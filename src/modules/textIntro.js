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
if (welcomeElement) {
  setInterval(() => {
    index = (index + 1) % welcomeTexts.length;
    welcomeElement.textContent = welcomeTexts[index];
  }, 3000);
}

const navItems = document.querySelectorAll(".nav-items p");
const homeBt = document.getElementById("homeBt");
const heroLogo = document.querySelector(".hero-logo");
const contactSct = document.querySelector(".contact");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.getAttribute("id") === "contactBt") {
      heroLogo.classList.remove("fade-in");
      heroLogo.classList.add("fade-out");

      heroLogo.addEventListener("transitionend", function handler() {
        heroLogo.removeEventListener("transitionend", handler);

        contactSct.classList.remove("fade-out");
        contactSct.classList.add("fade-in");
      });
    }
    if (item.getAttribute("id") === "homeBt") {
      contactSct.classList.add("fade-out");
      contactSct.classList.remove("fade-in");

      contactSct.addEventListener("transitionend", function handler() {
        contactSct.removeEventListener("transitionend", handler);

        heroLogo.classList.remove("fade-out");
        heroLogo.classList.add("fade-in");
      });
    }
  });
});
