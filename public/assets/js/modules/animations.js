/*
 * Animações de entrada e efeitos ligados à rolagem (GSAP + ScrollTrigger).
 */
export function initAnimations({ reduceMotion }) {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  setupMarquee(gsap, ScrollTrigger, reduceMotion);
  if (reduceMotion) return;

  heroIntro(gsap);
  heroScrollOut(gsap);
  splitHeadings(gsap);
  revealOnScroll(gsap, ScrollTrigger);
  scrubStatement(gsap);
  timeline(gsap, ScrollTrigger);
  counters(gsap, ScrollTrigger);
  parallaxOrbs(gsap);

  // Troca de idioma: os títulos ganham texto novo e precisam ser divididos de novo.
  document.addEventListener("langchange", () => {
    splitHeadings(gsap, { refresh: true });
    scrubStatement(gsap);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  // Recalcula posições quando fontes e imagens terminarem de carregar.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

/* ---------- Hero ---------- */
function heroIntro(gsap) {
  const lines = gsap.utils.toArray(".hero__title .line > span");
  // Esconde as linhas dentro da máscara antes de revelar o título (oculto via CSS até aqui).
  gsap.set(lines, { yPercent: 110 });
  gsap.set(".hero__title", { visibility: "visible" });

  const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.2 }, delay: 0.1 });
  tl.fromTo(".hero__eyebrow", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1 })
    .to(lines, { yPercent: 0, stagger: 0.12, duration: 1.4 }, 0.1)
    .fromTo(".hero__role", { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, 0.55)
    .fromTo(".hero__actions > *", { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.08 }, 0.75)
    .fromTo(".avatar__frame", { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.8 }, 0.2)
    .fromTo(".avatar-deco__inner", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 2 }, 0.4)
    .fromTo(".hero__scroll", { opacity: 0 }, { opacity: 1, duration: 1 }, 1.2);
}

function heroScrollOut(gsap) {
  gsap.to(".hero__text", {
    y: -90,
    opacity: 0.1,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__scroll", {
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "15% top", scrub: true },
  });
}

/* ---------- Títulos: palavras sobem de dentro de uma máscara ---------- */
function splitWords(el, className) {
  const text = el.textContent.trim().replace(/\s+/g, " ");
  if (/^H[1-6]$/.test(el.tagName)) {
    el.setAttribute("aria-label", text);
  } else {
    // Parágrafos não aceitam aria-label: deixamos uma cópia só para leitores de tela.
    const copy = document.createElement("span");
    copy.className = "sr-only";
    copy.textContent = text;
    el.prepend(copy);
  }
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains("sr-only")) return;
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(" "));
            return;
          }
          const outer = document.createElement("span");
          outer.className = className;
          outer.setAttribute("aria-hidden", "true");
          if (className === "sw") {
            const inner = document.createElement("span");
            inner.className = "sw__i";
            inner.textContent = part;
            outer.appendChild(inner);
            words.push(inner);
          } else {
            outer.textContent = part;
            words.push(outer);
          }
          fragment.appendChild(outer);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
  return words;
}

const headingState = new WeakMap();

function splitHeadings(gsap, { refresh = false } = {}) {
  document.querySelectorAll("[data-split]").forEach((heading) => {
    const previous = headingState.get(heading);
    previous?.tween?.scrollTrigger?.kill();
    previous?.tween?.kill();
    // Já apareceu (ou já passou da tela)? Ao trocar o idioma, mostra direto, sem repetir a animação.
    const shown = refresh && (previous?.revealed || heading.getBoundingClientRect().top < window.innerHeight * 0.88);

    const words = splitWords(heading, "sw");
    heading.style.visibility = "visible";
    const state = { revealed: shown, tween: null };
    headingState.set(heading, state);
    if (shown) return;

    gsap.set(words, { yPercent: 115 });
    state.tween = gsap.to(words, {
      yPercent: 0,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.06,
      scrollTrigger: { trigger: heading, start: "top 88%", once: true, onEnter: () => (state.revealed = true) },
    });
  });
}

/* ---------- Texto de destaque que "acende" palavra por palavra ---------- */
const scrubTweens = new WeakMap();

function scrubStatement(gsap) {
  document.querySelectorAll("[data-scrub-words]").forEach((el) => {
    const previous = scrubTweens.get(el);
    previous?.scrollTrigger?.kill();
    previous?.kill();
    const words = splitWords(el, "word");
    const tween = gsap.fromTo(
      words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
      },
    );
    scrubTweens.set(el, tween);
  });
}

/* ---------- Elementos que surgem ao entrar na tela ---------- */
function revealOnScroll(gsap, ScrollTrigger) {
  const items = gsap.utils.toArray("[data-reveal]");
  const show = (batch) => {
    batch.forEach((el) => el.classList.add("is-in"));
    gsap.fromTo(
      batch,
      { opacity: 0, y: 36 },
      { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.09, overwrite: true, clearProps: "transform" },
    );
  };

  ScrollTrigger.batch(items, { start: "top 90%", once: true, onEnter: show });

  // Itens que já estão acima da tela (ex.: página aberta direto em #contato).
  requestAnimationFrame(() => {
    const above = items.filter((el) => !el.classList.contains("is-in") && el.getBoundingClientRect().top < window.innerHeight);
    if (above.length) show(above);
  });
}

/* ---------- Linha do tempo ---------- */
function timeline(gsap, ScrollTrigger) {
  const list = document.querySelector(".timeline");
  if (!list) return;
  gsap.fromTo(
    ".timeline__progress",
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: { trigger: list, start: "top 62%", end: "bottom 62%", scrub: 0.5 },
    },
  );
  gsap.utils.toArray(".tl-item").forEach((item) => {
    ScrollTrigger.create({
      trigger: item,
      start: "top 62%",
      onEnter: () => item.classList.add("is-active"),
      onLeaveBack: () => item.classList.remove("is-active"),
    });
  });
}

/* ---------- Contadores ---------- */
function counters(gsap, ScrollTrigger) {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseInt(el.textContent, 10);
    if (!Number.isFinite(end)) return;
    const state = { value: 0 };
    el.textContent = "0";
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () =>
        gsap.to(state, {
          value: end,
          duration: 1.8,
          ease: "power3.out",
          onUpdate: () => (el.textContent = String(Math.round(state.value))),
        }),
    });
  });
}

/* ---------- Faixa de tecnologias: acelera conforme a velocidade da rolagem ---------- */
function setupMarquee(gsap, ScrollTrigger, reduceMotion) {
  const marquee = document.querySelector(".marquee");
  if (!marquee) return;
  if (reduceMotion) {
    marquee.classList.add("is-gsap"); // para a animação CSS
    return;
  }
  marquee.classList.add("is-gsap");

  const tweens = gsap.utils.toArray("[data-marquee]").map((row) => {
    const reverse = row.hasAttribute("data-reverse");
    return gsap.fromTo(
      row,
      { xPercent: reverse ? -50 : 0 },
      { xPercent: reverse ? 0 : -50, duration: 48, ease: "none", repeat: -1 },
    );
  });

  let hovered = false;
  marquee.addEventListener("pointerenter", () => {
    hovered = true;
    tweens.forEach((tween) => gsap.to(tween, { timeScale: 0, duration: 0.6, overwrite: true }));
  });
  marquee.addEventListener("pointerleave", () => {
    hovered = false;
    tweens.forEach((tween) => gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true }));
  });

  ScrollTrigger.create({
    trigger: marquee,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => tweens.forEach((tween) => (self.isActive ? tween.resume() : tween.pause())),
    onUpdate: (self) => {
      if (hovered) return;
      const boost = Math.min(Math.abs(self.getVelocity()) / 250, 7);
      tweens.forEach((tween) => {
        gsap.to(tween, {
          timeScale: 1 + boost,
          duration: 0.25,
          overwrite: true,
          onComplete: () => gsap.to(tween, { timeScale: 1, duration: 1.4, ease: "power2.out" }),
        });
      });
    },
  });
}

/* ---------- Orbes de luz com leve paralaxe ---------- */
function parallaxOrbs(gsap) {
  gsap.utils.toArray(".orb").forEach((orb) => {
    gsap.fromTo(
      orb,
      { yPercent: -15 },
      {
        yPercent: 25,
        ease: "none",
        scrollTrigger: { trigger: orb.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  });
}
