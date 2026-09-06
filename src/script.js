import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FirstPersonCameraControl } from "./modules/firstPersonControls.js";

import GUI from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { PositionalAudio } from "three";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/Addons.js";
import { CopyShader } from "three/examples/jsm/Addons.js";
import { PlayHandler } from "./modules/audioPlayer.js";
import { SetsShelf } from "./modules/setsModal.js";
import { AlbumShelf } from "./modules/albumsModal.js";
import { StudioPanel } from "./modules/studioModal.js";
import { ProximityZones } from "./modules/proximity.js";

import Stats from "stats.js";

/**
 * Base
 */

// these selectors below are just for the landing page quality selection and enter button.====================
let selectedQuality = "high";

// identifying quality choices
document.querySelectorAll(".quality-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedQuality = btn.dataset.quality;
    document
      .querySelectorAll(".quality-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    document.getElementById("enterButton").disabled = false;
  });
});

// Get quality settings
const getQualitySettings = () => {
  switch (selectedQuality) {
    case "low":
      return {
        pixelRatio: 0.7,
        antialias: false,
        shadows: false,
        shadowRes: 512,
        applyDegradation: false,
        noiseIntensity: 0.2,
      };

    case "high":
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        antialias: true,
        shadows: true,
        shadowRes: 512,
        applyDegradation: false,
        noiseIntensity: 0.02,
      };
  }
};
// until here ====================

/**
 * AUDIO PLAYER CONFIGURATION
 */

let player = null; // PositionalAudio, criado quando o modelo carrega
let playHandler = null; // controla o player da cena; guardado para o modal de sets

/*
 * Os mixes e a musica da cena disputariam o mesmo ouvido, entao um set que
 * comeca a tocar assume a barra de player: o nome passa a ser o do mix e o
 * botao de play/pause passa a comandar o widget. Quando o set acaba, o
 * comando volta para a faixa da cena, parada.
 *
 * As linhas ja existem no DOM; os iframes so viram rede na primeira vez que
 * o modal abre.
 */
/* As capas so baixam quando o modal abre pela primeira vez. */
const albumShelf = new AlbumShelf();

const studioPanel = new StudioPanel(document.getElementById("studioContent"));


const setsShelf = new SetsShelf(document.getElementById("setsList"), {
  onPlay: (source) => playHandler?.attachExternal(source),
  onPause: () => playHandler?.updateExternal(false),
  onFinish: () => playHandler?.detachExternal(),
});


// Raycasting variables for HTML Elements interaction
let foundIntersectionPrateleira = false;
let foundIntersectionVinil = false;

/*
 * A interacao ativa no frame, seja ela do raycast ou da proximidade. O
 * keydown do F le daqui em vez de repetir a cadeia de ifs do tick.
 */
let activeInteraction = null;

/* Hasteados para nao criar objeto novo a cada frame no loop de render. */
const RAY_INTERACTIONS = {
  prateleira: { modal: "musicModal", prompt: "Press F to hear my music" },
  vinil: { modal: "setsModal", prompt: "Press F to hear my sets" },
};

// Stats FPS COUNTER
var stats = new Stats();
stats.showPanel(0); //
document.body.appendChild(stats.dom);

// Loaders
const cubeTextureLoader = new THREE.CubeTextureLoader();
let loadedModel;

// CSS LOADER
const loaderTrack = document.querySelector(".loader-track");
const loaderBar = document.getElementById("loaderBar");
const loaderPercent = document.getElementById("loaderPercent");
const loaderBytes = document.getElementById("loaderBytes");

const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);

function setLoadProgress(loaded, total) {
  // Sem Content-Length (resposta comprimida/chunked) não dá para calcular
  // porcentagem: cai para a barra indeterminada e mostra só o que baixou.
  if (!total) {
    loaderTrack?.classList.add("is-indeterminate");
    if (loaderBytes) loaderBytes.textContent = `${toMB(loaded)} MB`;
    return;
  }

  loaderTrack?.classList.remove("is-indeterminate");
  const pct = Math.min(100, Math.round((loaded / total) * 100));
  if (loaderBar) loaderBar.style.width = `${pct}%`;
  if (loaderPercent) loaderPercent.textContent = `${pct}%`;
  if (loaderBytes) loaderBytes.textContent = `${toMB(loaded)} / ${toMB(total)} MB`;
}

// Tempo mínimo que o loader fica visível. Sem isso, um modelo em cache
// some antes da barra sair do zero e a tela só pisca.
const MIN_LOADER_MS = 1400;
let loaderShownAt = 0;

const loadingManager = new THREE.LoadingManager(() => {
  const loadingScreen = document.querySelector(".loading-screen");
  setLoadProgress(1, 1); // trava em 100% mesmo sem Content-Length

  // remove o loader do DOM quando o fade terminar. O guard evita que o
  // transitionend de um filho (a barra) borbulhe e remova o elemento errado.
  loadingScreen.addEventListener("transitionend", (event) => {
    if (event.target === loadingScreen && event.propertyName === "opacity") {
      loadingScreen.remove();
    }
  });

  const elapsed = performance.now() - loaderShownAt;
  setTimeout(() => {
    loadingScreen.classList.add("fade-out");
  }, Math.max(0, MIN_LOADER_MS - elapsed));
});

// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector(".webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Raycaster
 */

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
raycaster.far = 2;
raycaster.params.Line = { threshold: 100 };
/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffb919, 0.4);

scene.add(ambientLight);

/**
 * Directional light
 */

// Environment Map
const environmentMap = cubeTextureLoader.load([
  "../hdri/Standard-Cube-Map/px.png",
  "../hdri/Standard-Cube-Map/nx.png",
  "../hdri/Standard-Cube-Map/py.png",
  "../hdri/Standard-Cube-Map/ny.png",
  "../hdri/Standard-Cube-Map/pz.png",
  "../hdri/Standard-Cube-Map/nz.png",
]);

// scene environment
scene.background = environmentMap;
scene.environment = environmentMap;

// ------------

// GUI

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  80,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(1, 1.8, 1);
camera.lookAt(3, 1.8, 3);
scene.add(camera);

/*
 * Zona de proximidade da bancada de equipamentos.
 *
 * Convive de proposito com o raycast das outras duas zonas: da para andar
 * pela sala e comparar as duas formas de gatilho na mesma sessao antes de
 * decidir migrar o resto. Os nomes sao os meshes do .glb; a ancora sai da
 * caixa que envolve eles, entao nao ha coordenada fixa aqui.
 */
const proximityZones = new ProximityZones(camera, [
  {
    id: "studio",
    objects: [
      "electribe_rosa",
      "electribe_azul",
      "303",
      "acidlab",
      "MPC",
      "VIRUS",
      "dx7",
    ],
    radius: 2.5, // em unidades de mundo; o raycast antigo usava far = 2
    facing: 0.35, // produto escalar minimo: ~70 graus para cada lado
    modal: "studioModal",
    prompt: "Press F to see my studio",
  },
]);

// **
//  AUDIO LISTENER
// */
const listener = new THREE.AudioListener();
camera.add(listener);

//

//**
// FIRST PERSON CONTROLS and Orbit
//  */

const orbit = new OrbitControls(camera, canvas);
orbit.enabled = false;

// Fisrt Person Camera

const fpControls = new FirstPersonCameraControl(camera, canvas);
fpControls.enabled = false;

/**
 * Models
 */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

let sceneInitialized = false;

// ENTER BUTTON CLICK HANDLER
let renderer;
let effectComposer;

document.getElementById("enterButton").addEventListener("click", () => {
  // Hide landing page
  document.querySelector(".landing-page").style.display = "none";

  // Show loading screen
  const loadingScreen = document.querySelector(".loading-screen");
  loadingScreen.style.display = "flex";
  loadingScreen.classList.remove("fade-out");
  loaderShownAt = performance.now();

  /**
   * Renderer
   */
  const settings = getQualitySettings();
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: settings.antialias,
  });

  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(settings.pixelRatio);
  renderer.setSize(sizes.width, sizes.height);

  // renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // renderer.physicallyCorrectLights = true;

  // renderer.setSize(sizes.width, sizes.height);
  // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  /**
   * Post processing
   */

  const width = window.innerWidth;
  const height = window.innerHeight;

  effectComposer = new EffectComposer(renderer);
  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  if (settings.applyDegradation) {
    const degradationPass = new ShaderPass(degradationShader);
    degradationPass.uniforms["noiseIntensity"].value = settings.noiseIntensity;
    effectComposer.addPass(degradationPass);

    // Add copy pass to finalize
    effectComposer.addPass(new ShaderPass(CopyShader));
  }

  if (!sceneInitialized) {
    sceneInitialized = true;

    // Start loading the model

    gltfLoader.load(
      "../ROOM OMR NEW.glb",
      (gltf) => {
        gltf.scene.scale.set(0.3, 0.3, 0.3);
        gltf.scene.position.set(0, 0, 0);
        scene.add(gltf.scene);
        fpControls.colliders = gltf.scene.children[0];

        // Spawn na altura dos olhos, olhando reto para frente.
        // O alvo do lookAt usa o mesmo Y da câmera, então não há
        // inclinação vertical nenhuma no início.
        camera.position.set(1, 1.8, 1);
        camera.lookAt(3, camera.position.y, 3);

        // audio
        //
        // ***************************************************************

        player = new PositionalAudio(listener);
        player.setRefDistance(2); // volume 100 % até 2 unid.
        player.setRolloffFactor(1); // curva padrão de queda

        const alvo = gltf.scene.getObjectByName("vinilera") || gltf.scene;
        alvo.add(player);

        const playlist = [
          {
            name: "Martinelli - translateX (Unreleased)",
            url: "../music/Martinelli - translateX (mp3).mp3",
          },
        ];

        playHandler = new PlayHandler(player, playlist, 0.4); // volume padrão = 0.4

        // Mesh renomeado no Blender vira uma zona que nunca dispara, e em
        // silencio o sintoma seria so "o F nao funciona ali".
        proximityZones.bind(gltf.scene).forEach(({ id, found, missing }) => {
          if (missing.length) {
            console.warn(`[proximity] zona "${id}": nao achei ${missing.join(", ")}`);
          } else {
            console.info(`[proximity] zona "${id}": ${found} meshes`);
          }
        });

        // Calibragem ao vivo: da para andar ate a bancada e ajustar o
        // gatilho vendo o resultado, em vez de chutar numero e recarregar.
        const studioZone = proximityZones.zones[0];
        const proximityFolder = gui.addFolder("Proximity (studio)");
        proximityFolder.add(studioZone, "radius", 0.5, 8, 0.1).name("raio");
        proximityFolder.add(studioZone, "facing", -1, 1, 0.05).name("cone (1 = de frente)");

        // Só ligar depois de orientar a câmera: o setter `enabled` guarda
        // o euler atual, então ligar antes congelaria a rotação antiga.
        fpControls.enabled = true;
      },
      (event) => setLoadProgress(event.loaded, event.total)
    );
  }
});

// handle resizes
window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  const settings = getQualitySettings();

  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(settings.pixelRatio);

  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(settings.pixelRatio);
}

/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;
const interactionPrompt = document.getElementById("cds");

const tick = () => {
  stats.begin();
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // pause while loading
  if (!sceneInitialized) {
    window.requestAnimationFrame(tick);
    stats.end();
    return;
  }

  if (effectComposer && getQualitySettings().applyDegradation) {
    effectComposer.passes.forEach((pass) => {
      if (pass.uniforms && pass.uniforms["time"]) {
        pass.uniforms["time"].value = elapsedTime;
      }
    });
  }

  // first person controls
  fpControls.update(deltaTime);

  // raycaster
  raycaster.ray.origin.copy(camera.position);
  camera.getWorldDirection(rayDirection);
  raycaster.ray.direction.copy(rayDirection);

  // Atualizar raycaster
  raycaster.setFromCamera(new THREE.Vector2(), camera);

  // Verificar colisões
  const intersects = raycaster.intersectObjects(scene.children, true);

  foundIntersectionPrateleira = false;
  foundIntersectionVinil = false;

  intersects.forEach((intersect) => {
    if (
      intersect.object.name.includes("prateleira_cima") ||
      intersect.object.name.includes("lateral_direita") ||
      intersect.object.name.includes("lateral_esquerda") ||
      intersect.object.name.includes("ESTANTE_2_EMPT")
    ) {
      foundIntersectionPrateleira = true;
    }
    if (intersect.object.name.includes("MIXER_e_vinil")) {
      foundIntersectionVinil = true;
    }
  });

  /*
   * A proximidade ganha do raycast quando as duas valem: chegar perto e um
   * gesto deliberado, enquanto a mira pode so estar de passagem.
   */
  const zone = proximityZones.update();

  if (zone) activeInteraction = zone;
  else if (foundIntersectionPrateleira) activeInteraction = RAY_INTERACTIONS.prateleira;
  else if (foundIntersectionVinil) activeInteraction = RAY_INTERACTIONS.vinil;
  else activeInteraction = null;

  if (activeInteraction) {
    interactionPrompt.classList.add("active");
    interactionPrompt.textContent = activeInteraction.prompt;
  } else {
    interactionPrompt.classList.remove("active");
  }

  // Render
  // renderer.render(scene, camera);
  effectComposer.render();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
  stats.end();
};

tick();

// check which obj is intersecting and display modals based on IDs
document.addEventListener("keydown", (event) => {
  if (event.code === "KeyF" && activeInteraction) showModal(activeInteraction.modal);
});

// *
// *
// Modal control functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("modal-active");
  fpControls.enabled = false;

  if (modalId === "musicModal") albumShelf.open();
  if (modalId === "studioModal") studioPanel.open();
  if (modalId === "setsModal") setsShelf.open();
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("modal-active");
    fpControls.enabled = true;
  }
}

//Close modal when clicking outside
document.querySelectorAll(".close").forEach((button) => {
  button.addEventListener("click", (event) => {
    const modalId = event.currentTarget.dataset.modal;
    hideModal(modalId);
  });
});

// Atualizar o evento de clique fora
window.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal")) {
    const modalId = event.target.id;
    hideModal(modalId);
  }
});
