/**
 * Modal do "Press F to hear my sets".
 *
 * Fonte única dos mixes: para publicar um set novo basta acrescentar um
 * objeto em `sets` — a linha e o player são montados a partir daqui.
 *
 * `host` e `year` são opcionais; vazios, a linha some em vez de mostrar um
 * rótulo sem valor (mesma regra da página de motion design).
 */
export const sets = [
  {
    title: "406: Martinelli",
    host: "Troally",
    year: "2025",
    url: "https://soundcloud.com/troally/406-martinelli",
  },
  {
    title: "Strange But Dance Music #192",
    host: "Strange But Dance Music",
    year: "2025",
    url: "https://soundcloud.com/strangebutdancemusic/strange-but-dance-music-192-martinelli",
  },
  {
    title: "Live Recorded — Shadow at Nin92wo Festival",
    host: "Nin92wo",
    year: "2024",
    url: "https://soundcloud.com/nin92wo/live-recorded-shadow-at-4",
  },
  {
    title: "Under Division Podcast #17",
    host: "Under Division",
    year: "2020",
    url: "https://soundcloud.com/under-division/under-division-podcast-17-martinelli",
  },
];

const WIDGET_API = "https://w.soundcloud.com/player/api.js";

/*
 * O widget aceita o permalink direto; não é preciso resolver o ID numérico
 * da faixa antes. URLSearchParams cuida de escapar a URL e o "#" da cor.
 */
function widgetSrc(url) {
  const params = new URLSearchParams({
    url,
    color: "#a61d1d",
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "false",
  });

  return `https://w.soundcloud.com/player/?${params}`;
}

/* Carrega a API do widget uma vez só, e só quando alguém abre o modal. */
let widgetApiPromise;

function loadWidgetApi() {
  widgetApiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET_API;
    script.addEventListener("load", resolve);
    script.addEventListener("error", reject);
    document.head.append(script);
  });

  return widgetApiPromise;
}

export class SetsShelf {
  /**
   * @param {HTMLElement} container – onde as linhas são inseridas
   * @param {object} handlers
   * @param {(source) => void} handlers.onPlay   – um set assumiu o áudio
   * @param {() => void} handlers.onPause        – o set ativo pausou
   * @param {() => void} handlers.onFinish       – o set ativo acabou
   */
  constructor(container, { onPlay, onPause, onFinish } = {}) {
    this.$container = container;
    this.onPlay = onPlay ?? (() => {});
    this.onPause = onPause ?? (() => {});
    this.onFinish = onFinish ?? (() => {});
    this.widgets = [];
    // Qual widget manda no momento. Pausar os outros dispara PAUSE neles
    // também, então sem esse guarda a barra receberia o estado do errado.
    this.active = null;
    this.opened = false;

    this.$container.append(...sets.map((set) => this._buildRow(set)));
  }

  _buildRow(set) {
    const row = document.createElement("div");
    row.className = "set-wrapper";

    const info = document.createElement("div");
    info.className = "set-info";

    [
      ["Set", set.title],
      ["For", set.host],
      ["Year", set.year],
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

    // src fica em data-src: o iframe só vira rede quando o modal abre.
    const frame = document.createElement("iframe");
    frame.className = "set-player";
    frame.dataset.src = widgetSrc(set.url);
    frame.title = set.title;
    frame.allow = "autoplay";
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("frameborder", "no");

    row.append(info, frame);
    return row;
  }

  /**
   * Primeira abertura do modal: liga os iframes e sincroniza os players.
   * As vezes seguintes não fazem nada — o estado dos widgets é preservado.
   */
  async open() {
    if (this.opened) return;
    this.opened = true;

    const frames = [...this.$container.querySelectorAll("iframe[data-src]")];
    frames.forEach((frame) => {
      frame.src = frame.dataset.src;
      delete frame.dataset.src;
    });

    // Sem a API os players continuam funcionando sozinhos; o que se perde
    // é só a sincronia entre eles e com o som da cena.
    try {
      await loadWidgetApi();
    } catch {
      return;
    }

    const { Widget } = window.SC;
    this.widgets = frames.map((frame) => Widget(frame));

    this.widgets.forEach((widget, index) => {
      const set = sets[index];

      widget.bind(Widget.Events.PLAY, () => {
        this.active = widget;

        // Um set por vez: dois mixes tocando juntos vira ruído.
        this.widgets
          .filter((other) => other !== widget)
          .forEach((other) => other.pause());

        this.onPlay(this._sourceFor(widget, set));
      });

      widget.bind(Widget.Events.PAUSE, () => {
        if (this.active === widget) this.onPause();
      });

      widget.bind(Widget.Events.FINISH, () => {
        if (this.active !== widget) return;
        this.active = null;
        this.onFinish();
      });
    });
  }

  /* O contrato que a barra de player espera. setVolume do widget vai de
     0 a 100, ao contrário do THREE.Audio, que vai de 0 a 1. */
  _sourceFor(widget, set) {
    return {
      name: set.title,
      play: () => widget.play(),
      pause: () => widget.pause(),
      setMuted: (muted) => widget.setVolume(muted ? 0 : 100),
    };
  }

  pauseAll() {
    this.widgets.forEach((widget) => widget.pause());
  }
}
