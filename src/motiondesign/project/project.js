import { projects, findProject, isImage } from "../projects.js";

/**
 * Só toca o que está na tela — os arquivos passam de 60 MB cada, então
 * nada é transmitido antes de aparecer.
 */
const playObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {
          /* o browser pode recusar; os controles continuam disponíveis */
        });
      } else if (!video.paused) {
        video.pause();
      }
    });
  },
  { rootMargin: "200px 0px", threshold: 0.25 }
);

/* Campos ainda não preenchidos em projects.js ficam vazios: a linha inteira
   é omitida em vez de mostrar um rótulo sem valor. */
function renderMeta(project) {
  const rows = [
    ["Client", project.client],
    ["Year", project.year],
    ["Role", project.role],
    ["Tools", project.tools],
  ].filter(([, value]) => value);

  const $meta = document.getElementById("projectMeta");

  rows.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    $meta.append(dt, dd);
  });
}

function renderDescription(project) {
  if (!project.description) return;
  const $description = document.getElementById("projectDescription");
  $description.textContent = project.description;
  $description.hidden = false;
}

/*
 * A largura máxima acompanha a orientação do arquivo (ver motionpage.css):
 * um vertical na mesma coluna de um 16:9 vira uma torre de mais de 1000px.
 * Vale igual para vídeo e imagem, só muda de onde sai a medida.
 */
function applyOrientation(element, w, h) {
  if (!w || !h) return;

  element.style.aspectRatio = `${w} / ${h}`;

  const ratio = w / h;
  if (ratio < 0.95) element.classList.add("is-portrait");
  else if (ratio < 1.3) element.classList.add("is-square");
}

function buildImage(src) {
  const image = document.createElement("img");
  image.className = "project-video";
  image.src = encodeURI(src);
  image.loading = "lazy";
  image.decoding = "async";
  // Decorativa: o título e a descrição do projeto já dão o contexto.
  image.alt = "";

  image.addEventListener("load", () =>
    applyOrientation(image, image.naturalWidth, image.naturalHeight)
  );

  return image;
}

function buildVideo(src, { autoplay }) {
  const video = document.createElement("video");
  video.className = "project-video";
  video.src = encodeURI(src);
  video.preload = "metadata";
  video.controls = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "");

  video.addEventListener("loadedmetadata", () =>
    applyOrientation(video, video.videoWidth, video.videoHeight)
  );

  // Só o primeiro vídeo toca sozinho ao entrar na tela. Os demais esperam o
  // clique, senão abrir o Outermost Records baixaria os sete de uma vez.
  if (autoplay) playObserver.observe(video);

  return video;
}

function renderMedia(project) {
  const $videos = document.getElementById("projectVideos");

  // Projeto ainda sem arquivo: mostra um bloco vazio em vez de nada.
  if (!project.media.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "project-video video-placeholder";
    placeholder.textContent = "Coming soon";
    $videos.append(placeholder);
    return;
  }

  // Conta só os vídeos: se o projeto abre com imagens, o autoplay ainda vai
  // para o primeiro vídeo da página em vez de se perder.
  let videoCount = 0;

  project.media.forEach((src) => {
    if (isImage(src)) {
      $videos.append(buildImage(src));
      return;
    }

    $videos.append(buildVideo(src, { autoplay: videoCount === 0 }));
    videoCount += 1;
  });
}

function buildNavLink(label, target) {
  const link = document.createElement("a");
  link.className = "project-nav-link";
  link.href = `./?id=${encodeURIComponent(target.id)}`;

  const kicker = document.createElement("span");
  kicker.className = "project-nav-label";
  kicker.textContent = label;

  const title = document.createElement("span");
  title.className = "project-nav-title";
  title.textContent = target.title;

  link.append(kicker, title);
  return link;
}

/* Anterior/próximo dão a volta na lista, então nunca há um beco sem saída. */
function renderNav(project) {
  const index = projects.indexOf(project);
  const previous = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  document
    .getElementById("projectNav")
    .append(buildNavLink("Previous", previous), buildNavLink("Next", next));
}

function render(project) {
  document.title = `${project.title} — Motion Design`;
  document.getElementById("projectBreadcrumb").textContent = project.title;
  document.getElementById("projectTitle").textContent = project.title;

  renderMeta(project);
  renderDescription(project);
  renderMedia(project);
  renderNav(project);
}

const id = new URLSearchParams(window.location.search).get("id");
const project = id ? findProject(id) : undefined;

if (project) {
  render(project);
  document.getElementById("project").hidden = false;
} else {
  document.getElementById("projectMissing").hidden = false;
}
