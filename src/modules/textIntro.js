// const welcomeTexts = [
//   "Bem-vindo!",
//   "Welcome!",
//   "¡Bienvenido!",
//   "Bienvenue!",
//   "Willkommen!",
//   "Benvenuto!",
//   "ようこそ!",
//   "欢迎!",
// ];

// let index = 0;
// const welcomeElement = document.getElementById("welcomeText");
// if (welcomeElement) {
//   setInterval(() => {
//     index = (index + 1) % welcomeTexts.length;
//     welcomeElement.textContent = welcomeTexts[index];
//   }, 3000);
// }

const sections = {
  homeBt: document.querySelector(".hero-logo"),
  contactBt: document.querySelector(".contact"),
  infoBt: document.querySelector(".info"),
};

const navItems = document.querySelectorAll(".nav-items p");

function fadeTransition(fromSection, toSection) {
  if (!fromSection || !toSection || fromSection === toSection) return;

  fromSection.classList.remove("fade-in");
  fromSection.classList.add("fade-out");

  fromSection.addEventListener("transitionend", function handler() {
    fromSection.removeEventListener("transitionend", handler);

    toSection.classList.remove("fade-out");
    toSection.classList.add("fade-in");
  });
}

let currentSection = sections.homeBt; // Começa com home

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.getAttribute("id");
    const targetSection = sections[targetId];

    fadeTransition(currentSection, targetSection);
    currentSection = targetSection;
  });
});
