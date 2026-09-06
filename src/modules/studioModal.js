import { studio } from "./studio.js";

/**
 * Monta o modal do estúdio a partir de studio.js.
 *
 * Layout em duas colunas: foto à esquerda, texto e lista de equipamentos à
 * direita. Em tela estreita as duas viram uma coluna só (ver motionpage do
 * style.css: .studio-layout).
 *
 * Mesma regra dos outros modais: a foto fica em data-src e só vira rede na
 * primeira abertura, para não disputar banda com o .glb durante o load.
 */
export class StudioPanel {
  constructor(container) {
    this.$container = container;
    this.$photo = null;
    this.opened = false;

    if (!this.$container) return;

    const layout = document.createElement("div");
    layout.className = "studio-layout";
    layout.append(this._buildMedia(), this._buildBody());

    this.$container.append(layout);
  }

  /* ---------- coluna da esquerda ---------- */

  _buildMedia() {
    const column = document.createElement("div");
    column.className = "studio-media";

    // Sem foto ainda: um bloco de espera, e não um <img src=""> quebrado.
    if (!studio.photo) {
      const placeholder = document.createElement("div");
      placeholder.className = "studio-photo studio-photo-empty";
      placeholder.textContent = "Photo coming soon";
      column.append(placeholder);
      return column;
    }

    const figure = document.createElement("figure");
    figure.className = "studio-figure";

    const photo = document.createElement("img");
    photo.className = "studio-photo";
    photo.dataset.src = studio.photo;
    photo.loading = "lazy";
    photo.decoding = "async";
    // Decorativa: a legenda e o texto ao lado já dizem o que é.
    photo.alt = "";
    this.$photo = photo;

    figure.append(photo);

    if (studio.photoCaption) {
      const caption = document.createElement("figcaption");
      caption.className = "studio-caption";
      caption.textContent = studio.photoCaption;
      figure.append(caption);
    }

    column.append(figure);
    return column;
  }

  /* ---------- coluna da direita ---------- */

  _buildBody() {
    const column = document.createElement("div");
    column.className = "studio-body";

    this._buildIntro().forEach((paragraph) => column.append(paragraph));
    column.append(this._buildGear());

    return column;
  }

  /* Aceita string ou array de strings, para o texto poder virar vários
     parágrafos sem precisar mexer aqui depois. */
  _buildIntro() {
    const source = Array.isArray(studio.intro) ? studio.intro : [studio.intro];

    return source
      .filter((text) => text && text.trim())
      .map((text) => {
        const paragraph = document.createElement("p");
        paragraph.className = "studio-intro";
        paragraph.textContent = text;
        return paragraph;
      });
  }

  _buildGear() {
    const section = document.createElement("div");
    section.className = "studio-gear-block";

    const heading = document.createElement("h2");
    heading.className = "studio-gear-title";
    heading.textContent = "Equipment";
    section.append(heading);

    const list = document.createElement("ul");
    list.className = "studio-gear";

    studio.equipment.forEach(({ name, note }) => {
      const item = document.createElement("li");

      const label = document.createElement("span");
      label.className = "studio-gear-name";
      label.textContent = name;
      item.append(label);

      // A nota é opcional: sem ela o item fica só com o nome.
      if (note) {
        const detail = document.createElement("span");
        detail.className = "studio-gear-note";
        detail.textContent = note;
        item.append(detail);
      }

      list.append(item);
    });

    section.append(list);

    // Nota de rodape da lista (ex. o que foi emprestado).
    if (studio.equipmentFootnote) {
      const footnote = document.createElement("p");
      footnote.className = "studio-gear-footnote";
      footnote.textContent = studio.equipmentFootnote;
      section.append(footnote);
    }

    return section;
  }

  open() {
    if (this.opened) return;
    this.opened = true;

    if (this.$photo?.dataset.src) {
      this.$photo.src = this.$photo.dataset.src;
      delete this.$photo.dataset.src;
    }
  }
}
