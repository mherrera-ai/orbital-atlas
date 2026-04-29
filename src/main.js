import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  Camera,
  Compass,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  createIcons
} from "lucide";
import {
  AU_KM,
  CAMERA_VIEWS,
  DWARF_OBJECTS,
  PLANET_SIGNATURES,
  PLANETS,
  SIM_DAYS_PER_SECOND,
  SPEED_PRESETS,
  SYSTEM_ZONES
} from "./data/solarSystem.js";
import { escapeHtml } from "./utils/text.js";
import "./styles.css";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const ACTIVE_WAKE_POINTS = 96;
const ORBIT_SCRUBBER_MAX = 1000;
const SOLAR_WIND_PARTICLES = 2400;
const SOLAR_WIND_MIN_RADIUS = 3.4;
const SOLAR_WIND_MAX_RADIUS = 52;
const LUCIDE_ICONS = { Camera, Compass, Maximize2, Pause, Play, RotateCcw, Sparkles, Target };
const MOBILE_COMPOSITION_WIDTH = 720;
const SCENE_EXPOSURE = 0.84;
const AMBIENT_LIGHT_INTENSITY = 1.28;
const SUN_LIGHT_INTENSITY = 640;
const SUN_LIGHT_DISTANCE = 95;
const SUN_LIGHT_DECAY = 1.42;
const RIM_LIGHT_INTENSITY = 0.64;
const PLANET_ATMOSPHERE_GLOW_INTENSITY = 0.2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-shell planet-labels-visible">
    <div class="stage" aria-label="Interactive 3D solar system">
      <canvas
        id="space"
        role="img"
        tabindex="0"
        aria-label="Animated 3D model of the solar system"
        aria-describedby="focusAnnouncement"
        aria-keyshortcuts="Space R ArrowLeft ArrowRight ArrowUp ArrowDown 1 2 3 4 5 6 7 8"
      ></canvas>
    </div>

    <div class="hud">
      <header class="brand">
        <div class="brand-orbit" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="brand-kicker">Sol Navigation Array</div>
        <h1>Orbital Atlas</h1>
        <p>A cinematic command deck for tracing worlds, signal lag, orbital arcs, dust belts, and the glow of Sol.</p>
        <div class="brand-meter" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="brand-readout" aria-label="Navigation readout">
          <span id="brandMode">FREE VIEW</span>
          <span>WEBGL</span>
          <span id="brandPace">18 DAYS/S</span>
        </div>
      </header>

      <section class="mission-panel" aria-label="System metrics">
        <div class="panel-heading-row">
          <h2>Mission Pulse</h2>
          <span id="missionStatus">LIVE LINK</span>
        </div>
        <div class="mission-hero">
          <div>
            <span class="mission-eyebrow">Tracking</span>
            <strong id="missionTarget">Earth</strong>
            <small id="missionSignal">LIGHT 8.3 MIN</small>
          </div>
          <div class="mission-gauge" aria-hidden="true">
            <span></span>
          </div>
        </div>
        <div class="mission-stat-grid">
          <div class="mission-stat">
            <span>Range</span>
            <strong id="missionRange">1.0 AU</strong>
            <small>heliocentric</small>
          </div>
          <div class="mission-stat">
            <span>Orbit progress</span>
            <strong id="missionArc">0%</strong>
            <small>current orbit</small>
          </div>
          <div class="mission-stat">
            <span>Pace</span>
            <strong id="missionPace">Cruise</strong>
            <small id="missionPaceRate">18 days/s</small>
          </div>
          <div class="mission-stat">
            <span>View</span>
            <strong id="missionMode">Free</strong>
            <small>camera</small>
          </div>
          <div class="mission-stat">
            <span>Sunlight</span>
            <strong id="missionFlux">1.00x</strong>
            <small>Earth baseline</small>
          </div>
          <div class="mission-stat">
            <span>Local day</span>
            <strong id="missionDay">23.9h</strong>
            <small>sidereal rotation</small>
          </div>
        </div>
      </section>

      <aside class="focus-panel" aria-labelledby="focusPanelTitle">
        <p class="sr-only" id="focusAnnouncement" aria-live="polite"></p>
        <div class="focus-orbit-map" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="focus-header">
          <h2 id="focusPanelTitle">Planet Brief</h2>
          <span class="focus-badge" id="focusBadge">Live</span>
        </div>
        <h3 class="focus-name" id="focusName"></h3>
        <p class="focus-type" id="focusType"></p>
        <div class="focus-readout" aria-label="Focused object readout">
          <span id="focusTrack"></span>
          <span id="focusLongitude" class="is-live"></span>
          <span id="focusPeriod"></span>
          <span id="focusTilt"></span>
          <span id="focusSignal"></span>
          <span id="focusDay"></span>
          <span id="focusFlux"></span>
        </div>
        <div class="focus-meta-grid">
          <div class="focus-progress-card">
            <span>Orbit progress</span>
            <strong id="focusProgress">0%</strong>
            <div class="focus-progress-control">
              <input
                id="orbitScrubber"
                class="focus-progress-slider"
                type="range"
                min="0"
                max="${ORBIT_SCRUBBER_MAX}"
                value="0"
                aria-label="Set active planet year arc"
              />
              <div class="focus-progress-track" aria-hidden="true">
                <i id="focusProgressBar"></i>
              </div>
              <span class="focus-progress-thumb" aria-hidden="true"></span>
            </div>
          </div>
          <div class="focus-tags" id="focusTags"></div>
        </div>
        <p class="focus-copy" id="focusCopy"></p>
        <div class="data-grid" id="dataGrid"></div>
        <ul class="detail-list" id="detailList"></ul>
        <p class="source-note" id="sourceNote"></p>
      </aside>

      <section class="control-deck" aria-label="Simulation controls">
        <div class="icon-group">
          <button class="icon-button" id="playPause" type="button" aria-label="Pause simulation" aria-pressed="false" title="Pause" data-tooltip="Pause">
            <i data-lucide="pause"></i>
          </button>
          <button class="icon-button" id="resetView" type="button" aria-label="Reset camera" title="Reset view" data-tooltip="Reset view">
            <i data-lucide="rotate-ccw"></i>
          </button>
          <button class="icon-button" id="tourMode" type="button" aria-label="Start guided tour" aria-pressed="false" title="Tour" data-tooltip="Tour">
            <i data-lucide="sparkles"></i>
          </button>
          <button class="icon-button" id="captureView" type="button" aria-label="Export scene" title="Export scene" data-tooltip="Export scene">
            <i data-lucide="camera"></i>
          </button>
        </div>

        <div class="view-mode-group" role="group" aria-label="Camera view">
          ${CAMERA_VIEWS.map(
            (view) => `
              <button
                class="view-mode-button${view.id === "free" ? " is-active" : ""}"
                type="button"
                data-camera-view="${view.id}"
                aria-pressed="${view.id === "free"}"
                aria-label="${view.label} camera view"
                title="${view.label}"
              >
                <i data-lucide="${view.icon}"></i>
                <span>${view.label}</span>
              </button>
            `
          ).join("")}
        </div>

        <div class="speed-panel" role="group" aria-label="Orbit pace">
          <div class="speed-readout" aria-live="polite">
            <span class="speed-kicker">Orbit pace</span>
            <span class="speed-value">
              <strong id="speedReadout">Cruise</strong>
              <small id="speedRate">18 days/s</small>
            </span>
          </div>
          <div class="speed-options">
            ${SPEED_PRESETS.map(
              (preset) => `
                <button
                  class="speed-button${preset.speed === 1 ? " is-active" : ""}"
                  type="button"
                  data-speed="${preset.speed}"
                  data-speed-label="${preset.label}"
                  data-speed-rate="${preset.rate}"
                  style="--pace: ${preset.strength}"
                  aria-pressed="${preset.speed === 1}"
                  aria-label="${preset.label} pace, about ${preset.rate.replace("days/s", "simulated days per second")}"
                >
                  <span>${preset.label}</span>
                  <small>${preset.rate}</small>
                </button>
              `
            ).join("")}
          </div>
        </div>

        <div class="toggle-group">
          <label class="toggle-pill">
            <input id="toggleLabels" type="checkbox" checked />
            Labels
          </label>
          <label class="toggle-pill">
            <input id="toggleOrbits" type="checkbox" checked />
            Orbits
          </label>
          <label class="toggle-pill">
            <input id="toggleBloom" type="checkbox" checked />
            Bloom
          </label>
          <label class="toggle-pill">
            <input id="toggleSignals" type="checkbox" checked />
            Signal
          </label>
          <label class="toggle-pill">
            <input id="toggleZones" type="checkbox" checked />
            Zones
          </label>
        </div>
      </section>
    </div>

    <nav class="planet-dock" aria-label="Planet selector">
      ${PLANETS.map(
        (planet, index) => `
          <button
            class="planet-button"
            type="button"
            data-planet="${planet.id}"
            aria-label="Focus ${planet.name}, planet ${index + 1} of ${PLANETS.length}"
            aria-keyshortcuts="${index + 1}"
            aria-pressed="false"
            title="Focus ${planet.name}"
            style="--planet-color: ${planet.color}"
          >
            <span class="planet-dot"></span>
            ${planet.name}
          </button>`
      ).join("")}
    </nav>

    <div class="toast" id="toast" role="status"></div>

    <div class="loader" id="loader" role="status" aria-live="polite" aria-label="Calibrating orbit camera">
      <div class="loader-core">
        <div class="loader-orbit"></div>
        <p>Calibrating orbit camera</p>
      </div>
    </div>
  </div>
`;

createIcons({ icons: LUCIDE_ICONS });

const shell = document.querySelector(".app-shell");
const canvas = document.querySelector("#space");
const stage = document.querySelector(".stage");
document.body.style.cursor = "";
const loader = document.querySelector("#loader");
const focusName = document.querySelector("#focusName");
const focusType = document.querySelector("#focusType");
const focusCopy = document.querySelector("#focusCopy");
const focusAnnouncement = document.querySelector("#focusAnnouncement");
const focusBadge = document.querySelector("#focusBadge");
const focusPanel = document.querySelector(".focus-panel");
const focusTrack = document.querySelector("#focusTrack");
const focusLongitude = document.querySelector("#focusLongitude");
const focusPeriod = document.querySelector("#focusPeriod");
const focusTilt = document.querySelector("#focusTilt");
const focusSignal = document.querySelector("#focusSignal");
const focusDay = document.querySelector("#focusDay");
const focusFlux = document.querySelector("#focusFlux");
const focusProgress = document.querySelector("#focusProgress");
const focusProgressBar = document.querySelector("#focusProgressBar");
const focusProgressControl = document.querySelector(".focus-progress-control");
const focusTags = document.querySelector("#focusTags");
const orbitScrubber = document.querySelector("#orbitScrubber");
const dataGrid = document.querySelector("#dataGrid");
const detailList = document.querySelector("#detailList");
const sourceNote = document.querySelector("#sourceNote");
const toast = document.querySelector("#toast");
const playPause = document.querySelector("#playPause");
const resetView = document.querySelector("#resetView");
const tourMode = document.querySelector("#tourMode");
const captureView = document.querySelector("#captureView");
const toggleLabels = document.querySelector("#toggleLabels");
const toggleOrbits = document.querySelector("#toggleOrbits");
const toggleBloom = document.querySelector("#toggleBloom");
const toggleSignals = document.querySelector("#toggleSignals");
const toggleZones = document.querySelector("#toggleZones");
const brandMode = document.querySelector("#brandMode");
const brandPace = document.querySelector("#brandPace");
const missionStatus = document.querySelector("#missionStatus");
const missionTarget = document.querySelector("#missionTarget");
const missionSignal = document.querySelector("#missionSignal");
const missionRange = document.querySelector("#missionRange");
const missionArc = document.querySelector("#missionArc");
const missionPace = document.querySelector("#missionPace");
const missionPaceRate = document.querySelector("#missionPaceRate");
const missionMode = document.querySelector("#missionMode");
const missionFlux = document.querySelector("#missionFlux");
const missionDay = document.querySelector("#missionDay");
const missionGauge = document.querySelector(".mission-gauge");
const speedReadout = document.querySelector("#speedReadout");
const speedRate = document.querySelector("#speedRate");
const viewModeButtons = [...document.querySelectorAll(".view-mode-button")];
const speedButtons = [...document.querySelectorAll(".speed-button")];
const planetButtons = [...document.querySelectorAll(".planet-button")];

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03040b, 0.012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 18, 43);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true
});
renderer.setClearColor(0x03040b, 1);
renderer.setPixelRatio(getPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = SCENE_EXPOSURE;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.className = "label-layer";
labelRenderer.domElement.setAttribute("aria-hidden", "true");
stage.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 1.18;
controls.panSpeed = 0.95;
controls.minDistance = 2.4;
controls.maxDistance = 130;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;
controls.target.set(0, 0, 0);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,
  0.38,
  0.42
);
composer.addPass(bloomPass);

const ambient = new THREE.AmbientLight(0x223049, AMBIENT_LIGHT_INTENSITY);
scene.add(ambient);

const solarLight = new THREE.PointLight(
  0xffdc8a,
  SUN_LIGHT_INTENSITY,
  SUN_LIGHT_DISTANCE,
  SUN_LIGHT_DECAY
);
solarLight.position.set(0, 0, 0);
scene.add(solarLight);

const rimLight = new THREE.DirectionalLight(0x7de7ff, RIM_LIGHT_INTENSITY);
rimLight.position.set(-16, 10, 26);
scene.add(rimLight);

const systemRoot = new THREE.Group();
systemRoot.rotation.x = -4 * DEG;
scene.add(systemRoot);

const orbitRoot = new THREE.Group();
systemRoot.add(orbitRoot);

const pickables = [];
const planetMap = new Map();
const orbitLines = [];
const dwarfObjectEntries = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerDown = { active: false, x: 0, y: 0 };
const hoverPointer = { frameId: 0, clientX: 0, clientY: 0 };
const followTargetPosition = new THREE.Vector3();
const followTargetDelta = new THREE.Vector3();
const lastFollowPosition = new THREE.Vector3();
const signalSunPosition = new THREE.Vector3();
const signalPlanetPosition = new THREE.Vector3();
const signalStartPosition = new THREE.Vector3();
const signalEndPosition = new THREE.Vector3();
const signalDirection = new THREE.Vector3();
const cleanupCallbacks = [];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let animationFrameId = 0;

const state = {
  simDays: 0,
  visualTime: 0,
  speed: 1,
  paused: prefersReducedMotion.matches,
  activeId: "earth",
  hoveredId: null,
  followId: null,
  followOffset: null,
  followPositionReady: false,
  cameraDestination: null,
  targetDestination: null,
  cameraMode: "free",
  tour: false,
  tourTimer: 0,
  scrubbingOrbit: false,
  labelsVisible: true,
  orbitsVisible: true,
  zonesVisible: true,
  signalsVisible: true
};

const sun = createSun();
systemRoot.add(sun.group);

const signalLink = createSignalLink();
scene.add(signalLink.group);
const activeOrbitWake = createActiveOrbitWake();
const solarWind = createSolarWind();
systemRoot.add(solarWind.points);
const systemZones = createSystemZones();
orbitRoot.add(systemZones.group);

createStarfield();
createMilkyWayBand();
createAsteroidBelt();
createKuiperDust();
createPlanets();
createDwarfObjects();
createCometTracks();
applyResponsiveCameraComposition();
setActivePlanet("earth", true, true);

window.__SOLAR_READY__ = false;
window.__SOLAR_SAMPLE_CANVAS__ = sampleCanvas;
window.__SOLAR_APP__ = {
  focus: setActivePlanet,
  next: () => focusAdjacentPlanet(1),
  previous: () => focusAdjacentPlanet(-1),
  reset: () => resetCamera(true),
  setSpeed: (speed) => setSpeed(Number(speed)),
  setOrbitProgress: (progress) => setActiveOrbitProgress(Number(progress)),
  setSignals: (visible) => setSignalsVisible(Boolean(visible)),
  setZones: (visible) => setZonesVisible(Boolean(visible)),
  getTrackingState
};

on(playPause, "click", togglePaused);
on(resetView, "click", () => resetCamera(true));
on(tourMode, "click", toggleTour);
on(captureView, "click", captureScreenshot);
on(toggleLabels, "change", () => {
  state.labelsVisible = toggleLabels.checked;
  shell.classList.toggle("planet-labels-hidden", !state.labelsVisible);
});
on(toggleOrbits, "change", () => {
  state.orbitsVisible = toggleOrbits.checked;
  orbitLines.forEach((line) => {
    line.visible = state.orbitsVisible;
  });
  activeOrbitWake.group.visible = state.orbitsVisible;
});
on(toggleBloom, "change", () => {
  bloomPass.enabled = toggleBloom.checked;
});
on(toggleSignals, "change", () => {
  setSignalsVisible(toggleSignals.checked);
});
on(toggleZones, "change", () => {
  setZonesVisible(toggleZones.checked);
});
on(orbitScrubber, "input", () => {
  state.scrubbingOrbit = true;
  setActiveOrbitProgress(Number(orbitScrubber.value) / ORBIT_SCRUBBER_MAX);
});
on(orbitScrubber, "change", () => {
  state.scrubbingOrbit = false;
  const entry = planetMap.get(state.activeId);
  if (entry) {
    showToast(`${entry.data.name} orbit progress set to ${focusProgress.textContent}.`);
  }
});
on(orbitScrubber, "blur", () => {
  state.scrubbingOrbit = false;
});
on(controls, "start", handleManualCameraStart);
viewModeButtons.forEach((button) => {
  on(button, "click", () => applyCameraView(button.dataset.cameraView, true));
});
speedButtons.forEach((button) => {
  on(button, "click", () => setSpeed(Number(button.dataset.speed)));
});
planetButtons.forEach((button) => {
  on(button, "click", () => setActivePlanet(button.dataset.planet, true));
});
on(renderer.domElement, "pointermove", onPointerMove);
on(renderer.domElement, "pointerleave", clearHover);
on(renderer.domElement, "pointerdown", onPointerDown);
on(renderer.domElement, "pointerup", onPointerUp);
on(renderer.domElement, "pointercancel", onPointerCancel);
on(window, "resize", onResize);
on(window, "keydown", onKeyDown);
on(prefersReducedMotion, "change", (event) => {
  if (event.matches) {
    state.paused = true;
    updatePausedControl();
  }
});

if (state.paused) {
  updatePausedControl();
}
updateMissionStatus();

if (import.meta.hot) {
  import.meta.hot.dispose(destroyApp);
}

animate();

function createSun() {
  const group = new THREE.Group();
  const texture = createSunTexture();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(2.72, 128, 96),
    createSunSurfaceMaterial(texture)
  );
  core.name = "Sun";
  core.add(createSunspots(2.72));
  group.add(core);

  const glowMaterial = createGlowMaterial("#ffd36d", 3.2, 0.36);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(3.32, 96, 96), glowMaterial);
  glow.renderOrder = -1;
  group.add(glow);

  const coronaMaterial = createGlowMaterial("#ff8a3d", 7.4, 0.1);
  const corona = new THREE.Mesh(new THREE.SphereGeometry(4.58, 96, 96), coronaMaterial);
  corona.renderOrder = -2;
  group.add(corona);

  const prominences = createSolarProminences(2.72);
  group.add(prominences);

  return { group, core, glow, corona, prominences };
}

function createSignalLink() {
  const group = new THREE.Group();
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x4da3ff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  line.frustumCulled = false;
  group.add(line);

  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x4da3ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  pulse.frustumCulled = false;

  const pulseGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 32, 16),
    createGlowMaterial("#4da3ff", 2.2, 0.44)
  );
  pulseGlow.frustumCulled = false;
  pulse.add(pulseGlow);
  group.add(pulse);

  const receiver = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 12),
    new THREE.MeshBasicMaterial({
      color: 0x4da3ff,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  receiver.frustumCulled = false;
  group.add(receiver);

  return { group, line, pulse, pulseGlow, receiver, positions };
}

function createActiveOrbitWake() {
  const group = new THREE.Group();
  group.name = "Active orbit wake";
  group.visible = state.orbitsVisible;

  const positions = new Float32Array(ACTIVE_WAKE_POINTS * 3);
  const alphas = new Float32Array(ACTIVE_WAKE_POINTS);
  for (let i = 0; i < ACTIVE_WAKE_POINTS; i += 1) {
    const t = i / (ACTIVE_WAKE_POINTS - 1);
    alphas[i] = 0.08 + Math.pow(t, 1.65) * 0.86;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color("#ffd36d") }
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;

      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vAlpha;

      void main() {
        gl_FragColor = vec4(color, vAlpha * 0.58);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const pointMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color("#ffd36d") },
      pixelRatio: { value: getPixelRatio() }
    },
    vertexShader: `
      attribute float alpha;
      uniform float pixelRatio;
      varying float vAlpha;

      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.35, (2.0 + alpha * 5.6) * pixelRatio * (22.0 / max(1.0, -mvPosition.z)));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vAlpha;

      void main() {
        float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
        float falloff = smoothstep(0.5, 0.08, distanceFromCenter);
        gl_FragColor = vec4(color, falloff * vAlpha * 0.86);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const line = new THREE.Line(geometry, lineMaterial);
  line.frustumCulled = false;
  group.add(line);

  const points = new THREE.Points(geometry, pointMaterial);
  points.frustumCulled = false;
  group.add(points);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 28, 14),
    new THREE.MeshBasicMaterial({
      color: 0xffd36d,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  beacon.frustumCulled = false;

  const beaconGlow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), createGlowMaterial("#ffd36d", 2.25, 0.46));
  beaconGlow.frustumCulled = false;
  beacon.add(beaconGlow);
  group.add(beacon);

  return { group, geometry, positions, line, points, beacon, beaconGlow };
}

function createSystemZones() {
  const group = new THREE.Group();
  const layers = [];
  group.name = "System guide zones";
  group.visible = state.zonesVisible;

  SYSTEM_ZONES.forEach((zone, index) => {
    const zoneGroup = new THREE.Group();
    zoneGroup.name = zone.label;

    const band = new THREE.Mesh(
      new THREE.RingGeometry(zone.inner, zone.outer, 256, 1),
      new THREE.MeshBasicMaterial({
        color: zone.color,
        transparent: true,
        opacity: zone.opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    band.rotation.x = Math.PI * 0.5;
    band.position.y = -0.02 - index * 0.006;
    zoneGroup.add(band);

    const innerEdge = createOrbitLine(zone.inner, zone.color, index, zone.edgeOpacity);
    const outerEdge = createOrbitLine(zone.outer, zone.color, index, zone.edgeOpacity * 0.74);
    innerEdge.position.y = 0.025 + index * 0.006;
    outerEdge.position.y = 0.025 + index * 0.006;
    zoneGroup.add(innerEdge, outerEdge);

    layers.push({
      band,
      innerEdge,
      outerEdge,
      baseOpacity: zone.opacity,
      edgeOpacity: zone.edgeOpacity
    });
    group.add(zoneGroup);
  });

  return { group, layers };
}

function createSunSurfaceMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec2 drift = vec2(time * 0.006, sin(time * 0.08) * 0.002);
        vec3 surface = texture2D(map, vUv + drift).rgb;
        float face = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
        float limb = 1.0 - face;
        float centerLight = smoothstep(0.08, 0.74, face);
        vec3 rimHeat = vec3(1.0, 0.34, 0.04) * pow(limb, 2.35);
        vec3 hotCore = vec3(1.0, 0.86, 0.34) * pow(centerLight, 1.8) * 0.22;
        vec3 color = surface * (0.72 + centerLight * 0.34) + rimHeat * 0.42 + hotCore;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

function createSolarProminences(radius) {
  const group = new THREE.Group();
  const flareMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7b32,
    transparent: true,
    opacity: 0.64,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const arcs = [
    { start: -0.54, length: 0.82, rise: 0.46, rotate: [18, -28, 22], scale: 1 },
    { start: 1.05, length: 0.55, rise: 0.34, rotate: [-12, 34, -16], scale: 0.72 },
    { start: 2.66, length: 0.62, rise: 0.38, rotate: [24, 12, 96], scale: 0.82 },
    { start: 4.18, length: 0.52, rise: 0.32, rotate: [-24, -18, 158], scale: 0.68 }
  ];

  arcs.forEach((arc, index) => {
    const points = [];
    for (let i = 0; i <= 28; i += 1) {
      const t = i / 28;
      const angle = arc.start + arc.length * t;
      const lift = Math.sin(t * Math.PI) * radius * arc.rise;
      const currentRadius = radius * (1.04 + lift / radius);
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * currentRadius,
          Math.sin(angle) * currentRadius,
          Math.sin(t * Math.PI) * radius * 0.08
        )
      );
    }

    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      48,
      radius * 0.018 * arc.scale,
      8,
      false
    );
    const prominence = new THREE.Mesh(geometry, flareMaterial.clone());
    prominence.material.opacity = 0.38 + index * 0.08;
    prominence.rotation.set(
      arc.rotate[0] * DEG,
      arc.rotate[1] * DEG,
      arc.rotate[2] * DEG
    );
    group.add(prominence);
  });

  return group;
}

function createSunspots(radius) {
  const group = new THREE.Group();
  const spots = [
    { direction: [-0.42, 0.22, 0.88], size: 0.17, stretch: 1.75 },
    { direction: [0.22, -0.36, 0.91], size: 0.12, stretch: 1.45 },
    { direction: [0.5, 0.15, 0.85], size: 0.095, stretch: 1.35 },
    { direction: [-0.12, 0.5, 0.86], size: 0.075, stretch: 1.2 }
  ];

  spots.forEach((spot) => {
    const direction = new THREE.Vector3(...spot.direction).normalize();
    const anchor = new THREE.Group();
    anchor.position.copy(direction.clone().multiplyScalar(radius * 1.012));
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const penumbra = new THREE.Mesh(
      new THREE.CircleGeometry(spot.size, 48),
      new THREE.MeshBasicMaterial({
        color: 0x7d2a12,
        transparent: true,
        opacity: 0.54,
        depthWrite: false
      })
    );
    penumbra.scale.x = spot.stretch;
    anchor.add(penumbra);

    const umbra = new THREE.Mesh(
      new THREE.CircleGeometry(spot.size * 0.42, 40),
      new THREE.MeshBasicMaterial({
        color: 0x2b0b06,
        transparent: true,
        opacity: 0.68,
        depthWrite: false
      })
    );
    umbra.position.z = 0.002;
    umbra.scale.x = spot.stretch * 0.84;
    anchor.add(umbra);

    group.add(anchor);
  });

  return group;
}

function createPlanets() {
  PLANETS.forEach((planet, index) => {
    const orbitPivot = new THREE.Group();
    orbitPivot.rotation.z = planet.inclination * DEG;
    orbitRoot.add(orbitPivot);

    const phase = (index / PLANETS.length) * TAU + index * 0.23;
    const bodyAnchor = new THREE.Group();
    bodyAnchor.position.set(
      Math.cos(phase) * planet.distance,
      0,
      Math.sin(phase) * planet.distance
    );
    orbitPivot.add(bodyAnchor);

    const material = new THREE.MeshStandardMaterial({
      map: createPlanetTexture(planet),
      roughness: planet.texture === "ice" ? 0.72 : 0.88,
      metalness: 0,
      emissive: new THREE.Color(planet.color).multiplyScalar(0.045),
      emissiveIntensity: planet.texture === "gas" ? 0.3 : 0.12
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.radius, 96, 64), material);
    mesh.rotation.z = planet.axialTilt * DEG;
    mesh.userData.planetId = planet.id;
    bodyAnchor.add(mesh);
    pickables.push(mesh);

    if (planet.atmosphere) {
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius * 1.045, 96, 64),
        createGlowMaterial(planet.atmosphere, 3.1, PLANET_ATMOSPHERE_GLOW_INTENSITY)
      );
      bodyAnchor.add(atmosphere);
    }

    if (planet.storm) {
      const storm = createStormSpot(planet.radius);
      mesh.add(storm);
    }

    if (planet.rings) {
      bodyAnchor.add(createRingSystem(planet));
    }

    let moonSystem = null;
    if (planet.moons?.length) {
      moonSystem = createMoonSystem(planet);
      bodyAnchor.add(moonSystem.group);
    }

    const label = document.createElement("div");
    label.className = "planet-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = planet.name;
    const labelObject = new CSS2DObject(label);
    const labelLift = planet.distance < 12 ? 0.7 + index * 0.08 : 0.48;
    labelObject.position.set(0, planet.radius + labelLift, 0);
    bodyAnchor.add(labelObject);

    const orbitLine = createOrbitLine(planet.distance, planet.color, index);
    orbitPivot.add(orbitLine);
    orbitLines.push(orbitLine);

    const marker = createPlanetMarker(planet);
    marker.visible = planet.id === state.activeId;
    bodyAnchor.add(marker);

    planetMap.set(planet.id, {
      data: planet,
      orbitPivot,
      bodyAnchor,
      mesh,
      marker,
      moonSystem,
      label,
      labelObject,
      phase,
      currentAngle: phase
    });
  });
}

function createDwarfObjects() {
  DWARF_OBJECTS.forEach((object, index) => {
    const orbitPivot = new THREE.Group();
    orbitPivot.rotation.z = object.inclination * DEG;
    orbitRoot.add(orbitPivot);

    const phase = object.phase ?? (index / DWARF_OBJECTS.length) * TAU;
    const bodyAnchor = new THREE.Group();
    bodyAnchor.position.set(
      Math.cos(phase) * object.distance,
      0,
      Math.sin(phase) * object.distance
    );
    orbitPivot.add(bodyAnchor);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(object.radius, 48, 32),
      new THREE.MeshStandardMaterial({
        map: createMoonTexture(object.id, object.color),
        roughness: 0.88,
        metalness: 0,
        emissive: new THREE.Color(object.color).multiplyScalar(0.06),
        emissiveIntensity: 0.28
      })
    );
    mesh.name = object.name;
    bodyAnchor.add(mesh);

    const beacon = createDwarfBeacon(object);
    bodyAnchor.add(beacon);

    const label = document.createElement("div");
    label.className = "dwarf-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = object.name;
    label.title = object.region;
    const labelObject = new CSS2DObject(label);
    labelObject.position.set(0, object.radius + 0.42, 0);
    bodyAnchor.add(labelObject);

    const orbitLine = createOrbitLine(object.distance, object.color, index, 0.1);
    orbitLine.visible = state.orbitsVisible;
    orbitPivot.add(orbitLine);
    orbitLines.push(orbitLine);

    dwarfObjectEntries.push({
      data: object,
      bodyAnchor,
      mesh,
      beacon,
      phase,
      currentAngle: phase
    });
  });
}

function createDwarfBeacon(object) {
  const group = new THREE.Group();
  const ringRadius = Math.max(object.radius * 3.1, 0.36);
  const ring = createMarkerRing(
    ringRadius,
    new THREE.LineBasicMaterial({
      color: object.color,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.scale.z = 0.62;
  group.add(ring);

  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(object.radius * 0.5, 0.055), 18, 10),
    new THREE.MeshBasicMaterial({
      color: object.color,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glint.position.y = ringRadius * 0.82;
  group.add(glint);

  return group;
}

function createMoonSystem(planet) {
  const group = new THREE.Group();
  const moons = planet.moons.map((moon, index) => {
    const orbitRadius = planet.radius * moon.distance;
    const moonRadius = Math.max(planet.radius * moon.radius, 0.028);
    const pivot = new THREE.Group();
    pivot.rotation.z = (moon.inclination || 0) * DEG;
    pivot.rotation.y = moon.phase || (index / planet.moons.length) * TAU;
    group.add(pivot);

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 48, 32),
      new THREE.MeshStandardMaterial({
        map: createMoonTexture(`${planet.id}-${moon.name}`, moon.color),
        roughness: 0.9,
        metalness: 0,
        emissive: new THREE.Color(moon.color || "#d8d9d8").multiplyScalar(0.025),
        emissiveIntensity: 0.22
      })
    );
    moonMesh.name = moon.name;
    moonMesh.position.set(orbitRadius, 0.04 + index * 0.012, 0);
    pivot.add(moonMesh);

    if (moon.haze) {
      const haze = new THREE.Mesh(
        new THREE.SphereGeometry(moonRadius * 1.35, 40, 24),
        createGlowMaterial(moon.haze, 2.7, 0.2)
      );
      moonMesh.add(haze);
    }

    const orbit = createOrbitLine(orbitRadius, moon.color || "#dbe2ee", index, 0.12);
    orbit.visible = state.orbitsVisible;
    orbit.scale.z = 0.98;
    group.add(orbit);
    orbitLines.push(orbit);

    return {
      pivot,
      mesh: moonMesh,
      speed: moon.speed,
      spin: moon.spin ?? moon.speed * 0.6
    };
  });

  return { group, moons };
}

function createPlanetMarker(planet) {
  const group = new THREE.Group();
  const ringRadius = Math.max(planet.radius * 1.95, 0.66);
  const primary = createMarkerRing(
    ringRadius,
    new THREE.LineBasicMaterial({
      color: 0xffd36d,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  primary.scale.z = 0.72;
  group.add(primary);

  const vertical = createMarkerRing(
    ringRadius * 1.08,
    new THREE.LineBasicMaterial({
      color: planet.color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  vertical.rotation.x = Math.PI * 0.5;
  vertical.scale.z = 0.56;
  group.add(vertical);

  const tickMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff0b0,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (let i = 0; i < 4; i += 1) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(ringRadius * 0.18, ringRadius * 0.018, ringRadius * 0.018),
      tickMaterial
    );
    const angle = (i / 4) * TAU;
    tick.position.set(Math.cos(angle) * ringRadius, 0, Math.sin(angle) * ringRadius * 0.72);
    tick.rotation.y = -angle;
    group.add(tick);
  }

  return group;
}

function createMarkerRing(radius, material) {
  const points = [];
  const segments = 120;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
}

function createRingSystem(planet) {
  const group = new THREE.Group();
  group.rotation.x = Math.PI * 0.5;
  group.rotation.y = planet.axialTilt * DEG;

  const ringTexture = createRingTexture(planet.rings.color);
  const geometry = new THREE.RingGeometry(
    planet.radius * planet.rings.inner,
    planet.radius * planet.rings.outer,
    256,
    3
  );
  const material = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: planet.rings.color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: planet.rings.opacity || 0.52,
    depthWrite: false
  });

  const ring = new THREE.Mesh(geometry, material);
  group.add(ring);

  const outerGeometry = new THREE.RingGeometry(
    planet.radius * planet.rings.outer * 1.03,
    planet.radius * planet.rings.outer * 1.08,
    256,
    1
  );
  const outer = new THREE.Mesh(
    outerGeometry,
    new THREE.MeshBasicMaterial({
      color: planet.rings.color,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  group.add(outer);
  return group;
}

function createOrbitLine(distance, color, index = 0, opacity = 0.25) {
  const points = [];
  const segments = 320;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: opacity + (index % 2) * 0.04,
    blending: THREE.AdditiveBlending
  });
  return new THREE.LineLoop(geometry, material);
}

function createStarfield() {
  const count = 18000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const random = createSeededRandom("starfield");

  for (let i = 0; i < count; i += 1) {
    const radius = 105 + random() * 95;
    const theta = random() * TAU;
    const phi = Math.acos(2 * random() - 1);
    const index = i * 3;
    positions[index] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index + 1] = radius * Math.cos(phi);
    positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const warmth = random();
    color.setHSL(lerp(0.58, 0.12, warmth * 0.28), lerp(0.12, 0.45, warmth), lerp(0.58, 1, random()));
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  scene.add(new THREE.Points(geometry, material));
}

function createMilkyWayBand() {
  const count = 9500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const random = createSeededRandom("milky-way");

  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const radius = 92 + random() * 76;
    const band = (random() - 0.5) * 18;
    const index = i * 3;
    positions[index] = Math.cos(angle) * radius;
    positions[index + 1] = band + Math.sin(angle * 2.0) * 5;
    positions[index + 2] = Math.sin(angle) * radius;

    color.setHSL(0.56 + random() * 0.08, 0.45, 0.45 + random() * 0.3);
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.13,
    transparent: true,
    opacity: 0.24,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const band = new THREE.Points(geometry, material);
  band.rotation.z = 18 * DEG;
  scene.add(band);
}

function createAsteroidBelt() {
  const count = 17000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const random = createSeededRandom("asteroid-belt");

  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const radius = 13.1 + random() * 2.25 + Math.sin(angle * 7) * 0.25;
    const index = i * 3;
    positions[index] = Math.cos(angle) * radius;
    positions[index + 1] = (random() - 0.5) * 0.42;
    positions[index + 2] = Math.sin(angle) * radius;
    color.setHSL(0.08 + random() * 0.05, 0.2, 0.38 + random() * 0.2);
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });

  const belt = new THREE.Points(geometry, material);
  systemRoot.add(belt);
}

function createKuiperDust() {
  const count = 6000;
  const positions = new Float32Array(count * 3);
  const random = createSeededRandom("kuiper-dust");

  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const radius = 38 + random() * 12;
    const index = i * 3;
    positions[index] = Math.cos(angle) * radius;
    positions[index + 1] = (random() - 0.5) * 1.7;
    positions[index + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x8eb7ff,
    size: 0.042,
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });

  systemRoot.add(new THREE.Points(geometry, material));
}

function createSolarWind() {
  const positions = new Float32Array(SOLAR_WIND_PARTICLES * 3);
  const colors = new Float32Array(SOLAR_WIND_PARTICLES * 3);
  const radii = new Float32Array(SOLAR_WIND_PARTICLES);
  const angles = new Float32Array(SOLAR_WIND_PARTICLES);
  const yOffsets = new Float32Array(SOLAR_WIND_PARTICLES);
  const speeds = new Float32Array(SOLAR_WIND_PARTICLES);
  const lanes = new Float32Array(SOLAR_WIND_PARTICLES);
  const random = createSeededRandom("solar-wind");
  const color = new THREE.Color();

  for (let i = 0; i < SOLAR_WIND_PARTICLES; i += 1) {
    radii[i] =
      SOLAR_WIND_MIN_RADIUS +
      Math.pow(random(), 1.55) * (SOLAR_WIND_MAX_RADIUS - SOLAR_WIND_MIN_RADIUS);
    angles[i] = random() * TAU;
    yOffsets[i] = (random() - 0.5) * 3.8;
    speeds[i] = 4.8 + random() * 10.5;
    lanes[i] = random() * TAU;

    const warmth = random();
    color.setHSL(lerp(0.54, 0.13, warmth), 0.72, lerp(0.48, 0.72, random()));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    const index = i * 3;
    const scale = Math.pow(radii[i] / SOLAR_WIND_MAX_RADIUS, 0.82);
    positions[index] = Math.cos(angles[i]) * radii[i];
    positions[index + 1] = yOffsets[i] * scale;
    positions[index + 2] = Math.sin(angles[i]) * radii[i];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.075,
    transparent: true,
    opacity: 0.34,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.name = "Solar wind";
  points.frustumCulled = false;

  return { points, geometry, positions, radii, angles, yOffsets, speeds, lanes };
}

function createCometTracks() {
  const cometMaterial = new THREE.MeshBasicMaterial({
    color: 0x9eefff,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < 3; i += 1) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (18 + i * 13) * DEG;
    pivot.rotation.x = (12 - i * 9) * DEG;

    const orbit = createEllipticalOrbit(18 + i * 7, 5.5 + i * 2.4, "#76e4ff", 0.1);
    pivot.add(orbit);

    const comet = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.015, 20, 12), cometMaterial);
    comet.userData.speed = 0.1 + i * 0.04;
    comet.userData.major = 18 + i * 7;
    comet.userData.minor = 5.5 + i * 2.4;
    comet.userData.phase = i * 1.8;

    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 + i * 0.02, 1.4 + i * 0.35, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x76e4ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    tail.rotation.z = -Math.PI * 0.5;
    tail.position.x = 0.68 + i * 0.18;
    comet.add(tail);

    pivot.add(comet);
    pivot.userData.comet = comet;
    orbitRoot.add(pivot);
  }
}

function createEllipticalOrbit(major, minor, color, opacity) {
  const points = [];
  for (let i = 0; i <= 260; i += 1) {
    const angle = (i / 260) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * major, 0, Math.sin(angle) * minor));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending
    })
  );
}

function createStormSpot(radius) {
  const spot = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.18, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0xc45b3f,
      transparent: true,
      opacity: 0.78
    })
  );
  spot.position.set(radius * 0.72, -radius * 0.16, radius * 0.66);
  spot.scale.set(1.65, 0.62, 0.18);
  spot.rotation.z = -13 * DEG;
  return spot;
}

function createGlowMaterial(color, power = 2.5, intensity = 0.5) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      power: { value: power },
      intensity: { value: intensity }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
        float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), power);
        gl_FragColor = vec4(glowColor, fresnel * intensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
}

function createPlanetTexture(planet) {
  const width = 1024;
  const height = 512;
  const canvasTexture = createCanvasTexture(width, height, (ctx, image) => {
    const color = new THREE.Color();
    const colors = planet.palette.map((item) => new THREE.Color(item));

    for (let y = 0; y < height; y += 1) {
      const v = y / height;
      const latitude = Math.abs(v - 0.5) * 2;

      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        const noise = fbm(u * 10.5, v * 7.5, hashString(planet.id), 5);
        const fine = fbm(u * 35.0, v * 18.0, hashString(planet.id) + 12.6, 3);
        let output;

        if (planet.texture === "earth") {
          output = sampleEarth(u, v, latitude, noise, fine, colors);
        } else if (planet.texture === "venus") {
          output = sampleVenus(u, v, noise, fine, colors);
        } else if (planet.texture === "mars") {
          output = sampleMars(u, v, latitude, noise, fine, colors);
        } else if (planet.texture === "gas") {
          output = sampleGasGiant(u, v, noise, fine, colors, planet.id === "jupiter");
        } else if (planet.texture === "ice") {
          output = sampleIceGiant(u, v, noise, fine, colors);
        } else {
          output = sampleRock(u, v, latitude, noise, fine, colors);
        }

        color.copy(output);
        color.convertLinearToSRGB();
        const index = (y * width + x) * 4;
        image.data[index] = Math.round(clamp(color.r, 0, 1) * 255);
        image.data[index + 1] = Math.round(clamp(color.g, 0, 1) * 255);
        image.data[index + 2] = Math.round(clamp(color.b, 0, 1) * 255);
        image.data[index + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  });

  canvasTexture.colorSpace = THREE.SRGBColorSpace;
  canvasTexture.anisotropy = 8;
  return canvasTexture;
}

function createMoonTexture(seedText = "moon", colorValue = "#8d9094") {
  const width = 512;
  const height = 256;
  return createCanvasTexture(width, height, (ctx, image) => {
    const base = new THREE.Color(colorValue);
    const dark = base.clone().multiplyScalar(0.48);
    const light = base.clone().lerp(new THREE.Color("#ffffff"), 0.58);
    const seed = hashString(seedText);
    const color = new THREE.Color();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        const v = y / height;
        const n = fbm(u * 18, v * 9, seed + 8.1, 5);
        const crater = Math.pow(Math.max(0, 1 - Math.abs(fbm(u * 45, v * 24, seed + 44.2, 2) - 0.53) * 18), 2);
        color.copy(base).lerp(dark, n * 0.48).lerp(light, crater * 0.24);
        color.convertLinearToSRGB();
        const index = (y * width + x) * 4;
        image.data[index] = Math.round(clamp(color.r, 0, 1) * 255);
        image.data[index + 1] = Math.round(clamp(color.g, 0, 1) * 255);
        image.data[index + 2] = Math.round(clamp(color.b, 0, 1) * 255);
        image.data[index + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  });
}

function createSunTexture() {
  const width = 1024;
  const height = 512;
  const texture = createCanvasTexture(width, height, (ctx, image) => {
    const color = new THREE.Color();
    const core = new THREE.Color("#fff7b8");
    const gold = new THREE.Color("#ffd24f");
    const orange = new THREE.Color("#ff8428");
    const ember = new THREE.Color("#bd2e16");
    const umbra = new THREE.Color("#39120c");
    const spots = [
      { u: 0.18, v: 0.46, r: 0.032 },
      { u: 0.31, v: 0.57, r: 0.022 },
      { u: 0.57, v: 0.41, r: 0.026 },
      { u: 0.76, v: 0.52, r: 0.019 },
      { u: 0.88, v: 0.36, r: 0.015 }
    ];

    for (let y = 0; y < height; y += 1) {
      const v = y / height;
      const latitude = Math.abs(v - 0.5) * 2;
      const activeBand = 1 - smoothstep(0.34, 0.92, latitude);

      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        const flow = fbm(u * 3.2, v * 2.4, 19, 4);
        const cells = fbm(u * 74 + flow * 4.8, v * 38 + flow * 3.2, 31.4, 4);
        const fine = fbm(u * 145 + flow * 8.4, v * 70, 89.2, 2);
        const filament =
          Math.sin((u + flow * 0.16) * TAU * 13 + v * 25) * 0.5 +
          Math.sin((u - flow * 0.11) * TAU * 21 - v * 16) * 0.25 +
          0.5;
        const brightNetwork = Math.pow(smoothstep(0.45, 0.86, cells + fine * 0.24), 1.35);
        const hotPlage = Math.pow(smoothstep(0.5, 0.95, fbm(u * 12, v * 6, 117.6, 4)), 2) * activeBand;
        let penumbra = 0;
        let darkCore = 0;

        spots.forEach((spot) => {
          const du = Math.min(Math.abs(u - spot.u), 1 - Math.abs(u - spot.u));
          const dv = (v - spot.v) * 1.75;
          const distance = Math.hypot(du, dv);
          penumbra = Math.max(penumbra, 1 - smoothstep(spot.r, spot.r * 2.4, distance));
          darkCore = Math.max(darkCore, 1 - smoothstep(spot.r * 0.34, spot.r * 0.72, distance));
        });

        color
          .copy(orange)
          .lerp(gold, 0.34 + brightNetwork * 0.48)
          .lerp(core, hotPlage * 0.28)
          .lerp(ember, smoothstep(0.45, 1.08, filament) * 0.24)
          .lerp(ember, penumbra * 0.58)
          .lerp(umbra, darkCore * 0.82);

        color.convertLinearToSRGB();
        const index = (y * width + x) * 4;
        image.data[index] = Math.round(clamp(color.r, 0, 1) * 255);
        image.data[index + 1] = Math.round(clamp(color.g, 0, 1) * 255);
        image.data[index + 2] = Math.round(clamp(color.b, 0, 1) * 255);
        image.data[index + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRingTexture(colorValue) {
  const width = 512;
  const height = 24;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const base = new THREE.Color(colorValue);
  const color = new THREE.Color();
  const image = ctx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const band = Math.sin(u * TAU * 18) * 0.5 + 0.5;
      const gap = Math.sin(u * TAU * 5 + 1.2) * 0.5 + 0.5;
      const alpha = clamp(0.18 + band * 0.55 - Math.pow(gap, 8) * 0.42, 0.02, 0.9);
      const shade = 0.72 + band * 0.35;
      color.setRGB(base.r * shade, base.g * shade, base.b * shade).convertLinearToSRGB();
      const index = (y * width + x) * 4;
      image.data[index] = Math.round(clamp(color.r, 0, 1) * 255);
      image.data[index + 1] = Math.round(clamp(color.g, 0, 1) * 255);
      image.data[index + 2] = Math.round(clamp(color.b, 0, 1) * 255);
      image.data[index + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCanvasTexture(width, height, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  const image = ctx.createImageData(width, height);
  painter(ctx, image);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function sampleEarth(u, v, latitude, noise, fine, colors) {
  const ocean = colors[1].clone().lerp(colors[0], latitude * 0.35);
  const land = colors[2].clone().lerp(colors[3], fine * 0.38);
  const coast = smoothstep(0.46, 0.54, noise + Math.sin(u * TAU * 3.0 + v * 8) * 0.04);
  const polar = smoothstep(0.78, 0.93, latitude);
  const cloud = Math.pow(smoothstep(0.56, 0.78, fbm(u * 22 + 4, v * 15, 71.3, 4)), 2) * 0.26;
  return ocean.lerp(land, coast).lerp(new THREE.Color("#ffffff"), polar * 0.74 + cloud);
}

function sampleVenus(u, v, noise, fine, colors) {
  const streak = Math.sin(v * TAU * 9 + noise * 5.5 + u * 3.4) * 0.5 + 0.5;
  return colors[1].clone().lerp(colors[2], streak * 0.55).lerp(colors[3], fine * 0.24);
}

function sampleMars(u, v, latitude, noise, fine, colors) {
  const crater = Math.pow(Math.max(0, 1 - Math.abs(fbm(u * 34, v * 18, 12.7, 2) - 0.48) * 16), 2);
  const polar = smoothstep(0.82, 0.98, latitude);
  return colors[1]
    .clone()
    .lerp(colors[2], noise * 0.78)
    .lerp(colors[0], crater * 0.55)
    .lerp(new THREE.Color("#f5e2cd"), polar * 0.68)
    .lerp(colors[3], fine * 0.18);
}

function sampleGasGiant(u, v, noise, fine, colors, isJupiter) {
  const wave = Math.sin(v * TAU * (isJupiter ? 13 : 9) + noise * 3.6 + u * 1.2);
  const ribbon = smoothstep(-0.24, 0.68, wave);
  const turbulence = Math.sin((u + fine * 0.12) * TAU * 12 + v * 7) * 0.5 + 0.5;
  return colors[0]
    .clone()
    .lerp(colors[1], ribbon)
    .lerp(colors[2], turbulence * 0.36)
    .lerp(colors[3], Math.pow(1 - Math.abs(v - 0.5) * 2, 1.8) * 0.14);
}

function sampleIceGiant(u, v, noise, fine, colors) {
  const band = Math.sin(v * TAU * 6 + fine * 4 + u * 1.7) * 0.5 + 0.5;
  return colors[1].clone().lerp(colors[2], 0.48 + band * 0.22).lerp(colors[3], noise * 0.18);
}

function sampleRock(u, v, latitude, noise, fine, colors) {
  const crater = Math.pow(Math.max(0, 1 - Math.abs(fbm(u * 42, v * 21, 9.4, 2) - 0.5) * 14), 2);
  return colors[1].clone().lerp(colors[2], noise * 0.74).lerp(colors[0], crater * 0.52 + latitude * 0.1).lerp(colors[3], fine * 0.16);
}

function fbm(x, y, seed, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + i * 17.17);
    total += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }

  return value / total;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const topLeft = random2(xi, yi, seed);
  const topRight = random2(xi + 1, yi, seed);
  const bottomLeft = random2(xi, yi + 1, seed);
  const bottomRight = random2(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return lerp(lerp(topLeft, topRight, u), lerp(bottomLeft, bottomRight, u), v);
}

function random2(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 1000;
}

function createSeededRandom(seedText) {
  let seed = Math.floor(hashString(seedText) * 1_000_000) || 1;
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);
  const visualDelta = state.paused ? 0 : delta;
  const scaledDelta = state.paused ? 0 : delta * state.speed;

  state.simDays += scaledDelta * SIM_DAYS_PER_SECOND;
  state.visualTime += visualDelta;

  sun.core.material.uniforms.time.value = state.visualTime;
  sun.core.rotation.y += visualDelta * 0.035;
  sun.glow.rotation.y -= visualDelta * 0.018;
  sun.corona.rotation.z += visualDelta * 0.01;
  sun.prominences.rotation.y += visualDelta * 0.035;
  orbitRoot.rotation.y += visualDelta * 0.004;

  planetMap.forEach((entry) => {
    const { data, bodyAnchor, mesh, marker, moonSystem } = entry;
    const angle = entry.phase + (state.simDays / data.orbitDays) * TAU;
    bodyAnchor.position.set(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance);

    const rotationDirection = data.rotationHours < 0 ? -1 : 1;
    const rotationSpeed = (Math.abs(data.rotationHours) > 0 ? 24 / Math.abs(data.rotationHours) : 1) * 0.42;
    mesh.rotation.y += rotationDirection * scaledDelta * rotationSpeed;

    if (moonSystem) {
      moonSystem.moons.forEach((moon) => {
        moon.pivot.rotation.y += scaledDelta * moon.speed;
        moon.mesh.rotation.y += scaledDelta * moon.spin;
      });
    }

    entry.currentAngle = angle;

    if (marker.visible) {
      const pulse = 1 + Math.sin(state.visualTime * 2.6) * 0.035;
      marker.rotation.y += visualDelta * 0.5;
      marker.rotation.z += visualDelta * 0.18;
      marker.scale.setScalar(pulse);
    }
  });

  dwarfObjectEntries.forEach((entry, index) => {
    const { data, bodyAnchor, mesh, beacon } = entry;
    const angle = entry.phase + (state.simDays / data.orbitDays) * TAU;
    bodyAnchor.position.set(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance);
    mesh.rotation.y += scaledDelta * 0.18;
    beacon.rotation.y += visualDelta * (0.2 + index * 0.035);
    beacon.rotation.z -= visualDelta * 0.12;
    beacon.scale.setScalar(1 + Math.sin(state.visualTime * 1.7 + index * 0.8) * 0.08);
    entry.currentAngle = angle;
  });

  updateActiveOrbitWake();
  updateSolarWind(visualDelta);
  updateSystemZones();
  updateFocusedTelemetry();
  updateSignalLink();

  orbitRoot.children.forEach((child) => {
    if (!child.userData.comet) return;
    const comet = child.userData.comet;
    comet.userData.phase += scaledDelta * 0.05 * comet.userData.speed;
    const t = comet.userData.phase;
    comet.position.set(
      Math.cos(t) * comet.userData.major,
      0,
      Math.sin(t) * comet.userData.minor
    );
    comet.lookAt(0, 0, 0);
  });

  updateCameraTracking(delta);

  if (state.tour) {
    state.tourTimer += delta;
    if (state.tourTimer > 6.2) {
      state.tourTimer = 0;
      const currentIndex = PLANETS.findIndex((planet) => planet.id === state.activeId);
      const next = PLANETS[(currentIndex + 1) % PLANETS.length];
      setActivePlanet(next.id, true, true);
    }
  }

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);

  if (!window.__SOLAR_READY__) {
    window.__SOLAR_READY__ = true;
    requestAnimationFrame(() => loader.classList.add("is-hidden"));
  }

  animationFrameId = requestAnimationFrame(animate);
}

function setActivePlanet(id, moveCamera = true, quiet = false) {
  const entry = planetMap.get(id);
  if (!entry) return;

  state.activeId = id;
  focusName.textContent = entry.data.name;
  focusType.textContent = entry.data.type;
  focusCopy.textContent = entry.data.copy;
  focusAnnouncement.textContent = `${entry.data.name} selected. ${entry.data.copy}`;
  updateSceneAccessibility(entry);
  focusBadge.textContent = entry.data.orbitDays < 1000 ? "Inner Planet" : "Outer Planet";
  focusPeriod.textContent = `PERIOD ${formatOrbitPeriod(entry.data.orbitDays)}`;
  focusTilt.textContent = `TILT ${entry.data.axialTilt.toFixed(1)} DEG`;
  focusSignal.textContent = `LIGHT ${formatLightTime(entry.data.au)}`;
  focusDay.textContent = `DAY ${formatRotationPeriod(entry.data.rotationHours)}`;
  focusFlux.textContent = `FLUX ${formatSolarFlux(entry.data.au)}`;
  focusPanel.style.setProperty("--focus-color", entry.data.color);
  setSignalLinkColor(entry.data.color);
  attachActiveOrbitWake(entry);
  updateFocusedTelemetry();
  dataGrid.innerHTML = [
    ...Object.entries(entry.data.stats),
    ["Solar flux", `${formatSolarFlux(entry.data.au)} Earth`],
    ["Mean speed", formatOrbitalSpeed(entry.data.au, entry.data.orbitDays)]
  ]
    .map(
      ([label, value]) => `
        <div class="data-point">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`
    )
    .join("");
  detailList.innerHTML = entry.data.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");
  sourceNote.innerHTML = renderSourceNote(entry.data.source);
  focusTags.innerHTML = getPlanetSignature(entry.data)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");

  planetMap.forEach((planetEntry) => {
    const isActive = planetEntry.data.id === id;
    planetEntry.label.classList.toggle("is-active", isActive);
    planetEntry.marker.visible = isActive;
    if (!isActive) {
      planetEntry.marker.scale.setScalar(1);
    }
  });

  if (moveCamera) {
    focusCameraOn(entry);
  } else if (state.followId && state.followId !== id) {
    releasePlanetFollow(false);
  }
  updatePlanetButtonState();

  if (!quiet) {
    showToast(`Tracking ${entry.data.name}. Click empty space to release, or choose another planet.`);
  }
}

function formatOrbitPeriod(days) {
  if (days < 1000) {
    return `${Number(days.toFixed(days % 1 === 0 ? 0 : 1))} D`;
  }

  return `${(days / 365.25).toFixed(days > 20000 ? 0 : 1)} Y`;
}

function formatLightTime(au) {
  const minutes = au * 8.316746;

  if (minutes < 60) {
    return `${Number(minutes.toFixed(minutes < 10 ? 1 : 0))} MIN`;
  }

  return `${(minutes / 60).toFixed(1)} HR`;
}

function formatRotationPeriod(hours) {
  const absoluteHours = Math.abs(hours);
  const prefix = hours < 0 ? "RETRO " : "";

  if (absoluteHours < 48) {
    return `${prefix}${Number(absoluteHours.toFixed(absoluteHours < 10 ? 1 : 0))} H`;
  }

  const days = absoluteHours / 24;
  return `${prefix}${Number(days.toFixed(days < 10 ? 1 : 0))} D`;
}

function formatSolarFlux(au) {
  const flux = 1 / (au * au);

  if (flux >= 10) {
    return `${flux.toFixed(1)}x`;
  }

  if (flux >= 1) {
    return `${flux.toFixed(2)}x`;
  }

  if (flux >= 0.01) {
    return `${flux.toFixed(3)}x`;
  }

  return `${flux.toFixed(4)}x`;
}

function formatOrbitalSpeed(au, orbitDays) {
  const kmPerSecond = (TAU * au * AU_KM) / (orbitDays * 24 * 60 * 60);
  return `${kmPerSecond.toFixed(kmPerSecond < 10 ? 1 : 0)} km/s`;
}

function formatAu(au) {
  if (au < 10) {
    return au.toFixed(au < 1 ? 2 : 1);
  }

  return au.toFixed(0);
}

function formatOrbitalLongitude(angle) {
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.round((normalized / TAU) * 360)
    .toString()
    .padStart(3, "0");
}

function getOrbitProgress(angle) {
  return normalizeAngle(angle) / TAU;
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function shortestAngleDelta(from, to) {
  let delta = normalizeAngle(to) - normalizeAngle(from);

  if (delta > Math.PI) {
    delta -= TAU;
  } else if (delta < -Math.PI) {
    delta += TAU;
  }

  return delta;
}

function getPlanetSignature(planet) {
  return PLANET_SIGNATURES[planet.id] || [planet.type, `${formatAu(planet.au)} AU`, "Active lock"];
}

function renderSourceNote(source) {
  if (!source) {
    return "";
  }

  const url = getTrustedSourceUrl(source.url);
  if (!url) {
    return `Source: ${escapeHtml(source.label)}`;
  }

  return `Source: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    source.label
  )}</a>`;
}

function getTrustedSourceUrl(url) {
  try {
    const sourceUrl = new URL(url);
    return sourceUrl.protocol === "https:" ? sourceUrl.href : "";
  } catch {
    return "";
  }
}

function setActiveOrbitProgress(progress) {
  const entry = planetMap.get(state.activeId);
  if (!entry) {
    return;
  }

  const targetAngle = clamp(progress, 0, 0.999999) * TAU;
  const currentAngle = entry.currentAngle ?? entry.phase;
  const deltaAngle = shortestAngleDelta(currentAngle, targetAngle);
  state.simDays += (deltaAngle / TAU) * entry.data.orbitDays;
  entry.currentAngle = targetAngle;
  entry.bodyAnchor.position.set(
    Math.cos(targetAngle) * entry.data.distance,
    0,
    Math.sin(targetAngle) * entry.data.distance
  );
  updateFocusedTelemetry();
  updateActiveOrbitWake();
  updateSignalLink();
}

function attachActiveOrbitWake(entry) {
  if (activeOrbitWake.group.parent !== entry.orbitPivot) {
    entry.orbitPivot.add(activeOrbitWake.group);
  }

  activeOrbitWake.group.visible = state.orbitsVisible;
  activeOrbitWake.line.material.uniforms.color.value.set(entry.data.color);
  activeOrbitWake.points.material.uniforms.color.value.set(entry.data.color);
  activeOrbitWake.beacon.material.color.set(entry.data.color);
  activeOrbitWake.beaconGlow.material.uniforms.glowColor.value.set(entry.data.color);
  updateActiveOrbitWake();
}

function updateActiveOrbitWake() {
  const entry = planetMap.get(state.activeId);

  if (!entry || activeOrbitWake.group.parent !== entry.orbitPivot) {
    return;
  }

  activeOrbitWake.group.visible = state.orbitsVisible;
  if (!state.orbitsVisible) {
    return;
  }

  const activeAngle = entry.currentAngle ?? entry.phase;
  const trailSpan = clamp(0.92 - entry.data.au * 0.012, 0.48, 0.9);
  const yOffset = 0.018;

  for (let i = 0; i < ACTIVE_WAKE_POINTS; i += 1) {
    const t = i / (ACTIVE_WAKE_POINTS - 1);
    const angle = activeAngle - trailSpan * (1 - t);
    const index = i * 3;
    activeOrbitWake.positions[index] = Math.cos(angle) * entry.data.distance;
    activeOrbitWake.positions[index + 1] = yOffset;
    activeOrbitWake.positions[index + 2] = Math.sin(angle) * entry.data.distance;
  }

  activeOrbitWake.geometry.attributes.position.needsUpdate = true;
  activeOrbitWake.beacon.position.set(
    Math.cos(activeAngle) * entry.data.distance,
    yOffset,
    Math.sin(activeAngle) * entry.data.distance
  );
  activeOrbitWake.beacon.scale.setScalar(
    clamp(entry.data.radius * 0.5, 0.76, 1.25) + Math.sin(state.visualTime * 4.2) * 0.06
  );
}

function updateSolarWind(delta) {
  if (delta <= 0) {
    return;
  }

  for (let i = 0; i < SOLAR_WIND_PARTICLES; i += 1) {
    solarWind.radii[i] += delta * solarWind.speeds[i];
    solarWind.angles[i] += delta * (0.015 + Math.sin(solarWind.lanes[i]) * 0.004);

    if (solarWind.radii[i] > SOLAR_WIND_MAX_RADIUS) {
      solarWind.radii[i] = SOLAR_WIND_MIN_RADIUS + (i % 19) * 0.018;
      solarWind.angles[i] += 0.62;
    }

    const radius = solarWind.radii[i];
    const angle =
      solarWind.angles[i] +
      Math.sin(state.visualTime * 0.18 + solarWind.lanes[i]) * clamp(radius / 90, 0.01, 0.12);
    const scale = Math.pow(radius / SOLAR_WIND_MAX_RADIUS, 0.82);
    const index = i * 3;

    solarWind.positions[index] = Math.cos(angle) * radius;
    solarWind.positions[index + 1] =
      solarWind.yOffsets[i] * scale +
      Math.sin(angle * 2.7 + state.visualTime * 0.35 + solarWind.lanes[i]) * 0.06;
    solarWind.positions[index + 2] = Math.sin(angle) * radius;
  }

  solarWind.geometry.attributes.position.needsUpdate = true;
}

function updateSystemZones() {
  if (!state.zonesVisible) {
    return;
  }

  systemZones.layers.forEach((layer, index) => {
    const pulse = 0.86 + Math.sin(state.visualTime * 0.54 + index * 1.35) * 0.14;
    layer.band.material.opacity = layer.baseOpacity * pulse;
    layer.innerEdge.material.opacity = layer.edgeOpacity * (0.76 + pulse * 0.24);
    layer.outerEdge.material.opacity = layer.edgeOpacity * 0.74 * (0.76 + pulse * 0.24);
  });
}

function updateFocusedTelemetry() {
  const entry = planetMap.get(state.activeId);

  if (!entry) {
    return;
  }

  const angle = entry.currentAngle ?? entry.phase;
  const orbitProgress = getOrbitProgress(angle);
  const progressText = `${Math.round(orbitProgress * 100)}%`;
  const nextTrack = `DIST ${formatAu(entry.data.au)} AU`;
  const nextLongitude = `ORBIT ${formatOrbitalLongitude(angle)} DEG`;
  const scrubberText = `${entry.data.name} orbit ${progressText}, longitude ${formatOrbitalLongitude(angle)} degrees`;

  if (focusTrack.textContent !== nextTrack) {
    focusTrack.textContent = nextTrack;
  }

  if (focusLongitude.textContent !== nextLongitude) {
    focusLongitude.textContent = nextLongitude;
  }

  if (focusProgress.textContent !== progressText) {
    focusProgress.textContent = progressText;
    missionArc.textContent = progressText;
  }

  focusProgressBar.style.width = progressText;
  focusProgressControl.style.setProperty("--progress", progressText);
  if (!state.scrubbingOrbit) {
    orbitScrubber.value = String(Math.round(orbitProgress * ORBIT_SCRUBBER_MAX));
  }
  if (orbitScrubber.getAttribute("aria-valuetext") !== scrubberText) {
    orbitScrubber.setAttribute("aria-valuetext", scrubberText);
  }
  missionGauge.style.setProperty("--orbit-progress", `${orbitProgress * 360}deg`);
  missionTarget.textContent = entry.data.name;
  missionSignal.textContent = focusSignal.textContent;
  missionRange.textContent = `${formatAu(entry.data.au)} AU`;
  missionFlux.textContent = formatSolarFlux(entry.data.au);
  missionDay.textContent = formatRotationPeriod(entry.data.rotationHours);
}

function updateSceneAccessibility(entry) {
  const description = `${entry.data.name}, ${entry.data.type}, ${formatAu(
    entry.data.au
  )} astronomical units from the Sun. ${entry.data.copy}`;
  canvas.setAttribute("aria-label", `Animated 3D solar system tracking ${description}`);
  stage.setAttribute("aria-label", `Interactive 3D solar system currently tracking ${entry.data.name}`);
}

function focusCameraOn(entry) {
  const worldPosition = new THREE.Vector3();
  entry.bodyAnchor.getWorldPosition(worldPosition);
  const radius = entry.data.radius;
  const distance = clamp(radius * 8 + 5.2, 7.5, 15);
  const currentDirection = camera.position.clone().sub(controls.target).normalize();
  const direction =
    currentDirection.lengthSq() > 0.5
      ? currentDirection
      : new THREE.Vector3(0.65, 0.32, 0.68).normalize();

  state.followId = entry.data.id;
  state.followOffset = direction
    .multiplyScalar(distance)
    .add(new THREE.Vector3(0, radius * 1.8 + 0.8, 0));
  lastFollowPosition.copy(worldPosition);
  state.followPositionReady = true;
  state.targetDestination = worldPosition.clone();
  state.cameraDestination = worldPosition.clone().add(state.followOffset);
  setCameraMode("chase");
}

function updatePlanetButtonState() {
  planetButtons.forEach((button) => {
    const isFollowing = button.dataset.planet === state.followId;
    button.classList.toggle("is-active", isFollowing);
    button.setAttribute("aria-pressed", String(isFollowing));
    if (isFollowing) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function applyCameraView(mode, showMessage = false) {
  if (mode === "map") {
    releasePlanetFollow(false);
    state.targetDestination = new THREE.Vector3(0, 0, 0);
    state.cameraDestination = new THREE.Vector3(0.35, 64, 0.35);
    setCameraMode("map");
    if (showMessage) {
      showToast("Map view aligned to the orbital plane.");
    }
    return;
  }

  if (mode === "chase") {
    const entry = planetMap.get(state.activeId);
    if (!entry) return;
    focusCameraOn(entry);
    updatePlanetButtonState();
    if (showMessage) {
      showToast(`Chase view locked to ${entry.data.name}.`);
    }
    return;
  }

  releasePlanetFollow(false);
  state.cameraDestination = null;
  state.targetDestination = null;
  setCameraMode("free");
  if (showMessage) {
    showToast("Free view enabled.");
  }
}

function setCameraMode(mode) {
  state.cameraMode = mode;
  const view = CAMERA_VIEWS.find((item) => item.id === mode) || CAMERA_VIEWS[0];
  const modeLabel = view.label;
  brandMode.textContent = `${modeLabel.toUpperCase()} VIEW`;
  missionMode.textContent = modeLabel;
  viewModeButtons.forEach((button) => {
    const isActive = button.dataset.cameraView === view.id;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function handleManualCameraStart() {
  releasePlanetFollow(false);
  state.cameraDestination = null;
  state.targetDestination = null;
  setCameraMode("free");
}

function resetCamera(showMessage) {
  releasePlanetFollow(false);
  state.targetDestination = new THREE.Vector3(0, 0, 0);
  state.cameraDestination = new THREE.Vector3(0, 19, window.innerWidth < 720 ? 52 : 43);
  setCameraMode("free");
  if (showMessage) {
    showToast("Camera reset to full-system view.");
  }
}

function togglePaused() {
  state.paused = !state.paused;
  updatePausedControl();
}

function updatePausedControl() {
  playPause.innerHTML = state.paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
  playPause.setAttribute("aria-label", state.paused ? "Resume simulation" : "Pause simulation");
  playPause.setAttribute("aria-pressed", String(state.paused));
  playPause.setAttribute("title", state.paused ? "Resume" : "Pause");
  playPause.dataset.tooltip = state.paused ? "Resume" : "Pause";
  createIcons({ icons: LUCIDE_ICONS });
  updateMissionStatus();
}

function toggleTour() {
  state.tour = !state.tour;
  state.tourTimer = 0;
  tourMode.classList.toggle("is-active", state.tour);
  tourMode.setAttribute("aria-pressed", String(state.tour));
  tourMode.setAttribute("aria-label", state.tour ? "Stop guided tour" : "Start guided tour");
  tourMode.dataset.tooltip = state.tour ? "Stop tour" : "Tour";
  updateMissionStatus();
  showToast(state.tour ? "Tour mode is cycling through the planets." : "Tour mode stopped.");
}

function setSpeed(speed) {
  const preset = getClosestSpeedPreset(speed);
  state.speed = preset.speed;
  speedReadout.textContent = preset.label;
  speedRate.textContent = preset.rate;
  brandPace.textContent = preset.rate.toUpperCase();
  missionPace.textContent = preset.label;
  missionPaceRate.textContent = preset.rate;
  speedButtons.forEach((button) => {
    const isActive = Number(button.dataset.speed) === preset.speed;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  showToast(`Orbit pace set to ${preset.label.toLowerCase()} (${preset.rate}).`);
}

function getClosestSpeedPreset(speed) {
  const value = Number(speed);
  if (!Number.isFinite(value)) {
    return SPEED_PRESETS.find((preset) => preset.speed === state.speed) || SPEED_PRESETS[1];
  }

  return SPEED_PRESETS.reduce((closest, preset) => {
    const currentDistance = Math.abs(preset.speed - value);
    const closestDistance = Math.abs(closest.speed - value);
    return currentDistance < closestDistance ? preset : closest;
  }, SPEED_PRESETS[0]);
}

function setSignalsVisible(visible) {
  state.signalsVisible = visible;
  toggleSignals.checked = visible;
  updateSignalLink();
  updateMissionStatus();
  showToast(visible ? "Signal link enabled." : "Signal link hidden.");
}

function updateMissionStatus() {
  if (state.paused) {
    missionStatus.textContent = "PAUSED";
  } else if (state.tour) {
    missionStatus.textContent = "AUTO TOUR";
  } else if (!state.signalsVisible) {
    missionStatus.textContent = "LOCAL VIEW";
  } else {
    missionStatus.textContent = "LIVE LINK";
  }
}

function setZonesVisible(visible) {
  state.zonesVisible = visible;
  toggleZones.checked = visible;
  systemZones.group.visible = visible;
  showToast(visible ? "Guide zones enabled." : "Guide zones hidden.");
}

function setSignalLinkColor(colorValue) {
  signalLink.line.material.color.set(colorValue);
  signalLink.pulse.material.color.set(colorValue);
  signalLink.receiver.material.color.set(colorValue);
  signalLink.pulseGlow.material.uniforms.glowColor.value.set(colorValue);
}

function updateSignalLink() {
  const activeEntry = planetMap.get(state.activeId);
  signalLink.group.visible = state.signalsVisible && Boolean(activeEntry);

  if (!signalLink.group.visible) {
    return;
  }

  sun.group.getWorldPosition(signalSunPosition);
  activeEntry.bodyAnchor.getWorldPosition(signalPlanetPosition);
  signalDirection.copy(signalPlanetPosition).sub(signalSunPosition);
  const linkLength = signalDirection.length();

  if (linkLength <= 0.001) {
    signalLink.group.visible = false;
    return;
  }

  signalDirection.normalize();
  signalStartPosition
    .copy(signalSunPosition)
    .addScaledVector(signalDirection, Math.min(3.35, linkLength * 0.42));
  signalEndPosition
    .copy(signalPlanetPosition)
    .addScaledVector(signalDirection, -Math.min(activeEntry.data.radius * 1.45, linkLength * 0.2));

  signalLink.positions[0] = signalStartPosition.x;
  signalLink.positions[1] = signalStartPosition.y;
  signalLink.positions[2] = signalStartPosition.z;
  signalLink.positions[3] = signalEndPosition.x;
  signalLink.positions[4] = signalEndPosition.y;
  signalLink.positions[5] = signalEndPosition.z;
  signalLink.line.geometry.attributes.position.needsUpdate = true;

  const activeIndex = PLANETS.findIndex((planet) => planet.id === state.activeId);
  const pulseTravel = (state.visualTime * 0.28 + activeIndex * 0.09) % 1;
  signalLink.pulse.position.lerpVectors(signalStartPosition, signalEndPosition, pulseTravel);
  signalLink.pulse.scale.setScalar(clamp(linkLength * 0.011, 0.08, 0.28));
  signalLink.receiver.position.copy(signalEndPosition);
  signalLink.receiver.scale.setScalar(clamp(activeEntry.data.radius * 0.34, 0.08, 0.32));
}

function onPointerMove(event) {
  if (pointerDown.active) {
    clearHover();
    return;
  }

  hoverPointer.clientX = event.clientX;
  hoverPointer.clientY = event.clientY;

  if (hoverPointer.frameId) {
    return;
  }

  hoverPointer.frameId = requestAnimationFrame(updatePointerHover);
}

function clearHover() {
  if (hoverPointer.frameId) {
    cancelAnimationFrame(hoverPointer.frameId);
    hoverPointer.frameId = 0;
  }

  updateHoverState(null);
}

function updatePointerHover() {
  hoverPointer.frameId = 0;
  updateHoverState(getPlanetHitAt(hoverPointer.clientX, hoverPointer.clientY));
}

function updateHoverState(hitId) {
  if (hitId === state.hoveredId) return;

  state.hoveredId = hitId;
  renderer.domElement.style.cursor = hitId ? "pointer" : "";
  planetMap.forEach((entry) => {
    const hovered = entry.data.id === hitId;
    entry.mesh.scale.setScalar(hovered ? 1.08 : 1);
  });
}

function onPointerDown(event) {
  pointerDown.active = true;
  pointerDown.x = event.clientX;
  pointerDown.y = event.clientY;
}

function onPointerUp(event) {
  if (!pointerDown.active) {
    return;
  }

  pointerDown.active = false;
  const movement = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  if (movement > 8) {
    clearHover();
    releasePlanetFollow(false);
    return;
  }

  const hitId = getPlanetHit(event);
  if (hitId) {
    setActivePlanet(hitId, true);
  } else {
    clearHover();
    releasePlanetFollow(true);
  }
}

function onPointerCancel() {
  pointerDown.active = false;
  clearHover();
}

function updateCameraTracking(delta) {
  const followEntry = state.followId ? planetMap.get(state.followId) : null;
  const easing = 1 - Math.pow(0.001, delta);

  if (followEntry) {
    followEntry.bodyAnchor.getWorldPosition(followTargetPosition);
    if (state.followPositionReady) {
      followTargetDelta.copy(followTargetPosition).sub(lastFollowPosition);
      controls.target.add(followTargetDelta);
      camera.position.add(followTargetDelta);
    }
    lastFollowPosition.copy(followTargetPosition);
    state.followPositionReady = true;

    if (state.cameraDestination && state.targetDestination) {
      state.targetDestination.copy(followTargetPosition);
      state.cameraDestination.copy(followTargetPosition).add(state.followOffset);
      camera.position.lerp(state.cameraDestination, easing);
      controls.target.lerp(state.targetDestination, easing);

      if (
        camera.position.distanceTo(state.cameraDestination) < 0.06 &&
        controls.target.distanceTo(state.targetDestination) < 0.04
      ) {
        state.cameraDestination = null;
        state.targetDestination = null;
      }

      return;
    }

    followTargetDelta.copy(followTargetPosition).sub(controls.target);
    controls.target.copy(followTargetPosition);
    camera.position.add(followTargetDelta);
    return;
  }

  if (state.cameraDestination && state.targetDestination) {
    camera.position.lerp(state.cameraDestination, easing);
    controls.target.lerp(state.targetDestination, easing);

    if (camera.position.distanceTo(state.cameraDestination) < 0.06) {
      state.cameraDestination = null;
      state.targetDestination = null;
    }
  }
}

function releasePlanetFollow(showMessage) {
  if (!state.followId) return;

  state.followId = null;
  state.followOffset = null;
  state.followPositionReady = false;
  state.cameraDestination = null;
  state.targetDestination = null;
  setCameraMode("free");
  updatePlanetButtonState();

  if (showMessage) {
    showToast("Planet lock released. Drag to orbit freely or select another planet.");
  }
}

function getTrackingState() {
  const activeEntry = planetMap.get(state.activeId);
  const planetPosition = new THREE.Vector3();

  if (activeEntry) {
    activeEntry.bodyAnchor.getWorldPosition(planetPosition);
  }

  return {
    activeId: state.activeId,
    followId: state.followId,
    cameraMode: state.cameraMode,
    signalsVisible: state.signalsVisible,
    zonesVisible: state.zonesVisible,
    activeAu: activeEntry?.data.au ?? null,
    activeProgress: activeEntry ? getOrbitProgress(activeEntry.currentAngle ?? activeEntry.phase) : null,
    activeLongitude: activeEntry
      ? Number(formatOrbitalLongitude(activeEntry.currentAngle ?? activeEntry.phase))
      : null,
    targetDistance: activeEntry ? controls.target.distanceTo(planetPosition) : null
  };
}

function getPlanetHit(event) {
  return getPlanetHitAt(event.clientX, event.clientY);
}

function getPlanetHitAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  return hit?.object?.userData?.planetId || null;
}

function onKeyDown(event) {
  if (isInteractiveTarget(event.target)) {
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    togglePaused();
  }

  if (event.key.toLowerCase() === "r") {
    resetCamera(true);
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    focusAdjacentPlanet(1);
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    focusAdjacentPlanet(-1);
  }

  const number = Number(event.key);
  if (number >= 1 && number <= PLANETS.length) {
    setActivePlanet(PLANETS[number - 1].id, true);
  }
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.("button, input, select, textarea, [contenteditable='true']"));
}

function focusAdjacentPlanet(direction) {
  const currentIndex = PLANETS.findIndex((planet) => planet.id === state.activeId);
  const nextIndex = (currentIndex + direction + PLANETS.length) % PLANETS.length;
  setActivePlanet(PLANETS[nextIndex].id, true);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  applyResponsiveCameraComposition();
  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  composer.setPixelRatio(getPixelRatio());
  composer.setSize(width, height);
  activeOrbitWake.points.material.uniforms.pixelRatio.value = getPixelRatio();
}

function applyResponsiveCameraComposition() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (width < MOBILE_COMPOSITION_WIDTH) {
    camera.setViewOffset(width, height, 0, Math.round(height * 0.18), width, height);
  } else {
    camera.clearViewOffset();
  }

  camera.updateProjectionMatrix();
}

function getPixelRatio() {
  const cap = window.innerWidth < 720 ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, cap);
}

function captureScreenshot() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `orbital-atlas-${timestamp}.png`;
  composer.render();

  renderer.domElement.toBlob((blob) => {
    if (!blob) {
      showToast("Scene export failed. Try again.");
      return;
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.download = filename;
    link.href = url;
    link.click();
    requestAnimationFrame(() => URL.revokeObjectURL(url));
    showToast("Scene exported as a PNG.");
  }, "image/png");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function sampleCanvas() {
  composer.render();
  const gl = renderer.getContext();
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  let litPixels = 0;
  let brightPixels = 0;
  const stride = 80;

  for (let i = 0; i < pixels.length; i += 4 * stride) {
    const brightness = pixels[i] + pixels[i + 1] + pixels[i + 2];
    if (brightness > 28) litPixels += 1;
    if (brightness > 500) brightPixels += 1;
  }

  const sampled = pixels.length / 4 / stride;
  return {
    width,
    height,
    litRatio: litPixels / sampled,
    brightPixels
  };
}

function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  cleanupCallbacks.push(() => target.removeEventListener(type, handler, options));
}

function destroyApp() {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks.length = 0;
  if (hoverPointer.frameId) {
    cancelAnimationFrame(hoverPointer.frameId);
  }
  cancelAnimationFrame(animationFrameId);
  controls.dispose();
  composer.dispose();
  labelRenderer.domElement.remove();

  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      disposeMaterial(object.material);
    }
  });

  renderer.dispose();
}

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((item) => {
    Object.values(item).forEach((value) => {
      if (value?.isTexture) {
        value.dispose();
      }
    });
    Object.values(item.uniforms || {}).forEach((uniform) => {
      if (uniform?.value?.isTexture) {
        uniform.value.dispose();
      }
    });
    item.dispose();
  });
}
