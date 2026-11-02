/*
 * Informações de contato usadas pelo site.
 * Altere aqui para atualizar todos os botões de uma vez.
 */
export const CONFIG = {
  whatsapp: {
    number: "5534996560351",
    message: "Olá, Bruno! Vi seu portfólio e gostaria de conversar com você.",
  },
  // Separado em partes para dificultar a coleta automática por robôs de spam.
  email: { user: "brunohms2705", domain: "gmail.com" },
  // Endpoint da função serverless que envia o e-mail (pasta /api).
  contactEndpoint: "/api/contact",
};

export const emailAddress = () => `${CONFIG.email.user}@${CONFIG.email.domain}`;

export const whatsappUrl = (message = CONFIG.whatsapp.message) =>
  `https://wa.me/${CONFIG.whatsapp.number}?text=${encodeURIComponent(message)}`;
