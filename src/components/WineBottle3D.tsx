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

  // Interactive pointer / touch physics state
  const pointerStateRef = useRef({
    hoverX: 0,
    hoverY: 0,
    isHovering: false,
    isDragging: false,
    dragStartX: 0,
    dragRotY: 0,
    impulseRotVel: 0,
    impulseScaleVel: 0,
  });

  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const prevKey = prevPhotoKeyRef.current;
    if (prevKey && prevKey !== activePhotoKey) {
      // Trigger a subtle physical spring impulse when switching bottle size or wine variant
      const isSizeSwitch = prevKey.split('-')[0] === activePhotoKey.split('-')[0];
      pointerStateRef.current.impulseRotVel += isSizeSwitch ? 0.065 : 0.04;
      pointerStateRef.current.impulseScaleVel += isSizeSwitch ? 0.028 : 0.015;
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

    // 1. Photogrammetric 3D Bottle Core Mesh (Unlit sRGB albedo map preserves 100% of studio photograph color, internal refraction, and exact original label)
    const outerGeo = buildPhotogrammetricBottleGeometry(initialKey, LATHE_RADIAL_SEGMENTS);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: fallbackTex,
      toneMapped: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    bottleGroup.add(outerMesh);

    // 2. Dynamic PBR Glass Clearcoat, Metallic Screw-Cap & Gold Foil Emboss Glaze Shell
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
    glazeMesh.renderOrder = 2;
    bottleGroup.add(glazeMesh);

    // 3. Soft Ground Contact Shadow Plane
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
    let disposed = false;

    const applyTextureBundle = (key: BottlePhotoKey, bundle: PhotorealBottleTextures) => {
      if (disposed) return;
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

    // Second-order spring-damper physics state for lifelike bottle inertia
    let currRotY = targetStateRef.current.rotationY * 0.42;
    let rotYVel = 0;
    let currTiltZ = targetStateRef.current.tiltZ;
    let tiltZVel = 0;
    let currTiltX = 0;
    let tiltXVel = 0;
    let currDepth = targetStateRef.current.depthOffset;
    let currScale = 1.0;
    let scaleVel = 0;
    let currShadowScale = 1.0;

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
      if (maxDelta > 0.00035) {
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

        // Apply any queued size-switch / variant-switch physical impulse
        if (pState.impulseRotVel !== 0) {
          rotYVel += pState.impulseRotVel;
          pState.impulseRotVel = 0;
        }
        if (pState.impulseScaleVel !== 0) {
          scaleVel += pState.impulseScaleVel;
          pState.impulseScaleVel = 0;
        }

        // Constrain scroll rotation to the front studio hemisphere [-0.46, +0.46] rad
        // so the authentic studio label & glass refraction stay prominent, plus interactive pointer rotation
        const baseScrollRotY = Math.max(-0.46, Math.min(0.46, target.rotationY * 0.42));
        const pointerRotOffset = pState.isDragging
          ? pState.dragRotY
          : pState.isHovering
          ? pState.hoverX * 0.24
          : 0;
        const desiredRotY = baseScrollRotY + pointerRotOffset;

        const desiredTiltZ =
          target.tiltZ + (pState.isHovering && !pState.isDragging ? -pState.hoverX * 0.045 : 0);
        const desiredTiltX = pState.isHovering && !pState.isDragging ? pState.hoverY * 0.045 : 0;

        // Spring-damper integration
        const stiffness = isSoftwareGl ? 0.36 : 0.16;
        const damping = isSoftwareGl ? 0.55 : 0.76;

        rotYVel = (rotYVel + (desiredRotY - currRotY) * stiffness) * damping;
        currRotY += rotYVel;

        tiltZVel = (tiltZVel + (desiredTiltZ - currTiltZ) * stiffness) * damping;
        currTiltZ += tiltZVel;

        tiltXVel = (tiltXVel + (desiredTiltX - currTiltX) * stiffness) * damping;
        currTiltX += tiltXVel;

        scaleVel = (scaleVel + (1.0 - currScale) * 0.22) * 0.72;
        currScale += scaleVel;

        const lerpFactor = isSoftwareGl ? 0.65 : 0.24;
        currDepth += (target.depthOffset - currDepth) * lerpFactor;

        // Morph the 3D bottle lathe geometry and specular glaze vertices toward active photoKey silhouette
        const targetPosArray = targetPositions[desiredKey] || targetPositions['mitra-075'];
        const outerMoving = morphGeometryPositions(outerGeo, targetPosArray, lerpFactor);
        morphGeometryPositions(glazeGeo, targetPosArray, lerpFactor);

        // Scale ground shadow proportionally to bottle base width
        const targetShadowScale =
          desiredKey === 'mitra-050' || desiredKey === 'ume-050'
            ? 0.78
            : desiredKey === 'mitra-frizzante' || desiredKey === 'ume-frizzante'
            ? 1.12
            : 0.94;
        currShadowScale += (targetShadowScale - currShadowScale) * lerpFactor;
        shadowMesh.scale.set(currShadowScale, currShadowScale, 1);

        bottleGroup.rotation.y = currRotY;
        bottleGroup.scale.setScalar(currScale);

        rootGroup.rotation.z = currTiltZ;
        rootGroup.rotation.x = currTiltX;
        rootGroup.position.z = currDepth;

        // Shift key light subtly with bottle rotation and cursor hover so studio softbox speculars glide across the glass & gold foil
        keyLight.position.x = -3.8 + Math.sin(currRotY * 2.0) * 1.6 + pState.hoverX * 1.8;
        keyLight.position.y = 4.4 - pState.hoverY * 1.1;

        renderer.render(scene, camera);

        const stillMoving =
          outerMoving ||
          Math.abs(desiredRotY - currRotY) > 0.0012 ||
          Math.abs(rotYVel) > 0.0008 ||
          Math.abs(desiredTiltZ - currTiltZ) > 0.001 ||
          Math.abs(desiredTiltX - currTiltX) > 0.001 ||
          Math.abs(1.0 - currScale) > 0.001 ||
          Math.abs(scaleVel) > 0.0008 ||
          Math.abs(target.depthOffset - currDepth) > 0.002;

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
      pState.dragRotY = Math.max(-0.62, Math.min(0.62, deltaX * 1.15));
    }
    requestRenderRef.current?.();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pState = pointerStateRef.current;
    pState.isDragging = true;
    pState.dragStartX = e.clientX;
    pState.impulseScaleVel -= 0.014;
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
