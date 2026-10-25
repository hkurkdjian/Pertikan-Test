import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createInitialBeeFlightState,
  CursorPoint,
  stepBeeFlightPhysics,
} from '../utils/beeFlightMath';
import { checkWebGlAvailable, detectSoftwareGl } from '../utils/webgl';

/**
 * Generates a high-resolution procedural thorax pubescence (golden-brown micro-fur)
 * color map and bump/roughness map for Apis mellifera.
 */
function createBeeThoraxFurTextures(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base dark warm chitin undercoat
  const baseGrad = ctx.createLinearGradient(0, 0, 0, size);
  baseGrad.addColorStop(0.0, '#3a2410');
  baseGrad.addColorStop(0.35, '#593816');
  baseGrad.addColorStop(0.7, '#4d3012');
  baseGrad.addColorStop(1.0, '#2b1909');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#404040';
  bCtx.fillRect(0, 0, size, size);

  // Deterministic PRNG for dense, fine plumose hair strands
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const hairPalette = ['#8c5b22', '#a8702c', '#c48838', '#d99e46', '#6b4317', '#e5b25c'];

  for (let i = 0; i < 6500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 7 + rand() * 14;
    const angle = (rand() - 0.5) * 0.55 + Math.PI * 0.5;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;

    ctx.strokeStyle = hairPalette[Math.floor(rand() * hairPalette.length)];
    ctx.globalAlpha = 0.28 + rand() * 0.45;
    ctx.lineWidth = 0.8 + rand() * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * 3, (y + y2) * 0.5, x2, y2);
    ctx.stroke();

    const lum = Math.floor(110 + rand() * 135);
    bCtx.strokeStyle = `rgb(${lum},${lum},${lum})`;
    bCtx.globalAlpha = 0.45;
    bCtx.lineWidth = 1.1;
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x2, y2);
    bCtx.stroke();
  }
  ctx.globalAlpha = 1.0;
  bCtx.globalAlpha = 1.0;

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

/**
 * Generates an alpha-tested micro-fur shell texture for the outer pubescent fuzz silhouette.
 */
function createFurShellAlphaTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  let seed = 9001;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.7 + rand() * 1.5;
    ctx.fillStyle = rand() > 0.35 ? 'rgba(218, 162, 74, 0.75)' : 'rgba(165, 112, 42, 0.65)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * Generates the banded amber-ochre and dark melanin chitin tergite texture for the Apis mellifera abdomen,
 * including fine golden posterior seta fringes along each segment.
 */
function createBeeAbdomenTergiteTextures(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;

  // Vertical tergite banding along the abdomen (v=0 anterior petiole -> v=1 posterior apex)
  // Apis mellifera worker tergites: warm golden-amber anterior tergites (T2, T3, T4) with dark brown/black posterior margins,
  // transitioning to dark espresso/black posterior tergites (T5, T6) with pale golden hair bands.
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  // T1 (anterior base)
  grad.addColorStop(0.0, '#2a1808');
  grad.addColorStop(0.08, '#b86d19');
  // T2 (broad warm golden-amber tergite + dark margin)
  grad.addColorStop(0.12, '#d88924');
  grad.addColorStop(0.24, '#c9781b');
  grad.addColorStop(0.27, '#241407');
  grad.addColorStop(0.32, '#180d04');
  // T3 (warm amber band + dark chitin ring + golden pubescent fringe)
  grad.addColorStop(0.35, '#d48320');
  grad.addColorStop(0.46, '#b56714');
  grad.addColorStop(0.49, '#1f1106');
  grad.addColorStop(0.55, '#140b03');
  // T4 (narrower amber-ochre band + deep dark chitin + golden fringe)
  grad.addColorStop(0.58, '#bd6e19');
  grad.addColorStop(0.65, '#8f4d0e');
  grad.addColorStop(0.68, '#1a0e05');
  grad.addColorStop(0.76, '#120903');
  // T5 & T6 (dark espresso-black chitin apex with fine golden seta ring)
  grad.addColorStop(0.79, '#7a4918');
  grad.addColorStop(0.83, '#1a0f06');
  grad.addColorStop(0.92, '#110903');
  grad.addColorStop(1.0, '#0a0502');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Roughness base: smooth glossy chitin on dark/amber plates (roughness ~0.28), rougher on hair bands (~0.75)
  rCtx.fillStyle = '#555555';
  rCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // Segmental suture lines & golden seta fringes at tergite borders
  const fringePositions = [0.29, 0.51, 0.70, 0.82];
  let seed = 7123;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const fy of fringePositions) {
    const yCenter = fy * height;
    // Suture groove in bump map
    const bGrad = bCtx.createLinearGradient(0, yCenter - 8, 0, yCenter + 8);
    bGrad.addColorStop(0, '#808080');
    bGrad.addColorStop(0.5, '#252525');
    bGrad.addColorStop(1, '#989898');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, yCenter - 8, width, 16);

    // Higher roughness on pubescent hair band
    rCtx.fillStyle = '#c8c8c8';
    rCtx.fillRect(0, yCenter - 10, width, 18);

    // Fine golden-buff abdominal hairs along each tergite margin
    for (let i = 0; i < 900; i++) {
      const hx = rand() * width;
      const hy = yCenter - 9 + rand() * 14;
      const hLen = 6 + rand() * 9;
      ctx.strokeStyle = rand() > 0.4 ? '#d8a452' : '#b88334';
      ctx.globalAlpha = 0.35 + rand() * 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + (rand() - 0.5) * 2.5, hy + hLen);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.flipY = false;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.flipY = false;

  return { map, bumpMap, roughnessMap };
}

/**
 * Generates a realistic translucent insect wing texture with Apis mellifera chitinous venation
 * (costa, pterostigma, marginal cell, 3 submarginal cells, and discoidal cells).
 */
function createBeeWingVenationTexture(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  alphaMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const aCtx = alphaCanvas.getContext('2d')!;

  // Subtle warm pearlescent chitin membrane tint
  const memGrad = ctx.createLinearGradient(0, 0, width, height);
  memGrad.addColorStop(0.0, '#c89b54');
  memGrad.addColorStop(0.35, '#e8dcc8');
  memGrad.addColorStop(0.75, '#f2ece2');
  memGrad.addColorStop(1.0, '#dfd4c0');
  ctx.fillStyle = memGrad;
  ctx.fillRect(0, 0, width, height);

  // Membrane translucency (more opaque at basal root and veins, gossamer translucent across cells)
  const aGrad = aCtx.createLinearGradient(0, 0, width, 0);
  aGrad.addColorStop(0.0, '#b0b0b0');
  aGrad.addColorStop(0.25, '#686868');
  aGrad.addColorStop(0.75, '#525252');
  aGrad.addColorStop(1.0, '#444444');
  aCtx.fillStyle = aGrad;
  aCtx.fillRect(0, 0, width, height);

  const drawVein = (
    pts: Array<[number, number]>,
    lineWidth: number,
    color = '#4a2c0f',
    alphaColor = '#e8e8e8'
  ) => {
    for (const [targetCtx, stroke, lw] of [
      [ctx, color, lineWidth],
      [aCtx, alphaColor, lineWidth * 1.15],
    ] as const) {
      targetCtx.strokeStyle = stroke;
      targetCtx.lineWidth = lw;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';
      targetCtx.beginPath();
      pts.forEach(([px, py], idx) => {
        const x = px * width;
        const y = py * height;
        if (idx === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      });
      targetCtx.stroke();
    }
  };

  // Primary anterior costal & radial veins
  drawVein(
    [
      [0.02, 0.22],
      [0.35, 0.14],
      [0.58, 0.12],
      [0.88, 0.18],
    ],
    4.2,
    '#3b2109'
  );
  // Subcosta / Media-ersatz basal trunk
  drawVein(
    [
      [0.02, 0.28],
      [0.32, 0.28],
      [0.56, 0.22],
      [0.86, 0.26],
      [0.93, 0.34],
    ],
    3.0,
    '#4d2c0e'
  );
  // Pterostigma (dark chitin patch on leading edge)
  ctx.fillStyle = '#331b07';
  ctx.beginPath();
  ctx.ellipse(width * 0.56, height * 0.14, width * 0.045, height * 0.032, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cubital / Submarginal & Discoidal cell cross-veins characteristic of Apis mellifera
  drawVein(
    [
      [0.04, 0.42],
      [0.34, 0.46],
      [0.54, 0.44],
      [0.78, 0.48],
      [0.89, 0.56],
    ],
    2.4,
    '#5c3614'
  );
  drawVein(
    [
      [0.05, 0.58],
      [0.38, 0.68],
      [0.68, 0.72],
    ],
    2.0,
    '#683e18'
  );
  // Cross-veins forming closed honeybee wing cells
  drawVein(
    [
      [0.32, 0.28],
      [0.34, 0.46],
      [0.38, 0.68],
    ],
    2.1,
    '#5c3614'
  );
  drawVein(
    [
      [0.46, 0.25],
      [0.44, 0.45],
    ],
    1.8,
    '#5c3614'
  );
  drawVein(
    [
      [0.56, 0.22],
      [0.54, 0.44],
      [0.52, 0.69],
    ],
    2.0,
    '#5c3614'
  );
  drawVein(
    [
      [0.71, 0.24],
      [0.67, 0.46],
      [0.68, 0.72],
    ],
    1.7,
    '#683e18'
  );

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);

  return { map, alphaMap };
}

/**
 * Generates a hexagonal ommatidia normal/bump map for the compound eyes.
 */
function createCompoundEyeBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#606060';
  ctx.fillRect(0, 0, size, size);

  const step = 6;
  for (let y = 0; y < size; y += step) {
    const offset = (Math.floor(y / step) % 2) * (step * 0.5);
    for (let x = 0; x < size; x += step) {
      ctx.fillStyle = '#d0d0d0';
      ctx.beginPath();
      ctx.arc(x + offset, y, step * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * Builds an tear-drop insect wing BufferGeometry with planar UVs in [0, 1].
 */
function createWingGeometry(length: number, maxChord: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  // Straightened costal leading edge out to wingtip
  shape.bezierCurveTo(
    length * 0.28,
    maxChord * 0.22,
    length * 0.72,
    maxChord * 0.26,
    length,
    0.02
  );
  // Rounded apical wingtip and scalloped posterior trailing margin
  shape.bezierCurveTo(
    length * 0.96,
    -maxChord * 0.52,
    length * 0.52,
    -maxChord * 0.78,
    length * 0.14,
    -maxChord * 0.42
  );
  shape.quadraticCurveTo(length * 0.04, -maxChord * 0.18, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 20);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  const spanX = Math.max(0.001, bb.max.x - bb.min.x);
  const spanY = Math.max(0.001, bb.max.y - bb.min.y);

  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) - bb.min.x) / spanX;
    const v = 1 - (pos.getY(i) - bb.min.y) / spanY;
    // Slight dorsal camber arch for 3D realism
    const arch = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.022;
    pos.setZ(i, arch);
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an articulated 5-part honeybee leg (coxa, femur, tibia with optional corbicula/pollen basket,
 * basitarsus, and tarsal segments with terminal claws).
 */
function createSegmentedBeeLeg(
  chitinMat: THREE.Material,
  setaeMat: THREE.Material,
  pollenMat: THREE.Material,
  sideSign: 1 | -1,
  legType: 'fore' | 'mid' | 'hind'
): THREE.Group {
  const legRoot = new THREE.Group();
  const scale = legType === 'hind' ? 1.18 : legType === 'mid' ? 0.96 : 0.84;

  // 1. Coxa & Trochanter
  const coxaGeo = new THREE.CapsuleGeometry(0.026 * scale, 0.055 * scale, 6, 10);
  const coxa = new THREE.Mesh(coxaGeo, chitinMat);
  coxa.rotation.z = sideSign * 0.55;
  legRoot.add(coxa);

  // 2. Femur
  const femurGroup = new THREE.Group();
  femurGroup.position.set(sideSign * 0.045 * scale, -0.04 * scale, 0);
  const femurGeo = new THREE.CapsuleGeometry(0.028 * scale, 0.14 * scale, 8, 12);
  const femur = new THREE.Mesh(femurGeo, setaeMat);
  femur.position.set(sideSign * 0.065 * scale, -0.035 * scale, 0);
  femur.rotation.z = sideSign * 0.92;
  femurGroup.add(femur);
  legRoot.add(femurGroup);

  // 3. Tibia (broadened flattened corbicula on hind leg)
  const tibiaGroup = new THREE.Group();
  tibiaGroup.position.set(sideSign * 0.13 * scale, -0.075 * scale, 0);
  const tibiaRadius = legType === 'hind' ? 0.036 * scale : 0.022 * scale;
  const tibiaGeo = new THREE.CapsuleGeometry(tibiaRadius, 0.16 * scale, 8, 12);
  if (legType === 'hind') {
    tibiaGeo.scale(0.68, 1.0, 1.32); // Flattened corbicular pollen-basket profile
  }
  const tibia = new THREE.Mesh(tibiaGeo, chitinMat);
  tibia.position.set(sideSign * 0.02 * scale, -0.095 * scale, -0.02 * scale);
  tibia.rotation.z = sideSign * 0.18;
  tibia.rotation.x = 0.24;
  tibiaGroup.add(tibia);

  // Golden pollen load inside the hind tibia corbicula (pollen basket)
  if (legType === 'hind') {
    const pollenGeo = new THREE.SphereGeometry(0.044, 14, 12);
    pollenGeo.scale(0.75, 1.18, 0.92);
    const pollenBall = new THREE.Mesh(pollenGeo, pollenMat);
    pollenBall.position.set(sideSign * 0.036, -0.095, -0.018);
    tibiaGroup.add(pollenBall);
  }
  femurGroup.add(tibiaGroup);

  // 4. Basitarsus & segmented Tarsus + Pretarsal Claws
  const tarsusGroup = new THREE.Group();
  tarsusGroup.position.set(sideSign * 0.035 * scale, -0.19 * scale, -0.042 * scale);

  const basitarsusGeo = new THREE.CapsuleGeometry(0.018 * scale, 0.085 * scale, 6, 10);
  const basitarsus = new THREE.Mesh(basitarsusGeo, setaeMat);
  basitarsus.position.set(0, -0.048 * scale, -0.015 * scale);
  basitarsus.rotation.x = 0.32;
  tarsusGroup.add(basitarsus);

  for (let s = 0; s < 3; s++) {
    const segGeo = new THREE.SphereGeometry(0.013 * scale * (1 - s * 0.12), 8, 8);
    segGeo.scale(0.85, 1.5, 0.85);
    const seg = new THREE.Mesh(segGeo, chitinMat);
    seg.position.set(0, (-0.105 - s * 0.028) * scale, (-0.032 - s * 0.012) * scale);
    tarsusGroup.add(seg);
  }

  // Paired terminal claws
  const clawGeo = new THREE.ConeGeometry(0.006 * scale, 0.026 * scale, 6);
  for (const cSign of [-1, 1]) {
    const claw = new THREE.Mesh(clawGeo, chitinMat);
    claw.position.set(cSign * 0.008 * scale, -0.195 * scale, -0.072 * scale);
    claw.rotation.x = Math.PI * 0.72;
    claw.rotation.z = cSign * 0.25;
    tarsusGroup.add(claw);
  }

  tibiaGroup.add(tarsusGroup);
  return legRoot;
}

export function HoneyBee3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !checkWebGlAvailable()) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || window.innerWidth || 1200;
    const height = container.clientHeight || window.innerHeight || 800;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Macro Photography Environment & Diffused Lighting Rig
    let envTarget: THREE.WebGLRenderTarget | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      pmremGenerator.dispose();
    }

    const hemiLight = new THREE.HemisphereLight(0xfffaf0, 0xd8cbb8, isSoftwareGl ? 1.65 : 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(3.2, 4.8, 4.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeef3ff, 1.05);
    fillLight.position.set(-4.0, 2.2, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe6b8, 1.55);
    rimLight.position.set(0.5, 3.5, -4.2);
    scene.add(rimLight);

    const frontMacroLight = new THREE.DirectionalLight(0xfff8ee, 1.15);
    frontMacroLight.position.set(-1.5, 1.2, 5.2);
    scene.add(frontMacroLight);

    // Procedural Entomological Textures
    const thoraxTextures = createBeeThoraxFurTextures(renderer);
    const furShellAlphaTex = createFurShellAlphaTexture();
    const abdomenTextures = createBeeAbdomenTergiteTextures(renderer);
    const wingTextures = createBeeWingVenationTexture(renderer);
    const eyeBumpTex = createCompoundEyeBumpTexture();

    // Physically Based Materials
    const darkChitinMat = new THREE.MeshStandardMaterial({
      color: 0x2b1b0e,
      emissive: 0x0c0703,
      roughness: 0.34,
      metalness: 0.08,
      bumpMap: thoraxTextures.bumpMap,
      bumpScale: 0.004,
      envMapIntensity: 0.9,
    });

    const compoundEyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e130a,
      emissive: 0x080502,
      roughness: 0.2,
      metalness: 0.06,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      bumpMap: eyeBumpTex,
      bumpScale: 0.008,
      envMapIntensity: 1.1,
    });

    const thoraxPubescentMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: thoraxTextures.map,
      bumpMap: thoraxTextures.bumpMap,
      bumpScale: 0.028,
      roughness: 0.78,
      metalness: 0.02,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xe6b45a),
      sheenRoughness: 0.55,
      envMapIntensity: 0.65,
    });

    const furShellMat = new THREE.MeshStandardMaterial({
      color: 0xdba349,
      map: thoraxTextures.map,
      alphaMap: furShellAlphaTex,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      roughness: 0.88,
      metalness: 0.0,
    });

    const abdomenMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: abdomenTextures.map,
      bumpMap: abdomenTextures.bumpMap,
      bumpScale: 0.016,
      roughnessMap: abdomenTextures.roughnessMap,
      roughness: 0.42,
      metalness: 0.04,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
      sheen: 0.45,
      sheenColor: new THREE.Color(0xdba044),
      sheenRoughness: 0.6,
      envMapIntensity: 0.95,
    });

    const legSetaeMat = new THREE.MeshStandardMaterial({
      color: 0x3b230d,
      roughness: 0.58,
      metalness: 0.04,
      bumpMap: thoraxTextures.bumpMap,
      bumpScale: 0.01,
    });

    const pollenMat = new THREE.MeshStandardMaterial({
      color: 0xe08b18,
      roughness: 0.85,
      metalness: 0.0,
      bumpMap: thoraxTextures.bumpMap,
      bumpScale: 0.02,
    });

    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: wingTextures.map,
      alphaMap: wingTextures.alphaMap,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      side: THREE.DoubleSide,
      roughness: 0.16,
      metalness: 0.05,
      iridescence: 0.72,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [160, 420],
      envMapIntensity: 1.25,
    });

    const wingBlurFanMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4ead8,
      map: wingTextures.map,
      transparent: true,
      opacity: 0.21,
      depthWrite: false,
      side: THREE.DoubleSide,
      roughness: 0.22,
      iridescence: 0.55,
      iridescenceIOR: 1.35,
    });

    // ============================================================================
    // Shared Entomological Geometries for Both Apis mellifera Bees
    // ============================================================================
    const mesothoraxGeo = new THREE.SphereGeometry(0.28, 28, 24);
    mesothoraxGeo.scale(0.94, 0.88, 1.18);

    const prothoraxGeo = new THREE.SphereGeometry(0.19, 20, 16);
    prothoraxGeo.scale(0.95, 0.82, 0.65);

    const scutellumGeo = new THREE.SphereGeometry(0.22, 20, 16);
    scutellumGeo.scale(0.92, 0.85, 0.78);

    const headGeo = new THREE.SphereGeometry(0.185, 24, 20);
    headGeo.scale(0.96, 0.92, 0.68);

    const fronsTuftGeo = new THREE.SphereGeometry(0.15, 16, 14);
    fronsTuftGeo.scale(0.88, 0.82, 0.62);

    const eyeGeo = new THREE.SphereGeometry(0.095, 20, 16);
    eyeGeo.scale(0.58, 1.28, 0.82);

    const ocellusGeo = new THREE.SphereGeometry(0.018, 10, 10);
    const mandibleGeo = new THREE.ConeGeometry(0.028, 0.085, 8);
    const scapeGeo = new THREE.CapsuleGeometry(0.014, 0.11, 6, 8);
    const flagellumGeo = new THREE.CapsuleGeometry(0.012, 0.17, 6, 10);

    const petioleGeo = new THREE.CylinderGeometry(0.068, 0.095, 0.09, 14);
    petioleGeo.rotateX(Math.PI * 0.5);

    const abdomenPoints: THREE.Vector2[] = [];
    const numSamples = 64;
    const abdLength = 0.78;
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      let r =
        0.31 *
        Math.pow(Math.sin(Math.pow(t, 0.68) * Math.PI), 0.78) *
        (1 - 0.18 * t * t);
      const tergiteWave = Math.sin(t * Math.PI * 12) * 0.008 * (1 - t * 0.5);
      r = Math.max(0.002, r + tergiteWave);
      const y = -t * abdLength;
      abdomenPoints.push(new THREE.Vector2(r, y));
    }

    const abdomenGeo = new THREE.LatheGeometry(abdomenPoints, 36);
    abdomenGeo.scale(1.06, 1.0, 0.88);
    abdomenGeo.rotateX(Math.PI * 0.5);
    abdomenGeo.computeVertexNormals();

    const forewingGeo = createWingGeometry(0.74, 0.26);
    const hindwingGeo = createWingGeometry(0.52, 0.19);
    const blurFanGeo = createWingGeometry(0.72, 0.38);

    interface BeeActor {
      beeRoot: THREE.Group;
      bodyTiltGroup: THREE.Group;
      abdomenPivot: THREE.Group;
      antennaPivots: THREE.Group[];
      legPivots: Array<{ group: THREE.Group; baseRotX: number; side: 1 | -1 }>;
      wingRoots: Array<{
        forePivot: THREE.Group;
        hindPivot: THREE.Group;
        blurFanA: THREE.Mesh;
        blurFanB: THREE.Mesh;
        side: 1 | -1;
      }>;
    }

    const buildBeeActor = (beeScale: number): BeeActor => {
      const beeRoot = new THREE.Group();
      beeRoot.scale.setScalar(beeScale);
      scene.add(beeRoot);

      const bodyTiltGroup = new THREE.Group();
      beeRoot.add(bodyTiltGroup);

      // 1. THORAX (Mesosoma: Prothorax + Mesothorax + Scutellum + Propodeum + Micro-Fur Shells)
      const thoraxGroup = new THREE.Group();
      bodyTiltGroup.add(thoraxGroup);

      const mesothorax = new THREE.Mesh(mesothoraxGeo, thoraxPubescentMat);
      thoraxGroup.add(mesothorax);

      const prothorax = new THREE.Mesh(prothoraxGeo, thoraxPubescentMat);
      prothorax.position.set(0, 0.02, 0.24);
      thoraxGroup.add(prothorax);

      const scutellum = new THREE.Mesh(scutellumGeo, thoraxPubescentMat);
      scutellum.position.set(0, 0.01, -0.22);
      thoraxGroup.add(scutellum);

      for (const shellFactor of [1.035, 1.07]) {
        const shellMesh = new THREE.Mesh(mesothoraxGeo, furShellMat);
        shellMesh.scale.set(
          0.94 * shellFactor,
          0.88 * shellFactor,
          1.18 * shellFactor
        );
        thoraxGroup.add(shellMesh);
      }

      // 2. HEAD (Head capsule + Compound Eyes + 3 Ocelli + Mandibles + Geniculate Antennae)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, -0.02, 0.42);
      bodyTiltGroup.add(headGroup);

      const headMesh = new THREE.Mesh(headGeo, darkChitinMat);
      headGroup.add(headMesh);

      const fronsTuft = new THREE.Mesh(fronsTuftGeo, thoraxPubescentMat);
      fronsTuft.position.set(0, 0.03, 0.03);
      headGroup.add(fronsTuft);

      for (const side of [-1, 1] as const) {
        const eye = new THREE.Mesh(eyeGeo, compoundEyeMat);
        eye.position.set(side * 0.145, 0.015, 0.035);
        eye.rotation.z = side * -0.18;
        eye.rotation.y = side * 0.25;
        headGroup.add(eye);
      }

      const ocelliCoords: Array<[number, number, number]> = [
        [0, 0.155, 0.04],
        [-0.035, 0.162, 0.01],
        [0.035, 0.162, 0.01],
      ];
      for (const [ox, oy, oz] of ocelliCoords) {
        const ocellus = new THREE.Mesh(ocellusGeo, compoundEyeMat);
        ocellus.position.set(ox, oy, oz);
        headGroup.add(ocellus);
      }

      for (const side of [-1, 1] as const) {
        const mandible = new THREE.Mesh(mandibleGeo, darkChitinMat);
        mandible.position.set(side * 0.042, -0.145, 0.045);
        mandible.rotation.z = side * 0.42;
        mandible.rotation.x = 0.25;
        headGroup.add(mandible);
      }

      const antennaPivots: THREE.Group[] = [];
      for (const side of [-1, 1] as const) {
        const antPivot = new THREE.Group();
        antPivot.position.set(side * 0.052, 0.025, 0.115);
        headGroup.add(antPivot);
        antennaPivots.push(antPivot);

        const scape = new THREE.Mesh(scapeGeo, darkChitinMat);
        scape.position.set(side * 0.032, 0.038, 0.042);
        scape.rotation.z = side * -0.52;
        scape.rotation.x = 0.72;
        antPivot.add(scape);

        const flagellum = new THREE.Mesh(flagellumGeo, darkChitinMat);
        flagellum.position.set(side * 0.072, 0.015, 0.135);
        flagellum.rotation.x = 1.38;
        flagellum.rotation.z = side * -0.22;
        antPivot.add(flagellum);
      }

      // 3. ABDOMEN / GASTER (Petiole + 6 Sculpted Banded Tergites)
      const abdomenPivot = new THREE.Group();
      abdomenPivot.position.set(0, -0.02, -0.32);
      bodyTiltGroup.add(abdomenPivot);

      const petiole = new THREE.Mesh(petioleGeo, darkChitinMat);
      petiole.position.set(0, 0, -0.02);
      abdomenPivot.add(petiole);

      const abdomenMesh = new THREE.Mesh(abdomenGeo, abdomenMat);
      abdomenMesh.position.set(0, 0.02, -0.04);
      abdomenMesh.rotation.x = -0.22;
      abdomenPivot.add(abdomenMesh);

      // 4. SIX SEGMENTED LEGS (Fore, Mid, Hind pairs with Corbicula / Pollen Basket)
      const legsGroup = new THREE.Group();
      bodyTiltGroup.add(legsGroup);

      const legPivots: Array<{ group: THREE.Group; baseRotX: number; side: 1 | -1 }> = [];
      const legSpecs: Array<{
        type: 'fore' | 'mid' | 'hind';
        z: number;
        y: number;
        x: number;
        rotX: number;
        rotY: number;
      }> = [
        { type: 'fore', z: 0.18, y: -0.17, x: 0.14, rotX: 0.25, rotY: 0.35 },
        { type: 'mid', z: 0.0, y: -0.19, x: 0.18, rotX: 0.48, rotY: -0.1 },
        { type: 'hind', z: -0.18, y: -0.18, x: 0.16, rotX: 0.68, rotY: -0.42 },
      ];

      for (const spec of legSpecs) {
        for (const side of [-1, 1] as const) {
          const leg = createSegmentedBeeLeg(
            darkChitinMat,
            legSetaeMat,
            pollenMat,
            side,
            spec.type
          );
          leg.position.set(side * spec.x, spec.y, spec.z);
          leg.rotation.x = spec.rotX;
          leg.rotation.y = side * spec.rotY;
          legsGroup.add(leg);
          legPivots.push({ group: leg, baseRotX: spec.rotX, side });
        }
      }

      // 5. FOUR TRANSLUCENT VEINED WINGS + HIGH-FREQUENCY (~230 Hz) MOTION-BLUR FANS
      const wingRoots: Array<{
        forePivot: THREE.Group;
        hindPivot: THREE.Group;
        blurFanA: THREE.Mesh;
        blurFanB: THREE.Mesh;
        side: 1 | -1;
      }> = [];

      for (const side of [-1, 1] as const) {
        const socket = new THREE.Group();
        socket.position.set(side * 0.19, 0.18, 0.04);
        bodyTiltGroup.add(socket);

        const forePivot = new THREE.Group();
        const foreMesh = new THREE.Mesh(forewingGeo, wingMat);
        if (side === -1) {
          foreMesh.scale.x = -1;
        }
        foreMesh.rotation.x = -0.25;
        forePivot.add(foreMesh);
        socket.add(forePivot);

        const hindPivot = new THREE.Group();
        hindPivot.position.set(0, -0.015, -0.07);
        const hindMesh = new THREE.Mesh(hindwingGeo, wingMat);
        if (side === -1) {
          hindMesh.scale.x = -1;
        }
        hindMesh.rotation.x = -0.22;
        hindPivot.add(hindMesh);
        socket.add(hindPivot);

        const blurFanA = new THREE.Mesh(blurFanGeo, wingBlurFanMat);
        const blurFanB = new THREE.Mesh(blurFanGeo, wingBlurFanMat);
        if (side === -1) {
          blurFanA.scale.x = -1;
          blurFanB.scale.x = -1;
        }
        socket.add(blurFanA);
        socket.add(blurFanB);

        wingRoots.push({ forePivot, hindPivot, blurFanA, blurFanB, side });
      }

      return {
        beeRoot,
        bodyTiltGroup,
        abdomenPivot,
        antennaPivots,
        legPivots,
        wingRoots,
      };
    };

    // Instantiate two honeybees at 0.75x of their previous size (0.19 * 0.75 = 0.1425, 0.185 * 0.75 = 0.1388)
    const beeActors: [BeeActor, BeeActor] = [buildBeeActor(0.1425), buildBeeActor(0.1388)];

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ============================================================================
    // Biologically Plausible Foraging & Flight Animation Loop (2 Bees + Cursor & Touch)
    // ============================================================================
    let flightStates = [createInitialBeeFlightState(0), createInitialBeeFlightState(1)];
    const cursorRef: CursorPoint = { ndcX: 0, ndcY: 0, active: false };
    let aspectScale = width / Math.max(1, height);
    let touchTimeoutId = 0;

    const updateInteractionPoint = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      cursorRef.ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      cursorRef.ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
      cursorRef.active = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      updateInteractionPoint(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      updateInteractionPoint(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      cursorRef.active = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        clearTimeout(touchTimeoutId);
        updateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        clearTimeout(touchTimeoutId);
        updateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      clearTimeout(touchTimeoutId);
      touchTimeoutId = window.setTimeout(() => {
        cursorRef.active = false;
      }, 450);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth || 1200;
      const h = container.clientHeight || window.innerHeight || 800;
      aspectScale = w / Math.max(1, h);
      camera.aspect = aspectScale;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize, { passive: true });

    let frameId = 0;
    let lastTime = performance.now();

    const applyFlightPoseToActor = (actor: BeeActor, flightState: typeof flightStates[0]) => {
      actor.beeRoot.position.set(
        flightState.position.x,
        flightState.position.y,
        flightState.position.z
      );

      // Yaw, pitch, and aerodynamic banking roll
      actor.beeRoot.rotation.set(0, flightState.yaw, flightState.roll, 'YXZ');
      actor.bodyTiltGroup.rotation.x = flightState.pitch;

      // Subtle abdominal respiratory pumping & pitch counter-balance
      actor.abdomenPivot.rotation.x = -flightState.abdomenPulse + flightState.pitch * 0.2;

      // Live sensory antenna micro-twitch
      const antTwitch = Math.sin(flightState.elapsed * 11.5) * 0.06;
      if (actor.antennaPivots[0]) actor.antennaPivots[0].rotation.x = antTwitch;
      if (actor.antennaPivots[1]) actor.antennaPivots[1].rotation.x = -antTwitch * 0.85;

      // Trailing leg drag proportional to flight speed
      const speedMag = Math.hypot(
        flightState.velocity.x,
        flightState.velocity.y,
        flightState.velocity.z
      );
      for (const lp of actor.legPivots) {
        lp.group.rotation.x =
          lp.baseRotX + speedMag * 0.22 + Math.sin(flightState.elapsed * 7.2 + lp.side) * 0.035;
      }

      // High-frequency ~230 Hz wingbeat stroke & figure-eight feathering
      const stroke = Math.sin(flightState.wingPhase);
      const feather = Math.cos(flightState.wingPhase);

      for (const wr of actor.wingRoots) {
        wr.forePivot.rotation.z = wr.side * (0.38 + stroke * 0.62);
        wr.forePivot.rotation.y = wr.side * (-0.32 + feather * 0.42);
        wr.forePivot.rotation.x = -0.18 + feather * 0.25;

        wr.hindPivot.rotation.z = wr.side * (0.32 + stroke * 0.54);
        wr.hindPivot.rotation.y = wr.side * (-0.48 + feather * 0.36);

        wr.blurFanA.rotation.z = wr.side * (0.58 + Math.sin(flightState.wingPhase * 0.5) * 0.18);
        wr.blurFanA.rotation.y = wr.side * -0.22;
        wr.blurFanA.rotation.x = -0.28;

        wr.blurFanB.rotation.z = wr.side * (0.14 - Math.cos(flightState.wingPhase * 0.5) * 0.16);
        wr.blurFanB.rotation.y = wr.side * -0.45;
        wr.blurFanB.rotation.x = -0.12;
      }
    };

    // Initial pose before first draw
    const prevPos0 = flightStates[0].position;
    const prevPos1 = flightStates[1].position;
    flightStates[0] = stepBeeFlightPhysics(flightStates[0], 0.016, cursorRef, aspectScale, prevPos1);
    flightStates[1] = stepBeeFlightPhysics(flightStates[1], 0.016, cursorRef, aspectScale, prevPos0);
    applyFlightPoseToActor(beeActors[0], flightStates[0]);
    applyFlightPoseToActor(beeActors[1], flightStates[1]);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.04, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const p0 = flightStates[0].position;
      const p1 = flightStates[1].position;
      flightStates[0] = stepBeeFlightPhysics(flightStates[0], dt, cursorRef, aspectScale, p1);
      flightStates[1] = stepBeeFlightPhysics(flightStates[1], dt, cursorRef, aspectScale, p0);

      applyFlightPoseToActor(beeActors[0], flightStates[0]);
      applyFlightPoseToActor(beeActors[1], flightStates[1]);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearTimeout(touchTimeoutId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      envTarget?.dispose();
      thoraxTextures.map.dispose();
      thoraxTextures.bumpMap.dispose();
      furShellAlphaTex.dispose();
      abdomenTextures.map.dispose();
      abdomenTextures.bumpMap.dispose();
      abdomenTextures.roughnessMap.dispose();
      wingTextures.map.dispose();
      wingTextures.alphaMap.dispose();
      eyeBumpTex.dispose();

      darkChitinMat.dispose();
      compoundEyeMat.dispose();
      thoraxPubescentMat.dispose();
      furShellMat.dispose();
      abdomenMat.dispose();
      legSetaeMat.dispose();
      pollenMat.dispose();
      wingMat.dispose();
      wingBlurFanMat.dispose();

      mesothoraxGeo.dispose();
      prothoraxGeo.dispose();
      scutellumGeo.dispose();
      headGeo.dispose();
      fronsTuftGeo.dispose();
      eyeGeo.dispose();
      ocellusGeo.dispose();
      mandibleGeo.dispose();
      scapeGeo.dispose();
      flagellumGeo.dispose();
      petioleGeo.dispose();
      abdomenGeo.dispose();
      forewingGeo.dispose();
      hindwingGeo.dispose();
      blurFanGeo.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="apis-mellifera-canvas"
      data-bee-count="2"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-hidden"
    />
  );
}
