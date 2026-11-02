/*
 * Executa antes de tudo (no <head>): marca que o JS está ativo para
 * que as animações de entrada possam esconder o conteúdo inicialmente.
 * Se algo falhar, o conteúdo volta a aparecer sozinho após 4s.
 */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  setTimeout(function () {
    if (!root.classList.contains("anim-ready")) root.classList.remove("js");
  }, 4000);
})();
