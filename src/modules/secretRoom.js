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

/*
 * A sala é preta: parede, chão e teto. O que se vê é o que as obras
 * derramam em volta delas — ver o bloco de brilho mais abaixo.
 */
const WALL_COLOR = 0x000000;
const FLOOR_COLOR = 0x000000;
const CEILING_COLOR = 0x000000;

/*
 * Nome do material das paredes dentro do .glb do quarto.
 *
 * Continua sendo emprestado, mesmo com a sala preta: sem luz nenhuma ele
 * renderiza preto de qualquer jeito, e fica de rede de segurança para quem
 * levantar o ambiente no lil-gui — aí o cimento volta em vez de um preto
 * chapado.
 */
const ROOM_WALL_MATERIAL = "walls";

/* De quantas em quantas unidades a textura da parede se repete. */
const WALL_TEXTURE_TILE = 5;

/* ---------- luz ---------- */

/*
 * As duas luzes da sala ficam em zero.
 *
 * Não é esquecimento: a galeria é iluminada pelas obras, e qualquer luz
 * geral por cima levanta o preto e desmancha o efeito. Elas continuam na
 * cena porque os sliders do lil-gui estão ligados nelas — dá para levantar
 * um respiro sem mexer no código, e as cores abaixo são o ponto de partida
 * se alguém quiser fazer isso.
 *
 * Sobre o HemisphereLight, se ele voltar a ser usado: entrega `sky` a quem
 * tem a normal para cima e `ground` a quem tem para baixo. O teto olha para
 * baixo, então quem pinta o teto é o `ground`.
 */
const AMBIENT_COLOR = 0xffd0a0;
const AMBIENT_INTENSITY = 0;

const BOUNCE_SKY = 0xa87948;
const BOUNCE_GROUND = 0x33322f;
const BOUNCE_INTENSITY = 0;

/* ---------- brilho das obras ---------- */

/*
 * Não há mais luz nenhuma na sala: nem spot, nem ambiente, nem rebote.
 *
 * Quem ilumina são as próprias obras. Cada quadro ganha dois planos aditivos
 * com a mesma textura do vídeo — um atrás, espalhando na parede, e outro
 * deitado no chão, como poça de luz. Como o material da obra é Basic, ele já
 * é auto-iluminado, então a sala inteira preta com esses dois derrames é o
 * que dá a leitura da referência.
 *
 * Custa duas quads a mais por obra e nenhuma luz dinâmica — bem mais barato
 * do que os catorze spots que estavam aqui antes.
 */

/* Quanto do brilho vaza para a parede e para o chão. */
const GLOW_WALL_OPACITY = 0.55;
const GLOW_FLOOR_OPACITY = 0.45;

/* O halo é maior que a obra; é isso que faz o derrame aparecer em volta. */
const GLOW_WALL_SCALE = 2.2;

/* Comprimento da poça no chão, em unidades de mundo. */
const GLOW_FLOOR_DEPTH = 3.2;

/* Raio do desfoque, em uv. Sem ele o derrame vira uma cópia nítida da obra. */
const GLOW_BLUR = 0.045;

/* Potência da máscara do chão: maior = a poça morre mais perto da parede. */
const GLOW_FLOOR_FALLOFF = 2.2;

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

/*
 * Shader do derrame.
 *
 * Um só para os dois usos: o `uMode` escolhe entre a máscara redonda do halo
 * de parede e a máscara direcional da poça de chão, que nasce colada na
 * parede e morre indo para dentro da sala.
 *
 * O desfoque é um box de 9 amostras. Não é bonito de perto, mas é o que
 * transforma a cópia nítida do vídeo em luz derramada, e a 9 taps sai muito
 * mais barato do que um passe de bloom no EffectComposer.
 */
const GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBlur;
  uniform float uFalloff;
  uniform float uMode; // 0 = parede, 1 = chao

  varying vec2 vUv;

  vec3 blurred(vec2 uv) {
    vec3 sum = vec3(0.0);
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 offset = vec2(float(x), float(y)) * uBlur;
        sum += texture2D(uMap, clamp(uv + offset, 0.001, 0.999)).rgb;
      }
    }
    return sum / 9.0;
  }

  void main() {
    // No chao a imagem entra espelhada, como reflexo.
    vec2 uv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uMode));

    float radial = 1.0 - smoothstep(0.0, 0.5, length(vUv - 0.5));
    float toward = pow(clamp(vUv.y, 0.0, 1.0), uFalloff);
    float sides = 1.0 - smoothstep(0.25, 0.5, abs(vUv.x - 0.5));
    float mask = mix(radial, toward * sides, uMode);

    // Aditivo: o alpha nao conta, quem soma luz e o rgb.
    gl_FragColor = vec4(blurred(uv) * mask * uOpacity, 1.0);
  }
`;

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
    this.prepared = false; // ja buscou o arquivo
    this.playing = false; // esta rodando agora
    this.texture = null;
    this.video = null;

    /* Os planos de derrame (parede e chao). Nascem invisiveis: sem textura
       eles pintariam um retangulo do lixo da GPU na parede. */
    this.glows = [];
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

    /*
     * Os derrames acompanham a obra. Sem isto, um vídeo em pé mantinha o
     * halo deitado que veio da proporção provisória, e o brilho ficava mais
     * largo que o quadro que o produziu.
     *
     * A poça do chão só acompanha a largura: o comprimento dela é o quanto a
     * luz avança sala adentro, que não tem a ver com a altura da obra.
     */
    const [wall, floor] = this.glows;
    wall?.scale.set(width * GLOW_WALL_SCALE, height * GLOW_WALL_SCALE, 1);
    floor?.scale.set(width * GLOW_WALL_SCALE, GLOW_FLOOR_DEPTH, 1);
  }

  /**
   * Busca o arquivo e deixa o primeiro quadro na parede, parado.
   *
   * Separado do play de propósito: antes, o vídeo só era criado quando a
   * obra entrava nas três mais próximas, então cada moldura começava do zero
   * enquanto você andava e a sala vivia se preenchendo à sua frente. Agora a
   * sala inteira já chega pronta e o play é só o que se move.
   *
   * Idempotente — pode ser chamado a cada frame sem custo.
   */
  prepare() {
    if (this.prepared || !this.source) return;
    this.prepared = true;

    if (isImage(this.source)) this._prepareImage();
    else this._prepareVideo();
  }

  play() {
    this.prepare();
    if (this.playing || !this.video) return;
    this.playing = true;

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

  /* Pausa, mas continua pendurado: a obra fica no quadro em que parou em vez
     de apagar, que é o que uma galeria faria. */
  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.video?.pause();
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

    /* Os derrames leem a mesma textura da obra — nao ha copia nem segundo
       download, e o brilho na parede acompanha o video quadro a quadro. */
    this.glows.forEach((glow) => {
      glow.material.uniforms.uMap.value = this.texture;
      glow.visible = true;
    });

    /*
     * Força uma subida da textura para a GPU. Vídeo parado não apresenta
     * quadro novo, e o VideoTexture só se marca sozinho quando apresenta —
     * sem isto, uma obra pausada podia ficar preta mesmo já carregada.
     */
    this.texture.needsUpdate = true;
  }

  _prepareImage() {
    this.texture = new THREE.TextureLoader().load(
      encodeURI(this.source),
      (texture) => {
        this.fit(texture.image.width / texture.image.height);
        this._lightUp();
      }
    );
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  _prepareVideo() {
    const video = document.createElement("video");
    video.src = encodeURI(this.source);
    /* "auto" porque queremos o primeiro quadro na parede antes de alguém
       chegar perto; quem segura a banda é o pause logo depois. */
    video.preload = "auto";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "");
    this.video = video;

    this.texture = new THREE.VideoTexture(video);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // O cabeçalho chega antes do primeiro quadro, então a moldura já assume
    // a proporção certa enquanto a imagem ainda está a caminho.
    video.addEventListener(
      "loadedmetadata",
      () => this.fit(video.videoWidth / video.videoHeight),
      { once: true }
    );

    video.addEventListener(
      "loadeddata",
      () => {
        this._lightUp();
        // Chegou quadro mas ninguém pediu play: fica parado na parede.
        if (!this.playing) video.pause();
      },
      { once: true }
    );

    video.load();
  }

  dispose() {
    this.pause();
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
    this.glows = [];

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
    this.floor = floor;

    const ceiling = this._panel(size, size, CEILING_COLOR);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.name = "secret_ceiling";
    this.shell.add(ceiling);
    this.ceiling = ceiling;

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
    ].map(([rotation, position], index) => {
      const wall = this._panel(size, height, WALL_COLOR);
      wall.rotation.y = rotation;
      wall.position.set(...position);
      wall.name = `secret_wall_${index}`;
      this.shell.add(wall);
      return wall;
    });

    // Guardadas para o applyRoomWalls poder trocar o material depois.
    this.walls = this.shell.children.filter((child) =>
      child.name.startsWith("secret_wall_")
    );
  }

  /**
   * A sala não tem luz geral: o ambiente é só um respiro quente, e o que
   * desenha o espaço são os spots do chão apontados para cada obra.
   *
   * Os spots nascem junto das molduras (ver _buildFrame), porque cada um
   * pertence à sua obra — assim eles giram com a moldura e não precisam de
   * coordenada de mundo por parede.
   */
  _buildLights() {
    /*
     * As duas nascem em zero: a sala e preta e quem ilumina sao as obras.
     * Ficam na cena mesmo assim porque os sliders do lil-gui continuam
     * ligados nelas — da para levantar um respiro de luz sem mexer no codigo
     * e sem ter que escolher um tom do nada.
     */
    this.ambient = new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
    this.group.add(this.ambient);

    this.bounce = new THREE.HemisphereLight(
      BOUNCE_SKY,
      BOUNCE_GROUND,
      BOUNCE_INTENSITY
    );
    this.group.add(this.bounce);
  }

  /**
   * Empresta o material das paredes do quarto para as paredes e o teto da
   * galeria.
   *
   * Clona antes de mexer: o material vem do .glb que ainda está em cena, e
   * ajustar o `repeat` no original esticaria a textura do quarto junto. O
   * teto ganha o seu próprio clone porque é quadrado (20x20) e as paredes
   * são deitadas (20x5) — um `repeat` só serviria mal aos dois.
   *
   * @param {THREE.Object3D} root – a cena do glTF já carregada
   */
  applyRoomSurfaces(root) {
    let source = null;
    root.traverse((object) => {
      if (source || !object.isMesh) return;
      const material = object.material;
      if (material?.name === ROOM_WALL_MATERIAL) source = material;
    });

    if (!source) {
      console.warn(
        `[gallery] material "${ROOM_WALL_MATERIAL}" nao achado no .glb; ` +
          "as paredes ficam na cor lisa"
      );
      return false;
    }

    const tile = (repeatX, repeatY) => {
      const material = source.clone();
      if (!material.map) return material;

      // A textura tambem e compartilhada, entao o clone vale para ela.
      material.map = material.map.clone();
      material.map.wrapS = THREE.RepeatWrapping;
      material.map.wrapT = THREE.RepeatWrapping;
      material.map.repeat.set(repeatX, repeatY);
      material.map.needsUpdate = true;
      return material;
    };

    const wallMaterial = tile(
      this.size / WALL_TEXTURE_TILE,
      this.height / WALL_TEXTURE_TILE
    );
    this.walls.forEach((wall) => {
      wall.material = wallMaterial;
    });

    this.ceiling.material = tile(
      this.size / WALL_TEXTURE_TILE,
      this.size / WALL_TEXTURE_TILE
    );

    return true;
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

    group.add(...this._buildGlow(artwork, canvas.scale.x, canvas.scale.y));

    return group;
  }

  /**
   * O spot que ilumina uma obra, do chão para cima.
   *
   * Fica no espaço local da moldura: (0, -altura, +z) é sempre "no chão, um
   * passo à frente da parede", em qualquer das três paredes. Em coordenada
   * de mundo isso viraria um caso por parede, com sinal trocado em dois
   * deles — a rotação do grupo já resolve.
   */
  /**
   * Os dois planos de derrame de uma obra.
   *
   * O halo fica atrás da moldura, no vão entre ela e a parede: como não
   * escreve profundidade mas testa, a moldura opaca recorta o meio dele
   * sozinha e sobra só o que vaza em volta — que é o efeito.
   *
   * A poça fica deitada no chão, encostada na parede e indo para dentro da
   * sala. Ambos em espaço local da moldura, então giram junto com ela em
   * qualquer das paredes.
   */
  _buildGlow(artwork, width, height) {
    const material = (mode, opacity) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uOpacity: { value: opacity },
          uBlur: { value: GLOW_BLUR },
          uFalloff: { value: GLOW_FLOOR_FALLOFF },
          uMode: { value: mode },
        },
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    const wall = new THREE.Mesh(UNIT_PLANE, material(0, GLOW_WALL_OPACITY));
    wall.scale.set(width * GLOW_WALL_SCALE, height * GLOW_WALL_SCALE, 1);
    // Atrás da moldura, no vão até a parede.
    wall.position.z = -0.03;
    wall.visible = false;
    wall.name = "glow_wall";

    const floor = new THREE.Mesh(UNIT_PLANE, material(1, GLOW_FLOOR_OPACITY));
    floor.scale.set(width * GLOW_WALL_SCALE, GLOW_FLOOR_DEPTH, 1);
    floor.rotation.x = -Math.PI / 2;
    /* Rente ao chão: 1cm acima evita brigar em z com o piso. A poça começa
       na parede e avança meio comprimento para dentro da sala. */
    floor.position.set(0, 0.01 - ART_HEIGHT, GLOW_FLOOR_DEPTH / 2);
    floor.visible = false;
    floor.name = "glow_floor";

    artwork.glows.push(wall, floor);
    this.glows.push(wall, floor);

    return [wall, floor];
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
        if (index < MAX_ACTIVE && distance < this.wakeDistance) artwork.play();
        else artwork.pause();
      });
  }

  /**
   * Busca todas as obras de uma vez, para a sala já estar pendurada quando
   * alguém entra em vez de ir se preenchendo conforme a caminhada.
   *
   * Chamado quando o jogador chega perto do computador, ainda no quarto: o
   * tempo entre ver o "Press F" e apertar costuma bastar para os primeiros
   * quadros chegarem. Idempotente, então pode ser chamado por frame.
   *
   * Só o carregamento é adiantado; o play continua sendo das mais próximas,
   * que é quem segura a banda.
   */
  warmUp() {
    this.artworks.forEach((artwork) => artwork.prepare());
  }

  /* Sair da sala pausa tudo: sem isso os vídeos seguem rodando enquanto o
     jogador já está de volta no quarto. O que já baixou fica. */
  sleep() {
    this.artworks.forEach((artwork) => artwork.pause());
  }

  dispose() {
    this.artworks.forEach((artwork) => artwork.dispose());
  }
}
