/*
 * Ponto de entrada do site.
 * Cada funcionalidade vive em um módulo próprio dentro de ./modules.
 */
import { initI18n } from "./modules/i18n.js";
import { initTheme } from "./modules/theme.js";
import { initTechIcons } from "./modules/tech-icons.js";
import { initSmoothScroll } from "./modules/smooth-scroll.js";
import { initNav } from "./modules/nav.js";
import { initAvatarDock } from "./modules/avatar-dock.js";
import { initInteractions } from "./modules/interactions.js";
import { initAnimations } from "./modules/animations.js";
import { initContactForm } from "./modules/contact-form.js";
import { initOrbit } from "./modules/orbit.js";

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = Boolean(window.gsap && window.ScrollTrigger);

// Primeiro o idioma: os outros módulos já leem os textos traduzidos.
await initI18n();

// Sem GSAP (ou com "reduzir movimento"), mostramos tudo sem animações de entrada.
if (!hasGsap || reduceMotion) root.classList.remove("js");

initTheme({ reduceMotion });
initTechIcons();

const lenis = hasGsap && !reduceMotion ? initSmoothScroll() : null;

initInteractions({ reduceMotion });
initNav({ lenis, reduceMotion });
initAvatarDock();
initContactForm();
initOrbit({ reduceMotion });
if (hasGsap) initAnimations({ reduceMotion });

root.classList.add("anim-ready");

// A cena 3D é carregada depois do conteúdo principal, sem travar a página.
// Pulada quando o visitante ativou a economia de dados.
const canvas = document.querySelector("[data-hero-canvas]");
const saveData = navigator.connection?.saveData === true;
if (canvas && !saveData) {
  const start = () =>
    import("./modules/hero-scene.js")
      .then(({ initHeroScene }) => initHeroScene(canvas, { reduceMotion }))
      .catch((error) => console.warn("Cena 3D indisponível:", error));
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 600 });
  else setTimeout(start, 200);
}
