import { albums, COVER_SIZE } from "./albums.js";

/**
 * Monta as linhas do modal de discografia a partir de albums.js.
 *
 * As capas somam alguns MB e o modal começa fechado, então o src fica
 * guardado em data-src e só vira rede na primeira vez que alguém aperta F
 * na estante. `loading="lazy"` sozinho não resolveria: o modal é
 * position:fixed com visibility:hidden, ou seja, está dentro da viewport
 * para efeito de lazy loading e o browser baixaria tudo mesmo assim —
 * concorrendo com o download do .glb, que é o que trava a entrada na cena.
 */
export class AlbumShelf {
  constructor() {
    this.opened = false;
    this.$covers = [];

    albums.forEach((album) => {
      const container = document.getElementById(album.tab);
      if (!container) return; // aba removida do HTML: ignora em vez de quebrar
      container.append(this._buildRow(album));
    });
  }

  _buildRow(album) {
    const wrapper = document.createElement("div");
    wrapper.className = "album-wrapper";

    const content = document.createElement("div");
    content.className = "album-content";

    const cover = document.createElement("img");
    cover.dataset.src = album.cover;
    cover.width = COVER_SIZE;
    cover.height = COVER_SIZE;
    cover.loading = "lazy";
    cover.decoding = "async";
    // Decorativa: o título aparece escrito logo ao lado, e repetir o nome
    // faria o leitor de tela dizer o mesmo álbum duas vezes.
    cover.alt = "";

    const info = document.createElement("div");
    info.className = "album-info";

    [
      ["Title", album.title],
      ["Label", album.label],
      ["Year", album.year],
      ["Style", album.style],
    ]
      .filter(([, value]) => value)
      .forEach(([label, value]) => {
        const line = document.createElement("span");
        const sub = document.createElement("span");
        sub.className = "info-sub";
        sub.textContent = `${label}: `;
        line.append(sub, value);
        info.append(line);
      });

    content.append(cover, info);

    const purchase = document.createElement("div");
    purchase.className = "purchase-button";

    const link = document.createElement("a");
    link.href = album.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Purchase";

    purchase.append(link);
    wrapper.append(content, purchase);

    this.$covers.push(cover);
    return wrapper;
  }

  /* Primeira abertura do modal: libera o download das capas. */
  open() {
    if (this.opened) return;
    this.opened = true;

    this.$covers.forEach((cover) => {
      cover.src = cover.dataset.src;
      delete cover.dataset.src;
    });
  }
}
