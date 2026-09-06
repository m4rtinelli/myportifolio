import { projects, isImage } from "./projects.js";

const wrapper = document.getElementById("galleryWrapper");

/*
 * Fixa a proporção real assim que o arquivo se descreve, para a grade não
 * pular conforme cada card carrega. Vídeo avisa em loadedmetadata, imagem
 * em load — daí o evento vir de fora.
 */
function lockAspectRatio(element, event, getSize) {
  element.addEventListener(event, () => {
    const [w, h] = getSize();
    if (w && h) element.style.aspectRatio = `${w} / ${h}`;
  });
}

/**
 * A prévia do card é o primeiro item de media, que pode ser vídeo ou imagem.
 * Projetos ainda sem arquivo (media: []) recebem um bloco vazio no lugar,
 * para o card não virar um <video src="undefined">.
 */
function buildPreview(project) {
  const [first] = project.media;

  if (!first) {
    const placeholder = document.createElement("div");
    placeholder.className = "video-gallery video-placeholder";
    placeholder.textContent = "Coming soon";
    return placeholder;
  }

  if (isImage(first)) {
    const image = document.createElement("img");
    image.className = "video-gallery";
    image.src = encodeURI(first);
    image.loading = "lazy";
    image.decoding = "async";
    // Decorativa: o título do projeto logo abaixo já nomeia o card.
    image.alt = "";
    lockAspectRatio(image, "load", () => [
      image.naturalWidth,
      image.naturalHeight,
    ]);
    return image;
  }

  const video = document.createElement("video");
  video.className = "video-gallery";
  video.src = encodeURI(first);
  video.preload = "metadata";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("aria-hidden", "true");
  lockAspectRatio(video, "loadedmetadata", () => [
    video.videoWidth,
    video.videoHeight,
  ]);

  return video;
}

/**
 * Monta um card. O card inteiro é um link para a página do projeto, então o
 * vídeo aqui é só uma prévia: sem `controls`, senão clicar na barra do player
 * navegaria em vez de controlar o vídeo.
 */
function buildCard(project) {
  const item = document.createElement("li");
  item.className = "gallery-item";

  const link = document.createElement("a");
  link.className = "gallery-link";
  link.href = `./project/?id=${encodeURIComponent(project.id)}`;

  const info = document.createElement("div");
  info.className = "card-info";

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = project.title;

  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = project.role || project.tools || "In progress";

  info.append(title, meta);

  link.append(buildPreview(project), info);
  item.append(link);
  return item;
}

wrapper.append(...projects.map(buildCard));

/**
 * Só toca o que está na tela.
 *
 * Os vídeos usam preload="metadata": o browser baixa só o cabeçalho para
 * saber as dimensões, e o arquivo em si só é transmitido no play. Dar
 * autoplay em todos de uma vez fazia a página baixar centenas de MB.
 */
const playObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {
          /* o browser pode recusar; o card continua funcionando como link */
        });
      } else if (!video.paused) {
        video.pause();
      }
    });
  },
  { rootMargin: "200px 0px", threshold: 0.25 }
);

// querySelectorAll pega só <video>, então placeholder e imagem ficam de fora.
wrapper
  .querySelectorAll("video.video-gallery")
  .forEach((video) => playObserver.observe(video));
