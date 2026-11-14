import "./style.css";
import * as THREE from "three";
import {
  BOUNDS,
  EYE,
  MAP,
  SKY_YAW_OFFSET,
  mapToWorld,
  sweepYaw,
  sweeps,
  worldToMap,
} from "./scan.js";
import { INTERACT_DISTANCE, displays } from "./displays.js";
import { huntQuestions } from "./hunt.js";

const FACE_FILES = ["px", "nx", "py", "ny", "pz", "nz"];
const ROOM_SIZE = 16;
const base = import.meta.env.BASE_URL;

const canvas = document.querySelector("#view");
const loader = document.querySelector("#loader");
const loadBar = document.querySelector("#load-bar");
const intro = document.querySelector("#intro");
const promptEl = document.querySelector("#prompt");
const toastEl = document.querySelector("#toast");
const mapCanvas = document.querySelector("#minimap");
const mapCtx = mapCanvas.getContext("2d");
const modal = document.querySelector("#modal");
const modalPhoto = document.querySelector("#modal-photo");
const modalTitle = document.querySelector("#modal-title");
const modalCaption = document.querySelector("#modal-caption");
const modalHint = document.querySelector("#modal-hint");
const modalCount = document.querySelector("#modal-count");
const photoStage = document.querySelector(".photo-stage");
const loupe = document.querySelector("#loupe");
const magnifyButton = document.querySelector("#modal-magnify");
const modalPrev = document.querySelector("#modal-prev");
const modalNext = document.querySelector("#modal-next");
const hunt = document.querySelector("#hunt");
const huntScore = document.querySelector("#hunt-score");
const huntToggle = document.querySelector("#hunt-toggle");
const huntPhoto = document.querySelector("#hunt-photo");
const huntQuestion = document.querySelector("#hunt-question");
const huntHint = document.querySelector("#hunt-hint");
const huntAnswer = document.querySelector("#hunt-answer");
const huntHintBtn = document.querySelector("#hunt-hint-btn");
const huntFeedback = document.querySelector("#hunt-feedback");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 100);
camera.rotation.order = "YXZ";

const player = {
  x: sweeps[0].x,
  z: sweeps[0].z,
};
let yaw = Math.atan2(-(sweeps[1].x - sweeps[0].x), -(sweeps[1].z - sweeps[0].z));
let pitch = -0.06;
let touring = false;
let modalOpen = false;
let goal = null;
let toastUntil = 0;
let bob = 0;
const keys = new Set();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const raycaster = new THREE.Raycaster();
raycaster.params.Sprite = { threshold: 0.35 };
const pointer = new THREE.Vector2();
const forward = new THREE.Vector3();
const markerDir = new THREE.Vector3();
const origin = new THREE.Vector3();

let boxes = [];
let markers = [];
let floorImage = null;
let openIndex = -1;
let currentDisplay = null;
let photoIndex = 0;
let magnifyOn = false;
let pointerDown = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inside(x, z) {
  return x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;
}

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function probe(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

async function resolvePhoto(id) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const url = `${base}displays/${id}.${ext}`;
    if (await probe(url)) return { url, placeholder: false };
  }
  return { url: "", placeholder: true };
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function makePlate(display, hot) {
  const plate = document.createElement("canvas");
  plate.width = 256;
  plate.height = 320;
  const context = plate.getContext("2d");
  context.clearRect(0, 0, plate.width, plate.height);
  roundRect(context, 36, 28, 184, 264, 18);
  context.fillStyle = hot ? "rgba(28, 24, 18, 0.94)" : "rgba(16, 14, 12, 0.82)";
  context.fill();
  context.lineWidth = hot ? 6 : 3;
  context.strokeStyle = hot ? "#f0d7a0" : "#c6a15b";
  context.stroke();

  context.fillStyle = display.color;
  roundRect(context, 58, 52, 140, 8, 4);
  context.fill();

  context.fillStyle = display.color;
  context.font = "600 64px 'Cormorant Garamond', Georgia, serif";
  context.textAlign = "center";
  context.fillText(String(displays.indexOf(display) + 1), 128, 150);

  context.fillStyle = "#f4efe6";
  context.font = "400 22px Outfit, sans-serif";
  const title = display.title;
  context.fillText(title.length > 16 ? `${title.slice(0, 15)}…` : title, 128, 196);

  if (hot) {
    context.fillStyle = "#c6a15b";
    context.font = "500 15px Outfit, sans-serif";
    context.fillText("CLICK TO OPEN", 128, 246);
  }

  const texture = new THREE.CanvasTexture(plate);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildMarkers() {
  markers = displays.map((display) => {
    const material = new THREE.SpriteMaterial({
      map: display.plate,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.78, 0.98, 1);
    sprite.userData.display = display;
    sprite.renderOrder = 3;
    scene.add(sprite);
    return sprite;
  });
}

function nearestSweep() {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < sweeps.length; index += 1) {
    const distance = Math.hypot(player.x - sweeps[index].x, player.z - sweeps[index].z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

const fade = { from: 0, to: 0, t: 1 };

function setBoxOpacity(index, opacity) {
  const box = boxes[index];
  box.visible = opacity > 0.015;
  for (const material of box.material) material.opacity = opacity;
}

function updatePanorama(dt) {
  const next = nearestSweep();
  if (next !== fade.to) {
    fade.from = fade.to;
    fade.to = next;
    fade.t = 0;
  }
  fade.t = Math.min(1, fade.t + dt / 0.5);
  const blend = fade.t * fade.t * (3 - 2 * fade.t);
  for (let index = 0; index < boxes.length; index += 1) {
    const sweep = sweeps[index];
    boxes[index].position.set(sweep.x, EYE, sweep.z);
    boxes[index].rotation.set(0, sweepYaw(sweep.quaternion) + SKY_YAW_OFFSET, 0);
  }
  if (fade.from === fade.to) {
    boxes.forEach((_, index) => setBoxOpacity(index, index === fade.to ? 1 : 0));
    return;
  }
  boxes.forEach((_, index) => {
    if (index === fade.from) setBoxOpacity(index, 1 - blend);
    else if (index === fade.to) setBoxOpacity(index, blend);
    else setBoxOpacity(index, 0);
  });
  boxes[fade.from].renderOrder = 0;
  boxes[fade.to].renderOrder = 1;
}

function horizontalDistance(display) {
  const [x, , z] = display.position;
  return Math.hypot(player.x - x, player.z - z);
}

function directionFromSweep(display, target) {
  const sweep = sweeps[display.sweep];
  origin.set(sweep.x, EYE, sweep.z);
  target.set(display.position[0] - sweep.x, display.position[1] - EYE, display.position[2] - sweep.z);
  return target.normalize();
}

function updateMarkers(time) {
  camera.getWorldDirection(forward);
  displays.forEach((display, index) => {
    const sprite = markers[index];
    if (display.sweep !== fade.to) {
      sprite.visible = false;
      return;
    }
    const direction = directionFromSweep(display, markerDir);
    const facing = forward.dot(direction);
    const reach =
      ((ROOM_SIZE / 2) * 0.92) /
      Math.max(Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z), 0.2);
    sprite.position.copy(origin).addScaledVector(direction, reach);
    const near = horizontalDistance(display) <= INTERACT_DISTANCE;
    const visible = facing > 0.08;
    sprite.visible = visible;
    const pulse = near && !reducedMotion ? 1 + Math.sin(time / 280) * 0.045 : 1;
    const distance = Math.max(1.2, camera.position.distanceTo(sprite.position));
    const scale = ((near ? 0.96 : 0.78) * pulse * distance) / 5;
    sprite.scale.set(scale, scale * 1.25, 1);
    const nextMap = near ? display.plateHot : display.plate;
    if (sprite.material.map !== nextMap) {
      sprite.material.map = nextMap;
      sprite.material.needsUpdate = true;
    }
    sprite.material.opacity = visible ? clamp((facing - 0.08) / 0.35, 0.35, 1) : 0;
  });
}

function displayUnderPointer() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markers.filter((marker) => marker.visible), false);
  return hits.length ? hits[0].object.userData.display : null;
}

function updatePrompt() {
  if (!touring || modalOpen) {
    promptEl.hidden = true;
    return;
  }
  camera.getWorldDirection(forward);
  let focused = null;
  let best = 0.55;
  for (const display of displays) {
    if (horizontalDistance(display) > INTERACT_DISTANCE) continue;
    const facing = forward.dot(directionFromSweep(display, markerDir));
    if (facing > best) {
      best = facing;
      focused = display;
    }
  }
  if (!focused) {
    promptEl.hidden = true;
    return;
  }
  promptEl.hidden = false;
  promptEl.textContent = `Click to open · ${focused.title}`;
}

function tryMove(nextX, nextZ) {
  if (inside(nextX, nextZ)) return [nextX, nextZ];
  if (inside(nextX, player.z)) return [nextX, player.z];
  if (inside(player.x, nextZ)) return [player.x, nextZ];
  return [player.x, player.z];
}

function walkTo(x, z) {
  goal = {
    x: clamp(x, BOUNDS.minX, BOUNDS.maxX),
    z: clamp(z, BOUNDS.minZ, BOUNDS.maxZ),
  };
}

function approachDisplay(display) {
  const [x, , z] = display.position;
  const centerX = (BOUNDS.minX + BOUNDS.maxX) / 2;
  const centerZ = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
  let dx = centerX - x;
  let dz = centerZ - z;
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;
  walkTo(x + dx * 0.45, z + dz * 0.45);
}

function showToast(message) {
  toastEl.hidden = false;
  toastEl.textContent = message;
  toastUntil = performance.now() + 2800;
}

function photosOf(display) {
  if (display.photos && display.photos.length) return display.photos;
  return [
    {
      url: display.resolved.url,
      label: "Photo",
      placeholder: Boolean(display.resolved.placeholder),
    },
  ];
}

function showCurrentPhoto() {
  const photos = photosOf(currentDisplay);
  photoIndex = ((photoIndex % photos.length) + photos.length) % photos.length;
  const photo = photos[photoIndex];
  modalPhoto.src = photo.url;
  modalPhoto.alt = `${currentDisplay.title}, ${photo.label}`;
  modalCaption.textContent = photo.label;
  modalCount.hidden = photos.length < 2;
  modalCount.textContent = photos.length > 1 ? `${photoIndex + 1} of ${photos.length}` : "";
  modalHint.hidden = !photo.placeholder;
  modalHint.textContent = photo.placeholder
    ? `Placeholder. Save your photo as public/displays/${currentDisplay.id}.jpg and reload.`
    : "";
  modalPrev.hidden = photos.length < 2;
  modalNext.hidden = photos.length < 2;
  loupe.hidden = true;
}

function shiftPhoto(delta) {
  if (!currentDisplay) return;
  photoIndex += delta;
  showCurrentPhoto();
}

function setMagnify(on) {
  magnifyOn = on;
  magnifyButton.setAttribute("aria-pressed", on ? "true" : "false");
  modalPhoto.classList.toggle("magnify", on);
  if (!on) loupe.hidden = true;
}

function imageContentRect(image) {
  const rect = image.getBoundingClientRect();
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) return null;
  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
  };
}

function moveLoupe(event) {
  if (!magnifyOn || modal.hidden) {
    loupe.hidden = true;
    return;
  }
  const content = imageContentRect(modalPhoto);
  if (!content) {
    loupe.hidden = true;
    return;
  }
  const x = event.clientX - content.left;
  const y = event.clientY - content.top;
  if (x < 0 || y < 0 || x > content.width || y > content.height) {
    loupe.hidden = true;
    return;
  }
  const size = 190;
  const zoom = 2.8;
  const stage = photoStage.getBoundingClientRect();
  loupe.hidden = false;
  loupe.style.left = `${event.clientX - stage.left - size / 2}px`;
  loupe.style.top = `${event.clientY - stage.top - size / 2}px`;
  loupe.style.backgroundImage = `url("${modalPhoto.currentSrc || modalPhoto.src}")`;
  loupe.style.backgroundSize = `${content.width * zoom}px ${content.height * zoom}px`;
  loupe.style.backgroundPosition = `${size / 2 - x * zoom}px ${size / 2 - y * zoom}px`;
}

function openDisplay(display) {
  currentDisplay = display;
  photoIndex = 0;
  openIndex = displays.indexOf(display);
  modalTitle.textContent = display.title;
  showCurrentPhoto();
  modal.hidden = false;
  modalOpen = true;
  promptEl.hidden = true;
}

function closeModal() {
  modal.hidden = true;
  modalOpen = false;
  loupe.hidden = true;
  setMagnify(false);
}

function activateDisplay(display) {
  if (horizontalDistance(display) <= INTERACT_DISTANCE) {
    openDisplay(display);
    return;
  }
  approachDisplay(display);
  showToast("Walk up to the case, then click it to open the photo.");
}

function movement(dt) {
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  camera.position.set(player.x, EYE, player.z);
  camera.updateMatrixWorld();

  let dx = 0;
  let dz = 0;
  if (touring && !modalOpen) {
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    let inputX = 0;
    let inputZ = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) inputZ += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) inputZ -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) inputX += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) inputX -= 1;
    const keyMoving = inputX !== 0 || inputZ !== 0;
    if (keyMoving) goal = null;

    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 3.1 : 1.65;
    if (keyMoving) {
      const length = Math.hypot(inputX, inputZ) || 1;
      const step = speed * dt;
      dx = ((forward.x * inputZ + right.x * inputX) / length) * step;
      dz = ((forward.z * inputZ + right.z * inputX) / length) * step;
    } else if (goal) {
      const gx = goal.x - player.x;
      const gz = goal.z - player.z;
      const length = Math.hypot(gx, gz);
      if (length < 0.12) goal = null;
      else {
        const step = Math.min(length, speed * dt);
        dx = (gx / length) * step;
        dz = (gz / length) * step;
      }
    }
  }

  const moving = Math.hypot(dx, dz) > 0;
  if (moving && !reducedMotion) bob += dt * 9;
  const beforeX = player.x;
  const beforeZ = player.z;
  if (moving) {
    [player.x, player.z] = tryMove(player.x + dx, player.z + dz);
    if (goal && Math.hypot(player.x - beforeX, player.z - beforeZ) < 0.002) goal = null;
  }

  const bobOffset = moving && !reducedMotion ? Math.sin(bob) * 0.018 : 0;
  camera.position.set(player.x, EYE + bobOffset, player.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function drawMinimap() {
  const width = mapCanvas.width;
  const height = mapCanvas.height;
  mapCtx.clearRect(0, 0, width, height);
  if (floorImage) mapCtx.drawImage(floorImage, 0, 0, width, height);
  mapCtx.fillStyle = "rgba(0, 0, 0, 0.18)";
  mapCtx.fillRect(0, 0, width, height);

  for (const sweep of sweeps) {
    const [u, v] = worldToMap(sweep.x, sweep.z);
    mapCtx.beginPath();
    mapCtx.arc(u, v, 7, 0, Math.PI * 2);
    mapCtx.fillStyle = "rgba(244, 239, 230, 0.35)";
    mapCtx.fill();
  }

  displays.forEach((display, index) => {
    const [u, v] = worldToMap(display.position[0], display.position[2]);
    const near = horizontalDistance(display) <= INTERACT_DISTANCE;
    mapCtx.beginPath();
    mapCtx.arc(u, v, near ? 9 : 6, 0, Math.PI * 2);
    mapCtx.fillStyle = display.color;
    mapCtx.fill();
    mapCtx.lineWidth = 2;
    mapCtx.strokeStyle = near ? "#fff8ea" : "#1a140c";
    mapCtx.stroke();
    mapCtx.fillStyle = "#1a140c";
    mapCtx.font = "700 11px Outfit, sans-serif";
    mapCtx.textAlign = "center";
    mapCtx.textBaseline = "middle";
    mapCtx.fillText(String(index + 1), u, v + 0.5);
  });

  const [px, py] = worldToMap(player.x, player.z);
  const facingX = -Math.sin(yaw);
  const facingZ = -Math.cos(yaw);
  mapCtx.save();
  mapCtx.translate(px, py);
  mapCtx.rotate(Math.atan2(facingZ, facingX));
  mapCtx.beginPath();
  mapCtx.moveTo(12, 0);
  mapCtx.lineTo(-8, 6);
  mapCtx.lineTo(-4, 0);
  mapCtx.lineTo(-8, -6);
  mapCtx.closePath();
  mapCtx.fillStyle = "#f4efe6";
  mapCtx.fill();
  mapCtx.restore();
}

function tick(now) {
  const dt = Math.min(0.05, (now - (tick.last || now)) / 1000);
  tick.last = now;
  if (!touring && !reducedMotion) yaw += dt * 0.035;
  movement(dt);
  updatePanorama(dt);
  updateMarkers(now);
  updatePrompt();
  if (toastUntil && now > toastUntil) {
    toastEl.hidden = true;
    toastUntil = 0;
  }
  drawMinimap();
  renderer.render(scene, camera);
}

async function loadSweepBoxes(onProgress) {
  let done = 0;
  const total = sweeps.length * FACE_FILES.length;
  boxes = [];
  for (let index = 0; index < sweeps.length; index += 1) {
    const materials = [];
    for (const face of FACE_FILES) {
      const texture = await loadTexture(`${base}scan/s${index}/${face}.jpg`);
      done += 1;
      onProgress(done / total);
      materials.push(
        new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
          depthWrite: false,
          transparent: true,
          opacity: 0,
          toneMapped: false,
          color: new THREE.Color(1.08, 1.08, 1.08),
        })
      );
    }
    const box = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_SIZE, ROOM_SIZE), materials);
    // The captured faces are shown mirrored on an inward-facing box.
    // Flipping X turns the lettering around while keeping the seams together.
    box.scale.x = -1;
    box.visible = false;
    scene.add(box);
    boxes.push(box);
  }
}

function answersMatch(typed, expected) {
  const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, " ");
  const choices = Array.isArray(expected) ? expected : [expected];
  const given = normalize(typed);
  return given.length > 0 && choices.some((choice) => normalize(choice) === given);
}

function buildHunt() {
  let huntIndex = 0;
  const drafts = huntQuestions.map(() => "");
  const hintsOpen = huntQuestions.map(() => false);

  const refreshStatus = () => {
    const item = huntQuestions[huntIndex];
    const solved = huntQuestions.filter((question, index) =>
      answersMatch(drafts[index], question.answer)
    ).length;
    huntScore.textContent =
      solved === huntQuestions.length ? "Complete" : `${huntIndex + 1} of ${huntQuestions.length}`;
    hunt.classList.toggle("complete", solved === huntQuestions.length);
    const correct = answersMatch(drafts[huntIndex], item.answer);
    huntAnswer.classList.toggle("correct", correct);
    huntFeedback.hidden = !correct;
    huntFeedback.textContent = correct ? "Correct" : "";
  };

  const showQuestion = () => {
    const item = huntQuestions[huntIndex];
    huntPhoto.src = `${base}${encodeURI(item.image)}`;
    huntPhoto.alt = item.question;
    huntQuestion.textContent = item.question;
    huntHint.textContent = item.hint;
    huntHint.hidden = !hintsOpen[huntIndex];
    huntHintBtn.setAttribute("aria-pressed", String(hintsOpen[huntIndex]));
    huntAnswer.value = drafts[huntIndex];
    refreshStatus();
  };

  const step = (direction) => {
    const count = huntQuestions.length;
    huntIndex = (huntIndex + direction + count) % count;
    showQuestion();
  };

  huntAnswer.addEventListener("input", () => {
    drafts[huntIndex] = huntAnswer.value;
    refreshStatus();
  });
  huntHintBtn.addEventListener("click", () => {
    hintsOpen[huntIndex] = !hintsOpen[huntIndex];
    showQuestion();
  });
  document.querySelector("#hunt-prev").addEventListener("click", () => step(-1));
  document.querySelector("#hunt-next").addEventListener("click", () => step(1));

  const narrow = window.matchMedia("(max-width: 800px)").matches;
  hunt.classList.toggle("collapsed", narrow);
  huntToggle.setAttribute("aria-expanded", String(!narrow));
  huntToggle.addEventListener("click", () => {
    const collapsed = hunt.classList.toggle("collapsed");
    huntToggle.setAttribute("aria-expanded", String(!collapsed));
  });
  showQuestion();
}

function bindInput() {
  window.addEventListener("resize", resize);
  new ResizeObserver(() => resize()).observe(canvas);

  window.addEventListener("keydown", (event) => {
    if (event.target.closest("#hunt")) return;
    if (modalOpen && !event.repeat && event.code === "ArrowLeft") {
      event.preventDefault();
      shiftPhoto(-1);
      return;
    }
    if (modalOpen && !event.repeat && event.code === "ArrowRight") {
      event.preventDefault();
      shiftPhoto(1);
      return;
    }
    keys.add(event.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "Escape") closeModal();
    if (event.code === "KeyE" && touring && !modalOpen) {
      const near = displays
        .filter((display) => horizontalDistance(display) <= INTERACT_DISTANCE)
        .sort((a, b) => horizontalDistance(a) - horizontalDistance(b));
      if (near[0]) openDisplay(near[0]);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus();
    if (!touring || modalOpen) return;
    pointerDown = { x: event.clientX, y: event.clientY, moved: 0 };
    canvas.classList.add("grabbing");
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    if (!pointerDown) {
      const display = touring && !modalOpen ? displayUnderPointer() : null;
      canvas.style.cursor = display ? "pointer" : "grab";
      return;
    }
    pointerDown.moved += Math.abs(event.movementX) + Math.abs(event.movementY);
    yaw -= event.movementX * 0.0024;
    pitch = clamp(pitch - event.movementY * 0.002, -1.15, 1.15);
  });
  canvas.addEventListener("pointerup", (event) => {
    canvas.classList.remove("grabbing");
    const click = pointerDown && pointerDown.moved < 7;
    pointerDown = null;
    if (!click || !touring || modalOpen) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const display = displayUnderPointer();
    if (display) activateDisplay(display);
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  mapCanvas.addEventListener("pointerdown", (event) => {
    if (!touring || modalOpen) return;
    event.stopPropagation();
    const rect = mapCanvas.getBoundingClientRect();
    const u = ((event.clientX - rect.left) / rect.width) * MAP.width;
    const v = ((event.clientY - rect.top) / rect.height) * MAP.height;
    let closest = null;
    let closestPixels = 18;
    for (const display of displays) {
      const [du, dv] = worldToMap(display.position[0], display.position[2]);
      const pixels = Math.hypot(du - u, dv - v);
      if (pixels < closestPixels) {
        closest = display;
        closestPixels = pixels;
      }
    }
    if (closest) {
      activateDisplay(closest);
      return;
    }
    const [x, z] = mapToWorld(u, v);
    if (!inside(x, z)) return;
    walkTo(x, z);
  });

  document.querySelector("#begin").addEventListener("click", () => {
    touring = true;
    intro.hidden = true;
    hunt.hidden = false;
    canvas.focus();
  });
  buildHunt();
  document.querySelector("#modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) closeModal();
  });
  document.querySelector("#modal-prev").addEventListener("click", () => shiftPhoto(-1));
  document.querySelector("#modal-next").addEventListener("click", () => shiftPhoto(1));
  magnifyButton.addEventListener("click", () => setMagnify(!magnifyOn));
  photoStage.addEventListener("pointermove", moveLoupe);
  photoStage.addEventListener("pointerleave", () => {
    loupe.hidden = true;
  });

  for (const button of document.querySelectorAll(".pad button")) {
    const code = button.dataset.key;
    const press = (event) => {
      event.preventDefault();
      keys.add(code);
    };
    const release = () => keys.delete(code);
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  }
}

async function loadCatalog() {
  try {
    const response = await fetch(`${base}displays/catalog.json`);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

async function main() {
  resize();
  bindInput();
  floorImage = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = `${base}scan/floor.png`;
  });
  await loadSweepBoxes((fraction) => {
    loadBar.style.width = `${Math.round(fraction * 100)}%`;
  });
  await document.fonts.ready.catch(() => {});
  const catalog = await loadCatalog();
  await Promise.all(
    displays.map(async (display) => {
      const listed = catalog[display.id] || [];
      display.photos = listed.map((photo) => ({
        url: `${base}${photo.url}`,
        label: photo.label,
        placeholder: false,
      }));
      display.resolved = display.photos.length
        ? { url: display.photos[0].url, placeholder: false }
        : await resolvePhoto(display.id);
      display.plate = makePlate(display, false);
      display.plateHot = makePlate(display, true);
    })
  );
  buildMarkers();
  setBoxOpacity(0, 1);
  loader.hidden = true;
  intro.hidden = false;
  renderer.setAnimationLoop(tick);
}

main().catch((error) => {
  loader.hidden = false;
  loader.querySelector("h2").textContent = "The gallery could not open";
  console.error(error);
});
