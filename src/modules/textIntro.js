const welcomeTexts = [
  "Bem-vindo!",
  "Welcome!",
  "¡Bienvenido!",
  "Bienvenue!",
  "Willkommen!",
  "Benvenuto!",
  "ようこそ!",
  "欢迎!",
];

let index = 0;
const welcomeElement = document.getElementById("welcomeText");

setInterval(() => {
  index = (index + 1) % welcomeTexts.length;
  welcomeElement.textContent = welcomeTexts[index];
}, 3000);
