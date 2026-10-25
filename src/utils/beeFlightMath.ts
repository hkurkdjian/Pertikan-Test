export type BeeFlightMode = 'hover' | 'forage_arc' | 'saccade';

export interface BeeFlightState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  roll: number;
  wingPhase: number;
  abdomenPulse: number;
  mode: BeeFlightMode;
  modeTimer: number;
  elapsed: number;
  seedOffset?: number;
}

export interface CursorPoint {
  /** Normalized device coordinates in [-1, 1] */
  ndcX: number;
  ndcY: number;
  active: boolean;
}

/**
 * World-space bounds for the 404 scene camera (PerspectiveCamera fov=38, z=6.2).
 * Covers the full stage including hovering and flying over the 404 headline,
 * body copy, and "Back to Pertikan" button.
 */
export const WORLD_SAFE_BOUNDS = {
  minX: -2.45,
  maxX: 2.45,
  minY: -1.35,
  maxY: 1.52,
  minZ: -0.65,
  maxZ: 0.65,
};

/**
 * Deterministic, smooth multi-octave 3D gradient/trigonometric noise in [-1, 1]
 * (zero allocations, continuous derivatives for organic flight).
 */
export function sampleLayeredNoise3D(x: number, y: number, z: number): number {
  // Octave 1 (primary slow drift)
  const n1 =
    Math.sin(x * 1.27 + y * 0.73 + z * 0.51) * 0.45 +
    Math.cos(x * 0.83 - y * 1.41 + z * 0.97) * 0.35 +
    Math.sin(x * 0.59 + y * 1.13 - z * 1.29) * 0.2;

  // Octave 2 (medium foraging turbulence)
  const n2 =
    Math.sin(x * 2.63 - y * 1.97 + z * 2.11 + 1.7) * 0.5 +
    Math.cos(x * 2.19 + y * 2.87 - z * 1.63 + 0.9) * 0.5;

  // Octave 3 (high-frequency micro-tremor)
  const n3 =
    Math.sin(x * 5.41 + y * 4.79 - z * 5.13 + 3.1) * 0.5 +
    Math.cos(x * 4.83 - y * 5.31 + z * 4.37 + 2.4) * 0.5;

  return Math.max(-1, Math.min(1, n1 * 0.62 + n2 * 0.27 + n3 * 0.11));
}

export function createInitialBeeFlightState(beeIndex = 0): BeeFlightState {
  if (beeIndex === 1) {
    return {
      position: { x: -0.58, y: -0.18, z: 0.22 },
      velocity: { x: 0.21, y: 0.05, z: -0.02 },
      target: { x: 0.45, y: -0.42, z: 0.16 },
      yaw: 1.12,
      pitch: 0.08,
      roll: 0.0,
      wingPhase: Math.PI * 0.75,
      abdomenPulse: 0,
      mode: 'forage_arc',
      modeTimer: 1.9,
      elapsed: 0,
      seedOffset: 19.7,
    };
  }

  return {
    position: { x: 0.65, y: 0.68, z: 0.15 },
    velocity: { x: -0.18, y: -0.04, z: 0.02 },
    target: { x: -0.42, y: 0.08, z: 0.18 },
    yaw: -1.12,
    pitch: 0.08,
    roll: 0.0,
    wingPhase: 0,
    abdomenPulse: 0,
    mode: 'forage_arc',
    modeTimer: 2.4,
    elapsed: 0,
    seedOffset: 0,
  };
}

/**
 * Clamps a 3D world point to the viewport stage bounds (allowing free flight over texts and button).
 */
export function enforceStageBounds(
  x: number,
  y: number,
  z: number,
  aspectScale = 1
): { x: number; y: number; z: number } {
  const maxX = Math.max(0.85, Math.min(WORLD_SAFE_BOUNDS.maxX, 1.75 * aspectScale));
  const clampedX = Math.max(-maxX, Math.min(maxX, x));
  const clampedY = Math.max(WORLD_SAFE_BOUNDS.minY, Math.min(WORLD_SAFE_BOUNDS.maxY, y));
  const clampedZ = Math.max(WORLD_SAFE_BOUNDS.minZ, Math.min(WORLD_SAFE_BOUNDS.maxZ, z));

  return { x: clampedX, y: clampedY, z: clampedZ };
}

/**
 * Backwards-compatible alias for stage bounds enforcement.
 */
export const enforceNegativeSpaceBounds = enforceStageBounds;

/**
 * Advances the honeybee foraging simulation by `dt` seconds.
 * Implements:
 * - State transitions between `hover`, `forage_arc`, and `saccade`
 * - Multi-layered Perlin/Simplex-like noise turbulence
 * - Responsive air-disturbance reaction to cursor and touch gestures
 * - Free flight and hovering over the 404 headline, body copy, and CTA button
 * - Gentle peer-bee separation when two bees fly near each other
 * - Aerodynamic yaw, pitch, roll banking, and ~230 Hz wingbeat phase
 */
export function stepBeeFlightPhysics(
  state: BeeFlightState,
  dt: number,
  cursor: CursorPoint = { ndcX: 0, ndcY: 0, active: false },
  aspectScale = 1,
  peerPosition?: { x: number; y: number; z: number }
): BeeFlightState {
  const safeDt = Math.max(0.001, Math.min(0.05, dt));
  const elapsed = state.elapsed + safeDt;
  const seed = state.seedOffset ?? 0;
  let mode = state.mode;
  let modeTimer = state.modeTimer - safeDt;
  let target = { ...state.target };

  const maxX = Math.max(0.85, Math.min(WORLD_SAFE_BOUNDS.maxX, 1.65 * aspectScale));

  // State machine transitions
  if (modeTimer <= 0) {
    const selector = Math.abs(
      sampleLayeredNoise3D(elapsed * 0.7 + seed, state.position.x, state.position.y)
    );
    if (mode === 'hover') {
      mode = selector > 0.32 ? 'forage_arc' : 'saccade';
      modeTimer = mode === 'forage_arc' ? 2.1 + selector * 1.5 : 0.65 + selector * 0.45;
    } else if (mode === 'saccade') {
      mode = 'hover';
      modeTimer = 1.0 + selector * 1.3;
    } else {
      mode = selector > 0.45 ? 'hover' : 'saccade';
      modeTimer = mode === 'hover' ? 1.2 + selector * 1.4 : 0.7 + selector * 0.4;
    }

    // Pick a new biologically plausible foraging waypoint across the stage (including over text & button)
    const nx = sampleLayeredNoise3D(elapsed * 0.43 + 2.1 + seed, 1.3, 0.7);
    const ny = sampleLayeredNoise3D(0.9, elapsed * 0.51 + 4.7 + seed, 2.3);
    const nz = sampleLayeredNoise3D(3.1, 1.7, elapsed * 0.39 + 6.2 + seed);

    // Figure-eight foraging loops sweeping over the 404 typography, button, and surrounding space
    const figureEightX =
      Math.sin(elapsed * 0.52 + seed) * (maxX * 0.68) + nx * (maxX * 0.28);
    const targetY =
      0.05 + ny * 0.85 + Math.cos(elapsed * 0.64 + seed * 0.7) * 0.42;
    const targetZ = 0.1 + nz * 0.38;

    target = enforceStageBounds(figureEightX, targetY, targetZ, aspectScale);
  }

  // Multi-layered noise micro-turbulence (hovering drift + micro-saccades)
  const noiseFreq = mode === 'hover' ? 1.35 : mode === 'saccade' ? 2.8 : 1.75;
  const noiseAmp = mode === 'hover' ? 0.42 : mode === 'saccade' ? 1.15 : 0.68;

  const turbX =
    sampleLayeredNoise3D(elapsed * noiseFreq + seed, state.position.y * 1.5, 0.5) * noiseAmp;
  const turbY =
    sampleLayeredNoise3D(1.7, elapsed * noiseFreq * 1.15 + seed, state.position.x * 1.5) *
    (noiseAmp * 0.68);
  const turbZ =
    sampleLayeredNoise3D(3.4, state.position.x, elapsed * noiseFreq * 0.9 + seed) *
    (noiseAmp * 0.55);

  // Spring attraction toward current waypoint
  const springK = mode === 'saccade' ? 4.8 : mode === 'forage_arc' ? 2.4 : 1.6;
  let accelX = (target.x - state.position.x) * springK + turbX;
  let accelY = (target.y - state.position.y) * springK + turbY;
  let accelZ = (target.z - state.position.z) * springK + turbZ;

  // Subtle, organic foraging attraction toward the cursor or touch point
  if (cursor.active) {
    const cursorWorldX = cursor.ndcX * (2.14 * aspectScale);
    const cursorWorldY = cursor.ndcY * 2.14;

    // Give each bee a gentle, drifting hover offset around the cursor so they orbit naturally
    const orbitX = Math.cos(elapsed * 0.85 + seed) * 0.34 + (seed > 0 ? -0.22 : 0.22);
    const orbitY = Math.sin(elapsed * 1.05 + seed) * 0.24 + (seed > 0 ? -0.16 : 0.16);

    const desiredX = cursorWorldX + orbitX;
    const desiredY = cursorWorldY + orbitY;

    // Gently blend the bee's foraging waypoint toward the cursor's neighborhood
    const blend = 1 - Math.exp(-2.2 * safeDt);
    target = enforceStageBounds(
      target.x + (desiredX - target.x) * blend,
      target.y + (desiredY - target.y) * blend,
      target.z,
      aspectScale
    );

    const toCursorX = desiredX - state.position.x;
    const toCursorY = desiredY - state.position.y;
    const dist = Math.hypot(toCursorX, toCursorY);

    if (dist > 0.08) {
      // Soft, capped attraction impulse so the bee glides toward the cursor in a subtle way
      const followPull = Math.min(2.4, dist * 1.65);
      accelX += (toCursorX / dist) * followPull;
      accelY += (toCursorY / dist) * followPull;
    }
  }

  // Gentle peer-bee separation so the two bees never overlap unnaturally
  if (peerPosition) {
    const pdx = state.position.x - peerPosition.x;
    const pdy = state.position.y - peerPosition.y;
    const pdz = state.position.z - peerPosition.z;
    const peerDistSq = pdx * pdx + pdy * pdy + pdz * pdz;
    const minSep = 0.55;
    if (peerDistSq < minSep * minSep && peerDistSq > 0.0001) {
      const peerDist = Math.sqrt(peerDistSq);
      const sepPush = ((minSep - peerDist) / minSep) * 4.2;
      accelX += (pdx / peerDist) * sepPush;
      accelY += (pdy / peerDist) * sepPush;
      accelZ += (pdz / peerDist) * sepPush * 0.5;
    }
  }

  // Soft boundary repulsion near stage limits so the bee banks smoothly before hitting edges
  const margin = 0.22;
  if (state.position.y < WORLD_SAFE_BOUNDS.minY + margin) {
    accelY += (WORLD_SAFE_BOUNDS.minY + margin - state.position.y) * 12.0;
  }
  if (state.position.y > WORLD_SAFE_BOUNDS.maxY - margin) {
    accelY -= (state.position.y - (WORLD_SAFE_BOUNDS.maxY - margin)) * 12.0;
  }
  if (state.position.x < -maxX + margin) {
    accelX += (-maxX + margin - state.position.x) * 10.0;
  }
  if (state.position.x > maxX - margin) {
    accelX -= (state.position.x - (maxX - margin)) * 10.0;
  }

  // Integrate velocity with aerodynamic drag
  const drag = mode === 'hover' ? 4.6 : 3.2;
  const damping = Math.exp(-drag * safeDt);
  let vx = (state.velocity.x + accelX * safeDt) * damping;
  let vy = (state.velocity.y + accelY * safeDt) * damping;
  let vz = (state.velocity.z + accelZ * safeDt) * damping;

  // Cap maximum speed for biological plausibility
  const maxSpeed = mode === 'saccade' ? 1.95 : mode === 'forage_arc' ? 1.2 : 0.58;
  const speed = Math.hypot(vx, vy, vz);
  if (speed > maxSpeed && speed > 0) {
    const scale = maxSpeed / speed;
    vx *= scale;
    vy *= scale;
    vz *= scale;
  }

  const rawX = state.position.x + vx * safeDt;
  const rawY = state.position.y + vy * safeDt;
  const rawZ = state.position.z + vz * safeDt;

  const position = enforceStageBounds(rawX, rawY, rawZ, aspectScale);

  // Calculate biologically plausible orientation (yaw, pitch, roll banking)
  const horizSpeed = Math.hypot(vx, vz);
  let desiredYaw = state.yaw;
  if (horizSpeed > 0.05) {
    // Orient toward lateral foraging direction with a 3/4 macro profile angle toward the camera
    const dirSign = vx < -0.02 ? -1 : vx > 0.02 ? 1 : state.yaw < 0 ? -1 : 1;
    desiredYaw = dirSign * (1.05 + Math.min(0.28, Math.abs(vx) * 0.25)) + vz * 0.22;
  } else {
    // During hover, maintain 3/4 profile with subtle observational micro-yaw
    const hoverSign = state.yaw < 0 ? -1 : 1;
    desiredYaw = hoverSign * 0.98 + Math.sin(elapsed * 0.9 + seed) * 0.18;
  }

  // Shortest-angle yaw interpolation
  let yawDiff = desiredYaw - state.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  const yawAlpha = 1 - Math.exp(-6.5 * safeDt);
  const yaw = state.yaw + yawDiff * yawAlpha;

  // Forward velocity tilts body nose-down slightly; hovering tilts abdomen down (~14 deg natural hover posture)
  const forwardTilt = Math.max(-0.35, Math.min(0.38, horizSpeed * 0.24 - vy * 0.18 + 0.16));
  const pitchAlpha = 1 - Math.exp(-8.0 * safeDt);
  const pitch = state.pitch + (forwardTilt - state.pitch) * pitchAlpha;

  // Banking roll proportional to yaw turn rate & lateral acceleration
  const desiredRoll = Math.max(-0.48, Math.min(0.48, -yawDiff * 0.55 - accelX * 0.08));
  const rollAlpha = 1 - Math.exp(-9.0 * safeDt);
  const roll = state.roll + (desiredRoll - state.roll) * rollAlpha;

  // High-frequency ~230 Hz wingbeat visual phase (230 * 2 * PI rad/s)
  const wingPhase = (state.wingPhase + safeDt * 230 * Math.PI * 2) % (Math.PI * 200);
  // Subtle abdominal respiratory & flight balance oscillation (~3.2 Hz)
  const abdomenPulse = Math.sin(elapsed * Math.PI * 2 * 3.2 + seed) * 0.045;

  return {
    position,
    velocity: { x: vx, y: vy, z: vz },
    target,
    yaw,
    pitch,
    roll,
    wingPhase,
    abdomenPulse,
    mode,
    modeTimer,
    elapsed,
    seedOffset: seed,
  };
}
