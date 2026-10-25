import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialBeeFlightState,
  enforceNegativeSpaceBounds,
  isInsideTypographyExclusionZone,
  sampleLayeredNoise3D,
  stepBeeFlightPhysics,
  WORLD_SAFE_BOUNDS,
} from './beeFlightMath';

test('sampleLayeredNoise3D returns bounded deterministic values in [-1, 1]', () => {
  for (let i = 0; i < 50; i++) {
    const val = sampleLayeredNoise3D(i * 0.37, i * -0.51, i * 0.19);
    assert.ok(val >= -1 && val <= 1, `Expected noise in [-1, 1], got ${val}`);
  }
  assert.equal(sampleLayeredNoise3D(1.2, 3.4, 5.6), sampleLayeredNoise3D(1.2, 3.4, 5.6));
});

test('enforceNegativeSpaceBounds keeps bee strictly above the 404 typography exclusion zone', () => {
  const clamped = enforceNegativeSpaceBounds(0.0, -0.2, 0.0, 1.0);
  assert.ok(clamped.y >= WORLD_SAFE_BOUNDS.minY);
  assert.equal(isInsideTypographyExclusionZone(clamped.x, clamped.y), false);
});

test('stepBeeFlightPhysics stays within negative space over 600 frames and never enters typography exclusion zone', () => {
  let state = createInitialBeeFlightState();
  for (let i = 0; i < 600; i++) {
    state = stepBeeFlightPhysics(state, 1 / 60, { ndcX: 0, ndcY: 0.4, active: i % 20 === 0 }, 1.2);
    assert.ok(
      state.position.y >= WORLD_SAFE_BOUNDS.minY && state.position.y <= WORLD_SAFE_BOUNDS.maxY,
      `Frame ${i}: Y=${state.position.y} out of safe bounds`
    );
    assert.equal(
      isInsideTypographyExclusionZone(state.position.x, state.position.y),
      false,
      `Frame ${i}: Bee entered typography exclusion zone at (${state.position.x}, ${state.position.y})`
    );
  }
});

test('stepBeeFlightPhysics gently avoids nearby desktop cursor rather than chasing it', () => {
  const initial = createInitialBeeFlightState();
  // Place cursor slightly below-left of initial position (0.65, 1.02)
  const cursor = { ndcX: 0.25, ndcY: 0.42, active: true };
  const next = stepBeeFlightPhysics(initial, 0.03, cursor, 1.0);
  // Velocity should deflect away from cursor (+X and +Y)
  assert.ok(next.velocity.x > initial.velocity.x, 'Expected positive X avoidance impulse');
  assert.ok(next.velocity.y > initial.velocity.y, 'Expected upward Y avoidance impulse');
});
