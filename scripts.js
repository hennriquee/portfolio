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

// CONHECIMENTOS

const valores = {
  "html-bar": 80,
  "css-bar": 50,
  "js-bar": 10,
  "bootstrap-bar": 50,
  "reactjs-bar": 5,
  "sql-bar": 25,
  "pbi-bar": 80,
  "excel-bar": 90,
};

const buttons = document.querySelectorAll(".btn");

buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    const container = e.target.closest(".skills-container");
    container.classList.toggle("flip");

    if (container.classList.contains("flip")) {
      container.querySelectorAll(".bar-inner").forEach((element) => {
        const id = element.id;
        const destino = valores[id];

        element.style.transition = `transform ${destino * 0.025}s ease`;
        element.style.transform = `scaleX(${destino / 100})`;

        const textoPct = document.getElementById(id.replace("bar", "pct"));
        let contador = 0;

        const intervalo = setInterval(() => {
          if (contador >= destino) {
            clearInterval(intervalo);
          } else {
            contador++;
            textoPct.textContent = contador + "%";
          }
        }, 20);
      });
    } else {
      container.querySelectorAll(".bar-inner").forEach((element) => {
        element.style.transform = "scaleX(0)";
        element.style.transition = `transform ${
          valores[element.id] * 0.025
        }s ease`;
      });
    }
  });
});

// /CONHECIMENTOS

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
