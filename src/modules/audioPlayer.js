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
    if (!this.player.buffer || this.player.isPlaying) return;
    this.player.play();
    this._syncPlayButton();
  }

  pause() {
    if (!this.player.isPlaying) return;
    this.player.pause();
    this._syncPlayButton();
  }

  togglePlay() {
    if (this.player.isPlaying) this.pause();
    else this.play();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.player.setVolume(this.muted ? 0 : this.DEFAULT_VOLUME);
    if (this.$mute) {
      this.$mute.textContent = this.muted ? "🔇" : "🔊";
      this.$mute.setAttribute("aria-pressed", String(this.muted));
    }
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
    this.current =
      (this.current + dir + this.playlist.length) % this.playlist.length;
    this._load(this.current);
  }

  _setStatus(text) {
    if (this.$name) this.$name.textContent = text;
  }

  _syncPlayButton() {
    if (!this.$play) return;
    const playing = this.player.isPlaying;
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
