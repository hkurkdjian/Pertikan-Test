import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BOTTLE_PHOTO_URLS,
  BottlePhotoKey,
  getBottlePhotoKey,
  getBottlePhotoUrl,
  getWineBottleDimensions,
  WineProduct,
  WineSize,
} from '../data/products';
import {
  checkWebGlAvailable,
  createContactShadowTexture,
  createPhotorealBottleTexturesFromImage,
  detectSoftwareGl,
  PHOTO_BOTTLE_SPECS,
  PhotorealBottleTextures,
} from '../utils/webgl';

interface WineBottle3DProps {
  product: WineProduct;
  size?: WineSize;
  rotationY: number;
  tiltZ: number;
  depthOffset: number;
  className?: string;
}

const ALL_PHOTO_KEYS: BottlePhotoKey[] = [
  'mitra-075',
  'mitra-050',
  'mitra-frizzante',
  'ume-075',
  'ume-050',
  'ume-frizzante',
];

const LATHE_RADIAL_SEGMENTS = 72;
const BOTTLE_BASE_Y = -2.28;

/**
 * Builds a 67-point LatheGeometry from the exact 65-step silhouette measured
 * from the 1792x2400 studio reference photograph for `photoKey`, and assigns
 * linear vertical UV coordinates `v = (p - 1) / 64` so the inverse-cylindrical
 * unwrapped studio photograph maps 1:1 with zero vertical arc-length distortion.
 */
function buildPhotogrammetricBottleGeometry(
  photoKey: BottlePhotoKey,
  radialSegments = LATHE_RADIAL_SEGMENTS
): THREE.LatheGeometry {
  const spec = PHOTO_BOTTLE_SPECS[photoKey] || PHOTO_BOTTLE_SPECS['mitra-075'];
  const pxToWorld = spec.worldHeight / (spec.yBot - spec.yTop);
  const pts: THREE.Vector2[] = [];

  // Point 0: Center of bottom punt base
  pts.push(new THREE.Vector2(0, BOTTLE_BASE_Y));

  // Points 1..65: Exact 65-step silhouette from bottom (idx=0) to top of screw-cap (idx=64)
  for (let idx = 0; idx <= 64; idx++) {
    const t = idx / 64;
    const y = BOTTLE_BASE_Y + t * spec.worldHeight;
    const r = spec.radii[idx] * pxToWorld;
    pts.push(new THREE.Vector2(r, y));
  }

  // Point 66: Center of top Stelvin screw cap
  pts.push(new THREE.Vector2(0, BOTTLE_BASE_Y + spec.worldHeight));

  const geo = new THREE.LatheGeometry(pts, radialSegments, Math.PI, Math.PI * 2);

  // Override default arc-length V coordinates with exact linear V = t = (p - 1) / 64
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const numPts = pts.length; // 67
  for (let i = 0; i <= radialSegments; i++) {
    const u = i / radialSegments;
    for (let p = 0; p < numPts; p++) {
      const vIdx = i * numPts + p;
      const v = p === 0 ? 0 : p === numPts - 1 ? 1 : (p - 1) / 64;
      uvAttr.setXY(vIdx, u, v);
    }
  }
  uvAttr.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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
  const prevPhotoKeyRef = useRef<BottlePhotoKey | null>(null);

  const effectiveSize: WineSize = product.sizes.includes(size) ? size : product.defaultSize;
  const activeDims = getWineBottleDimensions(effectiveSize, product.isSparkling);
  const activePhotoKey = getBottlePhotoKey(product.id, effectiveSize);

  const targetStateRef = useRef({
    rotationY,
    tiltZ,
    depthOffset,
    product,
    size: effectiveSize,
    photoKey: activePhotoKey,
  });

  // Poised, non-bouncy pointer & transition state
  const pointerStateRef = useRef({
    hoverX: 0,
    hoverY: 0,
    isHovering: false,
    isDragging: false,
    dragStartX: 0,
    dragRotY: 0,
    sizeTurnOffset: 0,
  });

  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const prevKey = prevPhotoKeyRef.current;
    if (prevKey && prevKey !== activePhotoKey) {
      // Subtle, critically-damped axial turn when switching sizes (decays smoothly to 0 with zero bounce)
      const isSizeSwitch = prevKey.split('-')[0] === activePhotoKey.split('-')[0];
      if (isSizeSwitch) {
        pointerStateRef.current.sizeTurnOffset = effectiveSize === '0.5 L' ? 0.08 : -0.08;
      }
    }
    prevPhotoKeyRef.current = activePhotoKey;

    targetStateRef.current = {
      rotationY,
      tiltZ,
      depthOffset,
      product,
      size: effectiveSize,
      photoKey: activePhotoKey,
    };
    requestRenderRef.current?.();
  }, [rotationY, tiltZ, depthOffset, product, effectiveSize, activePhotoKey]);

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
    renderer.toneMappingExposure = 1.04;
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

    const camera = new THREE.PerspectiveCamera(27.5, width / height, 0.1, 50);
    camera.position.set(0, -0.02, 10.15);
    camera.lookAt(0, -0.02, 0);

    // 3-Point Studio Macro Lighting Rig for Dynamic Specular Glaze & Foil Reflections
    const hemiLight = new THREE.HemisphereLight(0xfffdf9, 0xe8e1d5, isSoftwareGl ? 1.1 : 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8eb, 2.25);
    keyLight.position.set(-3.8, 4.4, 5.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf4f7ff, 1.35);
    fillLight.position.set(4.4, 2.2, 4.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe9b0, 1.65);
    rimLight.position.set(0.4, 3.5, -5.2);
    scene.add(rimLight);

    // Root group controls Z-tilt, X-pitch, and Z-depth
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Bottle group rotates in 3D with scroll and pointer interaction
    const bottleGroup = new THREE.Group();
    rootGroup.add(bottleGroup);

    // Pre-build vertex position buffers for all 6 exact studio photograph silhouettes
    const targetPositions: Record<BottlePhotoKey, Float32Array> = {} as Record<
      BottlePhotoKey,
      Float32Array
    >;
    ALL_PHOTO_KEYS.forEach((k) => {
      const tempGeo = buildPhotogrammetricBottleGeometry(k, LATHE_RADIAL_SEGMENTS);
      targetPositions[k] = new Float32Array(
        (tempGeo.attributes.position as THREE.BufferAttribute).array
      );
      tempGeo.dispose();
    });

    // Clean initial placeholder texture before async image decode completes (~15ms)
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 64;
    fallbackCanvas.height = 64;
    const fCtx = fallbackCanvas.getContext('2d');
    if (fCtx) {
      fCtx.fillStyle = '#d89b28';
      fCtx.fillRect(0, 0, 64, 64);
    }
    const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
    fallbackTex.colorSpace = THREE.SRGBColorSpace;

    const initialKey = targetStateRef.current.photoKey;

    // 1. Primary Photogrammetric 3D Bottle Mesh
    const outerGeo = buildPhotogrammetricBottleGeometry(initialKey, LATHE_RADIAL_SEGMENTS);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: fallbackTex,
      toneMapped: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.renderOrder = 1;
    bottleGroup.add(outerMesh);

    // 2. Seamless Crossfade Overlay Mesh (dissolves outgoing bottle texture smoothly during transitions)
    const fadeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: fallbackTex,
      toneMapped: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const fadeMesh = new THREE.Mesh(outerGeo, fadeMat);
    fadeMesh.scale.setScalar(1.0004);
    fadeMesh.renderOrder = 2;
    fadeMesh.visible = false;
    bottleGroup.add(fadeMesh);

    // 3. Dynamic PBR Glass Clearcoat, Metallic Screw-Cap & Gold Foil Emboss Glaze Shell
    const glazeGeo = buildPhotogrammetricBottleGeometry(initialKey, LATHE_RADIAL_SEGMENTS);
    const glazeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: fallbackTex,
      bumpMap: fallbackTex,
      bumpScale: 0.0035,
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glazeMesh = new THREE.Mesh(glazeGeo, glazeMat);
    glazeMesh.scale.setScalar(1.0012);
    glazeMesh.renderOrder = 3;
    bottleGroup.add(glazeMesh);

    // 4. Soft Ground Contact Shadow Plane
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.15, 0.65);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, BOTTLE_BASE_Y - 0.02, 0);
    rootGroup.add(shadowMesh);

    // Cache of decoded photogrammetric texture bundles
    const photoTextureCache = new Map<BottlePhotoKey, PhotorealBottleTextures>();
    const loadingKeys = new Set<BottlePhotoKey>();
    let activeAppliedKey: BottlePhotoKey | null = null;
    let fadeAlpha = 0;
    let disposed = false;

    const applyTextureBundle = (key: BottlePhotoKey, bundle: PhotorealBottleTextures) => {
      if (disposed) return;
      // If transitioning from an already-applied bottle texture, crossfade smoothly from the outgoing map
      if (activeAppliedKey && activeAppliedKey !== key && outerMat.map !== fallbackTex) {
        fadeMat.map = outerMat.map;
        fadeMat.needsUpdate = true;
        fadeAlpha = 1.0;
        fadeMat.opacity = 1.0;
        fadeMesh.visible = true;
      }

      activeAppliedKey = key;
      outerMat.map = bundle.albedoMap;
      outerMat.needsUpdate = true;

      glazeMat.map = bundle.specularMap;
      glazeMat.bumpMap = bundle.bumpMap;
      glazeMat.needsUpdate = true;
    };

    const ensurePhotoTextureLoaded = (key: BottlePhotoKey) => {
      const cached = photoTextureCache.get(key);
      if (cached) {
        if (activeAppliedKey !== key && targetStateRef.current.photoKey === key) {
          applyTextureBundle(key, cached);
        }
        return;
      }
      if (loadingKeys.has(key)) return;
      loadingKeys.add(key);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadingKeys.delete(key);
        if (disposed) return;
        const bundle = createPhotorealBottleTexturesFromImage(renderer, img, key);
        photoTextureCache.set(key, bundle);
        if (targetStateRef.current.photoKey === key) {
          applyTextureBundle(key, bundle);
          requestRender();
        }
      };
      img.onerror = () => {
        loadingKeys.delete(key);
      };
      img.src = BOTTLE_PHOTO_URLS[key];
    };

    // Load active bottle photo immediately, then preload remaining 5 studio bottle photos
    ensurePhotoTextureLoaded(initialKey);
    ALL_PHOTO_KEYS.forEach((k) => {
      if (k !== initialKey) ensurePhotoTextureLoaded(k);
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Critically damped / exponential ease-out state (zero overshoot, zero bounce)
    let currRotY = -Math.sin(targetStateRef.current.rotationY) * 0.14;
    let currTiltZ = targetStateRef.current.tiltZ;
    let currTiltX = 0;
    let currDepth = targetStateRef.current.depthOffset;
    let currShadowScale = 0.94;

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function morphGeometryPositions(
      geo: THREE.BufferGeometry,
      targetArr: Float32Array,
      factor: number
    ): boolean {
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      let maxDelta = 0;
      for (let i = 0; i < arr.length; i++) {
        const diff = targetArr[i] - arr[i];
        const absDiff = Math.abs(diff);
        if (absDiff > maxDelta) maxDelta = absDiff;
        arr[i] += diff * factor;
      }
      if (maxDelta > 0.0003) {
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();
        return true;
      }
      return false;
    }

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
            frameId = window.setTimeout(cb, 20);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 20);
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
        const pState = pointerStateRef.current;
        const desiredKey = target.photoKey;

        // Swap texture bundle if photoKey changed and texture is ready
        ensurePhotoTextureLoaded(desiredKey);
        const cachedBundle = photoTextureCache.get(desiredKey);
        if (cachedBundle && activeAppliedKey !== desiredKey) {
          applyTextureBundle(desiredKey, cachedBundle);
        }

        // Smoothly decay size-switch turn offset with zero oscillation
        pState.sizeTurnOffset *= isSoftwareGl ? 0.45 : 0.76;
        if (Math.abs(pState.sizeTurnOffset) < 0.0005) {
          pState.sizeTurnOffset = 0;
        }

        // Poised sinusoidal scroll turn: 0 at every product stop, gentle ~6 deg turn mid-transition
        const scrollTurnY = -Math.sin(target.rotationY) * 0.11;
        const pointerRotOffset = pState.isDragging
          ? pState.dragRotY
          : pState.isHovering
          ? pState.hoverX * 0.18
          : 0;
        const desiredRotY = scrollTurnY + pState.sizeTurnOffset + pointerRotOffset;

        const desiredTiltZ =
          target.tiltZ + (pState.isHovering && !pState.isDragging ? -pState.hoverX * 0.025 : 0);
        const desiredTiltX = pState.isHovering && !pState.isDragging ? pState.hoverY * 0.025 : 0;

        // Fast, seamless monotonic exponential ease-out (zero overshoot, zero bounce)
        const easeFactor = isSoftwareGl ? 0.62 : 0.25;
        const morphFactor = isSoftwareGl ? 0.65 : 0.28;

        currRotY += (desiredRotY - currRotY) * easeFactor;
        currTiltZ += (desiredTiltZ - currTiltZ) * easeFactor;
        currTiltX += (desiredTiltX - currTiltX) * easeFactor;
        currDepth += (target.depthOffset - currDepth) * easeFactor;

        // Smoothly and rapidly dissolve outgoing texture crossfade layer
        if (fadeAlpha > 0.004) {
          fadeAlpha *= isSoftwareGl ? 0.35 : 0.68;
          fadeMat.opacity = fadeAlpha;
          fadeMesh.visible = true;
        } else if (fadeMesh.visible) {
          fadeAlpha = 0;
          fadeMat.opacity = 0;
          fadeMesh.visible = false;
        }

        // Morph the 3D bottle lathe geometry and specular glaze vertices toward active photoKey silhouette
        const targetPosArray = targetPositions[desiredKey] || targetPositions['mitra-075'];
        const outerMoving = morphGeometryPositions(outerGeo, targetPosArray, morphFactor);
        morphGeometryPositions(glazeGeo, targetPosArray, morphFactor);

        // Scale ground shadow proportionally to bottle base width
        const targetShadowScale =
          desiredKey === 'mitra-050' || desiredKey === 'ume-050'
            ? 0.78
            : desiredKey === 'mitra-frizzante' || desiredKey === 'ume-frizzante'
            ? 1.12
            : 0.94;
        currShadowScale += (targetShadowScale - currShadowScale) * morphFactor;
        shadowMesh.scale.set(currShadowScale, currShadowScale, 1);

        bottleGroup.rotation.y = currRotY;

        rootGroup.rotation.z = currTiltZ;
        rootGroup.rotation.x = currTiltX;
        rootGroup.position.z = currDepth;

        // Shift key light subtly with bottle rotation and cursor hover so studio softbox speculars glide across the glass & gold foil
        keyLight.position.x = -3.8 + Math.sin(currRotY * 2.0) * 1.4 + pState.hoverX * 1.5;
        keyLight.position.y = 4.4 - pState.hoverY * 0.9;

        renderer.render(scene, camera);

        const stillMoving =
          outerMoving ||
          fadeAlpha > 0.004 ||
          Math.abs(pState.sizeTurnOffset) > 0.0005 ||
          Math.abs(desiredRotY - currRotY) > 0.0008 ||
          Math.abs(desiredTiltZ - currTiltZ) > 0.0006 ||
          Math.abs(desiredTiltX - currTiltX) > 0.0006 ||
          Math.abs(target.depthOffset - currDepth) > 0.001;

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
      fadeMat.dispose();
      glazeGeo.dispose();
      glazeMat.dispose();
      fallbackTex.dispose();
      photoTextureCache.forEach((bundle) => {
        bundle.albedoMap.dispose();
        bundle.specularMap.dispose();
        bundle.bumpMap.dispose();
      });
      photoTextureCache.clear();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      envTexture?.dispose();
      renderer.dispose();
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const pState = pointerStateRef.current;
    pState.hoverX = Math.max(-1, Math.min(1, nx));
    pState.hoverY = Math.max(-1, Math.min(1, ny));
    pState.isHovering = true;

    if (pState.isDragging) {
      const deltaX = (e.clientX - pState.dragStartX) / Math.max(180, rect.width);
      pState.dragRotY = Math.max(-0.52, Math.min(0.52, deltaX * 0.95));
    }
    requestRenderRef.current?.();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pState = pointerStateRef.current;
    pState.isDragging = true;
    pState.dragStartX = e.clientX;
    requestRenderRef.current?.();
  };

  const handlePointerUp = () => {
    const pState = pointerStateRef.current;
    if (pState.isDragging) {
      pState.isDragging = false;
      pState.dragRotY = 0;
      requestRenderRef.current?.();
    }
  };

  const handlePointerLeave = () => {
    const pState = pointerStateRef.current;
    pState.isHovering = false;
    pState.isDragging = false;
    pState.hoverX = 0;
    pState.hoverY = 0;
    pState.dragRotY = 0;
    requestRenderRef.current?.();
  };

  if (!webGlSupported) {
    const photoUrl = getBottlePhotoUrl(product.id, effectiveSize);
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        data-testid="wine-bottle-fallback"
        data-product-id={product.id}
        data-bottle-size={effectiveSize}
        data-bottle-shape={activeDims.shapeVariant}
        data-bottle-photo={activePhotoKey}
      >
        <img
          src={photoUrl}
          alt={`${product.name} ${effectiveSize}`}
          className="h-full max-h-[520px] w-auto object-contain select-none"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full h-full select-none cursor-grab active:cursor-grabbing ${className}`}
      data-testid="wine-bottle-3d"
      data-product-id={product.id}
      data-bottle-size={effectiveSize}
      data-bottle-shape={activeDims.shapeVariant}
      data-bottle-photo={activePhotoKey}
      aria-label={`3D model of ${product.name} ${effectiveSize} bottle`}
      role="img"
    />
  );
}
