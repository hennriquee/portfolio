/*
 * /api/contact — envia a mensagem do formulário para o seu e-mail.
 *
 * Roda como Netlify Function (pasta netlify/functions). As credenciais ficam
 * SOMENTE nas variáveis de ambiente da Netlify — nada sensível vai para o navegador.
 *
 * Fluxo: o navegador pede um token assinado (GET) quando o formulário aparece
 * e o devolve junto com a mensagem (POST).
 *
 * Proteções:
 *  - aceita apenas POST com JSON vindo do próprio site (checagem de Origin)
 *  - token assinado pelo servidor (HMAC) com idade mínima e máxima: robôs
 *    que postam direto ou rápido demais são descartados
 *  - validação e limite de tamanho de todos os campos
 *  - campo-armadilha (honeypot) invisível para pessoas
 *  - limite de envios por IP e limite diário por instância
 *    (as instâncias da função podem ser várias: é uma proteção "de melhor esforço")
 *  - remoção de quebras de linha em cabeçalhos (evita "header injection")
 *  - escape de HTML no corpo do e-mail
 *
 * Variáveis de ambiente: veja .env.example
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

const LIMITS = { name: [2, 80], email: [5, 254], subject: [2, 120], message: [10, 2000] };
const TOKEN_MIN_AGE_MS = 2000;
const TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const DAILY_MAX = 50;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

const hits = new Map(); // limite por IP (por instância da função)
const daily = { day: "", count: 0 };
let transporter;

const json = (status, body, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });

const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

const singleLine = (value) => value.replace(/[\r\n\u2028\u2029]+/g, " ");

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function clientIp(req, context) {
  // Na Netlify, context.ip e x-nf-client-connection-ip vêm da própria plataforma.
  return (
    context?.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

function overDailyLimit() {
  const today = new Date().toISOString().slice(0, 10);
  if (daily.day !== today) Object.assign(daily, { day: today, count: 0 });
  daily.count += 1;
  return daily.count > DAILY_MAX;
}

/* ---------- Token assinado ---------- */
function tokenSecret() {
  if (process.env.CONTACT_SECRET) return process.env.CONTACT_SECRET;
  if (process.env.SMTP_PASS) return createHash("sha256").update(`contact-token:${process.env.SMTP_PASS}`).digest("hex");
  return "";
}

const sign = (issuedAt, secret) => createHmac("sha256", secret).update(String(issuedAt)).digest("base64url");

function issueToken(secret) {
  const issuedAt = Date.now();
  return `${issuedAt}.${sign(issuedAt, secret)}`;
}

/** Retorna "ok", "too-fast", "expired" ou "invalid". */
function checkToken(token, secret) {
  const [issuedRaw, signature] = String(token || "").split(".");
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt) || !signature) return "invalid";
  const expected = Buffer.from(sign(issuedAt, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return "invalid";
  const age = Date.now() - issuedAt;
  if (age < TOKEN_MIN_AGE_MS) return "too-fast";
  if (age > TOKEN_MAX_AGE_MS) return "expired";
  return "ok";
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

function isAllowedOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  try {
    const url = new URL(origin);
    if (allowed.length) return allowed.includes(url.origin);
    return url.host === new URL(req.url).host;
  } catch {
    return false;
  }
}

function validate(body) {
  const data = {
    name: singleLine(clean(body.name, LIMITS.name[1])),
    email: singleLine(clean(body.email, LIMITS.email[1])),
    subject: singleLine(clean(body.subject, LIMITS.subject[1])),
    message: clean(body.message, LIMITS.message[1]),
  };
  const fields = {};
  if (data.name.length < LIMITS.name[0]) fields.name = "Informe seu nome.";
  if (!EMAIL_RE.test(data.email)) fields.email = "Este e-mail não parece válido.";
  if (data.subject.length < LIMITS.subject[0]) fields.subject = "Informe o assunto.";
  if (data.message.length < LIMITS.message[0]) fields.message = "Escreva uma mensagem com pelo menos 10 caracteres.";
  return { data, fields };
}

async function readBody(req) {
  const raw = await req.text();
  if (raw.length > 20_000) throw new Error("payload too large");
  return JSON.parse(raw || "{}");
}

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

function buildEmail({ name, email, subject, message }, ip) {
  const sentAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const text = [
    `Nova mensagem pelo portfólio`,
    ``,
    `Nome: ${name}`,
    `E-mail: ${email}`,
    `Assunto: ${subject}`,
    ``,
    message,
    ``,
    `— Enviado em ${sentAt}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0b1430">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e8f4">
    <tr><td style="background:#001E5F;padding:22px 28px;color:#fff;font-size:18px;font-weight:600">Nova mensagem pelo portfólio</td></tr>
    <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6">
      <p style="margin:0 0 6px"><strong>Nome:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 6px"><strong>E-mail:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#1d4ed8">${escapeHtml(email)}</a></p>
      <p style="margin:0 0 18px"><strong>Assunto:</strong> ${escapeHtml(subject)}</p>
      <div style="padding:16px 18px;background:#f4f6fb;border-radius:10px;white-space:pre-wrap">${escapeHtml(message)}</div>
      <p style="margin:18px 0 0;color:#6b7590;font-size:12px">Enviado em ${escapeHtml(sentAt)} · responda este e-mail para falar direto com ${escapeHtml(name)}.</p>
    </td></tr>
  </table></body></html>`;

  return {
    from: { name: process.env.MAIL_FROM_NAME || "Portfólio", address: process.env.SMTP_USER },
    to: process.env.MAIL_TO || process.env.SMTP_USER,
    replyTo: { name, address: email },
    subject: `[Portfólio] ${subject}`,
    text,
    html,
    headers: { "X-Portfolio-Sender-IP": ip },
  };
}

export default async function handler(req, context) {
  const secret = tokenSecret();

  if (req.method === "GET") {
    if (req.headers.get("sec-fetch-site") === "cross-site") {
      return json(403, { ok: false, error: "Origem não autorizada." });
    }
    if (!secret) return json(503, { ok: false, error: "Envio indisponível." });
    return json(200, { ok: true, token: issueToken(secret) });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Método não permitido." }, { Allow: "GET, POST" });
  }
  if (!isAllowedOrigin(req)) {
    return json(403, { ok: false, error: "Origem não autorizada." });
  }
  if (!String(req.headers.get("content-type") || "").includes("application/json")) {
    return json(415, { ok: false, error: "Formato inválido." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(400, { ok: false, error: "Requisição inválida." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { ok: false, error: "Requisição inválida." });
  }

  if (!secret) {
    console.error("[contact] CONTACT_SECRET/SMTP_PASS não configurados.");
    return json(500, { ok: false, error: "O envio por e-mail está indisponível no momento. Fale comigo direto:" });
  }

  // Robôs: respondemos "ok" sem enviar nada, para não dar pistas.
  const tokenStatus = checkToken(body.token, secret);
  if (body.website || tokenStatus === "too-fast") {
    return json(200, { ok: true });
  }
  if (tokenStatus === "expired") {
    return json(401, { ok: false, code: "token_expired", error: "Sua sessão expirou. Tente enviar novamente." });
  }
  if (tokenStatus !== "ok") {
    return json(403, { ok: false, error: "Não foi possível validar o envio. Recarregue a página e tente novamente." });
  }

  const ip = clientIp(req, context);
  if (isRateLimited(ip)) {
    return json(429, { ok: false, error: "Muitas mensagens em pouco tempo. Tente novamente mais tarde ou fale comigo direto:" });
  }

  const { data, fields } = validate(body);
  if (Object.keys(fields).length) {
    return json(422, { ok: false, error: "Confira os campos destacados.", fields });
  }

  if (overDailyLimit()) {
    return json(429, { ok: false, error: "Recebi muitas mensagens hoje. Fale comigo direto:" });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("[contact] SMTP_USER/SMTP_PASS não configurados.");
    return json(500, { ok: false, error: "O envio por e-mail está indisponível no momento. Fale comigo direto:" });
  }

  try {
    await getTransporter().sendMail(buildEmail(data, ip));
    return json(200, { ok: true });
  } catch (error) {
    console.error("[contact] Falha ao enviar:", error?.message);
    return json(502, { ok: false, error: "Não foi possível enviar agora. Fale comigo direto:" });
  }
}

// A função responde em /api/contact (mesmo endereço usado pelo formulário).
export const config = { path: "/api/contact" };
