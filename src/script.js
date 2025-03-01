import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FirstPersonCameraControl } from "./modules/firstPersonControls.js";

import GUI from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import Stats from "stats.js";

/**
 * Base
 */

// Raycasting variables for HTML Elements interaction
let foundIntersectionPrateleira = false;
let foundIntersectionVinil = false;
const closeModal = document.querySelector(".close");

// Stats FPS COUNTER
var stats = new Stats();
stats.showPanel(0); //
document.body.appendChild(stats.dom);

// Loaders
const cubeTextureLoader = new THREE.CubeTextureLoader();
let loadedModel;

// CSS LOADER
const loadingManager = new THREE.LoadingManager(() => {
  const loadingScreen = document.querySelector(".loading-screen");
  loadingScreen.classList.add("fade-out");

  // optional: remove loader from DOM via event listener
  loadingScreen.addEventListener("transitionend", onTransitionEnd);
});

function onTransitionEnd(event) {
  event.target.remove();
}

// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector(".webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Models
 */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load("./my studio final.glb", (gltf) => {
  gltf.scene.scale.set(0.1, 0.1, 0.1);
  gltf.scene.position.set(0, 0, 0);

  const loadedModel = gltf.scene;

  scene.add(loadedModel);
  console.log(loadedModel);
  fpControls.colliders = gltf.scene.children[0];
});

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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
// scene.add(ambientLight);

/**
 * Directional light
 */

// Environment Map
const environmentMap = cubeTextureLoader.load([
  "./hdri/Standard-Cube-Map/px.png",
  "./hdri/Standard-Cube-Map/nx.png",
  "./hdri/Standard-Cube-Map/py.png",
  "./hdri/Standard-Cube-Map/ny.png",
  "./hdri/Standard-Cube-Map/pz.png",
  "./hdri/Standard-Cube-Map/nz.png",
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

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

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
camera.position.set(1, 6, 1);
camera.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(camera);

//**
// FIRST PERSON CONTROLS and Orbit
//  */

const orbit = new OrbitControls(camera, canvas);
orbit.enabled = false;

const fpControls = new FirstPersonCameraControl(camera, canvas);
fpControls.enabled = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

/**
 * Post processing
 */

const width = window.innerWidth;
const height = window.innerHeight;

const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

// GUI
//

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

  // first person controls
  fpControls.update();

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
    if (intersect.object.name.includes("prateleira_cima")) {
      foundIntersectionPrateleira = true;
    }
    if (intersect.object.name.includes("MIXER_e_vinil")) {
      foundIntersectionVinil = true;
    }
  });

  if (foundIntersectionPrateleira) {
    interactionPrompt.classList.add("active");
    interactionPrompt.innerHTML = "Press F to hear my music";
  } else if (foundIntersectionVinil) {
    interactionPrompt.classList.add("active");
    interactionPrompt.innerHTML = "Press F to hear my sets";
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
  if (event.code === "KeyF") {
    if (foundIntersectionPrateleira) {
      showModal("musicModal");
    } else if (foundIntersectionVinil) {
      showModal("setsModal");
    }
  }
});

// *
// *
// Modal control functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("modal-active");
    fpControls.enabled = false;
  }
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
