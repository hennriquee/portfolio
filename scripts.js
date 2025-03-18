// Menu Hambúrguer
const menuHamburguer = document.querySelector(".menu-hamburguer");
const nav = document.querySelector(".navbar-responsive");

menuHamburguer.addEventListener("click", toggleMenu);

function toggleMenu() {
  menuHamburguer.classList.toggle("change");
  nav.style.display = menuHamburguer.classList.contains("change")
    ? "block"
    : "none";

  // Adiciona evento para fechar o menu ao clicar em qualquer link
  const menuLinks = nav.querySelectorAll("a");
  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.style.display = "none";
      menuHamburguer.classList.remove("change");
    });
  });
}
// /Menu Hambúrguer

// Flip Skills Cards
const buttons = document.querySelectorAll(".btn");

buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    const container = e.target.closest(".skills-container"); // Pega o container certo
    container.classList.toggle("flip");
  });
});
// /Flip Skills Cards

// Evento que formata o campo de telefone conforme o usuário digita
document.getElementById("telefone").addEventListener("input", function (event) {
  var telefone = event.target.value.replace(/\D/g, ""); // Remove todos os caracteres não numéricos

  // Formatar com parênteses e hífens conforme o usuário digita
  if (telefone.length <= 2) {
    telefone = "(" + telefone;
  } else if (telefone.length <= 7) {
    telefone = "(" + telefone.substring(0, 2) + ") " + telefone.substring(2);
  } else {
    telefone =
      "(" +
      telefone.substring(0, 2) +
      ") " +
      telefone.substring(2, 7) +
      "-" +
      telefone.substring(7, 11);
  }

  event.target.value = telefone; // Atualiza o valor do campo com a máscara
});

// Verificar Telefone:

document
  .getElementById("contact-form")
  .addEventListener("submit", function (event) {
    var telefone = document.getElementById("telefone").value;
    var telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;

    if (!telefoneRegex.test(telefone)) {
      alert(
        "Por favor, insira um número de telefone válido no formato (xx) xxxxx-xxxx."
      );
      event.preventDefault(); // Evita o envio do formulário
    }
  });

// CONHECIMENTOS

const vhtml_pct = 80;
const vcss_pct = 50;
const vjs_pct = 10;
const vbootstrap_pct = 50;
const vreactjs_pct = 5;
const vsql_pct = 25;
const vpbi_pct = 95;
const vexcel_pct = 90;

const html = document.getElementById("html-bar");
html.style.width = `${vhtml_pct}%`;
html.style.height = "100%";
const htmlp = document.getElementById("html-pct");
htmlp.textContent = `${vhtml_pct}%`;

const css = document.getElementById("css-bar");
css.style.width = `${vcss_pct}%`;
css.style.height = "100%";
const cssp = document.getElementById("css-pct");
cssp.textContent = `${vcss_pct}%`;

const js = document.getElementById("js-bar");
js.style.width = `${vjs_pct}%`;
js.style.height = "100%";
const jsp = document.getElementById("js-pct");
jsp.textContent = `${vjs_pct}%`;

const bootstrap = document.getElementById("bootstrap-bar");
bootstrap.style.width = `${vbootstrap_pct}%`;
bootstrap.style.height = "100%";
const bootstrapp = document.getElementById("bootstrap-pct");
bootstrapp.textContent = `${vbootstrap_pct}%`;

const reactjs = document.getElementById("reactjs-bar");
reactjs.style.width = `${vreactjs_pct}%`;
reactjs.style.height = "100%";
const reactjsp = document.getElementById("reactjs-pct");
reactjsp.textContent = `${vreactjs_pct}%`;

const sql = document.getElementById("sql-bar");
sql.style.width = `${vsql_pct}%`;
sql.style.height = "100%";
const sqlp = document.getElementById("sql-pct");
sqlp.textContent = `${vsql_pct}%`;

const excel = document.getElementById("excel-bar");
excel.style.width = `${vexcel_pct}%`;
excel.style.height = "100%";
const excelp = document.getElementById("excel-pct");
excelp.textContent = `${vexcel_pct}%`;

const pbi = document.getElementById("pbi-bar");
pbi.style.width = `${vpbi_pct}%`;
pbi.style.height = "100%";
const pbip = document.getElementById("pbi-pct");
pbip.textContent = `${vpbi_pct}%`;

// /CONHECIMENTOS