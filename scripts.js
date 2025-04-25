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

// FLIP CARD SKILLS

const buttons = document.querySelectorAll(".btn");

buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    const container = e.target.closest(".skills-container");
    container.classList.toggle("flip");
  });
});

// /FLIP CARD SKILLS

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
    var telefone = document.getElementById("telefone").value.trim();
    var telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;

    // Só valida o formato se o campo não estiver vazio
    if (telefone !== "(" && telefone !== "" && !telefoneRegex.test(telefone)) {
      alert(
        "Por favor, insira um número de telefone válido no formato (xx) xxxxx-xxxx."
      );
      event.preventDefault(); // Evita o envio do formulário
    }
  });
