import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getWineBottleDimensions, WineProduct, WineSize } from '../data/products';
import {
  checkWebGlAvailable,
  createBottleStudioTexture,
  createCapsuleStudioTexture,
  createContactShadowTexture,
  createCottonPaperTexture,
  detectSoftwareGl,
} from '../utils/webgl';

interface WineBottle3DProps {
  product: WineProduct;
  size?: WineSize;
  rotationY: number;
  tiltZ: number;
  depthOffset: number;
  className?: string;
}

/**
 * Builds the exact Burgundy sloped-shoulder outer profile matching Pertikan's Mitra & U&Me bottles.
 * Total height: ~4.64 units (y from -2.30 to +2.33), body radius: 0.685.
 */
function buildBottleOuterPoints(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  // Center bottom of punt
  pts.push(new THREE.Vector2(0.0, -2.14));
  pts.push(new THREE.Vector2(0.44, -2.26));
  pts.push(new THREE.Vector2(0.58, -2.30));
  // Rounded base heel
  pts.push(new THREE.Vector2(0.65, -2.27));
  pts.push(new THREE.Vector2(0.68, -2.18));
  // Straight lower cylindrical body (where label sits: y = -1.82 to -0.32)
  pts.push(new THREE.Vector2(0.685, -1.85));
  pts.push(new THREE.Vector2(0.685, -0.32));
  // Burgundy sloped shoulder (smooth S-curve from y = -0.32 to +1.34)
  const shoulderSteps = 28;
  for (let i = 1; i <= shoulderSteps; i++) {
    const t = i / shoulderSteps;
    const y = -0.32 + t * 1.66; // -0.32 -> +1.34
    const ease = t * t * (3 - 2 * t);
    const r = 0.685 - ease * (0.685 - 0.226) - Math.sin(t * Math.PI) * 0.018;
    pts.push(new THREE.Vector2(r, y));
  }
  // Upper glass neck (below capsule)
  pts.push(new THREE.Vector2(0.222, 1.50));
  pts.push(new THREE.Vector2(0.214, 2.08));
  // Bague / lip ring finish
  pts.push(new THREE.Vector2(0.232, 2.11));
  pts.push(new THREE.Vector2(0.232, 2.21));
  pts.push(new THREE.Vector2(0.224, 2.23));
  pts.push(new THREE.Vector2(0.228, 2.31));
  pts.push(new THREE.Vector2(0.18, 2.32));
  pts.push(new THREE.Vector2(0.0, 2.30));
  return pts;
}

/**
 * Builds the matte charcoal-pewter tin capsule profile covering y = +1.36 to +2.33.
 */
function buildCapsulePoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.230, 1.36),
    new THREE.Vector2(0.232, 1.38),
    new THREE.Vector2(0.222, 2.08),
    // Lower collar ring
    new THREE.Vector2(0.240, 2.10),
    new THREE.Vector2(0.241, 2.21),
    // Groove between rings
    new THREE.Vector2(0.230, 2.23),
    // Top lip bead
    new THREE.Vector2(0.236, 2.26),
    new THREE.Vector2(0.235, 2.31),
    new THREE.Vector2(0.210, 2.33),
    new THREE.Vector2(0.0, 2.33),
  ];
}

export function WineBottle3D({
  product,
  size = '0.75 L',
  rotationY,
  tiltZ,
  depthOffset,
  className = '',
}: WineBottle3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const prevSizeRef = useRef<WineSize>(size);
  const sizeSpinBonusRef = useRef<number>(0);

  const targetStateRef = useRef({
    rotationY,
    tiltZ,
    depthOffset,
    product,
    size,
  });
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (prevSizeRef.current !== size) {
      prevSizeRef.current = size;
      sizeSpinBonusRef.current += Math.PI * 2;
    }
    targetStateRef.current = {
      rotationY,
      tiltZ,
      depthOffset,
      product,
      size,
    };
    requestRenderRef.current?.();
  }, [rotationY, tiltZ, depthOffset, product, size]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    if (!checkWebGlAvailable()) {
      setWebGlSupported(false);
      return;
    }

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebGlSupported(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 540;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    let envTexture: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();
    }

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 50);
    camera.position.set(0, 0.02, 10.2);
    camera.lookAt(0, 0.02, 0);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfcfbf7, 0xd8d4c8, isSoftwareGl ? 1.05 : 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff9ee, 1.9);
    keyLight.position.set(-4.2, 4.2, 5.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf2f5ff, 1.15);
    fillLight.position.set(4.5, 2.0, 4.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeeb5, 1.4);
    rimLight.position.set(0.5, 3.2, -5.0);
    scene.add(rimLight);

    // Root group controls Z-tilt and Z-depth
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Studio glass group rotates gently with scroll so softbox reflections glide across the shoulder
    const studioGlassGroup = new THREE.Group();
    rootGroup.add(studioGlassGroup);

    // Bottle physical group rotates 1:1 with scroll (labels, punt knurling dots, capsule seam)
    const bottleGroup = new THREE.Group();
    rootGroup.add(bottleGroup);

    // 1. High-Contrast Dark Antique Olive-Amber Glass Body with Backlit Mead Core (phiStart = Math.PI so u=0.5 faces +Z)
    const studioBottleTex = createBottleStudioTexture(
      renderer,
      targetStateRef.current.product.liquidGlowColor
    );
    const outerGeo = new THREE.LatheGeometry(buildBottleOuterPoints(), 64, Math.PI, Math.PI * 2);
    const outerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: studioBottleTex,
      roughness: 0.14,
      metalness: 0.04,
      envMapIntensity: 0.22,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    studioGlassGroup.add(outerMesh);

    // 2. Clearcoat Specular Glass Glaze Shell (catches real-time directional light as the bottle tilts)
    const glazeGeo = new THREE.LatheGeometry(buildBottleOuterPoints(), 48, Math.PI, Math.PI * 2);
    const glazeMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x161b07),
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.18,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    const glazeMesh = new THREE.Mesh(glazeGeo, glazeMat);
    glazeMesh.scale.setScalar(1.001);
    glazeMesh.renderOrder = 2;
    bottleGroup.add(glazeMesh);

    // 3. Neck Meniscus Golden-Olive Ring (visible between shoulder y=1.24 and capsule y=1.36)
    const meniscusGeo = new THREE.CylinderGeometry(0.224, 0.228, 0.075, 48);
    const meniscusMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x88942c),
      transparent: true,
      opacity: 0.85,
    });
    const meniscusMesh = new THREE.Mesh(meniscusGeo, meniscusMat);
    meniscusMesh.position.y = 1.315;
    meniscusMesh.renderOrder = 3;
    studioGlassGroup.add(meniscusMesh);

    // 4. Matte Brushed Charcoal-Pewter Tin Capsule + Embossed Top Rings
    const capsuleTex = createCapsuleStudioTexture(
      renderer,
      targetStateRef.current.product.capsuleColor
    );
    const capsuleGeo = new THREE.LatheGeometry(buildCapsulePoints(), 56, Math.PI, Math.PI * 2);
    const capsuleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: capsuleTex,
      roughness: 0.34,
      metalness: 0.35,
      envMapIntensity: 0.3,
    });
    const capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    capsuleMesh.renderOrder = 4;
    studioGlassGroup.add(capsuleMesh);

    // 5. Wrap-Around Textured Cream Cotton Paper Label (Front + Back)
    const { map: paperMap, bumpMap: paperBump } = createCottonPaperTexture(
      renderer,
      targetStateRef.current.product.labelTint
    );
    // Wrap-around cotton paper label with a razor-thin physical seam on the back (theta = Math.PI)
    const frontLabelGeo = new THREE.CylinderGeometry(
      0.691,
      0.691,
      1.45,
      64,
      1,
      true,
      -Math.PI * 0.988,
      Math.PI * 1.976
    );
    const labelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: paperMap,
      bumpMap: paperBump,
      bumpScale: 0.004,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.15,
      side: THREE.DoubleSide,
    });
    const frontLabelMesh = new THREE.Mesh(frontLabelGeo, labelMat);
    frontLabelMesh.position.y = -1.06;
    frontLabelMesh.renderOrder = 5;
    bottleGroup.add(frontLabelMesh);

    // 6. Bottom Glass Punt & Mold Knurling Dots (visible at bottle heel y = -2.18, matching bottle_closeup.png)
    const puntDotGeo = new THREE.SphereGeometry(0.011, 8, 8);
    const puntDotMat = new THREE.MeshBasicMaterial({
      color: 0xb5bda0,
      transparent: true,
      opacity: 0.62,
    });
    const dotGroup = new THREE.Group();
    const dotPositions = [-0.28, -0.23, -0.18, 0.18, 0.23, 0.28];
    dotPositions.forEach((angle) => {
      const dot = new THREE.Mesh(puntDotGeo, puntDotMat);
      dot.position.set(Math.sin(angle) * 0.672, -2.18, Math.cos(angle) * 0.672);
      dotGroup.add(dot);
    });
    bottleGroup.add(dotGroup);

    // 7. Soft Ground Contact Shadow Plane
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.15, 0.65);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -2.31, 0);
    rootGroup.add(shadowMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const initialDims = getWineBottleDimensions(targetStateRef.current.size);
    let currRotY = targetStateRef.current.rotationY;
    let currTiltZ = targetStateRef.current.tiltZ;
    let currDepth = targetStateRef.current.depthOffset;
    let currRadialScale = initialDims.radialScale;
    let currHeightScale = initialDims.heightScale;
    let currLabelScaleY = initialDims.labelScaleY;
    let currSpinBonus = 0;
    let currLiquidColor = new THREE.Color(targetStateRef.current.product.liquidGlowColor);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
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
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const target = targetStateRef.current;
        const targetDims = getWineBottleDimensions(target.size);
        const lerpFactor = isSoftwareGl ? 0.45 : 0.22;

        currRotY += (target.rotationY - currRotY) * lerpFactor;
        currTiltZ += (target.tiltZ - currTiltZ) * lerpFactor;
        currDepth += (target.depthOffset - currDepth) * lerpFactor;
        currRadialScale += (targetDims.radialScale - currRadialScale) * lerpFactor;
        currHeightScale += (targetDims.heightScale - currHeightScale) * lerpFactor;
        currLabelScaleY += (targetDims.labelScaleY - currLabelScaleY) * lerpFactor;
        currSpinBonus += (sizeSpinBonusRef.current - currSpinBonus) * (isSoftwareGl ? 0.42 : 0.16);

        const targetLiquid = new THREE.Color(target.product.liquidGlowColor);
        currLiquidColor.lerp(targetLiquid, lerpFactor);
        meniscusMat.color.copy(currLiquidColor);

        // Keep bottle heel grounded at y = -2.30 on the studio shadow plane as heightScale changes
        const groundOffsetY = -2.3 * (1 - currHeightScale);

        const totalRotY = currRotY + currSpinBonus;
        bottleGroup.rotation.y = totalRotY;
        bottleGroup.scale.set(currRadialScale, currHeightScale, currRadialScale);
        bottleGroup.position.y = groundOffsetY;

        frontLabelMesh.scale.set(1, currLabelScaleY / Math.max(0.7, currHeightScale), 1);

        studioGlassGroup.rotation.y = Math.sin(totalRotY) * 0.16;
        studioGlassGroup.scale.set(currRadialScale, currHeightScale, currRadialScale);
        studioGlassGroup.position.y = groundOffsetY;

        shadowMesh.scale.set(currRadialScale, currRadialScale, 1);

        rootGroup.rotation.z = currTiltZ;
        rootGroup.position.z = currDepth;

        renderer.render(scene, camera);

        const stillMoving =
          Math.abs(target.rotationY - currRotY) > 0.002 ||
          Math.abs(target.tiltZ - currTiltZ) > 0.001 ||
          Math.abs(target.depthOffset - currDepth) > 0.002 ||
          Math.abs(targetDims.radialScale - currRadialScale) > 0.002 ||
          Math.abs(targetDims.heightScale - currHeightScale) > 0.002 ||
          Math.abs(sizeSpinBonusRef.current - currSpinBonus) > 0.005;

        if (stillMoving) {
          renderDirty = true;
        }

        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    requestRender();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      outerGeo.dispose();
      outerMat.dispose();
      studioBottleTex.dispose();
      glazeGeo.dispose();
      glazeMat.dispose();
      meniscusGeo.dispose();
      meniscusMat.dispose();
      capsuleGeo.dispose();
      capsuleMat.dispose();
      capsuleTex.dispose();
      frontLabelGeo.dispose();
      labelMat.dispose();
      paperMap.dispose();
      paperBump.dispose();
      puntDotGeo.dispose();
      puntDotMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      envTexture?.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webGlSupported) {
    const fallbackScale = size === '0.5 L' ? 0.84 : 1;
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        data-testid="wine-bottle-fallback"
        data-bottle-size={size}
      >
        <svg
          viewBox="0 0 160 440"
          style={{ transform: `scale(${fallbackScale})`, transformOrigin: 'bottom center' }}
          className="h-full max-h-[520px] w-auto transition-transform duration-300"
        >
          <defs>
            <linearGradient id="bottleBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#141807" />
              <stop offset="35%" stopColor="#3f4814" />
              <stop offset="55%" stopColor="#485217" />
              <stop offset="85%" stopColor="#1d2209" />
              <stop offset="100%" stopColor="#101305" />
            </linearGradient>
            <linearGradient id="bottleLabel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#dbd7cd" />
              <stop offset="30%" stopColor="#eae7de" />
              <stop offset="75%" stopColor="#c9c5ba" />
              <stop offset="100%" stopColor="#d4d0c5" />
            </linearGradient>
          </defs>
          <path
            d="M66,20 L94,20 L96,110 C102,165 130,205 130,255 L130,405 C130,418 122,424 108,424 L52,424 C38,424 30,418 30,405 L30,255 C30,205 58,165 64,110 Z"
            fill="url(#bottleBody)"
          />
          <rect x="65" y="18" width="30" height="84" rx="2" fill="#262624" />
          <rect x="31" y="255" width="98" height="135" rx="1" fill="url(#bottleLabel)" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full select-none ${className}`}
      data-testid="wine-bottle-3d"
      data-product-id={product.id}
      data-bottle-size={size}
      aria-label={`3D model of ${product.name} ${size} bottle`}
      role="img"
    />
  );
}
