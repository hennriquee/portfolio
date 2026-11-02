/*
 * Microinterações e conteúdo dinâmico:
 * links de contato, cópia de e-mail, texto digitado, durações das
 * experiências, números calculados, holofote dos cards, botões magnéticos
 * e botão flutuante do WhatsApp.
 */
import { emailAddress, whatsappUrl } from "../config.js";

export function initInteractions({ reduceMotion }) {
  setupContactLinks();
  setupTyper(reduceMotion);
  setupDurations();
  setupStats();
  setupSpotlight();
  if (!reduceMotion) setupMagnetic();
  setupWhatsappFab();
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
}

/* ---------- Toast ---------- */
let toastTimer;
export function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

/* ---------- Links de WhatsApp e e-mail ---------- */
function setupContactLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => (link.href = whatsappUrl()));

  const address = emailAddress();
  const mailto = `mailto:${address}?subject=${encodeURIComponent("Contato pelo portfólio")}`;
  document.querySelectorAll("[data-email]").forEach((link) => {
    link.href = mailto;
    link.textContent = address;
  });
  document.querySelectorAll("[data-email-icon]").forEach((link) => (link.href = mailto));

  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyText(address);
      showToast(ok ? "E-mail copiado!" : address);
      if (ok) {
        const use = button.querySelector("use");
        use?.setAttribute("href", "#i-check");
        setTimeout(() => use?.setAttribute("href", "#i-copy"), 1800);
      }
    });
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/* ---------- Texto digitado no hero ---------- */
function setupTyper(reduceMotion) {
  const el = document.querySelector("[data-typer]");
  if (!el) return;
  let words;
  try {
    words = JSON.parse(el.dataset.typer);
  } catch {
    return;
  }
  if (!Array.isArray(words) || words.length < 2) return;

  let index = 0;
  if (reduceMotion) {
    // Sem animação: mostra o primeiro papel fixo e esconde o cursor piscando.
    el.textContent = words[0];
    el.parentElement.querySelector(".caret")?.remove();
    return;
  }

  let length = words[0].length;
  let deleting = true;
  const step = () => {
    length += deleting ? -1 : 1;
    el.textContent = words[index].slice(0, Math.max(0, length));
    if (deleting && length <= 0) {
      deleting = false;
      index = (index + 1) % words.length;
      return setTimeout(step, 320);
    }
    if (!deleting && length >= words[index].length) {
      deleting = true;
      return setTimeout(step, 2600);
    }
    setTimeout(step, deleting ? 30 : 60);
  };
  setTimeout(step, 3400);
}

/* ---------- Datas ---------- */
const parseMonth = (value) => {
  const [year, month] = String(value).split("-").map(Number);
  return year && month ? new Date(year, month - 1, 1) : null;
};
const monthsBetween = (start, end) =>
  (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

function formatDuration(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years > 1 ? "anos" : "ano"}`);
  if (rest) parts.push(`${rest} ${rest > 1 ? "meses" : "mês"}`);
  return parts.join(" e ") || "1 mês";
}

function setupDurations() {
  const now = new Date();
  document.querySelectorAll("[data-start]").forEach((el) => {
    const start = parseMonth(el.dataset.start);
    const end = el.dataset.end ? parseMonth(el.dataset.end) : now;
    if (!start || !end || end < start) return;
    el.textContent = formatDuration(monthsBetween(start, end));
  });
}

/* ---------- Números da seção "Sobre" (calculados, nunca desatualizam) ---------- */
function setupStats() {
  document.querySelectorAll("[data-years-since]").forEach((el) => {
    const start = parseMonth(el.dataset.yearsSince);
    if (!start) return;
    const years = Math.max(1, Math.floor((monthsBetween(start, new Date()) - 1) / 12));
    el.textContent = String(years);
  });

  document.querySelectorAll("[data-xp-count]").forEach((el) => {
    el.textContent = String(document.querySelectorAll(".tl-item").length);
  });

  document.querySelectorAll("[data-tech-count]").forEach((el) => {
    const names = new Set(
      [...document.querySelectorAll("#habilidades .chip")].map((chip) => chip.textContent.trim().toLowerCase()),
    );
    const rounded = Math.floor(names.size / 5) * 5;
    if (rounded > 0) el.textContent = String(rounded);
  });
}

/* ---------- Holofote que segue o mouse nos cards ---------- */
function setupSpotlight() {
  if (!window.matchMedia("(hover: hover)").matches) return;
  document.querySelectorAll("[data-spotlight]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

/* ---------- Botões magnéticos ---------- */
function setupMagnetic() {
  const { gsap } = window;
  if (!gsap || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      xTo((event.clientX - (rect.left + rect.width / 2)) * 0.22);
      yTo((event.clientY - (rect.top + rect.height / 2)) * 0.32);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* ---------- Botão flutuante do WhatsApp ---------- */
function setupWhatsappFab() {
  const fab = document.querySelector(".wa-fab");
  const contact = document.getElementById("contato");
  const footer = document.querySelector(".footer");
  if (!fab) return;

  const hiddenBy = new Set();
  const update = () => {
    const pastHero = window.scrollY > window.innerHeight * 0.7;
    fab.classList.toggle("is-visible", pastHero && hiddenBy.size === 0);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? hiddenBy.add(entry.target) : hiddenBy.delete(entry.target)));
      update();
    },
    { threshold: 0.12 },
  );
  [contact, footer].filter(Boolean).forEach((el) => observer.observe(el));

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    },
    { passive: true },
  );
  update();
}

