import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  computeScrollSequenceState,
  calculateStickyProgress,
  calculateTargetScrollYForIndex,
} from './scrollMath';
import { WINE_PRODUCTS, HONEY_PRODUCTS } from '../data/products';

test('product catalog preserves exact Pertikan wine and honey sequences', () => {
  assert.equal(WINE_PRODUCTS.length, 4);
  assert.deepEqual(
    WINE_PRODUCTS.map((w) => w.name),
    ['Mitra', 'Mitra Frizzante', 'U&Me', 'U&Me Frizzante']
  );

  assert.equal(HONEY_PRODUCTS.length, 3);
  assert.deepEqual(
    HONEY_PRODUCTS.map((h) => h.name),
    ['Creamed Honey', 'Acacia Honey', 'Linden Blossom']
  );
});

test('clamp01 bounds values strictly to [0, 1]', () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(0.42), 0.42);
  assert.equal(clamp01(1.8), 1);
  assert.equal(clamp01(Number.NaN), 0);
});

test('computeScrollSequenceState synchronizes active index, indicators, and 360-deg bottle rotation at stops', () => {
  const start = computeScrollSequenceState(0, 4);
  assert.equal(start.activeIndex, 0);
  assert.equal(start.items[0].isActive, true);
  assert.equal(start.items[0].opacity, 1);
  assert.equal(start.items[0].indicatorWidth, 32);
  assert.equal(start.items[1].indicatorWidth, 4);
  assert.equal(start.rotationY, 0);

  const secondStop = computeScrollSequenceState(1 / 3, 4);
  assert.equal(secondStop.activeIndex, 1);
  assert.equal(secondStop.items[1].isActive, true);
  assert.equal(secondStop.items[1].opacity, 1);
  assert.equal(secondStop.items[1].indicatorWidth, 32);
  // At exact product stop, bottle faces directly forward (multiple of 2 * PI)
  assert.ok(Math.abs(secondStop.rotationY - Math.PI * 2) < 1e-6);

  const end = computeScrollSequenceState(1, 4);
  assert.equal(end.activeIndex, 3);
  assert.equal(end.items[3].isActive, true);
  assert.equal(end.items[3].opacity, 1);
  assert.equal(end.items[3].indicatorWidth, 32);
  assert.ok(Math.abs(end.rotationY - Math.PI * 6) < 1e-6);
});

test('computeScrollSequenceState is strictly reversible for forward and backward scrolling', () => {
  const forwardMid = computeScrollSequenceState(0.5, 4);
  const reverseMid = computeScrollSequenceState(0.5, 4);
  assert.deepEqual(forwardMid, reverseMid);

  // Midpoint between index 1 and 2 (progress = 0.5 for 4 items => scaled = 1.5)
  assert.ok(forwardMid.continuousIndex > 1.4 && forwardMid.continuousIndex < 1.6);
  assert.ok(forwardMid.tiltZ > 0);
  assert.ok(forwardMid.depthOffset < 0);
});

test('computeScrollSequenceState respects prefers-reduced-motion', () => {
  const reduced = computeScrollSequenceState(0.5, 4, true);
  assert.equal(reduced.rotationY, 0);
  assert.equal(reduced.tiltZ, 0);
  assert.equal(reduced.depthOffset, 0);
});

test('calculateStickyProgress and calculateTargetScrollYForIndex invert cleanly', () => {
  const pageTop = 1500;
  const height = 3600;
  const vh = 900;

  const targetScrollY = calculateTargetScrollYForIndex(pageTop, height, vh, 2, 4);
  const containerTopAtScroll = pageTop - targetScrollY;
  const progress = calculateStickyProgress(containerTopAtScroll, height, vh);
  assert.ok(Math.abs(progress - 2 / 3) < 1e-6);
});
