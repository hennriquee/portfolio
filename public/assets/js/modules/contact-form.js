/*
 * Formulário de contato.
 * Valida no navegador, envia para a função serverless própria (/api/contact)
 * e, se o envio falhar, oferece WhatsApp ou e-mail já preenchidos com a mensagem.
 */
import { CONFIG, emailAddress, whatsappUrl } from "../config.js";

const LIMITS = { name: 80, email: 254, subject: 120, message: 2000 };
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const COOLDOWN_KEY = "contact:lastSent";
const COOLDOWN_MS = 60_000;
const TOKEN_MIN_AGE_MS = 2200; // o servidor descarta envios com token mais novo que 2s

const RULES = {
  name: (v) => (v.length < 2 ? "Informe seu nome." : ""),
  email: (v) => (!v ? "Informe seu e-mail." : EMAIL_RE.test(v) ? "" : "Este e-mail não parece válido."),
  subject: (v) => (v.length < 2 ? "Informe o assunto." : ""),
  message: (v) => (v.length < 10 ? "Escreva uma mensagem com pelo menos 10 caracteres." : ""),
};

export function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const card = form.closest(".contact-card");
  const success = card.querySelector("[data-form-success]");
  const successText = card.querySelector("[data-success-text]");
  const status = form.querySelector("[data-form-status]");
  const submit = form.querySelector("[data-submit]");
  const submitLabel = submit.querySelector(".btn__label");
  const counter = form.querySelector("[data-counter]");
  const fields = Object.fromEntries(Object.keys(RULES).map((name) => [name, form.elements[name]]));
  const honeypot = form.elements.website;
  const announcer = card.querySelector("[data-form-announcer]");
  let sending = false;

  /* ---------- Token anti-robô (pedido quando o formulário se aproxima da tela) ---------- */
  let token = null;
  let tokenAt = 0;
  let tokenRequest = null;
  const fetchToken = () => {
    tokenRequest ??= fetch(CONFIG.contactEndpoint, { headers: { Accept: "application/json" }, signal: timeoutSignal(10_000) })
      .then((r) => r.json())
      .then((data) => {
        if (data?.token) {
          token = data.token;
          tokenAt = Date.now();
        }
      })
      .catch(() => {})
      .finally(() => (tokenRequest = null));
    return tokenRequest;
  };
  const ensureToken = async () => {
    if (!token) await fetchToken();
    const wait = TOKEN_MIN_AGE_MS - (Date.now() - tokenAt);
    if (token && wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return token;
  };
  new IntersectionObserver(
    (entries, observer) => {
      if (entries.some((e) => e.isIntersecting)) {
        fetchToken();
        observer.disconnect();
      }
    },
    { rootMargin: "400px 0px" },
  ).observe(form);
  form.addEventListener("focusin", () => token || fetchToken(), { once: true });

  const announce = (message) => {
    if (!announcer) return;
    announcer.textContent = "";
    setTimeout(() => (announcer.textContent = message), 60);
  };

  /* ---------- Validação ---------- */
  const setError = (name, message) => {
    const input = fields[name];
    const error = document.getElementById(`${input.id}-error`);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
    error.textContent = message;
  };
  const validateField = (name) => {
    const message = RULES[name](fields[name].value.trim());
    setError(name, message);
    return !message;
  };

  Object.keys(fields).forEach((name) => {
    const input = fields[name];
    input.addEventListener("blur", () => input.value.trim() && validateField(name));
    input.addEventListener("input", () => input.hasAttribute("aria-invalid") && validateField(name));
  });

  const updateCounter = () => {
    const length = fields.message.value.length;
    counter.textContent = `${length}/${LIMITS.message}`;
    counter.classList.toggle("is-near", length > LIMITS.message * 0.9);
  };
  fields.message.addEventListener("input", updateCounter);
  updateCounter();

  /* ---------- Mensagens de estado ---------- */
  const hideStatus = () => {
    status.hidden = true;
    status.className = "form__status";
    status.replaceChildren();
  };

  const showError = (message, data) => {
    status.hidden = false;
    status.className = "form__status is-error";
    const text = document.createElement("p");
    text.textContent = message;

    const preview = `Olá, Bruno! Sou ${data.name}.\n\n*${data.subject}*\n${data.message}`.slice(0, 1500);
    const actions = document.createElement("div");
    actions.className = "form__status-actions";
    actions.append(
      makeLink(whatsappUrl(preview), "Enviar pelo WhatsApp", "btn btn--whatsapp btn--sm", true),
      makeLink(
        `mailto:${emailAddress()}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.message)}`,
        "Abrir meu e-mail",
        "btn btn--ghost btn--sm",
      ),
    );
    status.replaceChildren(text, actions);
    announce(message);
  };

  const setSending = (value) => {
    sending = value;
    submit.disabled = value;
    submit.setAttribute("aria-busy", String(value));
    submitLabel.textContent = value ? "Enviando…" : "Enviar mensagem";
    const icon = submit.querySelector(".icon, .spinner");
    if (value && icon?.classList.contains("icon")) {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.setAttribute("aria-hidden", "true");
      icon.replaceWith(spinner);
      spinner._icon = icon;
    } else if (!value && icon?.classList.contains("spinner")) {
      icon.replaceWith(icon._icon);
    }
  };

  const showSuccess = (name) => {
    successText.textContent = `Obrigado pelo contato, ${name.split(" ")[0]}! Vou responder no e-mail informado o mais breve possível.`;
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    announce(`Mensagem enviada! ${successText.textContent}`);
  };

  card.querySelector("[data-form-reset]")?.addEventListener("click", () => {
    form.reset();
    updateCounter();
    hideStatus();
    success.hidden = true;
    form.hidden = false;
    fields.name.focus();
  });

  /* ---------- Envio ---------- */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    hideStatus();

    const invalid = Object.keys(fields).filter((name) => !validateField(name));
    if (invalid.length) {
      fields[invalid[0]].focus();
      announce(`Confira ${invalid.length > 1 ? "os campos destacados" : "o campo destacado"}.`);
      return;
    }

    const data = {
      name: fields.name.value.trim().slice(0, LIMITS.name),
      email: fields.email.value.trim().slice(0, LIMITS.email),
      subject: fields.subject.value.trim().slice(0, LIMITS.subject),
      message: fields.message.value.trim().slice(0, LIMITS.message),
    };

    const lastSent = readCooldown();
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      showError("Você acabou de enviar uma mensagem. Aguarde um minuto ou fale comigo direto:", data);
      return;
    }

    setSending(true);
    try {
      const post = async () => {
        const response = await fetch(CONFIG.contactEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, website: honeypot?.value || "", token: await ensureToken() }),
          signal: timeoutSignal(15_000),
        });
        return { response, result: await response.json().catch(() => ({})) };
      };

      let { response, result } = await post();
      if (result.code === "token_expired") {
        token = null; // a página ficou aberta por horas: pega um token novo e tenta de novo
        ({ response, result } = await post());
      }

      if (response.ok && result.ok) {
        writeCooldown();
        showSuccess(data.name);
        form.reset();
        updateCounter();
        return;
      }

      if (response.status === 422 && result.fields) {
        Object.entries(result.fields).forEach(([name, message]) => fields[name] && setError(name, message));
        const first = Object.keys(result.fields).find((name) => fields[name]);
        if (first) fields[first].focus();
        announce(result.error || "Confira os campos destacados.");
        return;
      }

      showError(result.error || "Não foi possível enviar agora. Você pode falar comigo direto por aqui:", data);
    } catch {
      showError("Não consegui conectar ao servidor. Você pode falar comigo direto por aqui:", data);
    } finally {
      setSending(false);
    }
  });
}

function makeLink(href, label, className, external = false) {
  const link = document.createElement("a");
  link.href = href;
  link.className = className;
  link.textContent = label;
  if (external) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function readCooldown() {
  try {
    return Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    /* armazenamento indisponível: segue sem limite local */
  }
}
