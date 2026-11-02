/*
 * Navbar: estado ao rolar, barra de progresso, link ativo
 * (com indicador deslizante) e menu mobile acessível.
 */
import { bindAnchorLinks } from "./smooth-scroll.js";

export function initNav({ lenis, reduceMotion }) {
  const root = document.documentElement;
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;

  const toggle = nav.querySelector(".nav__toggle");
  const menu = document.getElementById("menu-mobile");
  const indicator = nav.querySelector(".nav__indicator");
  const links = [...nav.querySelectorAll("[data-nav-link]")];
  const blockers = [document.querySelector("main"), document.querySelector("footer"), document.querySelector(".wa-fab")];

  /* ---------- Rolagem: fundo da navbar + progresso ---------- */
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle("is-scrolled", y > 24);
    nav.style.setProperty("--progress", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();

  /* ---------- Link ativo ---------- */
  const moveIndicator = (link) => {
    if (!indicator) return;
    if (!link) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  let activeId = null;
  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    let activeLink = null;
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
        activeLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    moveIndicator(activeLink);
  };

  const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const hero = document.getElementById("inicio");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target === hero ? null : entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  [hero, ...sections].filter(Boolean).forEach((section) => observer.observe(section));
  window.addEventListener("resize", () => moveIndicator(links.find((l) => l.classList.contains("is-active"))));

  /* ---------- Menu mobile ---------- */
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    root.classList.toggle("menu-open", open);
    blockers.forEach((el) => el && (el.inert = open));
    if (open) {
      lenis?.stop();
      menu.querySelector("a")?.focus({ preventScroll: true });
    } else {
      lenis?.start();
    }
  };
  const isOpen = () => menu?.classList.contains("is-open");

  toggle?.addEventListener("click", () => setMenu(!isOpen()));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && setMenu(false));

  bindAnchorLinks({ lenis, reduceMotion, onNavigate: () => isOpen() && setMenu(false) });
}
