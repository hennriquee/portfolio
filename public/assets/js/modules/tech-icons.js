/*
 * Logos das tecnologias.
 * Qualquer elemento com data-tech="react" ganha o logo correspondente antes do texto.
 *   - Logos coloridos: símbolos "t-NOME" em assets/img/tech-icons.svg
 *     (coleções livres Iconify: logos e simple-icons CC0, devicon e vscode-icons MIT).
 *   - data-tech="i-NOME": usa um ícone de linha do próprio index.html (para quem não tem logo, ex.: SQL).
 * O arquivo de logos é baixado uma vez (fica em cache) e colocado na página,
 * para que gradientes funcionem em todos os navegadores.
 */
const SPRITE_URL = "assets/img/tech-icons.svg";
const SVG_NS = "http://www.w3.org/2000/svg";

export function initTechIcons() {
  document.querySelectorAll("[data-tech]").forEach((el) => {
    if (el.querySelector(":scope > .tech-ico")) return;
    const key = el.dataset.tech;
    const line = key.startsWith("i-");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", line ? "icon tech-ico" : "tech-ico");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", line ? `#${key}` : `#t-${key}`);
    svg.appendChild(use);
    el.prepend(svg);
  });

  fetch(SPRITE_URL)
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    .then((markup) => {
      const holder = document.createElement("div");
      holder.className = "sprite";
      holder.setAttribute("aria-hidden", "true");
      holder.innerHTML = markup; // arquivo estático do próprio site
      document.body.prepend(holder);
    })
    .catch(() => document.documentElement.classList.add("no-tech-icons"));
}
