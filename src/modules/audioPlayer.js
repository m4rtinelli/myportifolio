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
    this.$prev = document.getElementById("prevTrack");
    this.$next = document.getElementById("nextTrack");
    this.$mute = document.getElementById("muteToggle");
    this.$name = document.getElementById("trackName");

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
  toggleMute() {
    this.$mute?.click();
  }

  /* ----------------- Interno -------------------------------------- */
  _attachEvents() {
    this.$prev?.addEventListener("click", () => this.prev());
    this.$next?.addEventListener("click", () => this.next());
    this.$mute?.addEventListener("click", () => {
      this.muted = !this.muted;
      if (this.player)
        this.player.setVolume(this.muted ? 0 : this.DEFAULT_VOLUME);
      this.$mute.textContent = this.muted ? "🔇" : "🔊";
      this.$mute.setAttribute("aria-pressed", this.muted);
    });

    document.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft") this.prev();
      if (e.code === "ArrowRight") this.next();
      if (e.code === "KeyM") this.toggleMute();
    });
  }

  _switch(dir) {
    this.current =
      (this.current + dir + this.playlist.length) % this.playlist.length;
    this._load(this.current);
  }

  _load(idx) {
    const { name, url } = this.playlist[idx];
    const play = (buffer) => {
      if (this.player.isPlaying) this.player.stop();
      this.player.setBuffer(buffer);
      this.player.setLoop(true);
      this.player.setVolume(this.muted ? 0 : this.DEFAULT_VOLUME);
      this.player.play();
      if (this.$name) this.$name.textContent = name;
    };

    if (this.cache[url]) {
      play(this.cache[url]);
    } else {
      this.loader.load(url, (buf) => {
        this.cache[url] = buf;
        play(buf);
      });
    }
  }
}
