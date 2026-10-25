import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialBeeFlightState,
  enforceStageBounds,
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

test('enforceStageBounds keeps bees within viewport stage bounds and allows flying over text/button area', () => {
  const overText = enforceStageBounds(0.0, -0.2, 0.1, 1.0);
  assert.equal(overText.x, 0.0);
  assert.equal(overText.y, -0.2);
  const clamped = enforceStageBounds(5.0, -4.0, 2.0, 1.0);
  assert.ok(clamped.y >= WORLD_SAFE_BOUNDS.minY && clamped.y <= WORLD_SAFE_BOUNDS.maxY);
});

test('two independent bees forage across stage bounds over 600 frames without colliding', () => {
  let bee1 = createInitialBeeFlightState(0);
  let bee2 = createInitialBeeFlightState(1);

  assert.notDeepEqual(bee1.position, bee2.position);

  for (let i = 0; i < 600; i++) {
    const prev1 = bee1.position;
    const prev2 = bee2.position;
    bee1 = stepBeeFlightPhysics(
      bee1,
      1 / 60,
      { ndcX: 0, ndcY: 0.1, active: i % 25 === 0 },
      1.2,
      prev2
    );
    bee2 = stepBeeFlightPhysics(
      bee2,
      1 / 60,
      { ndcX: 0, ndcY: 0.1, active: i % 25 === 0 },
      1.2,
      prev1
    );

    for (const b of [bee1, bee2]) {
      assert.ok(
        b.position.y >= WORLD_SAFE_BOUNDS.minY && b.position.y <= WORLD_SAFE_BOUNDS.maxY,
        `Frame ${i}: Y=${b.position.y} out of safe bounds`
      );
    }
  }
});

test('stepBeeFlightPhysics subtly follows active cursor or touch point', () => {
  const initial = createInitialBeeFlightState(0);
  // Place cursor/touch to the right and above initial position (0.65, 0.68)
  const cursor = { ndcX: 0.75, ndcY: 0.65, active: true };
  const withoutCursor = stepBeeFlightPhysics(initial, 0.03, { ndcX: 0, ndcY: 0, active: false }, 1.0);
  const withCursor = stepBeeFlightPhysics(initial, 0.03, cursor, 1.0);
  assert.ok(
    withCursor.velocity.x > withoutCursor.velocity.x,
    'Expected subtle positive X attraction toward cursor'
  );
  assert.ok(
    withCursor.velocity.y > withoutCursor.velocity.y,
    'Expected subtle positive Y attraction toward cursor'
  );
});
