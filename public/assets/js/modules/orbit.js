/*
 * Chips ao redor da foto: enquanto os anéis giram, cada chip troca de tecnologia,
 * um de cada vez, sem repetir as que já estão na tela.
 * Para mudar a lista, edite TECHS (o primeiro valor é o nome do logo em tech-icons.svg).
 */
const TECHS = [
  ["react", "React"],
  ["nodejs", "Node.js"],
  ["powerbi", "Power BI"],
  ["python", "Python"],
  ["javascript", "JavaScript"],
  ["clickhouse", "ClickHouse"],
  ["databricks", "Databricks"],
  ["spark", "PySpark"],
  ["mongodb", "MongoDB"],
  ["metabase", "Metabase"],
  ["chartjs", "Chart.js"],
  ["git", "Git"],
  ["azure", "Azure"],
  ["lookerstudio", "Looker Studio"],
  ["pandas", "Pandas"],
  ["github", "GitHub"],
  ["netlify", "Netlify"],
  ["claude", "Claude"],
];
const INTERVAL_MS = 1800;
const SWAP_MS = 380;

export function initOrbit({ reduceMotion }) {
  const chips = [...document.querySelectorAll("[data-orbit-chip]")];
  const hero = document.getElementById("inicio");
  if (!chips.length || reduceMotion) return;

  // Em telas pequenas os chips ficam perto da borda: usa só nomes curtos.
  const list = window.innerWidth < 600 ? TECHS.filter(([, name]) => name.length <= 9) : TECHS;
  const shown = chips.map((chip) => chip.querySelector("use")?.getAttribute("href").replace("#t-", ""));
  let pointer = 0;
  let turn = 0;
  let visible = true;

  const nextTech = () => {
    for (let i = 0; i < list.length; i++) {
      const tech = list[pointer++ % list.length];
      if (!shown.includes(tech[0])) return tech;
    }
    return null;
  };

  const swap = () => {
    if (!visible || document.hidden) return;
    // pula chips escondidos (telas menores mostram menos chips)
    let index = -1;
    for (let i = 0; i < chips.length; i++) {
      const candidate = (turn + i) % chips.length;
      if (chips[candidate].offsetParent !== null) {
        index = candidate;
        break;
      }
    }
    if (index < 0) return;
    turn = index + 1;

    const chip = chips[index];
    const tech = nextTech();
    if (!tech) return;
    chip.classList.remove("is-in");
    chip.classList.add("is-out");
    setTimeout(() => {
      chip.querySelector("use")?.setAttribute("href", `#t-${tech[0]}`);
      const label = chip.querySelector(".orbit-chip__swap > span");
      if (label) label.textContent = tech[1];
      shown[index] = tech[0];
      chip.classList.remove("is-out");
      chip.classList.add("is-in");
    }, SWAP_MS);
  };

  setInterval(swap, INTERVAL_MS);
  if (hero) new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(hero);
}
