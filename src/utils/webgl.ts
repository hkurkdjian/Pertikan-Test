import * as THREE from 'three';

let cachedSoftwareGl: boolean | null = null;
let cachedWebGlAvailable: boolean | null = null;

export function checkWebGlAvailable(): boolean {
  if (cachedWebGlAvailable !== null) return cachedWebGlAvailable;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cachedWebGlAvailable = Boolean(gl);
    if (gl && 'getExtension' in gl) {
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }
    return cachedWebGlAvailable;
  } catch {
    cachedWebGlAvailable = false;
    return false;
  }
}

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

/**
 * Computes normalized cylindrical UV coordinates (u in [0,1] with 0.5 at front +Z,
 * 0.25 at left -X, 0.75 at right +X; v in [0,1] from minY to maxY).
 */
export function applyNormalizedCylindricalUVs(geo: THREE.BufferGeometry): void {
  geo.computeBoundingBox();
  const bbox = geo.boundingBox!;
  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const height = Math.max(0.001, maxY - minY);

  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(x, z); // 0 at +Z, -PI/2 at -X, +PI/2 at +X
    const u = 0.5 + angle / (Math.PI * 2);
    const v = (y - minY) / height;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

/**
 * Generates a studio-lit cotton paper texture matching the Pertikan bottle & jar labels.
 */
export function createCottonPaperTexture(
  renderer: THREE.WebGLRenderer,
  baseHex = '#e0ddd2'
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const width = 512;
  const height = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  // Studio softbox horizontal shading across label curvature (matches bottle_closeup.png)
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, '#d2cec3');
  grad.addColorStop(0.16, '#e8e5dc');
  grad.addColorStop(0.42, baseHex);
  grad.addColorStop(0.75, '#c1bdb2');
  grad.addColorStop(0.92, '#d1cdc2');
  grad.addColorStop(1.0, '#bab6ab');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle top/bottom paper edge bevel
  const vGrad = ctx.createLinearGradient(0, 0, 0, height);
  vGrad.addColorStop(0.0, 'rgba(255,255,255,0.22)');
  vGrad.addColorStop(0.02, 'rgba(0,0,0,0.03)');
  vGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  vGrad.addColorStop(0.98, 'rgba(0,0,0,0.04)');
  vGrad.addColorStop(1.0, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // Fine tactile paper grain + bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  const imgData = bCtx.createImageData(256, 256);
  const data = imgData.data;

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < data.length; i += 4) {
    const n = Math.floor(118 + (rand() - 0.5) * 34);
    data[i] = n;
    data[i + 1] = n;
    data[i + 2] = n;
    data[i + 3] = 255;
  }
  bCtx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 0.05;
  ctx.drawImage(bumpCanvas, 0, 0, width, height);
  ctx.globalAlpha = 1.0;

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

/**
 * Generates a realistic metallic Stelvin screw-cap texture (burgundy, champagne-gold, or matte black)
 * with studio specular bands, embossed screw-thread shadows, and fine vertical knurling ticks.
 * Note: For LatheGeometry(pts, 64, Math.PI, Math.PI * 2), u=0.5 is front (+Z), u=0.25 is left (-X), u=0.75 is right (+X).
 */
export function createCapsuleStudioTexture(
  renderer: THREE.WebGLRenderer,
  baseHex = '#232321'
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const hexLower = baseHex.toLowerCase();
  const isGold = hexLower === '#c2a260' || hexLower === '#b89858';
  const isBurgundy = hexLower === '#541620' || hexLower === '#4f121b';

  let edgeDark = '#0c0c0c';
  let midDark = '#181818';
  let specLeft = '#606060';
  let centerTone = '#1f1f1f';
  let coreShadow = '#111111';
  let specRight = '#484848';

  if (isGold) {
    edgeDark = '#543f18';
    midDark = '#8c6e32';
    specLeft = '#f5e3af';
    centerTone = '#c5a560';
    coreShadow = '#755a26';
    specRight = '#dfc788';
  } else if (isBurgundy) {
    edgeDark = '#210509';
    midDark = '#3d0c14';
    specLeft = '#913140';
    centerTone = '#591621';
    coreShadow = '#300810';
    specRight = '#752230';
  }

  ctx.fillStyle = midDark;
  ctx.fillRect(0, 0, width, height);

  const drawMetallicWrap = (startX: number, spanW: number) => {
    const hGrad = ctx.createLinearGradient(startX, 0, startX + spanW, 0);
    hGrad.addColorStop(0.0, edgeDark);
    hGrad.addColorStop(0.15, midDark);
    hGrad.addColorStop(0.32, specLeft);
    hGrad.addColorStop(0.46, centerTone);
    hGrad.addColorStop(0.62, coreShadow);
    hGrad.addColorStop(0.78, specRight);
    hGrad.addColorStop(0.91, midDark);
    hGrad.addColorStop(1.0, edgeDark);
    ctx.fillStyle = hGrad;
    ctx.fillRect(startX, 0, spanW, height);
  };

  // Front face (u = 0.25..0.75) and back face wraps
  drawMetallicWrap(width * 0.23, width * 0.54);
  drawMetallicWrap(0, width * 0.23);
  drawMetallicWrap(width * 0.77, width * 0.23);

  // Stelvin screw-thread grooves and collar rings in upper section (canvas y = 0 is top of cap, y = height is bottom skirt)
  const collarGrad = ctx.createLinearGradient(0, 0, 0, height);
  collarGrad.addColorStop(0.0, 'rgba(255,255,255,0.28)');
  collarGrad.addColorStop(0.05, 'rgba(0,0,0,0.42)');
  collarGrad.addColorStop(0.10, 'rgba(255,255,255,0.26)');
  collarGrad.addColorStop(0.15, 'rgba(0,0,0,0.45)');
  collarGrad.addColorStop(0.20, 'rgba(255,255,255,0.22)');
  collarGrad.addColorStop(0.28, 'rgba(0,0,0,0.32)');
  collarGrad.addColorStop(0.33, 'rgba(255,255,255,0.18)');
  collarGrad.addColorStop(0.37, 'rgba(0,0,0,0.38)');
  collarGrad.addColorStop(0.42, 'rgba(255,255,255,0.08)');
  collarGrad.addColorStop(0.94, 'rgba(0,0,0,0)');
  collarGrad.addColorStop(1.0, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = collarGrad;
  ctx.fillRect(0, 0, width, height);

  // Fine vertical knurling ticks along the Stelvin tamper-evident ring (y = 0.20..0.31)
  const knurlTop = Math.round(height * 0.205);
  const knurlH = Math.round(height * 0.095);
  for (let i = 0; i < 120; i++) {
    const x = (i / 120) * width;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, knurlTop, 2, knurlH);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export interface BottleStudioTextureOptions {
  productId?: string;
  size?: '0.75 L' | '0.5 L';
  isSparkling?: boolean;
  liquidColor?: string;
  liquidGlowColor?: string;
  glassColor?: string;
}

/**
 * Generates a studio-lit crystal-clear glass + glowing liquid texture (golden honey mead or ruby Uhudler & Met)
 * matching the 6 uploaded product photographs:
 * - u = 0.50 is front center (+Z)
 * - u = 0.25 is left silhouette edge (-X)
 * - u = 0.75 is right silhouette edge (+X)
 * - canvas y = 0 is bottle top, canvas y = height is bottle bottom (-2.30)
 */
export function createBottleStudioTexture(
  renderer: THREE.WebGLRenderer,
  liquidGlowHex = '#f7c82a',
  options?: BottleStudioTextureOptions
): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const productId = options?.productId ?? 'mitra';
  const isRuby = productId.startsWith('u-and-me');
  const isSparkling = options?.isSparkling ?? productId.includes('frizzante');

  const coreGlow = options?.liquidGlowColor ?? (isRuby ? '#e83c25' : liquidGlowHex);
  const midLiquid = options?.liquidColor ?? (isRuby ? '#b51712' : '#d98c0a');
  const deepEdge = options?.glassColor ?? (isRuby ? '#3d0404' : '#5c3103');
  const rimDark = isRuby ? '#220202' : '#2e1601';

  // 1. Base rich liquid fill across full 360 cylinder
  ctx.fillStyle = midLiquid;
  ctx.fillRect(0, 0, width, height);

  // Helper to paint horizontal cylindrical refraction + Fresnel glass wall edges across any 180-deg half
  const paintHalfCylinder = (startX: number, halfW: number) => {
    const hGrad = ctx.createLinearGradient(startX, 0, startX + halfW, 0);
    hGrad.addColorStop(0.0, rimDark);
    hGrad.addColorStop(0.035, deepEdge);
    hGrad.addColorStop(0.09, midLiquid);
    hGrad.addColorStop(0.28, coreGlow);
    hGrad.addColorStop(0.50, coreGlow);
    hGrad.addColorStop(0.72, coreGlow);
    hGrad.addColorStop(0.91, midLiquid);
    hGrad.addColorStop(0.965, deepEdge);
    hGrad.addColorStop(1.0, rimDark);
    ctx.fillStyle = hGrad;
    ctx.fillRect(startX, 0, halfW, height);
  };

  // Front half (u = 0.25..0.75) and back halves (u = 0..0.25, 0.75..1.0)
  paintHalfCylinder(width * 0.25, width * 0.50);
  paintHalfCylinder(-width * 0.25, width * 0.50);
  paintHalfCylinder(width * 0.75, width * 0.50);

  // 2. Vertical studio lighting gradient (warm upper shoulder glow, saturated body, deep shoulder/neck transitions)
  const vGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (isSparkling) {
    vGrad.addColorStop(0.0, 'rgba(0,0,0,0.45)');
    vGrad.addColorStop(0.20, 'rgba(0,0,0,0.18)');
    vGrad.addColorStop(0.29, isRuby ? 'rgba(255, 110, 80, 0.28)' : 'rgba(255, 245, 160, 0.36)');
    vGrad.addColorStop(0.52, 'rgba(0,0,0,0.05)');
    vGrad.addColorStop(0.84, 'rgba(0,0,0,0.12)');
    vGrad.addColorStop(0.95, isRuby ? 'rgba(255, 90, 60, 0.22)' : 'rgba(255, 230, 120, 0.28)');
    vGrad.addColorStop(1.0, 'rgba(15, 5, 2, 0.75)');
  } else {
    vGrad.addColorStop(0.0, 'rgba(0,0,0,0.35)');
    vGrad.addColorStop(0.22, 'rgba(255,255,255,0.12)');
    vGrad.addColorStop(0.32, isRuby ? 'rgba(255, 100, 75, 0.24)' : 'rgba(255, 242, 150, 0.32)');
    vGrad.addColorStop(0.45, 'rgba(0,0,0,0.04)');
    vGrad.addColorStop(0.84, 'rgba(0,0,0,0.06)');
    vGrad.addColorStop(0.94, isRuby ? 'rgba(255, 90, 60, 0.24)' : 'rgba(255, 232, 125, 0.30)');
    vGrad.addColorStop(1.0, 'rgba(15, 5, 2, 0.78)');
  }
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Neck headspace & liquid meniscus below the screw cap for Bordeaux bottles (canvas y = 0.20..0.28)
  if (!isSparkling) {
    // Clear glass / pale air headspace just under the screw cap skirt (y = 0.20..0.238)
    const neckAirGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, 0);
    neckAirGrad.addColorStop(0.0, isRuby ? '#3d0808' : '#52340a');
    neckAirGrad.addColorStop(0.12, isRuby ? '#e88b84' : '#f2dfb3');
    neckAirGrad.addColorStop(0.50, isRuby ? '#f7cbc8' : '#faf2dc');
    neckAirGrad.addColorStop(0.88, isRuby ? '#e88b84' : '#f2dfb3');
    neckAirGrad.addColorStop(1.0, isRuby ? '#3d0808' : '#52340a');
    ctx.fillStyle = neckAirGrad;
    ctx.fillRect(width * 0.25, height * 0.205, width * 0.50, height * 0.032);

    // Crisp horizontal liquid meniscus ring at y = 0.235..0.252
    const meniscusGrad = ctx.createLinearGradient(0, height * 0.232, 0, height * 0.256);
    meniscusGrad.addColorStop(0.0, isRuby ? '#2b0303' : '#3d2002');
    meniscusGrad.addColorStop(0.45, isRuby ? '#6e0907' : '#854c05');
    meniscusGrad.addColorStop(0.75, isRuby ? '#ff6b52' : '#' ? '#ffea78' : '#ffea78');
    meniscusGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = meniscusGrad;
    ctx.fillRect(0, height * 0.232, width, height * 0.025);

    // Dark shadow ring where shoulder curves into neck (y = 0.278..0.296)
    const neckBaseGrad = ctx.createLinearGradient(0, height * 0.275, 0, height * 0.30);
    neckBaseGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    neckBaseGrad.addColorStop(0.5, isRuby ? 'rgba(45, 3, 3, 0.55)' : 'rgba(75, 38, 3, 0.48)');
    neckBaseGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = neckBaseGrad;
    ctx.fillRect(0, height * 0.275, width, height * 0.025);
  }

  // 4. Studio softbox reflections on shoulder and cylinder (matching reference studio photos)
  if (!isSparkling) {
    // Glossy white studio softbox window reflection on the upper-right rounded Bordeaux shoulder
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width * 0.535, height * 0.305);
    ctx.bezierCurveTo(
      width * 0.59,
      height * 0.302,
      width * 0.625,
      height * 0.325,
      width * 0.635,
      height * 0.378
    );
    ctx.lineTo(width * 0.562, height * 0.378);
    ctx.bezierCurveTo(
      width * 0.555,
      height * 0.34,
      width * 0.545,
      height * 0.32,
      width * 0.535,
      height * 0.305
    );
    ctx.closePath();
    const winGrad = ctx.createLinearGradient(0, height * 0.305, 0, height * 0.38);
    winGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.86)');
    winGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.72)');
    winGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.12)');
    ctx.fillStyle = winGrad;
    ctx.fill();
    ctx.restore();

    // Left vertical studio softbox highlight strip
    const leftStrip = ctx.createLinearGradient(width * 0.365, 0, width * 0.435, 0);
    leftStrip.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    leftStrip.addColorStop(0.35, 'rgba(255, 252, 242, 0.36)');
    leftStrip.addColorStop(0.65, 'rgba(255, 252, 242, 0.44)');
    leftStrip.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftStrip;
    ctx.fillRect(width * 0.365, height * 0.22, width * 0.07, height * 0.74);

    // Secondary soft vertical highlight strip under the right window
    const rightStrip = ctx.createLinearGradient(width * 0.56, 0, width * 0.635, 0);
    rightStrip.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    rightStrip.addColorStop(0.5, 'rgba(255, 250, 238, 0.26)');
    rightStrip.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightStrip;
    ctx.fillRect(width * 0.56, height * 0.38, width * 0.075, height * 0.58);
  } else {
    // Sweeping vertical softbox ribbons along the long sloped Frizzante shoulder
    const leftRibbon = ctx.createLinearGradient(width * 0.37, 0, width * 0.445, 0);
    leftRibbon.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    leftRibbon.addColorStop(0.45, 'rgba(255, 253, 245, 0.46)');
    leftRibbon.addColorStop(0.75, 'rgba(255, 253, 245, 0.28)');
    leftRibbon.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftRibbon;
    ctx.fillRect(width * 0.37, height * 0.22, width * 0.075, height * 0.74);

    const rightRibbon = ctx.createLinearGradient(width * 0.555, 0, width * 0.625, 0);
    rightRibbon.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    rightRibbon.addColorStop(0.35, 'rgba(255, 250, 235, 0.24)');
    rightRibbon.addColorStop(0.65, 'rgba(255, 253, 245, 0.42)');
    rightRibbon.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightRibbon;
    ctx.fillRect(width * 0.555, height * 0.22, width * 0.07, height * 0.74);
  }

  // 5. Parabolic bottom glass punt dome & thick glass heel refraction (canvas y = 0.86..1.00)
  const drawPuntDome = (centerX: number) => {
    const domeW = width * 0.34;
    const domeTopY = height * 0.875;
    const domeBaseY = height * 0.982;

    // Bright backlit dome interior
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - domeW * 0.5, domeBaseY);
    ctx.quadraticCurveTo(centerX, domeTopY - height * 0.045, centerX + domeW * 0.5, domeBaseY);
    ctx.closePath();
    const domeGrad = ctx.createRadialGradient(
      centerX,
      domeBaseY - height * 0.03,
      width * 0.01,
      centerX,
      domeBaseY - height * 0.02,
      domeW * 0.52
    );
    domeGrad.addColorStop(0.0, isRuby ? '#ff6442' : '#fff08c');
    domeGrad.addColorStop(0.55, isRuby ? '#c41c14' : '#e0960c');
    domeGrad.addColorStop(0.88, isRuby ? '#3d0404' : '#592d02');
    domeGrad.addColorStop(1.0, isRuby ? '#240202' : '#361901');
    ctx.fillStyle = domeGrad;
    ctx.fill();

    // Refractive dark/light arch rim of the punt dome
    ctx.lineWidth = 5;
    ctx.strokeStyle = isRuby ? 'rgba(45, 3, 3, 0.78)' : 'rgba(72, 35, 2, 0.72)';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 250, 220, 0.55)';
    ctx.stroke();
    ctx.restore();
  };

  drawPuntDome(width * 0.50);
  drawPuntDome(0);
  drawPuntDome(width);

  // Thick bottom glass base rim highlight & grounding shadow (y = 0.955..1.00)
  const heelGrad = ctx.createLinearGradient(0, height * 0.955, 0, height);
  heelGrad.addColorStop(0.0, 'rgba(255, 250, 230, 0.38)');
  heelGrad.addColorStop(0.45, isRuby ? 'rgba(60, 5, 5, 0.75)' : 'rgba(85, 42, 3, 0.72)');
  heelGrad.addColorStop(0.80, 'rgba(245, 240, 225, 0.45)');
  heelGrad.addColorStop(1.0, '#120802');
  ctx.fillStyle = heelGrad;
  ctx.fillRect(0, height * 0.955, width, height * 0.045);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/**
 * Draws the golden calligraphic Mitra emblem (looped petal/bee motif + spiral tail + top antennae ticks).
 */
function drawMitraCalligraphicEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  strokeStyle: string | CanvasGradient
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = strokeStyle;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.5, radius * 0.075);

  // Top vertical loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-radius * 0.24, -radius * 0.28, -radius * 0.22, -radius * 0.76, 0, -radius * 0.76);
  ctx.bezierCurveTo(radius * 0.22, -radius * 0.76, radius * 0.24, -radius * 0.28, 0, 0);
  ctx.stroke();

  // Left horizontal wing loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-radius * 0.32, -radius * 0.22, -radius * 0.78, -radius * 0.18, -radius * 0.76, 0.04 * radius);
  ctx.bezierCurveTo(-radius * 0.74, radius * 0.24, -radius * 0.28, radius * 0.16, 0, 0);
  ctx.stroke();

  // Right horizontal wing loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(radius * 0.32, -radius * 0.22, radius * 0.78, -radius * 0.18, radius * 0.76, 0.04 * radius);
  ctx.bezierCurveTo(radius * 0.74, radius * 0.24, radius * 0.28, radius * 0.16, 0, 0);
  ctx.stroke();

  // Lower-right diagonal stroke & central spiral abdomen
  ctx.beginPath();
  ctx.moveTo(-radius * 0.32, radius * 0.38);
  ctx.quadraticCurveTo(0, 0, radius * 0.44, radius * 0.56);
  ctx.stroke();

  // Spiral curl at bottom center
  ctx.beginPath();
  ctx.arc(0, radius * 0.48, radius * 0.24, -Math.PI * 0.35, Math.PI * 1.35);
  ctx.arc(0, radius * 0.48, radius * 0.12, Math.PI * 1.35, -Math.PI * 0.2, true);
  ctx.stroke();

  // Twin small vertical ticks at top and bottom of emblem
  ctx.lineWidth = Math.max(1.6, radius * 0.04);
  for (const dx of [-radius * 0.045, radius * 0.045]) {
    ctx.beginPath();
    ctx.moveTo(dx, -radius * 0.78);
    ctx.lineTo(dx, -radius * 0.90);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(dx, radius * 0.72);
    ctx.lineTo(dx, radius * 0.84);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generates an authentic 1024x1024 wrap-around bottle label texture + tactile paper bump map
 * matching each of the 6 uploaded Pertikan wine bottle photographs.
 */
export function createWineLabelTexture(
  renderer: THREE.WebGLRenderer,
  productId: string,
  size: '0.75 L' | '0.5 L' = '0.75 L'
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const isUme = productId.startsWith('u-and-me');
  const isFrizzante = productId.includes('frizzante');

  // 1. Matte label paper background with cylindrical studio softbox shading
  // Note: u = 0.50 (x = 512) is dead-center front (+Z), u = 0.25 (x = 256) is left edge (-X), u = 0.75 (x = 768) is right edge (+X)
  const bgGrad = ctx.createLinearGradient(width * 0.24, 0, width * 0.76, 0);
  if (isUme) {
    bgGrad.addColorStop(0.0, '#0d0d0d');
    bgGrad.addColorStop(0.18, '#1a1a1a');
    bgGrad.addColorStop(0.34, '#2c2c2c'); // Left studio softbox reflection
    bgGrad.addColorStop(0.50, '#181818');
    bgGrad.addColorStop(0.68, '#141414');
    bgGrad.addColorStop(0.84, '#262626'); // Right studio rim highlight
    bgGrad.addColorStop(1.0, '#0d0d0d');
    ctx.fillStyle = '#121212';
  } else {
    bgGrad.addColorStop(0.0, '#210f10');
    bgGrad.addColorStop(0.18, '#361a1c');
    bgGrad.addColorStop(0.35, '#522c2f'); // Left studio softbox reflection
    bgGrad.addColorStop(0.50, '#3d1f21');
    bgGrad.addColorStop(0.68, '#2e1618');
    bgGrad.addColorStop(0.84, '#4a272a'); // Right studio rim highlight
    bgGrad.addColorStop(1.0, '#210f10');
    ctx.fillStyle = '#291315';
  }
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(width * 0.22, 0, width * 0.56, height);

  const cx = width * 0.50;

  // Metallic gold gradient across front label area
  const goldGrad = ctx.createLinearGradient(cx - 170, 0, cx + 170, 0);
  goldGrad.addColorStop(0.0, '#bd9348');
  goldGrad.addColorStop(0.28, '#edd296');
  goldGrad.addColorStop(0.50, '#d6b064');
  goldGrad.addColorStop(0.75, '#f2da9e');
  goldGrad.addColorStop(1.0, '#b58a40');

  // Compensate for 360-degree cylindrical circumference vs label height so circles and typography render undistorted on the front bottle face
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(0.74, 1.0);
  ctx.translate(-cx, 0);

  if (!isUme && !isFrizzante) {
    // MITRA 0.75 L & 0.5 L LABEL
    ctx.textAlign = 'center';
    ctx.fillStyle = goldGrad;
    ctx.font = '600 84px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('MITRA', cx, 175);

    ctx.font = '500 22px "Inter", sans-serif';
    ctx.fillStyle = '#e8cf96';
    ctx.fillText('H O N I G W E I N', cx, 218);

    // Ornate radiating sunburst halo around calligraphic emblem
    const medY = 515;
    const innerR = 128;
    const numRays = 144;
    ctx.save();
    ctx.translate(cx, medY);
    ctx.strokeStyle = goldGrad;
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const wave = Math.abs(Math.sin(angle * 12));
      const outerR = innerR + 12 + wave * 24 + (i % 2 === 0 ? 7 : 0);
      ctx.lineWidth = i % 2 === 0 ? 1.8 : 1.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, innerR - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawMitraCalligraphicEmblem(ctx, cx, medY, 96, goldGrad);

    // DAS ORIGINAL
    ctx.fillStyle = '#e5c888';
    ctx.font = '500 22px "Inter", sans-serif';
    ctx.fillText('D A S   O R I G I N A L', cx, 785);

    // Bottom ABV & Volume row
    ctx.fillStyle = '#f2ece1';
    ctx.font = '400 28px "Inter", sans-serif';
    if (size === '0.5 L') {
      ctx.textAlign = 'left';
      ctx.fillText('10% Vol.    L.', cx - 158, 868);
      ctx.textAlign = 'right';
      ctx.fillText('e 0,5 l', cx + 158, 868);

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(235, 220, 195, 0.72)';
      ctx.font = '400 12px "Inter", sans-serif';
      ctx.fillText('HONIGWEIN AUS ÖSTERREICH · IMKEREI PERTIKAN', cx, 902);
      ctx.fillText('7503 GROSSPETERSDORF · SÜDBURGENLAND', cx, 920);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText('13% vol.', cx - 162, 882);
      ctx.textAlign = 'right';
      ctx.fillText('0,75 L', cx + 162, 882);

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 165, 912);
      ctx.lineTo(cx + 165, 912);
      ctx.stroke();
    }
  } else if (!isUme && isFrizzante) {
    // MITRA FRIZZANTE 0.75 L LABEL
    ctx.textAlign = 'center';
    ctx.fillStyle = goldGrad;
    ctx.font = '600 94px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('MITRA', cx, 215);

    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillStyle = '#f0deba';
    ctx.fillText('H O N I G W E I N', cx, 265);

    // Scalloped bottle-cap gold medallion at center
    const medY = 545;
    const sealR = 135;
    const teeth = 36;
    ctx.save();
    ctx.translate(cx, medY);
    ctx.beginPath();
    for (let i = 0; i <= teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? sealR + 9 : sealR - 3;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#291214';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = goldGrad;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, sealR - 10, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    drawMitraCalligraphicEmblem(ctx, cx, medY, 92, goldGrad);

    // Delicate gold hexagons and rising fizz bubbles around the medallion
    ctx.strokeStyle = '#d9b56c';
    ctx.lineWidth = 1.8;
    const bubbles = [
      { x: cx - 165, y: 405, r: 14 },
      { x: cx - 140, y: 375, r: 9 },
      { x: cx - 160, y: 485, r: 16 },
      { x: cx - 170, y: 560, r: 15 },
      { x: cx - 135, y: 695, r: 12 },
      { x: cx - 122, y: 715, r: 9 },
      { x: cx + 148, y: 395, r: 13 },
      { x: cx + 165, y: 412, r: 11 },
      { x: cx + 150, y: 650, r: 12 },
      { x: cx + 135, y: 695, r: 13 },
    ];
    bubbles.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Hexagon motif on right flank
    const hexX = cx + 166;
    const hexY = 548;
    const hexR = 24;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const hx = hexX + Math.cos(a) * hexR;
      const hy = hexY + Math.sin(a) * hexR;
      if (k === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();

    // FRIZZANTE bottom title
    ctx.fillStyle = '#f5f0e8';
    ctx.font = '400 44px "Inter", sans-serif';
    ctx.fillText('F R I Z Z A N T E', cx, 855);
  } else if (isUme && !isFrizzante) {
    // U&ME 0.75 L & 0.5 L LABEL
    const crimson = '#dc2840';

    // Top row: "U" (crimson) + "&" (metallic gold)
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 205px "Inter", "Arial Narrow", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = crimson;
    ctx.fillText('U', cx - 2, 305);

    ctx.textAlign = 'left';
    ctx.fillStyle = goldGrad;
    ctx.fillText('&', cx + 2, 305);

    // Second row: "ME" (crimson)
    ctx.textAlign = 'center';
    ctx.fillStyle = crimson;
    ctx.font = '700 198px "Inter", "Arial Narrow", sans-serif';
    ctx.fillText('ME', cx, 505);

    // SWEET & WILD
    ctx.fillStyle = '#e5c885';
    ctx.font = '500 32px "Inter", sans-serif';
    ctx.fillText('S W E E T & W I L D', cx, 615);

    // Divider line
    ctx.strokeStyle = 'rgba(214, 176, 100, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 125, 668);
    ctx.lineTo(cx + 125, 668);
    ctx.stroke();

    // UHUDLER & MET
    ctx.fillStyle = crimson;
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText('U H U D L E R  &  M E T', cx, 742);

    // Bottom rule + size & ABV
    if (size === '0.75 L') {
      ctx.strokeStyle = 'rgba(214, 176, 100, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 175, 805);
      ctx.lineTo(cx + 175, 805);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, 838);
      ctx.lineTo(cx, 888);
      ctx.stroke();
    }

    ctx.fillStyle = '#e6cf98';
    ctx.font = '500 34px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(size === '0.5 L' ? '0,5 L' : '0,75 L', cx - 162, 878);
    ctx.textAlign = 'right';
    ctx.fillText('13% vol', cx + 162, 878);
  } else {
    // U&ME FRIZZANTE 0.75 L LABEL
    const crimson = '#dc2840';

    // Festive gold and crimson-pink fizz bubbles around U& / ME
    const goldBubbles = [
      { x: cx - 135, y: 245, r: 10 },
      { x: cx - 148, y: 318, r: 18 },
      { x: cx - 120, y: 375, r: 8 },
      { x: cx - 128, y: 590, r: 22 },
      { x: cx - 95, y: 608, r: 13 },
      { x: cx - 22, y: 122, r: 15 },
      { x: cx - 2, y: 132, r: 11 },
      { x: cx + 92, y: 108, r: 9 },
      { x: cx + 148, y: 378, r: 8 },
      { x: cx - 42, y: 658, r: 9 },
      { x: cx - 2, y: 662, r: 9 },
    ];
    const crimsonBubbles = [
      { x: cx - 92, y: 175, r: 14 },
      { x: cx + 118, y: 172, r: 16 },
      { x: cx + 78, y: 312, r: 17 },
      { x: cx + 96, y: 322, r: 12 },
      { x: cx + 92, y: 492, r: 28 },
      { x: cx + 76, y: 595, r: 14 },
      { x: cx - 96, y: 492, r: 15 },
    ];

    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#d9b568';
    goldBubbles.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = crimson;
    crimsonBubbles.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Stacked U& / ME
    ctx.font = '700 215px "Inter", "Arial Narrow", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = crimson;
    ctx.fillText('U', cx - 2, 365);

    ctx.textAlign = 'left';
    ctx.fillStyle = goldGrad;
    ctx.fillText('&', cx + 2, 365);

    ctx.textAlign = 'center';
    ctx.fillStyle = crimson;
    ctx.font = '700 210px "Inter", "Arial Narrow", sans-serif';
    ctx.fillText('ME', cx, 585);

    // FRIZZANTE
    ctx.fillStyle = '#f5f2ec';
    ctx.font = '500 48px "Inter", sans-serif';
    ctx.fillText('F R I Z Z A N T E', cx, 785);

    // UHUDLER & MET
    ctx.fillStyle = crimson;
    ctx.font = '600 28px "Inter", sans-serif';
    ctx.fillText('U H U D L E R  &  M E T', cx, 865);
  }
  ctx.restore();

  // Subtle top/bottom label paper edge highlight & shadow
  const vEdge = ctx.createLinearGradient(0, 0, 0, height);
  vEdge.addColorStop(0.0, 'rgba(255,255,255,0.16)');
  vEdge.addColorStop(0.015, 'rgba(0,0,0,0)');
  vEdge.addColorStop(0.985, 'rgba(0,0,0,0)');
  vEdge.addColorStop(1.0, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vEdge;
  ctx.fillRect(0, 0, width, height);

  // Tactile matte paper grain bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  const imgData = bCtx.createImageData(256, 256);
  const data = imgData.data;
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.floor(124 + (rand() - 0.5) * 28);
    data[i] = n;
    data[i + 1] = n;
    data[i + 2] = n;
    data[i + 3] = 255;
  }
  bCtx.putImageData(imgData, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

/**
 * Generates a rich, saturated golden-cognac honey texture with hexagonal facet highlights
 * matching /.playwright-cli/ref/jar_closeup2.png.
 * Normalized cylindrical UVs:
 * - u = 0.25 is left silhouette edge (-X)
 * - u = 0.4167 is front-left hexagonal bevel ridge
 * - u = 0.4167..0.5833 is flat front facet
 * - u = 0.5833 is front-right hexagonal bevel ridge
 * - u = 0.75 is right silhouette edge (+X)
 */
export function createHoneyStudioTexture(
  renderer: THREE.WebGLRenderer,
  primaryHex = '#a84e08',
  deepHex = '#682802',
  highlightHex = '#d87e1e'
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich vertical honey gradient (deep amber under lid shadow -> warm cognac body -> golden lower caustic glow)
  const vGrad = ctx.createLinearGradient(0, 0, 0, height);
  vGrad.addColorStop(0.0, '#4a1b01');
  vGrad.addColorStop(0.09, deepHex);
  vGrad.addColorStop(0.24, primaryHex);
  vGrad.addColorStop(0.68, primaryHex);
  vGrad.addColorStop(0.86, highlightHex);
  vGrad.addColorStop(0.95, '#e89b38');
  vGrad.addColorStop(1.0, deepHex);
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Horizontal hexagonal facet shading & internal refraction across front 180 degrees (u = 0.25..0.75)
  const hGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, 0);
  hGrad.addColorStop(0.0, 'rgba(42, 14, 1, 0.78)'); // Dark amber outer left glass thickness
  hGrad.addColorStop(0.07, 'rgba(255, 210, 140, 0.35)'); // Left outer glass wall highlight
  hGrad.addColorStop(0.18, 'rgba(185, 88, 12, 0.15)'); // Left angled facet middle
  hGrad.addColorStop(0.31, 'rgba(95, 36, 3, 0.35)'); // Pre-bevel depth
  hGrad.addColorStop(0.333, 'rgba(255, 228, 175, 0.58)'); // Front-left vertical hexagonal bevel line (u = 0.4167)
  hGrad.addColorStop(0.36, 'rgba(120, 48, 4, 0.22)');
  hGrad.addColorStop(0.50, 'rgba(220, 120, 22, 0.10)'); // Flat front facet center
  hGrad.addColorStop(0.64, 'rgba(120, 48, 4, 0.22)');
  hGrad.addColorStop(0.667, 'rgba(255, 228, 175, 0.58)'); // Front-right vertical hexagonal bevel line (u = 0.5833)
  hGrad.addColorStop(0.69, 'rgba(95, 36, 3, 0.35)');
  hGrad.addColorStop(0.82, 'rgba(235, 145, 35, 0.25)'); // Right angled facet warm glow
  hGrad.addColorStop(0.93, 'rgba(255, 210, 140, 0.38)'); // Right outer glass wall highlight
  hGrad.addColorStop(1.0, 'rgba(42, 14, 1, 0.78)'); // Dark amber outer right glass thickness
  ctx.fillStyle = hGrad;
  ctx.fillRect(width * 0.25, 0, width * 0.5, height);

  // Mirror subtle facet shading on back half (u = 0..0.25 and 0.75..1.0) so rotation stays seamless
  const backLeft = ctx.createLinearGradient(0, 0, width * 0.25, 0);
  backLeft.addColorStop(0.0, 'rgba(180, 85, 10, 0.15)');
  backLeft.addColorStop(0.33, 'rgba(255, 220, 165, 0.42)');
  backLeft.addColorStop(1.0, 'rgba(42, 14, 1, 0.78)');
  ctx.fillStyle = backLeft;
  ctx.fillRect(0, 0, width * 0.25, height);

  const backRight = ctx.createLinearGradient(width * 0.75, 0, width, 0);
  backRight.addColorStop(0.0, 'rgba(42, 14, 1, 0.78)');
  backRight.addColorStop(0.67, 'rgba(255, 220, 165, 0.42)');
  backRight.addColorStop(1.0, 'rgba(180, 85, 10, 0.15)');
  ctx.fillStyle = backRight;
  ctx.fillRect(width * 0.75, 0, width * 0.25, height);

  // 3. Subtle studio glass reflection patches on the left and right angled facets (matches jar_closeup2.png)
  const leftFacetReflect = ctx.createLinearGradient(0, height * 0.18, 0, height * 0.85);
  leftFacetReflect.addColorStop(0.0, 'rgba(255, 240, 210, 0.28)');
  leftFacetReflect.addColorStop(0.45, 'rgba(255, 240, 210, 0.08)');
  leftFacetReflect.addColorStop(1.0, 'rgba(255, 225, 170, 0.24)');
  ctx.fillStyle = leftFacetReflect;
  ctx.fillRect(width * 0.285, height * 0.14, width * 0.095, height * 0.74);
  ctx.fillRect(width * 0.62, height * 0.14, width * 0.095, height * 0.74);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/**
 * Generates a realistic brushed dark gunmetal/bronze-black studio texture for the honey jar twist-off lid.
 */
export function createJarLidStudioTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181614';
  ctx.fillRect(0, 0, width, height);

  // Studio cylindrical metallic sheen across front (u = 0.25..0.75 for phiStart = Math.PI)
  const hGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, 0);
  hGrad.addColorStop(0.0, '#12100e');
  hGrad.addColorStop(0.14, '#3a3631');
  hGrad.addColorStop(0.26, '#757068'); // Crisp left metallic highlight (matches jar_closeup2.png)
  hGrad.addColorStop(0.40, '#26231f');
  hGrad.addColorStop(0.55, '#191714'); // Deep dark center
  hGrad.addColorStop(0.74, '#6b665e'); // Crisp right metallic highlight
  hGrad.addColorStop(0.88, '#332f2b');
  hGrad.addColorStop(1.0, '#12100e');
  ctx.fillStyle = hGrad;
  ctx.fillRect(width * 0.25, 0, width * 0.5, height);

  // Subtle top bevel & bottom rim lip shading
  const vGrad = ctx.createLinearGradient(0, 0, 0, height);
  vGrad.addColorStop(0.0, 'rgba(255,255,255,0.25)');
  vGrad.addColorStop(0.18, 'rgba(0,0,0,0)');
  vGrad.addColorStop(0.85, 'rgba(0,0,0,0.18)');
  vGrad.addColorStop(0.94, 'rgba(255,255,255,0.18)');
  vGrad.addColorStop(1.0, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/**
 * Generates a soft radial ground contact shadow texture.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.48
  );
  grad.addColorStop(0.0, 'rgba(15, 12, 8, 0.55)');
  grad.addColorStop(0.45, 'rgba(15, 12, 8, 0.22)');
  grad.addColorStop(0.78, 'rgba(15, 12, 8, 0.04)');
  grad.addColorStop(1.0, 'rgba(15, 12, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface PhotoBottleSpec {
  url: string;
  yTop: number;
  yBot: number;
  labelTopY: number;
  labelBotY: number;
  capBotY: number;
  avgCenterX: number;
  worldHeight: number;
  radii: number[];
}

/**
 * Exact 65-step silhouette radii (from yBot at index 0 to yTop at index 64) and anatomical bounds
 * measured directly from the 6 high-resolution (1792x2400) reference studio photographs.
 */
export const PHOTO_BOTTLE_SPECS: Record<string, PhotoBottleSpec> = {
  'mitra-075': {
    url: '/assets/aistudio/Mitra_0_75_d987df6d.jpeg',
    yTop: 463,
    yBot: 2060,
    labelTopY: 1146,
    labelBotY: 1831,
    capBotY: 780,
    avgCenterX: 898.5,
    worldHeight: 4.58,
    radii: [
      54, 171, 184.1, 188.6, 191, 192, 191.3, 191, 191, 190.5, 191, 191, 191, 191, 191, 191, 191,
      191, 191, 191, 191, 191, 191, 191, 191.5, 191.5, 191.5, 191.5, 191.5, 191.5, 191.5, 191.5,
      191.5, 191.5, 191.6, 192, 192, 192, 192, 192.5, 192.6, 191.2, 186.1, 177.2, 163.6, 145.3,
      120.5, 100.4, 90.8, 86, 85, 84.3, 85, 85, 85, 85, 85, 85, 85.6, 86, 85.7, 84, 80.7, 83.7,
      35.4,
    ],
  },
  'mitra-050': {
    url: '/assets/aistudio/Mitra_0_5_12f2eeed.jpeg',
    yTop: 598,
    yBot: 2053,
    labelTopY: 1256,
    labelBotY: 1855,
    capBotY: 900,
    avgCenterX: 911.7,
    worldHeight: 4.16,
    radii: [
      38.7, 148.9, 161.3, 165.9, 167.6, 168, 167.5, 166.5, 166.5, 166.5, 166.5, 166.5, 166.5,
      166.2, 166, 166, 166, 165.7, 165.5, 165.5, 165.5, 165.5, 165.5, 165.5, 165.5, 165.9, 165.9,
      165.5, 166, 166.5, 166, 166.5, 166.1, 166.4, 166.5, 166.5, 166.5, 167, 167.3, 167, 164.3,
      158.7, 149.4, 136.8, 120.3, 98.9, 85, 77.9, 76, 74.7, 73.1, 74.5, 74.5, 75, 75, 75, 75, 75,
      74.5, 75, 74.9, 73.3, 70.2, 72.4, 24.1,
    ],
  },
  'mitra-frizzante': {
    url: '/assets/aistudio/Mitra_Frizzante_480c394f.jpeg',
    yTop: 298,
    yBot: 2187,
    labelTopY: 1451,
    labelBotY: 2032,
    capBotY: 695,
    avgCenterX: 895.9,
    worldHeight: 4.62,
    radii: [
      47.5, 221.1, 253.5, 265.6, 271.7, 273.5, 272.5, 271.5, 272.5, 272.5, 272.5, 272.5, 272.5,
      272.5, 272.5, 272.5, 272.5, 272.9, 273, 273, 273, 273, 273, 273, 273, 273, 272.5, 272.5,
      271.5, 270, 266.1, 260.7, 253.9, 245.4, 234.8, 223.5, 211.2, 198.9, 186.5, 174.7, 163.4,
      153.3, 143.5, 134.8, 127.4, 120.7, 114.8, 109.8, 105.6, 102.4, 100, 100, 100, 100, 100, 100,
      100.1, 100, 99.6, 101.5, 101.9, 100.2, 96.6, 100.6, 34.7,
    ],
  },
  'ume-075': {
    url: '/assets/aistudio/U_Me_0_75_66007e63.jpeg',
    yTop: 437,
    yBot: 2060,
    labelTopY: 1123,
    labelBotY: 1825,
    capBotY: 740,
    avgCenterX: 874.5,
    worldHeight: 4.58,
    radii: [
      50, 180.9, 193.2, 197, 197.5, 197.5, 197, 196.5, 196.5, 196.5, 196.5, 196.5, 196.5, 196.5,
      196.5, 196.5, 196.5, 196.5, 196.5, 196.5, 196.5, 196.5, 196, 196, 196, 196, 196, 196, 196,
      196, 196, 196, 196, 196, 196, 196, 196, 195.5, 195.5, 195.5, 195.5, 195.5, 191.9, 186.1,
      175.2, 159.3, 137.5, 112, 94.3, 84.5, 82.5, 80.6, 79.8, 79, 78.5, 78.5, 78.5, 77.8, 77.5,
      77.8, 78.3, 78.8, 74.3, 77.9, 28.7,
    ],
  },
  'ume-050': {
    url: '/assets/aistudio/U_Me_0_5_659946d1.jpeg',
    yTop: 529,
    yBot: 2060,
    labelTopY: 1219,
    labelBotY: 1823,
    capBotY: 825,
    avgCenterX: 894.0,
    worldHeight: 4.14,
    radii: [
      33.9, 140.3, 152.5, 154.5, 154.5, 155, 154.9, 154.6, 154.5, 154.5, 154.5, 154.5, 154.5,
      154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5,
      154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154.5, 154, 154, 154.5,
      154.6, 154.5, 152.5, 146.5, 136, 120.4, 100.4, 84.8, 76.9, 74, 73.5, 73, 72.9, 73.3, 73.5,
      73.5, 73.5, 73.5, 73.5, 74.2, 73.6, 74.5, 72.3, 70.5, 72.9, 26.4,
    ],
  },
  'ume-frizzante': {
    url: '/assets/aistudio/U_Me_Frizzante_2bfb7608.jpeg',
    yTop: 333,
    yBot: 2064,
    labelTopY: 1405,
    labelBotY: 1915,
    capBotY: 695,
    avgCenterX: 895.6,
    worldHeight: 4.62,
    radii: [
      57.1, 211.6, 228.5, 235.1, 237, 235.5, 235.5, 237, 237, 236.5, 236.5, 236.5, 236.5, 236.5,
      236.5, 236.5, 236.5, 236.5, 236.5, 236.5, 236.5, 236.5, 236.5, 236.5, 235.5, 235.5, 235.5,
      234.5, 232.2, 228.7, 224.2, 218.4, 211.2, 202, 192.1, 182, 171.7, 161.4, 151.3, 141.8,
      132.8, 124.8, 117.6, 111.4, 105.9, 101.2, 97.4, 94.2, 91.6, 89.5, 87.6, 87.4, 88.5, 88.5,
      88.5, 88.5, 88.5, 88.5, 90.3, 89, 88.8, 88.4, 84.3, 87.5, 40.5,
    ],
  },
};

/**
 * Performs photogrammetric inverse-cylindrical unwrapping of one of the 6 studio bottle photographs
 * onto a 1024x1536 3D cylindrical texture map + companion 3D specular/gold-foil/bump map.
 */
export function createPhotorealBottleTexturesFromImage(
  renderer: THREE.WebGLRenderer,
  img: HTMLImageElement,
  photoKey: string
): {
  albedoMap: THREE.CanvasTexture;
  specularMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const spec = PHOTO_BOTTLE_SPECS[photoKey] || PHOTO_BOTTLE_SPECS['mitra-075'];
  const srcW = img.naturalWidth || 1792;
  const srcH = img.naturalHeight || 2400;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

  const texW = 1024;
  const texH = 1536;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = texW;
  albedoCanvas.height = texH;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImgData = albedoCtx.createImageData(texW, texH);
  const dstAlbedo = albedoImgData.data;

  const specCanvas = document.createElement('canvas');
  specCanvas.width = texW;
  specCanvas.height = texH;
  const specCtx = specCanvas.getContext('2d')!;
  const specImgData = specCtx.createImageData(texW, texH);
  const dstSpec = specImgData.data;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 768;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const { yTop, yBot, labelTopY, labelBotY, capBotY, avgCenterX, radii } = spec;
  const bottleSpanY = Math.max(1, yBot - yTop);
  const isRuby = photoKey.startsWith('ume');

  const isBottlePixel = (x: number, y: number): boolean => {
    const ix = Math.max(0, Math.min(srcW - 1, Math.round(x)));
    const iy = Math.max(0, Math.min(srcH - 1, Math.round(y)));
    const idx = (iy * srcW + ix) * 4;
    const r = srcData[idx];
    const g = srcData[idx + 1];
    const b = srcData[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return r < 239 || g < 239 || b < 239 || maxC - minC > 15;
  };

  const sampleBilinear = (
    fx: number,
    fy: number,
    out: [number, number, number]
  ) => {
    const cx = Math.max(0, Math.min(srcW - 1.001, fx));
    const cy = Math.max(0, Math.min(srcH - 1.001, fy));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const x1 = Math.min(srcW - 1, x0 + 1);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const dx = cx - x0;
    const dy = cy - y0;

    const i00 = (y0 * srcW + x0) * 4;
    const i10 = (y0 * srcW + x1) * 4;
    const i01 = (y1 * srcW + x0) * 4;
    const i11 = (y1 * srcW + x1) * 4;

    const w00 = (1 - dx) * (1 - dy);
    const w10 = dx * (1 - dy);
    const w01 = (1 - dx) * dy;
    const w11 = dx * dy;

    out[0] =
      srcData[i00] * w00 +
      srcData[i10] * w10 +
      srcData[i01] * w01 +
      srcData[i11] * w11;
    out[1] =
      srcData[i00 + 1] * w00 +
      srcData[i10 + 1] * w10 +
      srcData[i01 + 1] * w01 +
      srcData[i11 + 1] * w11;
    out[2] =
      srcData[i00 + 2] * w00 +
      srcData[i10 + 2] * w10 +
      srcData[i01 + 2] * w01 +
      srcData[i11 + 2] * w11;
  };

  // Precompute horizontal projection lookup table across u = 0..1 (texW columns)
  const sinTable = new Float32Array(texW);
  const cosTable = new Float32Array(texW);
  const frontSTable = new Float32Array(texW);
  const kPersp = 0.052;
  const kNorm = Math.sqrt(1 - kPersp * kPersp);

  for (let tx = 0; tx < texW; tx++) {
    const u = tx / (texW - 1);
    const theta = (u - 0.5) * Math.PI * 2;
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    sinTable[tx] = s;
    cosTable[tx] = c;
    const sPersp = (s * kNorm) / (1 - kPersp * Math.max(0, c));
    frontSTable[tx] = Math.max(-0.992, Math.min(0.992, sPersp));
  }

  const rgb: [number, number, number] = [0, 0, 0];
  const rgbBackGlass: [number, number, number] = [0, 0, 0];

  for (let ty = 0; ty < texH; ty++) {
    // t = 1 at top of screw cap (ty = 0), t = 0 at bottom of glass base (ty = texH - 1)
    const t = 1 - ty / (texH - 1);
    const ySrc = yBot - t * bottleSpanY;

    // Interpolate prior radius from 65-step measured table
    const fIdx = Math.max(0, Math.min(64, t * 64));
    const idx0 = Math.floor(fIdx);
    const idx1 = Math.min(64, idx0 + 1);
    const frac = fIdx - idx0;
    const priorR = radii[idx0] * (1 - frac) + radii[idx1] * frac;

    // Refine exact left & right bottle edges at row ySrc within tight window around prior
    const iy = Math.max(0, Math.min(srcH - 1, Math.round(ySrc)));
    let xL = avgCenterX - priorR;
    let xR = avgCenterX + priorR;

    const searchMinL = Math.max(10, Math.floor(avgCenterX - priorR - 18));
    const searchMaxL = Math.min(srcW - 10, Math.ceil(avgCenterX - priorR + 18));
    for (let x = searchMinL; x <= searchMaxL; x++) {
      if (isBottlePixel(x, iy) && isBottlePixel(x + 3, iy)) {
        xL = x;
        break;
      }
    }

    const searchMaxR = Math.min(srcW - 10, Math.ceil(avgCenterX + priorR + 18));
    const searchMinR = Math.max(10, Math.floor(avgCenterX + priorR - 18));
    for (let x = searchMaxR; x >= searchMinR; x--) {
      if (isBottlePixel(x, iy) && isBottlePixel(x - 3, iy)) {
        xR = x;
        break;
      }
    }

    // Inset by 3.0px so zero white studio background fringe ever enters the 3D surface
    const inset = priorR > 45 ? 3.2 : 1.8;
    const xMid = 0.5 * (xL + xR);
    const halfW = Math.max(1.5, 0.5 * (xR - xL) - inset);

    const isLabelRow = ySrc >= labelTopY - 4 && ySrc <= labelBotY + 4;
    const isCapRow = ySrc <= capBotY;

    // Pre-sample left and right label paper margin colors for back-of-bottle wrap
    let marginLeftR = 35,
      marginLeftG = 22,
      marginLeftB = 24;
    let marginRightR = 35,
      marginRightG = 22,
      marginRightB = 24;
    if (isLabelRow) {
      sampleBilinear(xMid - 0.91 * halfW, ySrc, rgb);
      marginLeftR = rgb[0];
      marginLeftG = rgb[1];
      marginLeftB = rgb[2];
      sampleBilinear(xMid + 0.91 * halfW, ySrc, rgb);
      marginRightR = rgb[0];
      marginRightG = rgb[1];
      marginRightB = rgb[2];
    }

    for (let tx = 0; tx < texW; tx++) {
      const sinT = sinTable[tx];
      const cosT = cosTable[tx];
      const dstIdx = (ty * texW + tx) * 4;

      let r = 0,
        g = 0,
        b = 0;

      if (cosT >= 0) {
        // Front 180-degree hemisphere facing camera: exact inverse-cylindrical projection of studio photo
        const s = frontSTable[tx];
        sampleBilinear(xMid + s * halfW, ySrc, rgb);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
      } else if (!isLabelRow) {
        // Back 180-degree hemisphere on glass, liquid, punt, and Stelvin screw cap: seamless axisymmetric wrap
        const sBack = Math.max(-0.992, Math.min(0.992, sinT));
        sampleBilinear(xMid + sBack * halfW, ySrc, rgb);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
      } else {
        // Back 180-degree hemisphere on label band: wrap clean matte paper around sides + glowing glass seam at rear center
        const backDepth = -cosT; // 0 at sides (theta = +/- PI/2), 1 at dead-center back (theta = PI)
        const baseR = sinT < 0 ? marginLeftR : marginRightR;
        const baseG = sinT < 0 ? marginLeftG : marginRightG;
        const baseB = sinT < 0 ? marginLeftB : marginRightB;
        const shade = 0.88 + 0.14 * Math.sin(backDepth * Math.PI);
        r = baseR * shade;
        g = baseG * shade;
        b = baseB * shade;

        // Narrow vertical glass window right at the back seam (backDepth > 0.92) where wrap-around label ends meet
        if (backDepth > 0.90) {
          const seamBlend = Math.min(1, (backDepth - 0.90) / 0.08);
          sampleBilinear(xMid + sinT * 0.4 * halfW, labelTopY - 38, rgbBackGlass);
          r = r * (1 - seamBlend) + rgbBackGlass[0] * seamBlend;
          g = g * (1 - seamBlend) + rgbBackGlass[1] * seamBlend;
          b = b * (1 - seamBlend) + rgbBackGlass[2] * seamBlend;
        }
      }

      dstAlbedo[dstIdx] = Math.round(r);
      dstAlbedo[dstIdx + 1] = Math.round(g);
      dstAlbedo[dstIdx + 2] = Math.round(b);
      dstAlbedo[dstIdx + 3] = 255;

      // Compute 3D dynamic specular / gold-foil / glass clearcoat response for glazeMesh
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      if (isLabelRow) {
        // Detect gold foil, crimson emblem, or white typography on dark label paper
        const foilBoost = Math.max(0, (lum - 0.22) * 1.65);
        dstSpec[dstIdx] = Math.min(255, Math.round(r * foilBoost * 0.85));
        dstSpec[dstIdx + 1] = Math.min(255, Math.round(g * foilBoost * 0.82));
        dstSpec[dstIdx + 2] = Math.min(255, Math.round(b * foilBoost * 0.72));
        dstSpec[dstIdx + 3] = 255;
      } else if (isCapRow) {
        // Metallic Stelvin screw-cap sheen catching ridges
        const capSheen = Math.pow(lum, 1.2) * 0.65;
        dstSpec[dstIdx] = Math.min(255, Math.round(r * capSheen + 28));
        dstSpec[dstIdx + 1] = Math.min(255, Math.round(g * capSheen + 24));
        dstSpec[dstIdx + 2] = Math.min(255, Math.round(b * capSheen + 20));
        dstSpec[dstIdx + 3] = 255;
      } else {
        // Optical flint glass + honey/Uhudler internal glow
        const glassSpec = Math.pow(lum, 1.35) * 0.55;
        dstSpec[dstIdx] = Math.min(255, Math.round((isRuby ? 255 : 255) * glassSpec));
        dstSpec[dstIdx + 1] = Math.min(255, Math.round((isRuby ? 195 : 242) * glassSpec));
        dstSpec[dstIdx + 2] = Math.min(255, Math.round((isRuby ? 185 : 205) * glassSpec));
        dstSpec[dstIdx + 3] = 255;
      }
    }
  }

  albedoCtx.putImageData(albedoImgData, 0, 0);
  specCtx.putImageData(specImgData, 0, 0);

  // Build bump map from specular/foil canvas for 3D embossed gold foil & screw-cap thread relief
  bumpCtx.drawImage(specCanvas, 0, 0, bumpCanvas.width, bumpCanvas.height);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.ClampToEdgeWrapping;
  albedoMap.anisotropy = maxAniso;

  const specularMap = new THREE.CanvasTexture(specCanvas);
  specularMap.colorSpace = THREE.SRGBColorSpace;
  specularMap.wrapS = THREE.RepeatWrapping;
  specularMap.wrapT = THREE.ClampToEdgeWrapping;
  specularMap.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = maxAniso;

  return { albedoMap, specularMap, bumpMap };
}

