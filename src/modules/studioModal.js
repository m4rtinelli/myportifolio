import { studio } from "./studio.js";

/**
 * Monta o modal do estúdio a partir de studio.js.
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

    this.$container.append(this._buildPhoto(), this._buildText());
  }

  _buildPhoto() {
    // Sem foto ainda: um bloco de espera, e não um <img src=""> quebrado.
    if (!studio.photo) {
      const placeholder = document.createElement("div");
      placeholder.className = "studio-photo studio-photo-empty";
      placeholder.textContent = "Photo coming soon";
      return placeholder;
    }

    const figure = document.createElement("figure");
    figure.className = "studio-figure";

    const photo = document.createElement("img");
    photo.className = "studio-photo";
    photo.dataset.src = studio.photo;
    photo.loading = "lazy";
    photo.decoding = "async";
    photo.alt = "";
    this.$photo = photo;

    figure.append(photo);

    if (studio.photoCaption) {
      const caption = document.createElement("figcaption");
      caption.className = "studio-caption";
      caption.textContent = studio.photoCaption;
      figure.append(caption);
    }

    return figure;
  }

  _buildText() {
    const wrapper = document.createElement("div");
    wrapper.className = "studio-body";

    if (studio.intro) {
      const intro = document.createElement("p");
      intro.className = "studio-intro";
      intro.textContent = studio.intro;
      wrapper.append(intro);
    }

    const list = document.createElement("dl");
    list.className = "studio-gear";

    studio.equipment.forEach(({ name, note }) => {
      const term = document.createElement("dt");
      term.textContent = name;
      list.append(term);

      if (!note) return;
      const detail = document.createElement("dd");
      detail.textContent = note;
      list.append(detail);
    });

    wrapper.append(list);
    return wrapper;
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
