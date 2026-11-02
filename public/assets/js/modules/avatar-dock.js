/*
 * Foto de perfil que "sobe" do hero e se encaixa na navbar ao rolar.
 *
 * Desktop (mouse): a foto vira um elemento fixo e voa do hero até a navbar,
 *   sincronizada com a rolagem suave (mesmo frame do Lenis/GSAP).
 * Touch (celular/tablet): a rolagem é nativa e roda fora da thread principal,
 *   então mover um elemento fixo causaria tremidas. Lá a foto do hero diminui
 *   e some, e uma cópia aparece na navbar com uma transição suave.
 *
 * Variáveis CSS expostas:
 *   --dock-p  progresso vertical (0 → 1): esconde os anéis do hero
 *   --dock    chegada na navbar (0 → 1): revela o anel e o nome na navbar
 * Sem JavaScript, a foto simplesmente fica no hero.
 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

export function initAvatarDock() {
  const avatar = document.querySelector("[data-avatar]");
  const origin = document.querySelector("[data-avatar-origin]");
  const target = document.querySelector("[data-avatar-target]");
  if (!avatar || !origin || !target) return;

  const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (touch) handoffMode(avatar, origin, target);
  else floatingMode(avatar, origin, target);
}

/* ---------- Desktop: a foto voa até a navbar ---------- */
function floatingMode(avatar, origin, target) {
  const root = document.documentElement;
  avatar.classList.add("is-floating");
  document.body.appendChild(avatar);

  const navBar = target.closest(".nav__inner") || target;
  let from = null;
  let to = null;
  let navBottom = 0;
  let distance = 1;
  let lastY = -1;
  let docked = null;

  const measure = () => {
    const scrollY = window.scrollY;
    const o = origin.getBoundingClientRect();
    const t = target.getBoundingClientRect(); // navbar é fixa → coordenadas da viewport
    from = { x: o.left + o.width / 2, y: o.top + scrollY + o.height / 2, size: o.width };
    to = { x: t.left + t.width / 2, y: t.top + t.height / 2, size: t.width };
    navBottom = navBar.getBoundingClientRect().bottom;
    distance = Math.max(from.y - to.y, 320);
    avatar.style.width = `${from.size}px`;
    avatar.style.height = `${from.size}px`;
    lastY = -1;
    update();
  };

  const update = () => {
    const scrollY = Math.max(0, window.scrollY);
    if (scrollY === lastY || !from) return;
    lastY = scrollY;

    const progress = clamp01(scrollY / distance);
    // Trajeto em 3 etapas, sem passar por cima do texto da navbar:
    // 1) sobe (encolhendo) até uma "faixa" logo abaixo da navbar,
    // 2) desliza pela faixa até ficar sob o espaço da foto,
    // 3) encaixa na navbar.
    const scale = lerp(1, to.size / from.size, easeOutCubic(progress));
    const size = from.size * scale;
    const lane = navBottom + 14 + size / 2;
    const rise = smoothstep(clamp01(progress / 0.45));
    const slide = smoothstep(clamp01((progress - 0.3) / 0.5));
    const dock = smoothstep(clamp01((progress - 0.78) / 0.22));

    const x = lerp(from.x, to.x, slide);
    const y = lerp(lerp(from.y - scrollY, lane, rise), to.y, dock);

    avatar.style.transform = `translate3d(${(x - from.size / 2).toFixed(2)}px, ${(y - from.size / 2).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    root.style.setProperty("--dock-p", rise.toFixed(4));
    root.style.setProperty("--dock", dock.toFixed(4));

    const isDocked = progress >= 1;
    if (isDocked !== docked) {
      docked = isDocked;
      avatar.classList.toggle("is-docked", isDocked);
    }
  };

  // Com GSAP, atualiza no mesmo "tick" da rolagem suave (sem atraso de 1 frame).
  if (window.gsap) {
    window.gsap.ticker.add(update);
  } else {
    let frame = 0;
    window.addEventListener(
      "scroll",
      () => {
        if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
      },
      { passive: true },
    );
  }

  let resizeTimer;
  const remeasure = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  };
  window.addEventListener("resize", remeasure);
  document.addEventListener("langchange", remeasure);
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  measure();
}

/* ---------- Touch: a foto do hero passa o "bastão" para a navbar ---------- */
function handoffMode(avatar, origin, target) {
  const root = document.documentElement;
  root.classList.add("dock-handoff");

  const source = avatar.querySelector("img");
  const mini = document.createElement("img");
  mini.className = "nav__avatar-img";
  mini.alt = "";
  mini.decoding = "async";
  mini.src = "assets/img/bruno-320.webp";
  mini.addEventListener("error", () => (mini.src = source?.src || ""), { once: true });
  target.appendChild(mini);

  let distance = 1;
  let lastY = -1;
  let docked = null;
  let lastWidth = window.innerWidth;

  const measure = () => {
    const o = origin.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const originCenter = o.top + window.scrollY + o.height / 2;
    distance = Math.max(originCenter - (t.top + t.height / 2), 120);
    lastY = -1;
    update();
  };

  const update = () => {
    const scrollY = Math.max(0, window.scrollY);
    if (scrollY === lastY) return;
    lastY = scrollY;

    const progress = clamp01(scrollY / distance);
    const eased = smoothstep(progress);
    avatar.style.transform = `scale(${(1 - 0.35 * eased).toFixed(4)})`;
    avatar.style.opacity = String((1 - smoothstep(clamp01((progress - 0.55) / 0.35))).toFixed(3));
    root.style.setProperty("--dock-p", eased.toFixed(4));

    const isDocked = progress >= 0.8;
    if (isDocked !== docked) {
      docked = isDocked;
      root.classList.toggle("is-avatar-docked", isDocked);
      root.style.setProperty("--dock", isDocked ? "1" : "0");
    }
  };

  let frame = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
    },
    { passive: true },
  );
  // No celular, a barra de endereço muda a altura a todo momento: só recalcula quando a largura muda.
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    measure();
  });
  document.addEventListener("langchange", () => requestAnimationFrame(measure));
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  measure();
}
