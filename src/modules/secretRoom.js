import * as THREE from "three";
import { projects, isImage } from "../motiondesign/projects.js";

/**
 * A sala secreta: uma galeria quadrada onde cada trabalho de motion design
 * vira um quadro na parede.
 *
 * É construída em código, não importada de um .glb: são seis planos e umas
 * molduras, e assim a lista de obras acompanha o projects.js sozinha —
 * publicar um trabalho novo na página de motion design pendura ele aqui
 * também, sem reexportar nada do Blender.
 */

const WALL_COLOR = 0xe8e4dc;
const FLOOR_COLOR = 0x2b2724;
const CEILING_COLOR = 0xf2efe9;

/* Quantos vídeos podem tocar ao mesmo tempo. Os arquivos passam de 60 MB;
   deixar os quatorze rodando juntos derruba a banda e a placa de vídeo. */
const MAX_ACTIVE = 3;

/* Cor do quadro apagado, antes de a textura chegar. */
const DARK_CANVAS = 0x0a0a0a;

/*
 * A que distância um quadro acorda, como fração do lado da sala.
 *
 * Proporcional, e não um número fixo: com 0.75 dá sempre para acender as
 * obras da parede oposta de qualquer ponto do salão. Quando a sala cresceu
 * de 16 para 20 esse valor era fixo em 7, e o efeito foi a galeria inteira
 * ficar preta — as paredes passaram a estar a ~10 unidades de qualquer
 * lugar, mais longe do que o gatilho alcançava.
 *
 * Quem segura a banda é o MAX_ACTIVE, não esta distância.
 */
const WAKE_RATIO = 0.75;

/* Altura do centro dos quadros, na linha dos olhos (a câmera fica a 1.8). */
const ART_HEIGHT = 2.1;

/*
 * Caixa máxima de uma obra. A moldura encolhe dentro dela conforme a
 * proporção do arquivo, então a largura nunca passa de MAX_ART_WIDTH — é o
 * que garante que o espaçamento calculado em _placeFrame continue válido
 * mesmo com vídeo em pé ao lado de 16:9.
 */
const MAX_ART_WIDTH = 2.6;
const MAX_ART_HEIGHT = 2.0;

/* Quanto a borda sobra para fora da obra, somado em largura e altura. */
const FRAME_MARGIN = 0.16;

/* Enquanto o arquivo não diz o tamanho, a moldura fica em 16:9. */
const DEFAULT_ASPECT = 16 / 9;

/* Uma geometria só para todos os quadros: o que muda é a escala de cada um. */
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

const WALL = { NORTH: 0, SOUTH: 1, WEST: 2, EAST: 3 };

const _scratch = new THREE.Vector3();

/**
 * Um quadro. Nasce apagado e só busca o arquivo quando alguém chega perto —
 * a galeria inteira carregada de uma vez seriam centenas de MB.
 */
class Artwork {
  constructor(mesh, border, project) {
    this.mesh = mesh;
    this.border = border;
    this.project = project;
    this.source = project.media[0] ?? null;
    this.active = false;
    this.texture = null;
    this.video = null;
  }

  /**
   * Redimensiona a moldura para a proporção real do arquivo.
   *
   * A tela e a borda são planos 1x1 e quem dá o tamanho é a escala, então
   * ajustar aqui é mexer em dois Vector3 — nada de refazer geometria. A obra
   * é encaixada dentro de um limite máximo em vez de esticada: os trabalhos
   * vão de reels 2:3 a 16:9, e uma moldura fixa deformava todos menos um.
   *
   * @param {number} aspect – largura / altura
   */
  fit(aspect) {
    const boxAspect = MAX_ART_WIDTH / MAX_ART_HEIGHT;

    const width = aspect >= boxAspect ? MAX_ART_WIDTH : MAX_ART_HEIGHT * aspect;
    const height = aspect >= boxAspect ? MAX_ART_WIDTH / aspect : MAX_ART_HEIGHT;

    this.mesh.scale.set(width, height, 1);
    this.border.scale.set(width + FRAME_MARGIN, height + FRAME_MARGIN, 1);
  }

  activate() {
    if (this.active || !this.source) return;
    this.active = true;

    if (isImage(this.source)) this._activateImage();
    else this._activateVideo();
  }

  /*
   * Tira o preto da cor do material. Roda só quando já existe imagem de
   * verdade para mostrar: acender antes deixaria a moldura branca e vazia
   * enquanto o arquivo não chega.
   *
   * Sem este passo o vídeo carrega, toca e mesmo assim aparece preto — no
   * three.js a cor final é `map * color`, e color quase zero apaga tudo.
   */
  _lightUp() {
    this.mesh.material.map = this.texture;
    this.mesh.material.color.setHex(0xffffff);
    this.mesh.material.needsUpdate = true;
  }

  _activateImage() {
    if (this.texture) return;

    this.texture = new THREE.TextureLoader().load(
      encodeURI(this.source),
      (texture) => {
        this.fit(texture.image.width / texture.image.height);
        this._lightUp();
      }
    );
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  _activateVideo() {
    if (!this.video) {
      const video = document.createElement("video");
      video.src = encodeURI(this.source);
      // "none", e não "metadata": nem o cabeçalho é baixado antes da hora.
      video.preload = "none";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("webkit-playsinline", "");
      this.video = video;

      this.texture = new THREE.VideoTexture(video);
      this.texture.colorSpace = THREE.SRGBColorSpace;

      // O cabeçalho chega antes do primeiro quadro, então a moldura já
      // assume a proporção certa enquanto a imagem ainda está a caminho.
      video.addEventListener(
        "loadedmetadata",
        () => this.fit(video.videoWidth / video.videoHeight),
        { once: true }
      );

      video.addEventListener("loadeddata", () => this._lightUp(), {
        once: true,
      });
    }

    this.video.play().catch((error) => {
      /*
       * Silenciar aqui foi o que escondeu o bug da cor: o quadro ficava
       * preto e não havia como saber se era o vídeo ou o material.
       */
      console.warn(
        `[gallery] "${this.project.id}" nao tocou: ${error?.message ?? error}`
      );
    });
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.video?.pause();
  }

  dispose() {
    this.deactivate();
    this.texture?.dispose();
    if (this.video) this.video.src = "";
  }
}

export class SecretRoom {
  /**
   * @param {object} options
   * @param {number} options.size   - lado da sala, em unidades de mundo
   * @param {number} options.height - pé-direito
   */
  constructor({ size = 20, height = 5 } = {}) {
    this.size = size;
    this.height = height;
    this.wakeDistance = size * WAKE_RATIO;

    this.group = new THREE.Group();
    this.group.name = "SECRET_ROOM";
    this.group.visible = false;

    /* Só a casca entra na colisão: o fpControls faz raycast a cada frame e
       não precisa testar as molduras, só chão e paredes. */
    this.shell = new THREE.Group();
    this.shell.name = "SECRET_ROOM_SHELL";
    this.group.add(this.shell);

    this.artworks = [];

    this._buildShell();
    this._buildLights();
    this._buildArtworks();
    this._buildExit();

    /* Nasce a um passo da porta, olhando para dentro da sala. */
    this.spawn = new THREE.Vector3(0, 1.8, size / 2 - 2.5);
    this.spawnLookAt = new THREE.Vector3(0, 1.8, 0);
  }

  /* ---------- casca ---------- */

  _panel(width, height, color) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 })
    );
  }

  _buildShell() {
    const { size, height } = this;
    const half = size / 2;

    const floor = this._panel(size, size, FLOOR_COLOR);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "secret_floor";
    this.shell.add(floor);

    const ceiling = this._panel(size, size, CEILING_COLOR);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    this.shell.add(ceiling);

    /*
     * As quatro paredes viradas para dentro. A orientação importa: o
     * raycaster respeita material.side, e uma parede de costas para o
     * jogador deixaria ele atravessar como se não existisse.
     */
    [
      [0, [0, height / 2, -half]],
      [Math.PI, [0, height / 2, half]],
      [Math.PI / 2, [-half, height / 2, 0]],
      [-Math.PI / 2, [half, height / 2, 0]],
    ].forEach(([rotation, position], index) => {
      const wall = this._panel(size, height, WALL_COLOR);
      wall.rotation.y = rotation;
      wall.position.set(...position);
      wall.name = `secret_wall_${index}`;
      this.shell.add(wall);
    });
  }

  _buildLights() {
    this.group.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(0, this.height, 0);
    this.group.add(key);

    /* Uma luz por parede, na altura dos quadros, para as obras não ficarem
       chapadas contra o branco. */
    const half = this.size / 2 - 1;
    [
      [0, -half],
      [0, half],
      [-half, 0],
      [half, 0],
    ].forEach(([x, z]) => {
      const light = new THREE.PointLight(0xfff4e2, 12, this.size, 2);
      light.position.set(x, this.height - 1.2, z);
      this.group.add(light);
    });
  }

  /* ---------- obras ---------- */

  /**
   * Distribui as obras em volta da sala.
   *
   * Só entram projetos que já têm arquivo: um "Coming soon" pendurado numa
   * galeria seria só uma moldura vazia.
   *
   * A parede sul fica de fora de propósito — é onde está a porta, e um
   * quadro no meio dela ficaria por cima da saída.
   */
  _buildArtworks() {
    const shown = projects.filter((project) => project.media.length);
    if (!shown.length) return;

    const walls = [WALL.NORTH, WALL.WEST, WALL.EAST];
    const base = Math.floor(shown.length / walls.length);
    const extra = shown.length % walls.length;

    let cursor = 0;
    walls.forEach((wall, index) => {
      const count = base + (index < extra ? 1 : 0);
      for (let i = 0; i < count; i += 1) {
        this._placeFrame(shown[cursor], wall, i, count);
        cursor += 1;
      }
    });
  }

  _placeFrame(project, wall, index, count) {
    const half = this.size / 2;

    // Espaçamento igual ao longo da parede, com margem nas pontas.
    const span = this.size - 3;
    const step = span / count;
    const offset = -span / 2 + step * (index + 0.5);

    const frame = this._buildFrame(project);

    switch (wall) {
      case WALL.NORTH:
        frame.position.set(offset, ART_HEIGHT, -half + 0.06);
        break;
      case WALL.WEST:
        frame.position.set(-half + 0.06, ART_HEIGHT, offset);
        frame.rotation.y = Math.PI / 2;
        break;
      default:
        frame.position.set(half - 0.06, ART_HEIGHT, offset);
        frame.rotation.y = -Math.PI / 2;
    }

    this.group.add(frame);
  }

  _buildFrame(project) {
    const group = new THREE.Group();
    group.name = `art_${project.id}`;

    /*
     * Planos 1x1: o tamanho vem da escala, que o Artwork.fit ajusta para a
     * proporção do arquivo. A geometria é a mesma instância para todos os
     * quadros — quem difere é a escala, que é por mesh.
     */

    // Moldura: um plano um pouco maior atrás da obra.
    const border = new THREE.Mesh(
      UNIT_PLANE,
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 })
    );
    group.add(border);

    /*
     * Nasce preto de propósito: enquanto o arquivo não chega o quadro fica
     * apagado, e acender conforme você se aproxima virou parte da sala.
     *
     * Esse preto é a própria cor do material, e no three.js a cor final é
     * `map * color` — deixá-lo assim depois de pendurar a textura pintaria o
     * vídeo de preto. Por isso o Artwork acende o material para branco junto
     * com o play (ver _lightUp).
     */
    const canvas = new THREE.Mesh(
      UNIT_PLANE,
      new THREE.MeshBasicMaterial({ color: DARK_CANVAS })
    );
    canvas.position.z = 0.01;
    group.add(canvas);

    const artwork = new Artwork(canvas, border, project);
    // Proporção de partida até o arquivo dizer a de verdade.
    artwork.fit(DEFAULT_ASPECT);
    this.artworks.push(artwork);

    return group;
  }

  /* ---------- saída ---------- */

  _buildExit() {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        emissive: 0xffb919,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      })
    );
    door.name = "secret_exit";
    door.position.set(0, 1.3, this.size / 2 - 0.05);
    door.rotation.y = Math.PI;

    this.group.add(door);
    this.exit = door;
  }

  /* ---------- ciclo ---------- */

  /**
   * Acende as obras mais próximas e apaga o resto.
   *
   * Roda por frame, mas o trabalho é ordenar quatorze distâncias — o custo
   * de verdade está no play/pause, que só acontece quando a lista muda.
   */
  update(cameraPosition) {
    if (!this.group.visible) return;

    this.artworks
      .map((artwork) => ({
        artwork,
        distance: artwork.mesh
          .getWorldPosition(_scratch)
          .distanceTo(cameraPosition),
      }))
      .sort((a, b) => a.distance - b.distance)
      .forEach(({ artwork, distance }, index) => {
        if (index < MAX_ACTIVE && distance < this.wakeDistance) artwork.activate();
        else artwork.deactivate();
      });
  }

  /* Sair da sala pausa tudo: sem isso os vídeos seguem baixando enquanto o
     jogador já está de volta no quarto. */
  sleep() {
    this.artworks.forEach((artwork) => artwork.deactivate());
  }

  dispose() {
    this.artworks.forEach((artwork) => artwork.dispose());
  }
}
