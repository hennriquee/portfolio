/*
 * Idiomas do site: português (padrão), inglês e espanhol.
 *
 * Como funciona:
 *  - O texto em português fica no próprio HTML. Cada trecho traduzível tem
 *    data-i18n="chave" (conteúdo), data-i18n-attr="atributo:chave" (ex.: placeholder)
 *    ou data-i18n-typer="chave" (lista do texto digitado).
 *  - As traduções ficam em ../i18n/en.js e ../i18n/es.js, com as mesmas chaves.
 *  - A escolha fica salva no navegador; ?lang=en na URL também funciona.
 *
 * Outros módulos usam t("chave") para mensagens geradas por JavaScript e
 * escutam o evento "langchange" para se atualizar.
 */
import pt from "../i18n/pt.js";

export const LANGS = ["pt", "en", "es"];
const HTML_LANG = { pt: "pt-BR", en: "en", es: "es" };
const loaders = {
  en: () => import("../i18n/en.js"),
  es: () => import("../i18n/es.js"),
};

let lang = "pt";
let dict = pt;
const source = new Map(); // textos originais (português) lidos do HTML

export const getLang = () => lang;
export const getLocale = () => HTML_LANG[lang];

/** Texto traduzido. Variáveis no formato {nome}. */
export function t(key, vars) {
  let value = dict[key] ?? pt[key] ?? source.get(key) ?? key;
  if (vars && typeof value === "string") value = value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  return value;
}

const parseAttrs = (el) =>
  el.dataset.i18nAttr
    .split(";")
    .map((pair) => pair.split(":").map((part) => part.trim()))
    .filter(([attr, key]) => attr && key);

function captureSource() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!source.has(key)) source.set(key, el.tagName === "TITLE" ? el.textContent : el.innerHTML.trim());
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    parseAttrs(el).forEach(([attr, key]) => {
      if (!source.has(key)) source.set(key, el.getAttribute(attr) ?? "");
    });
  });
  document.querySelectorAll("[data-i18n-typer]").forEach((el) => {
    const key = el.dataset.i18nTyper;
    try {
      if (!source.has(key)) source.set(key, JSON.parse(el.dataset.typer));
    } catch {
      /* lista inválida: o texto digitado fica como está */
    }
  });
}

function applyToPage() {
  const read = (key) => (lang === "pt" ? source.get(key) : dict[key] ?? source.get(key));

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = read(el.dataset.i18n);
    if (value == null) return;
    if (el.tagName === "TITLE") document.title = value;
    else if (el.innerHTML.trim() !== value) el.innerHTML = value; // traduções são nossas (arquivos do site)
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    parseAttrs(el).forEach(([attr, key]) => {
      const value = read(key);
      if (value != null) el.setAttribute(attr, value);
    });
  });
  document.querySelectorAll("[data-i18n-typer]").forEach((el) => {
    const value = read(el.dataset.i18nTyper);
    if (Array.isArray(value)) el.dataset.typer = JSON.stringify(value);
  });

  const root = document.documentElement;
  root.lang = HTML_LANG[lang];
  root.dataset.lang = lang;
  syncControls();
}

function syncControls() {
  document.querySelectorAll("[data-set-lang]").forEach((button) => {
    const active = button.dataset.setLang === lang;
    if (button.getAttribute("role") === "menuitemradio") button.setAttribute("aria-checked", String(active));
    else button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-lang-current]").forEach((el) => (el.textContent = lang.toUpperCase()));
}

/** Troca o idioma da página. */
export async function setLang(next, { persist = true } = {}) {
  if (!LANGS.includes(next)) return;
  if (persist) {
    try {
      localStorage.setItem("lang", next);
    } catch {
      /* sem armazenamento: vale só para esta visita */
    }
  }
  if (next === lang) return;

  dict = next === "pt" ? pt : { ...pt, ...(await loaders[next]()).default };
  lang = next;
  applyToPage();

  // Mantém a URL coerente se ela tiver ?lang=
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", next);
    history.replaceState(history.state, "", url);
  }
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

/** Lê os textos originais, aplica o idioma inicial (definido em boot.js) e liga os botões. */
export async function initI18n() {
  const root = document.documentElement;
  captureSource();
  try {
    await setLang(root.dataset.lang || "pt", { persist: false });
  } catch (error) {
    console.warn("Tradução indisponível, mantendo português:", error);
    lang = "pt";
    dict = pt;
  } finally {
    syncControls();
    root.classList.remove("i18n-wait");
  }

  document.querySelectorAll("[data-set-lang]").forEach((button) =>
    button.addEventListener("click", () => {
      const inDropdown = button.closest("[data-lang-menu]");
      closeMenus(null, Boolean(inDropdown));
      setLang(button.dataset.setLang).catch((error) => console.warn("Não foi possível trocar o idioma:", error));
    }),
  );
  setupDropdowns();
}

/* ---------- Menu suspenso de idioma (desktop) ---------- */
const menus = [];
function closeMenus(except, focusButton = false) {
  menus.forEach((m) => m !== except && m.close(focusButton));
}

function setupDropdowns() {
  document.querySelectorAll("[data-lang-menu]").forEach((wrap) => {
    const button = wrap.querySelector("[aria-haspopup]");
    const options = [...wrap.querySelectorAll("[data-set-lang]")];
    const list = wrap.querySelector(".lang__menu");
    if (!button) return;
    if (list) list.inert = true; // fechado: fora do Tab e dos leitores de tela
    const isOpen = () => wrap.classList.contains("is-open");
    const menu = {
      open() {
        closeMenus(menu);
        wrap.classList.add("is-open");
        if (list) list.inert = false;
        button.setAttribute("aria-expanded", "true");
        (options.find((o) => o.dataset.setLang === lang) || options[0])?.focus();
      },
      close(focusButton = false) {
        if (!isOpen()) return;
        wrap.classList.remove("is-open");
        if (list) list.inert = true;
        button.setAttribute("aria-expanded", "false");
        if (focusButton) button.focus();
      },
    };
    menus.push(menu);

    button.addEventListener("click", () => (isOpen() ? menu.close() : menu.open()));
    wrap.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      const index = options.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        menu.close(true);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        options[(index + step + options.length) % options.length]?.focus();
      } else if (event.key === "Tab") {
        // fecha e devolve o foco ao botão; o Tab continua a partir dele
        menu.close(true);
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (isOpen() && !wrap.contains(event.target)) menu.close();
    });
  });
}
