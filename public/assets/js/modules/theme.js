/*
 * Tema claro / escuro.
 * O tema inicial é definido em boot.js (escolha salva ou escuro, o padrão do site).
 * As cores de cada tema ficam em assets/css/theme.css.
 */
import { t } from "./i18n.js";

const META_COLOR = { dark: "#050b1c", light: "#f7f9fd" };

export function initTheme({ reduceMotion }) {
  const root = document.documentElement;
  const buttons = [...document.querySelectorAll("[data-theme-toggle]")];
  const meta = document.querySelector('meta[name="theme-color"]');
  const current = () => (root.dataset.theme === "light" ? "light" : "dark");

  const sync = () => {
    const light = current() === "light";
    buttons.forEach((button) => {
      const label = button.querySelector("[data-theme-label]");
      if (label) label.textContent = t(light ? "theme.dark" : "theme.light");
      else button.setAttribute("aria-label", t(light ? "theme.toDark" : "theme.toLight"));
    });
    if (meta) meta.content = META_COLOR[current()];
  };

  const apply = (theme) => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* sem armazenamento: vale só para esta visita */
    }
    sync();
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  };

  const toggle = (origin) => {
    const next = current() === "light" ? "dark" : "light";

    // Navegadores com View Transitions: o novo tema "abre" em círculo a partir do botão.
    if (document.startViewTransition && !reduceMotion) {
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 0;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(() => apply(next));
      transition.ready
        .then(() =>
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
          ),
        )
        .catch(() => {});
      return;
    }

    // Sem suporte: troca com um fade curto nas cores.
    if (!reduceMotion) root.classList.add("theme-fade");
    apply(next);
    setTimeout(() => root.classList.remove("theme-fade"), 500);
  };

  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      const rect = button.getBoundingClientRect();
      toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }),
  );
  document.addEventListener("langchange", sync);
  sync();
}
