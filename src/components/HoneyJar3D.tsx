import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HoneyProduct } from '../data/products';
import {
  applyNormalizedCylindricalUVs,
  checkWebGlAvailable,
  createContactShadowTexture,
  createCottonPaperTexture,
  createHoneyStudioTexture,
  createJarLidStudioTexture,
  detectSoftwareGl,
} from '../utils/webgl';

interface HoneyJar3DProps {
  product: HoneyProduct;
  rotationY: number;
  tiltZ?: number;
  scaleOffset?: number;
  className?: string;
}

/**
 * Builds a 2D rounded hexagonal cross-section shape with vertices at 0, 60, 120, 180, 240, 300 deg.
 * After geo.rotateX(Math.PI / 2), the top edge (between 60 and 120 deg) becomes a wide FLAT front face
 * perpendicular to +Z (z = +flatToFlatRadius), flanked by two 60-degree angled side facets, matching jar_closeup2.png.
 */
function createRoundedHexagonShape(flatToFlatRadius: number, cornerSmooth = 0.08): THREE.Shape {
  const shape = new THREE.Shape();
  const R = flatToFlatRadius / Math.cos(Math.PI / 6);
  const pts: THREE.Vector2[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    pts.push(new THREE.Vector2(Math.cos(angle) * R, Math.sin(angle) * R));
  }

  for (let i = 0; i < 6; i++) {
    const prev = pts[(i + 5) % 6];
    const curr = pts[i];
    const next = pts[(i + 1) % 6];

    const pIn = curr.clone().lerp(prev, cornerSmooth);
    const pOut = curr.clone().lerp(next, cornerSmooth);

    if (i === 0) {
      shape.moveTo(pIn.x, pIn.y);
    } else {
      shape.lineTo(pIn.x, pIn.y);
    }
    shape.quadraticCurveTo(curr.x, curr.y, pOut.x, pOut.y);
  }
  shape.closePath();
  return shape;
}

/**
 * Builds a centered hexagonal prism BufferGeometry oriented vertically along Y with normalized cylindrical UVs.
 */
function buildHexJarGeometry(
  flatRadius: number,
  cornerSmooth: number,
  height: number,
  bevelThickness = 0.055,
  bevelSize = 0.045
): THREE.BufferGeometry {
  const shape = createRoundedHexagonShape(flatRadius, cornerSmooth);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 2,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 4,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  applyNormalizedCylindricalUVs(geo);
  return geo;
}

/**
 * Builds the brushed bronze-pewter twist-off lid LatheGeometry profile (y = 1.18 to 1.54).
 */
function buildJarLidPoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.0, 1.18),
    new THREE.Vector2(0.92, 1.18),
    new THREE.Vector2(0.98, 1.20),
    new THREE.Vector2(0.96, 1.23),
    new THREE.Vector2(0.96, 1.47),
    new THREE.Vector2(0.93, 1.52),
    new THREE.Vector2(0.85, 1.54),
    new THREE.Vector2(0.0, 1.54),
  ];
}

/**
 * Builds the cylindrical threaded glass neck and stepped clear glass bottom base.
 */
function buildNeckPoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.80, 0.96),
    new THREE.Vector2(0.88, 1.02),
    new THREE.Vector2(0.87, 1.06),
    // Thread ring 1
    new THREE.Vector2(0.92, 1.08),
    new THREE.Vector2(0.87, 1.11),
    // Thread ring 2
    new THREE.Vector2(0.93, 1.14),
    new THREE.Vector2(0.88, 1.18),
    new THREE.Vector2(0.84, 1.20),
  ];
}

function buildBasePoints(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.0, -1.39),
    new THREE.Vector2(0.72, -1.39),
    new THREE.Vector2(0.86, -1.36),
    new THREE.Vector2(0.96, -1.30),
    new THREE.Vector2(0.99, -1.21),
    new THREE.Vector2(0.86, -1.17),
    new THREE.Vector2(0.0, -1.17),
  ];
}

export function HoneyJar3D({
  product,
  rotationY,
  tiltZ = 0,
  scaleOffset = 0,
  className = '',
}: HoneyJar3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const targetStateRef = useRef({
    rotationY,
    tiltZ,
    scaleOffset,
    product,
  });
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targetStateRef.current = {
      rotationY,
      tiltZ,
      scaleOffset,
      product,
    };
    requestRenderRef.current?.();
  }, [rotationY, tiltZ, scaleOffset, product]);

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

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 340;
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

    const camera = new THREE.PerspectiveCamera(27, width / height, 0.1, 40);
    camera.position.set(0, 0.06, 7.25);
    camera.lookAt(0, 0.02, 0);

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffcf5, 0xe2c79c, isSoftwareGl ? 1.05 : 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e0, 2.0);
    keyLight.position.set(-3.8, 4.2, 5.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfff0d4, 1.3);
    fillLight.position.set(4.0, 2.2, 4.5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffad33, 1.8);
    backLight.position.set(0.0, 1.5, -5.0);
    scene.add(backLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const jarGroup = new THREE.Group();
    rootGroup.add(jarGroup);

    // 1. Saturated Golden-Cognac Honey Hexagonal Body with normalized cylindrical UVs
    const honeyTex = createHoneyStudioTexture(
      renderer,
      targetStateRef.current.product.honeyColor,
      targetStateRef.current.product.honeyDeepColor,
      targetStateRef.current.product.honeyHighlightColor
    );
    const honeyGeo = buildHexJarGeometry(0.98, 0.07, 2.12, 0.05, 0.04);
    const honeyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: honeyTex,
      roughness: 0.14,
      metalness: 0.04,
      envMapIntensity: 0.24,
    });
    const honeyMesh = new THREE.Mesh(honeyGeo, honeyMat);
    honeyMesh.position.y = -0.11;
    jarGroup.add(honeyMesh);

    // 2. Outer Hexagonal Faceted Clear Glass Shell
    const glassGeo = buildHexJarGeometry(1.015, 0.075, 2.18, 0.06, 0.045);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xd98a2b),
      roughness: 0.06,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.28,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.y = -0.11;
    glassMesh.renderOrder = 2;
    jarGroup.add(glassMesh);

    // 3. Threaded Glass Neck & Upper Golden Honey Meniscus (visible between jar shoulder and dark lid)
    const neckHoneyGeo = new THREE.CylinderGeometry(0.84, 0.88, 0.22, 48);
    const neckHoneyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xc86c14),
      roughness: 0.22,
      metalness: 0.05,
      envMapIntensity: 0.25,
    });
    const neckHoneyMesh = new THREE.Mesh(neckHoneyGeo, neckHoneyMat);
    neckHoneyMesh.position.y = 1.06;
    jarGroup.add(neckHoneyMesh);

    const neckGlassGeo = new THREE.LatheGeometry(buildNeckPoints(), 48, Math.PI, Math.PI * 2);
    const neckGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf5d296),
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      envMapIntensity: 0.35,
      transparent: true,
      opacity: 0.48,
    });
    const neckGlassMesh = new THREE.Mesh(neckGlassGeo, neckGlassMat);
    neckGlassMesh.renderOrder = 3;
    jarGroup.add(neckGlassMesh);

    // 4. Stepped Clear Glass Base with Golden Amber Caustic Refraction
    const baseGeo = new THREE.LatheGeometry(buildBasePoints(), 48, Math.PI, Math.PI * 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xda9538),
      roughness: 0.16,
      metalness: 0.08,
      envMapIntensity: 0.35,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    jarGroup.add(baseMesh);

    // 5. Brushed Dark Gunmetal/Bronze-Pewter Twist-Off Lid (phiStart = Math.PI so u=0.5 faces +Z)
    const lidTex = createJarLidStudioTexture(renderer);
    const lidGeo = new THREE.LatheGeometry(buildJarLidPoints(), 64, Math.PI, Math.PI * 2);
    const lidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: lidTex,
      roughness: 0.28,
      metalness: 0.38,
      envMapIntensity: 0.32,
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.renderOrder = 4;
    jarGroup.add(lidMesh);

    // 6. Vertical Rectangular Cream Cotton Paper Label centered on the FLAT Front Facet (+ Back Facet)
    const { map: paperMap, bumpMap: paperBump } = createCottonPaperTexture(renderer, '#e4e0d5');
    // Flat front facet spans x in [-0.56, +0.56] at z = +1.06; label width 0.78 sits flush inside the flat front facet
    const labelGeo = new THREE.BoxGeometry(0.78, 1.88, 0.016);
    const labelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      map: paperMap,
      bumpMap: paperBump,
      bumpScale: 0.004,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.15,
    });
    const frontLabel = new THREE.Mesh(labelGeo, labelMat);
    frontLabel.position.set(0, -0.12, 1.062);
    frontLabel.renderOrder = 5;
    jarGroup.add(frontLabel);

    const backLabel = new THREE.Mesh(labelGeo, labelMat);
    backLabel.position.set(0, -0.12, -1.062);
    backLabel.renderOrder = 5;
    jarGroup.add(backLabel);

    // 7. Soft Ground Contact Shadow Disc
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.4, 0.72);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.40, 0);
    rootGroup.add(shadowMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let currRotY = targetStateRef.current.rotationY;
    let currTiltZ = targetStateRef.current.tiltZ;
    let currScale = 1 + targetStateRef.current.scaleOffset;
    let currHoneyTint = new THREE.Color(targetStateRef.current.product.honeyColor);

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
        const lerpFactor = isSoftwareGl ? 0.45 : 0.22;

        currRotY += (target.rotationY - currRotY) * lerpFactor;
        currTiltZ += (target.tiltZ - currTiltZ) * lerpFactor;
        const targetScale = 1 + target.scaleOffset;
        currScale += (targetScale - currScale) * lerpFactor;

        const targetColor = new THREE.Color(target.product.honeyColor);
        currHoneyTint.lerp(targetColor, lerpFactor);
        neckHoneyMat.color.copy(currHoneyTint);

        jarGroup.rotation.y = currRotY;
        rootGroup.rotation.z = currTiltZ;
        rootGroup.scale.setScalar(currScale);

        renderer.render(scene, camera);

        const stillMoving =
          Math.abs(target.rotationY - currRotY) > 0.002 ||
          Math.abs(target.tiltZ - currTiltZ) > 0.001 ||
          Math.abs(targetScale - currScale) > 0.002;

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
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 340;
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
      honeyGeo.dispose();
      honeyMat.dispose();
      honeyTex.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      neckHoneyGeo.dispose();
      neckHoneyMat.dispose();
      neckGlassGeo.dispose();
      neckGlassMat.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      lidGeo.dispose();
      lidMat.dispose();
      lidTex.dispose();
      labelGeo.dispose();
      labelMat.dispose();
      paperMap.dispose();
      paperBump.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      envTexture?.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webGlSupported) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        data-testid="honey-jar-fallback"
      >
        <svg viewBox="0 0 220 280" className="h-full max-h-[290px] w-auto">
          <rect x="46" y="18" width="128" height="28" rx="6" fill="#2c2823" />
          <rect x="52" y="46" width="116" height="14" fill="#d4a259" />
          <rect x="38" y="60" width="144" height="190" rx="10" fill={product.honeyColor} />
          <rect x="82" y="88" width="56" height="138" rx="1" fill="#e4e0d5" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full select-none ${className}`}
      data-testid="honey-jar-3d"
      data-product-id={product.id}
      aria-label={`3D model of ${product.name} jar`}
      role="img"
    />
  );
}
