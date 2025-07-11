import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FirstPersonCameraControl } from "./modules/firstPersonControls.js";

import GUI from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/Addons.js";
import { CopyShader } from "three/examples/jsm/Addons.js";

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
 * SHADERS
 */

const degradationShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    noiseIntensity: { value: 0.03 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float noiseIntensity;
    
    varying vec2 vUv;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Signed noise in [-0.5, 0.5] range
      float noise = (random(vUv + time) - 0.5) * 2.0 * noiseIntensity;
      
      // Preserve luminance while adding noise
      float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb += noise * mix(1.0, luminance, 0.5);
      
      // Maintain original brightness
      color.rgb = mix(color.rgb, color.rgb * (1.0 + noise), 0.2);
      
      gl_FragColor = color;
    }
  `,
};

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
  loadingScreen.addEventListener("transitionend", (event) => {
    event.target.remove();
  });
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
camera.position.set(1, 6, 1);
camera.lookAt(3, 1.5, 3);
scene.add(camera);

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

    gltfLoader.load("../ROOM OMR NEW.glb", (gltf) => {
      gltf.scene.scale.set(0.3, 0.3, 0.3);
      gltf.scene.position.set(0, 0, 0);
      scene.add(gltf.scene);
      fpControls.colliders = gltf.scene.children[0];
      camera.lookAt(3, 1.5, 3);
    });

    fpControls.enabled = true;
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
