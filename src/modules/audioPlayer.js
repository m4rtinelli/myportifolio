/* playHandler.js --------------------------------------------------- */
import * as THREE from "three"; // só para AudioLoader

export class PlayHandler {
  /**
   * @param {THREE.PositionalAudio} player  – o alto‑falante 3D
   * @param {Object[]} playlist             – [{name,url}, …]
   * @param {number} defaultVolume          – 0‑1
   */
  constructor(player, playlist, defaultVolume = 1) {
    this.player = player;
    this.playlist = playlist;
    this.current = 0;
    this.muted = false;

    // Fonte externa ativa (um mix do SoundCloud). Enquanto existe, a barra
    // controla ela em vez do audio da cena: os botoes sao os mesmos, so o
    // destino muda. O estado de play vem por updateExternal, porque o widget
    // do SoundCloud responde por eventos e nao por leitura sincrona.
    this.external = null;
    this.externalPlaying = false;
    this.DEFAULT_VOLUME = defaultVolume;

    this.cache = {};
    this.loader = new THREE.AudioLoader();
    this.$root = document.querySelector(".player-controls");
    this.$play = document.getElementById("playToggle");
    this.$prev = document.getElementById("prevTrack");
    this.$next = document.getElementById("nextTrack");
    this.$mute = document.getElementById("muteToggle");
    this.$name = document.getElementById("trackName");

    // prev/next não fazem sentido com uma faixa só
    if (this.playlist.length < 2) {
      this.$prev?.setAttribute("hidden", "");
      this.$next?.setAttribute("hidden", "");
    }

    this._attachEvents(); // liga botões/teclas
    this._load(this.current); // toca a 1ª faixa
  }

  /* ----------------- API pública se você quiser chamar de fora ----- */
  next() {
    this._switch(+1);
  }

  prev() {
    this._switch(-1);
  }

  play() {
    if (this.external) {
      this.external.play();
      return; // o widget confirma pelo evento PLAY, via updateExternal
    }

    if (!this.player.buffer || this.player.isPlaying) return;
    this.player.play();
    this._syncPlayButton();
  }

  pause() {
    if (this.external) {
      this.external.pause();
      return;
    }

    if (!this.player.isPlaying) return;
    this.player.pause();
    this._syncPlayButton();
  }

  togglePlay() {
    if (this._isPlaying()) this.pause();
    else this.play();
  }

  toggleMute() {
    this.muted = !this.muted;
    // Silencia os dois: o M tem que calar tudo, nao so a fonte ativa.
    this.player.setVolume(this.muted ? 0 : this.DEFAULT_VOLUME);
    this.external?.setMuted(this.muted);
    if (this.$mute) {
      this.$mute.textContent = this.muted ? "🔇" : "🔊";
      this.$mute.setAttribute("aria-pressed", String(this.muted));
    }
  }

  /**
   * Passa o comando da barra para um mix. O audio da cena para aqui, e nao
   * por this.pause(), que a esta altura ja apontaria para a fonte externa.
   *
   * @param {{name: string, play: Function, pause: Function, setMuted: Function}} source
   */
  attachExternal(source) {
    if (this.player.isPlaying) this.player.pause();

    this.external = source;
    this.externalPlaying = true;
    source.setMuted(this.muted);

    this._setStatus(source.name);
    this._syncPlayButton();
  }

  /* O widget avisa quando toca ou pausa por conta propria (pelos controles
     dele), para o botao da barra nao ficar mostrando o estado errado. */
  updateExternal(isPlaying) {
    if (!this.external) return;
    this.externalPlaying = isPlaying;
    this._syncPlayButton();
  }

  /* Devolve o comando para a faixa da cena, parada: quem apertar play em
     seguida volta a ouvir a musica do ambiente. */
  detachExternal() {
    if (!this.external) return;

    this.external = null;
    this.externalPlaying = false;

    this._setStatus(this.playlist[this.current].name);
    this._syncPlayButton();
  }

  /* ----------------- Interno -------------------------------------- */
  _attachEvents() {
    this.$play?.addEventListener("click", () => this.togglePlay());
    this.$prev?.addEventListener("click", () => this.prev());
    this.$next?.addEventListener("click", () => this.next());
    this.$mute?.addEventListener("click", () => this.toggleMute());

    // As setas movem a câmera (ver firstPersonControls), então aqui
    // só escutamos teclas que não conflitam com o movimento.
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") this.toggleMute();
    });
  }

  _switch(dir) {
    // Trocar de faixa da cena tira o mix do ar; deixar os dois tocando
    // juntos seria o unico jeito de a barra mentir sobre o que esta soando.
    this.external?.pause();
    this.detachExternal();

    this.current =
      (this.current + dir + this.playlist.length) % this.playlist.length;
    this._load(this.current);
  }

  _isPlaying() {
    return this.external ? this.externalPlaying : this.player.isPlaying;
  }

  _setStatus(text) {
    if (this.$name) this.$name.textContent = text;
  }

  _syncPlayButton() {
    if (!this.$play) return;
    const playing = this._isPlaying();
    this.$play.textContent = playing ? "⏸" : "▶";
    this.$play.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.$root?.classList.toggle("is-playing", playing);
  }

  _load(idx) {
    const { name, url } = this.playlist[idx];

    const play = (buffer) => {
      if (this.player.isPlaying) this.player.stop();
      this.player.setBuffer(buffer);
      this.player.setLoop(true);
      this.player.setVolume(this.muted ? 0 : this.DEFAULT_VOLUME);
      this.player.play();
      this._setStatus(name);
      this._syncPlayButton();
    };

    if (this.cache[url]) {
      play(this.cache[url]);
      return;
    }

    this._setStatus(`loading ${name}…`);
    this.loader.load(
      url,
      (buf) => {
        this.cache[url] = buf;
        play(buf);
      },
      undefined,
      () => {
        this._setStatus(`unavailable — ${name}`);
        this._syncPlayButton();
      }
    );
  }
}
