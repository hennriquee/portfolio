/*
 * Rolagem suave (Lenis) integrada ao GSAP ScrollTrigger,
 * e navegação suave pelos links internos (#secao).
 */
const NAV_OFFSET = -88;
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

export function initSmoothScroll() {
  const { Lenis, gsap, ScrollTrigger } = window;
  if (!Lenis) return null;

  const lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/** Faz os links "#secao" rolarem suavemente e move o foco para a seção (acessibilidade). */
export function bindAnchorLinks({ lenis, reduceMotion, onNavigate }) {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

    const hash = link.getAttribute("href");
    const toTop = hash === "#" || hash === "#inicio";
    const target = toTop ? null : document.querySelector(hash);
    if (!toTop && !target) return;

    event.preventDefault();
    onNavigate?.();

    if (lenis) {
      lenis.scrollTo(toTop ? 0 : target, {
        offset: toTop ? 0 : NAV_OFFSET,
        duration: 1.4,
        easing: easeOutQuart,
      });
    } else if (toTop) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }

    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    history.replaceState(null, "", toTop ? location.pathname + location.search : hash);
  });
}
