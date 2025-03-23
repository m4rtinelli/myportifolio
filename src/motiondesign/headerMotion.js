const omrButton = document.getElementById("omr");
const othersButton = document.getElementById("others");

const galleryWrapperOMR = document.querySelector(".gallery-wrapper");
const galleryWrapperOthers = document.querySelector(".gallery-wrapper-others");

const hoverOverlay = document.querySelectorAll(".hover-overlay");
const galleryWrapper = document.querySelectorAll(".gallery-item");

omrButton.addEventListener("click", function () {
  // Atualiza as classes dos botões (opcional, se quiser manter o visual de seleção)
  omrButton.classList.add("header-selected");
  othersButton.classList.remove("header-selected");

  // Mostra a seção de outermost records e esconde a de other projects
  galleryWrapperOMR.classList.remove("hidden");
  galleryWrapperOthers.classList.add("hidden");

  // (Opcional) Se quiser adicionar a animação de crescimento:
  galleryWrapperOMR.classList.remove("animate-grow");
  void galleryWrapperOMR.offsetWidth; // Força o reflow
  galleryWrapperOMR.classList.add("animate-grow");
});

othersButton.addEventListener("click", function () {
  // Atualiza as classes dos botões
  othersButton.classList.add("header-selected");
  omrButton.classList.remove("header-selected");

  // Mostra a seção de other projects e esconde a de outermost records
  galleryWrapperOthers.classList.remove("hidden");
  galleryWrapperOMR.classList.add("hidden");

  // (Opcional) Adiciona a animação para a seção que aparece
  galleryWrapperOthers.classList.remove("animate-grow");
  void galleryWrapperOthers.offsetWidth; // Força o reflow
  galleryWrapperOthers.classList.add("animate-grow");
});

galleryWrapper.forEach((item) => {
  item.addEventListener("mouseenter", function () {
    const overlay = item.querySelector(".hover-overlay");
    if (overlay) {
      overlay.classList.remove("nv");
      overlay.classList.add("animate");
    }
  });

  item.addEventListener("mouseleave", function () {
    const overlay = item.querySelector(".hover-overlay");
    if (overlay) {
      overlay.classList.add("nv");
      overlay.classList.remove("animate");
    }
  });
});
