/*
 * Cena 3D do hero (Three.js): um "campo de dados" de partículas em onda,
 * que reage ao mouse e à rolagem, com poeira luminosa flutuando acima.
 * As cores são lidas das variáveis CSS do tema — trocar --brand muda tudo.
 * A animação pausa sozinha quando o hero sai da tela ou a aba fica oculta.
 */
import * as THREE from "../../vendor/three.custom.min.js";

/** Converte uma variável CSS de cor em [r, g, b] (0–1), em qualquer formato (hex, oklch…). */
function readColor(token) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

const waveVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uHalfWidth;
  attribute float aRand;
  varying float vElevation;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * 0.32;

    float e = sin(p.x * 0.32 + t * 1.4) * 0.38
            + sin(p.z * 0.46 + t) * 0.32
            + sin((p.x + p.z) * 0.21 + t * 0.7) * 0.5
            + sin(length(p.xz) * 0.55 - t * 2.2) * 0.14;

    float d = distance(p.xz, uMouse);
    e += uMouseStrength * exp(-d * d * 0.16) * (1.1 + 0.25 * sin(d * 3.0 - uTime * 4.0));

    p.y += e;
    vElevation = e;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.75 + aRand * 0.5) / -mv.z;

    float depthFade = smoothstep(42.0, 7.0, -mv.z);
    float edgeFade = 1.0 - smoothstep(uHalfWidth * 0.55, uHalfWidth, abs(p.x));
    vAlpha = depthFade * edgeFade;
  }
`;

const waveFragment = /* glsl */ `
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform float uOpacity;
  varying float vElevation;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, d);
    float h = smoothstep(-0.8, 1.1, vElevation);
    vec3 color = mix(uColorLow, uColorMid, h);
    color = mix(color, uColorHigh, smoothstep(0.75, 1.0, h));
    gl_FragColor = vec4(color, soft * vAlpha * uOpacity);
  }
`;

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.12 + aRand * 0.25), 8.0);
    p.x += sin(uTime * 0.3 + aRand * 6.2831) * 0.4;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (14.0 + aRand * 22.0) * uPixelRatio / -mv.z;
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + aRand * 2.0) + aRand * 40.0);
    vAlpha = twinkle * smoothstep(0.0, 1.2, p.y) * (1.0 - smoothstep(6.0, 8.0, p.y)) * smoothstep(40.0, 6.0, -mv.z);
  }
`;

const dustFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float glow = pow(1.0 - d * 2.0, 2.0);
    gl_FragColor = vec4(uColor, glow * vAlpha * uOpacity);
  }
`;

export function initHeroScene(canvas, { reduceMotion = false } = {}) {
  const hero = canvas.closest(".hero");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    return null; // WebGL indisponível: o fundo em CSS continua aparecendo.
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const cameraBase = new THREE.Vector3(0, 2.4, 8);
  const lookTarget = new THREE.Vector3(0, 0, -6);
  camera.position.copy(cameraBase);

  const small = window.innerWidth < 768;

  /* ---------- Campo de partículas em onda ---------- */
  const cols = small ? 96 : 180;
  const rows = small ? 60 : 104;
  const width = 46;
  const depth = 42;
  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) {
      positions[i * 3] = (c / (cols - 1) - 0.5) * width;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 6 - (r / (rows - 1)) * depth;
      randoms[i] = Math.random();
    }
  }
  const waveGeometry = new THREE.BufferGeometry();
  waveGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  waveGeometry.setAttribute("aRand", new THREE.BufferAttribute(randoms, 1));

  const waveUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uSize: { value: small ? 34 : 30 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseStrength: { value: 0 },
    uHalfWidth: { value: width / 2 },
    uColorLow: { value: readColor("--glow") },
    uColorMid: { value: readColor("--accent") },
    uColorHigh: { value: readColor("--accent-2") },
    uOpacity: { value: 0.9 },
  };
  const wave = new THREE.Points(
    waveGeometry,
    new THREE.ShaderMaterial({
      vertexShader: waveVertex,
      fragmentShader: waveFragment,
      uniforms: waveUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  wave.position.y = -1.6;
  scene.add(wave);

  /* ---------- Poeira luminosa ---------- */
  const dustCount = small ? 200 : 420;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustRandoms = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 36;
    dustPositions[i * 3 + 1] = Math.random() * 8;
    dustPositions[i * 3 + 2] = 5 - Math.random() * 32;
    dustRandoms[i] = Math.random();
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute("aRand", new THREE.BufferAttribute(dustRandoms, 1));
  const dustUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uColor: { value: readColor("--accent-2") },
    uOpacity: { value: 0.75 },
  };
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.position.y = -1.6;
  scene.add(dust);

  /* ---------- Tamanho ---------- */
  const resize = () => {
    const w = canvas.clientWidth || hero.clientWidth;
    const h = canvas.clientHeight || hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 72 : 55;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(() => {
    resize();
    if (!running) render(clock.getElapsedTime());
  }).observe(canvas);

  /* ---------- Mouse ---------- */
  const pointer = { x: 0, y: 0, active: false };
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.6);
  const hit = new THREE.Vector3();
  const mouseTarget = new THREE.Vector2(999, 999);

  if (!reduceMotion) {
    hero.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.active = true;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) mouseTarget.set(hit.x, hit.z);
    });
    hero.addEventListener("pointerleave", () => (pointer.active = false));
  }

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = false;
  let frameId = 0;
  let heroVisible = true;

  const render = (time) => {
    waveUniforms.uTime.value = time;
    dustUniforms.uTime.value = time;

    // Suaviza o mouse para um movimento fluido
    const strengthTarget = pointer.active ? 1 : 0;
    waveUniforms.uMouseStrength.value += (strengthTarget - waveUniforms.uMouseStrength.value) * 0.05;
    if (pointer.active) waveUniforms.uMouse.value.lerp(mouseTarget, 0.08);

    // Paralaxe da câmera (mouse) + afastamento ao rolar
    const scroll = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));
    const px = pointer.active ? pointer.x : 0;
    const py = pointer.active ? pointer.y : 0;
    camera.position.x += (cameraBase.x + px * 0.7 - camera.position.x) * 0.04;
    camera.position.y += (cameraBase.y + py * 0.35 + scroll * 1.6 - camera.position.y) * 0.06;
    camera.lookAt(lookTarget.x, lookTarget.y - scroll * 1.2, lookTarget.z);
    wave.rotation.y = Math.sin(time * 0.05) * 0.06;

    waveUniforms.uOpacity.value = 0.9 * (1 - scroll * 0.7);
    renderer.render(scene, camera);
  };

  const loop = () => {
    frameId = requestAnimationFrame(loop);
    render(clock.getElapsedTime());
  };
  const start = () => {
    if (running || reduceMotion) return;
    running = true;
    loop();
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frameId);
  };
  const sync = () => (heroVisible && !document.hidden ? start() : stop());

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    sync();
  }).observe(hero);
  document.addEventListener("visibilitychange", sync);

  if (reduceMotion) render(4); // quadro estático
  else start();

  requestAnimationFrame(() => canvas.classList.add("is-ready"));
  return { start, stop };
}
