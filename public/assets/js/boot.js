/*
 * Executa antes de tudo (no <head>):
 *  - marca que o JS está ativo (as animações de entrada escondem o conteúdo no início);
 *  - aplica o tema salvo (padrão: escuro) e escolhe o idioma, sem "piscar" a página.
 * Se algo falhar, o conteúdo volta a aparecer sozinho após 4s.
 */
(function () {
  var root = document.documentElement;
  root.classList.add("js", "has-js");

  var theme = "dark";
  try {
    var savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") theme = savedTheme;
  } catch (e) {}
  root.setAttribute("data-theme", theme);

  // Idioma: ?lang= na URL > escolha salva > idioma do navegador (robôs de busca ficam em português).
  var langs = ["pt", "en", "es"];
  var lang = null;
  try {
    var fromUrl = (new URLSearchParams(location.search).get("lang") || "").toLowerCase().slice(0, 2);
    if (langs.indexOf(fromUrl) >= 0) {
      lang = fromUrl;
      localStorage.setItem("lang", lang);
    }
  } catch (e) {}
  if (!lang) {
    try {
      var savedLang = localStorage.getItem("lang");
      if (langs.indexOf(savedLang) >= 0) lang = savedLang;
    } catch (e) {}
  }
  if (!lang) {
    var isBot = /bot|crawl|spider|slurp|lighthouse|facebookexternalhit|whatsapp/i.test(navigator.userAgent);
    var browser = ((navigator.languages && navigator.languages[0]) || navigator.language || "pt").toLowerCase();
    lang = isBot || browser.indexOf("pt") === 0 ? "pt" : browser.indexOf("es") === 0 ? "es" : "en";
  }
  root.setAttribute("data-lang", lang);
  if (lang !== "pt") root.classList.add("i18n-wait");

  setTimeout(function () {
    root.classList.remove("i18n-wait");
    if (!root.classList.contains("anim-ready")) root.classList.remove("js");
  }, 4000);
})();
