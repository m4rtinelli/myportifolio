import gsap from "gsap";
const colors = ["#FF9E30", "#00FF00", "#FF0000", "#007BFF"]; // Amarelo, verde, vermelho, azul

function wrapLetters(el) {
  const text = el.textContent;
  el.innerHTML = "";
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.display = "inline-block";
    span.style.transition = "color 0.3s ease";
    el.appendChild(span);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const all = document.querySelectorAll("body *:not(nav):not(nav *)");
  const textElements = [];

  all.forEach((el) => {
    if (el.children.length === 0 && el.textContent.trim() !== "") {
      textElements.push(el);
    }
  });

  textElements.forEach((el) => {
    wrapLetters(el);
    const spans = el.querySelectorAll("span");

    spans.forEach((span, i) => {
      span.addEventListener("mouseenter", () => {
        const color = colors[i % colors.length];
        gsap.to(span, {
          color: color,
          duration: 0.01,
          ease: "power1.out",
        });
      });

      span.addEventListener("mouseleave", () => {
        gsap.to(span, {
          color: "",
          duration: 0.2,
          ease: "power1.out",
        });
      });
    });
  });
});
