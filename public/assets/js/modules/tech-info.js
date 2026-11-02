/*
 * Balão informativo das tecnologias: ao clicar (ou Enter/Espaço) em um chip com logo,
 * abre um bloquinho dizendo o que é aquela tecnologia e para que serve.
 * Os textos ficam em ../i18n/tech-info.js (carregado só no primeiro clique).
 * A chave é data-info="..." ou, se não houver, o próprio data-tech.
 */
import { t, getLang } from "./i18n.js";

const SVG_NS = "http://www.w3.org/2000/svg";
let texts = null;
let pop = null;
let current = null;
let openedAt = 0;

const keyOf = (el) => el.dataset.info || (el.dataset.tech?.startsWith("i-") ? "" : el.dataset.tech || "");

export function initTechInfo() {
  const chips = [...document.querySelectorAll(".chip[data-tech], .chip[data-info], .bi-tool[data-tech]")].filter(keyOf);
  chips.forEach((chip) => {
    chip.setAttribute("data-info-chip", "");
    if (chip.parentElement?.tagName === "UL") chip.parentElement.setAttribute("role", "group"); // grupo de botões
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-expanded", "false");
    chip.addEventListener("focusout", (event) => {
      if (current === chip && !pop?.contains(event.relatedTarget)) close();
    });
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle(chip);
    });
    chip.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(chip);
      }
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (current && !pop.contains(event.target) && !current.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && current) close(true);
  });
  // fecha ao rolar de verdade (pequenos tremores no celular não contam)
  window.addEventListener("scroll", () => current && Math.abs(window.scrollY - openedAt) > 40 && close(), { passive: true });
  window.addEventListener("resize", () => current && close());
  document.addEventListener("langchange", () => current && fill(current));
}

async function toggle(chip) {
  if (current === chip) return close();
  if (!texts) {
    try {
      texts = (await import("../i18n/tech-info.js")).default;
    } catch {
      return;
    }
  }
  open(chip);
}

function build() {
  pop = document.createElement("div");
  pop.className = "tech-pop";
  pop.id = "tech-pop";
  pop.innerHTML = `
    <div class="tech-pop__head"><span class="tech-pop__logo"></span><strong class="tech-pop__name"></strong></div>
    <span class="tech-pop__tag"></span>
    <p class="tech-pop__text" id="tech-pop-text"></p>
    <button class="tech-pop__close" type="button"><svg class="icon" aria-hidden="true"><use href="#i-close" /></svg></button>`;
  pop.querySelector(".tech-pop__close").addEventListener("click", () => close(true));
  document.body.appendChild(pop);
}

function fill(chip) {
  const [tag, text] = texts[getLang()]?.[keyOf(chip)] || texts.pt[keyOf(chip)] || ["", ""];
  const name = chip.cloneNode(true);
  name.querySelectorAll("svg, .bi-badge").forEach((el) => el.remove());
  const label = name.textContent.trim();
  pop.querySelector(".tech-pop__name").textContent = label;
  pop.querySelector(".tech-pop__tag").textContent = tag;
  pop.querySelector(".tech-pop__text").textContent = text;
  pop.querySelector(".tech-pop__close").setAttribute("aria-label", t("info.close"));
  const logo = pop.querySelector(".tech-pop__logo");
  logo.replaceChildren();
  const icon = chip.querySelector(":scope > .tech-ico");
  if (icon) logo.appendChild(icon.cloneNode(true));
}

function open(chip) {
  if (!pop) build();
  if (current) current.setAttribute("aria-expanded", "false");
  current = chip;
  openedAt = window.scrollY;
  fill(chip);
  chip.setAttribute("aria-expanded", "true");
  chip.setAttribute("aria-describedby", "tech-pop-text");

  // posiciona abaixo do chip (ou acima, se não couber), sempre dentro da tela
  pop.classList.remove("is-open");
  pop.style.left = "0px";
  pop.style.top = "0px";
  const r = chip.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const margin = 12;
  const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, margin), window.innerWidth - w - margin);
  let top = r.bottom + 10;
  if (top + h > window.innerHeight - margin) top = Math.max(margin, r.top - h - 10);
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
  void pop.offsetWidth; // aplica a posição antes de animar a entrada
  pop.classList.add("is-open");
}

function close(returnFocus = false) {
  if (!current) return;
  const chip = current;
  current = null;
  chip.setAttribute("aria-expanded", "false");
  chip.removeAttribute("aria-describedby");
  pop?.classList.remove("is-open");
  if (returnFocus) chip.focus();
}
