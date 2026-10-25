export interface ItemTransitionState {
  index: number;
  opacity: number;
  translateY: number;
  scale: number;
  depthZ: number;
  indicatorWidth: number;
  isActive: boolean;
}

export interface SectionScrollState {
  /** Normalized progress across the sticky runway [0, 1] */
  progress: number;
  /** Continuous item index [0, itemCount - 1] */
  continuousIndex: number;
  /** Discrete active product index (0 .. itemCount - 1) */
  activeIndex: number;
  /** Transition fraction between floor(continuousIndex) and ceil(continuousIndex) in [0, 1] */
  segmentProgress: number;
  /** 3D Y-axis rotation in radians */
  rotationY: number;
  /** Subtle 3D Z-axis tilt during product transitions */
  tiltZ: number;
  /** Subtle 3D depth dolly offset */
  depthOffset: number;
  /** Per-item visual transition state */
  items: ItemTransitionState[];
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Computes deterministic, reversible scroll state for a sticky product sequence.
 * Holding plateau around each product center ensures crisp readability while scrolling,
 * with smooth crossfade + translation + 3D rotation between adjacent products.
 */
export function computeScrollSequenceState(
  rawProgress: number,
  itemCount: number,
  reducedMotion = false
): SectionScrollState {
  const safeCount = Math.max(1, itemCount);
  const progress = clamp01(rawProgress);

  if (safeCount === 1) {
    return {
      progress,
      continuousIndex: 0,
      activeIndex: 0,
      segmentProgress: 0,
      rotationY: 0,
      tiltZ: 0,
      depthOffset: 0,
      items: [
        {
          index: 0,
          opacity: 1,
          translateY: 0,
          scale: 1,
          depthZ: 0,
          indicatorWidth: 32,
          isActive: true,
        },
      ],
    };
  }

  // Map raw [0, 1] progress into continuous index [0, safeCount - 1]
  // Apply subtle plateau easing within each step so each product rests cleanly before transitioning
  const scaled = progress * (safeCount - 1);
  const baseIdx = Math.min(safeCount - 2, Math.floor(scaled));
  const localT = scaled - baseIdx;

  // Plateau for first 25% and last 25% of segment, smoothstep transition in middle 50%
  const easedLocalT = reducedMotion ? (localT < 0.5 ? 0 : 1) : smoothstep(0.18, 0.82, localT);
  const continuousIndex = clamp(baseIdx + easedLocalT, 0, safeCount - 1);
  const activeIndex = Math.round(continuousIndex);

  // Controlled 3D rotation: full 180 deg per product transition so label returns to front at each product stop!
  // Wait: if the bottle rotates 360 degrees (2 * Math.PI) per product transition, then at EVERY product stop (0, 1, 2, 3),
  // rotationY is a multiple of 2*PI so the front label faces the camera directly!
  const rotationY = reducedMotion ? 0 : continuousIndex * Math.PI * 2;
  const transitionWave = reducedMotion ? 0 : Math.sin(easedLocalT * Math.PI);
  const tiltZ = transitionWave === 0 ? 0 : transitionWave * 0.045;
  const depthOffset = transitionWave === 0 ? 0 : -transitionWave * 0.28;

  const items: ItemTransitionState[] = [];
  for (let i = 0; i < safeCount; i++) {
    const dist = continuousIndex - i; // negative when item is ahead (below), positive when item is passed (above)
    const absDist = Math.abs(dist);
    const opacity = reducedMotion
      ? i === activeIndex
        ? 1
        : 0
      : clamp01(1 - smoothstep(0.0, 0.85, absDist));

    // When entering from next (dist < 0), starts slightly below (+18px) and rises to 0.
    // When leaving to previous (dist > 0), moves slightly up (-18px).
    const translateY = reducedMotion ? 0 : -dist * 22;
    const scale = reducedMotion ? 1 : 1 - clamp01(absDist) * 0.03;
    const depthZ = reducedMotion ? 0 : - clamp01(absDist) * 0.35;
    const indicatorBlend = clamp01(1 - absDist);
    const indicatorWidth = 4 + indicatorBlend * 28; // 32px when active, 4px when inactive

    items.push({
      index: i,
      opacity,
      translateY,
      scale,
      depthZ,
      indicatorWidth,
      isActive: i === activeIndex,
    });
  }

  return {
    progress,
    continuousIndex,
    activeIndex,
    segmentProgress: easedLocalT,
    rotationY,
    tiltZ,
    depthOffset,
    items,
  };
}

/**
 * Calculates normalized sticky scroll progress [0, 1] from DOM rect metrics.
 */
export function calculateStickyProgress(
  containerTop: number,
  containerHeight: number,
  viewportHeight: number
): number {
  const scrollableDistance = Math.max(1, containerHeight - viewportHeight);
  const scrolled = -containerTop;
  return clamp01(scrolled / scrollableDistance);
}

/**
 * Calculates target window.scrollY to jump to a specific product index inside a sticky container.
 */
export function calculateTargetScrollYForIndex(
  containerPageTop: number,
  containerHeight: number,
  viewportHeight: number,
  targetIndex: number,
  itemCount: number
): number {
  if (itemCount <= 1) return containerPageTop;
  const scrollableDistance = Math.max(0, containerHeight - viewportHeight);
  const normalizedTarget = clamp(targetIndex / (itemCount - 1), 0, 1);
  return containerPageTop + normalizedTarget * scrollableDistance;
}
