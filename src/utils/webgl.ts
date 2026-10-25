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
 * Generates a realistic studio brushed pewter-charcoal capsule texture for the bottle neck.
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

  const hGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, 0);
  hGrad.addColorStop(0.0, '#141413');
  hGrad.addColorStop(0.18, '#282826');
  hGrad.addColorStop(0.32, '#5c5b57'); // Left studio specular band
  hGrad.addColorStop(0.46, baseHex);
  hGrad.addColorStop(0.64, '#1b1b19');
  hGrad.addColorStop(0.80, '#4a4945'); // Right studio rim band
  hGrad.addColorStop(0.92, '#222220');
  hGrad.addColorStop(1.0, '#141413');

  ctx.fillStyle = '#181816';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = hGrad;
  ctx.fillRect(width * 0.22, 0, width * 0.56, height);

  // Subtle horizontal collar ring highlights near the top of the capsule (canvas y = 18..55)
  const collarGrad = ctx.createLinearGradient(0, 0, 0, height);
  collarGrad.addColorStop(0.0, 'rgba(255,255,255,0.18)');
  collarGrad.addColorStop(0.08, 'rgba(0,0,0,0.35)');
  collarGrad.addColorStop(0.14, 'rgba(255,255,255,0.22)');
  collarGrad.addColorStop(0.22, 'rgba(0,0,0,0.42)');
  collarGrad.addColorStop(0.28, 'rgba(255,255,255,0.08)');
  collarGrad.addColorStop(0.95, 'rgba(0,0,0,0)');
  collarGrad.addColorStop(1.0, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = collarGrad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/**
 * Generates a high-contrast dark antique olive-amber glass + backlit mead core studio texture
 * matching /.playwright-cli/ref/bottle_closeup.png.
 * For LatheGeometry(pts, 64, Math.PI, Math.PI * 2):
 * - u = 0.50 is front center (+Z)
 * - u = 0.25 is left silhouette edge (-X)
 * - u = 0.75 is right silhouette edge (+X)
 * - canvas y = 0 is bottle top (+2.32), canvas y = height is bottle bottom (-2.30)
 */
export function createBottleStudioTexture(
  renderer: THREE.WebGLRenderer,
  liquidGlowHex = '#5f691b'
): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep antique olive-black glass silhouette base
  ctx.fillStyle = '#0b0d04';
  ctx.fillRect(0, 0, width, height);

  // 2. Warm olive-amber internal backlit mead glow through upper shoulder & body (canvas y = 0.20..0.62, u = 0.30..0.70)
  const shoulderGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    width * 0.01,
    width * 0.5,
    height * 0.44,
    width * 0.22
  );
  shoulderGlow.addColorStop(0.0, liquidGlowHex);
  shoulderGlow.addColorStop(0.38, '#464f14');
  shoulderGlow.addColorStop(0.68, '#252b09');
  shoulderGlow.addColorStop(0.90, '#111405');
  shoulderGlow.addColorStop(1.0, 'rgba(11, 13, 4, 0)');
  ctx.fillStyle = shoulderGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Secondary warm olive glow on back face (u = 0.0 and u = 1.0) so 360 rotation stays rich
  for (const cx of [0, width]) {
    const backGlow = ctx.createRadialGradient(
      cx,
      height * 0.43,
      width * 0.01,
      cx,
      height * 0.44,
      width * 0.18
    );
    backGlow.addColorStop(0.0, '#4c5616');
    backGlow.addColorStop(0.55, '#222809');
    backGlow.addColorStop(1.0, 'rgba(11, 13, 4, 0)');
    ctx.fillStyle = backGlow;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Golden-olive neck meniscus collar band right below the capsule (canvas y = 0.205..0.245)
  const meniscusGrad = ctx.createLinearGradient(0, height * 0.20, 0, height * 0.255);
  meniscusGrad.addColorStop(0.0, 'rgba(11, 13, 4, 0.9)');
  meniscusGrad.addColorStop(0.35, '#828c2c');
  meniscusGrad.addColorStop(0.55, '#9aa438');
  meniscusGrad.addColorStop(0.85, '#474f14');
  meniscusGrad.addColorStop(1.0, 'rgba(11, 13, 4, 0)');
  ctx.fillStyle = meniscusGrad;
  ctx.fillRect(width * 0.27, height * 0.20, width * 0.46, height * 0.055);

  // 5. Left vertical studio softbox specular reflection strip (u = 0.36..0.425, matching bottle_closeup.png)
  const leftSoftbox = ctx.createLinearGradient(width * 0.355, 0, width * 0.43, 0);
  leftSoftbox.addColorStop(0.0, 'rgba(255, 255, 250, 0)');
  leftSoftbox.addColorStop(0.22, 'rgba(218, 222, 200, 0.52)');
  leftSoftbox.addColorStop(0.48, 'rgba(232, 236, 218, 0.64)');
  leftSoftbox.addColorStop(0.78, 'rgba(185, 194, 155, 0.25)');
  leftSoftbox.addColorStop(1.0, 'rgba(255, 255, 250, 0)');
  ctx.fillStyle = leftSoftbox;
  ctx.fillRect(width * 0.355, height * 0.21, width * 0.075, height * 0.77);

  // 6. Right vertical studio rim softbox reflection strip (u = 0.595..0.655)
  const rightSoftbox = ctx.createLinearGradient(width * 0.59, 0, width * 0.66, 0);
  rightSoftbox.addColorStop(0.0, 'rgba(255, 255, 250, 0)');
  rightSoftbox.addColorStop(0.30, 'rgba(180, 190, 150, 0.22)');
  rightSoftbox.addColorStop(0.62, 'rgba(226, 230, 212, 0.54)');
  rightSoftbox.addColorStop(0.82, 'rgba(205, 212, 185, 0.32)');
  rightSoftbox.addColorStop(1.0, 'rgba(255, 255, 250, 0)');
  ctx.fillStyle = rightSoftbox;
  ctx.fillRect(width * 0.59, height * 0.21, width * 0.07, height * 0.77);

  // 7. Outer extreme edge crisp rim light (u = 0.275 and u = 0.725)
  const leftRim = ctx.createLinearGradient(width * 0.265, 0, width * 0.295, 0);
  leftRim.addColorStop(0.0, 'rgba(255,255,255,0)');
  leftRim.addColorStop(0.5, 'rgba(175, 182, 145, 0.26)');
  leftRim.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = leftRim;
  ctx.fillRect(width * 0.265, height * 0.32, width * 0.03, height * 0.65);

  const rightRim = ctx.createLinearGradient(width * 0.705, 0, width * 0.735, 0);
  rightRim.addColorStop(0.0, 'rgba(255,255,255,0)');
  rightRim.addColorStop(0.5, 'rgba(175, 182, 145, 0.26)');
  rightRim.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = rightRim;
  ctx.fillRect(width * 0.705, height * 0.32, width * 0.03, height * 0.65);

  // 8. Bottom thick glass heel & punt refraction below label (canvas y = 0.88..0.995)
  const baseGlow = ctx.createLinearGradient(0, height * 0.88, 0, height);
  baseGlow.addColorStop(0.0, 'rgba(10, 12, 4, 0.45)');
  baseGlow.addColorStop(0.45, 'rgba(8, 10, 3, 0.78)');
  baseGlow.addColorStop(0.75, 'rgba(55, 64, 16, 0.48)'); // Subtle olive-amber base refraction
  baseGlow.addColorStop(0.92, 'rgba(195, 202, 170, 0.35)'); // Bottom glass heel highlight
  baseGlow.addColorStop(1.0, '#070803');
  ctx.fillStyle = baseGlow;
  ctx.fillRect(0, height * 0.88, width, height * 0.12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
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
