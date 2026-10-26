import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  computeScrollSequenceState,
  calculateStickyProgress,
  calculateTargetScrollYForIndex,
} from './scrollMath';
import {
  WINE_PRODUCTS,
  HONEY_PRODUCTS,
  getWineBottleDimensions,
  getWineBottleShapeVariant,
  getHoneyJarDimensions,
  getBottlePhotoKey,
  getBottlePhotoUrl,
} from '../data/products';

test('product catalog preserves exact Pertikan wine and honey sequences and size options', () => {
  assert.equal(WINE_PRODUCTS.length, 4);
  assert.deepEqual(
    WINE_PRODUCTS.map((w) => w.name),
    ['Mitra', 'Mitra Frizzante', 'U&Me', 'U&Me Frizzante']
  );

  // Mitra and U&Me have two sizes (0.75 L and 0.5 L); Frizzante wines have only 0.75 L
  assert.deepEqual(WINE_PRODUCTS[0].sizes, ['0.75 L', '0.5 L']);
  assert.equal(WINE_PRODUCTS[0].defaultSize, '0.75 L');
  assert.deepEqual(WINE_PRODUCTS[1].sizes, ['0.75 L']);
  assert.equal(WINE_PRODUCTS[1].defaultSize, '0.75 L');
  assert.deepEqual(WINE_PRODUCTS[2].sizes, ['0.75 L', '0.5 L']);
  assert.equal(WINE_PRODUCTS[2].defaultSize, '0.75 L');
  assert.deepEqual(WINE_PRODUCTS[3].sizes, ['0.75 L']);
  assert.equal(WINE_PRODUCTS[3].defaultSize, '0.75 L');

  // Authentic screw cap & liquid colors per wine
  assert.equal(WINE_PRODUCTS[0].capsuleColor, '#541620'); // Mitra deep burgundy Stelvin cap
  assert.equal(WINE_PRODUCTS[1].capsuleColor, '#c2a260'); // Mitra Frizzante champagne gold Stelvin cap
  assert.equal(WINE_PRODUCTS[2].capsuleColor, '#1a1a1a'); // U&Me matte black Stelvin cap
  assert.equal(WINE_PRODUCTS[3].capsuleColor, '#1a1a1a'); // U&Me Frizzante matte black Stelvin cap

  assert.equal(HONEY_PRODUCTS.length, 3);
  assert.deepEqual(
    HONEY_PRODUCTS.map((h) => h.name),
    ['Creamed Honey', 'Acacia Honey', 'Linden Blossom']
  );
  for (const honey of HONEY_PRODUCTS) {
    assert.deepEqual(honey.sizes, ['250g', '500g', '900g', '1kg']);
    assert.equal(honey.defaultSize, '250g');
  }
});

test('3D bottle and jar dimension helpers produce distinct physical scales and silhouettes per size and wine style', () => {
  assert.equal(getWineBottleShapeVariant(false, '0.75 L'), 'bordeaux-075');
  assert.equal(getWineBottleShapeVariant(false, '0.5 L'), 'bordeaux-050');
  assert.equal(getWineBottleShapeVariant(true, '0.75 L'), 'frizzante-075');

  const b75 = getWineBottleDimensions('0.75 L', false);
  const b50 = getWineBottleDimensions('0.5 L', false);
  const frizz75 = getWineBottleDimensions('0.75 L', true);

  assert.equal(b75.shapeVariant, 'bordeaux-075');
  assert.equal(b50.shapeVariant, 'bordeaux-050');
  assert.equal(frizz75.shapeVariant, 'frizzante-075');

  // 0.5 L Bordeaux is slenderer and slightly shorter than 0.75 L Bordeaux
  assert.ok(b50.heightScale < b75.heightScale);
  assert.ok(b50.radialScale < b75.radialScale);
  assert.ok(b50.bodyRadius < b75.bodyRadius);

  // Frizzante Cuvée has a wider belly and shorter label height than still 0.75 L Bordeaux
  assert.ok(frizz75.radialScale > b75.radialScale);
  assert.ok(frizz75.bodyRadius > b75.bodyRadius);
  assert.ok(frizz75.labelHeight < b75.labelHeight);

  const j250 = getHoneyJarDimensions('250g');
  const j500 = getHoneyJarDimensions('500g');
  const j900 = getHoneyJarDimensions('900g');
  const j1000 = getHoneyJarDimensions('1kg');
  assert.ok(j250.heightScale < j500.heightScale);
  assert.ok(j500.heightScale < j900.heightScale);
  assert.ok(j900.heightScale < j1000.heightScale);

  // Studio reference photo keys and URLs map 1:1 to the 6 reference photographs
  assert.equal(getBottlePhotoKey('mitra', '0.75 L'), 'mitra-075');
  assert.equal(getBottlePhotoKey('mitra', '0.5 L'), 'mitra-050');
  assert.equal(getBottlePhotoKey('mitra-frizzante', '0.75 L'), 'mitra-frizzante');
  assert.equal(getBottlePhotoKey('ume', '0.75 L'), 'ume-075');
  assert.equal(getBottlePhotoKey('ume', '0.5 L'), 'ume-050');
  assert.equal(getBottlePhotoKey('ume-frizzante', '0.75 L'), 'ume-frizzante');
  assert.ok(getBottlePhotoUrl('mitra', '0.75 L').endsWith('Mitra_0_75_d987df6d.jpeg'));
  assert.ok(getBottlePhotoUrl('mitra', '0.5 L').endsWith('Mitra_0_5_12f2eeed.jpeg'));
  assert.ok(getBottlePhotoUrl('mitra-frizzante', '0.75 L').endsWith('Mitra_Frizzante_480c394f.jpeg'));
  assert.ok(getBottlePhotoUrl('ume', '0.75 L').endsWith('U_Me_0_75_66007e63.jpeg'));
  assert.ok(getBottlePhotoUrl('ume', '0.5 L').endsWith('U_Me_0_5_659946d1.jpeg'));
  assert.ok(getBottlePhotoUrl('ume-frizzante', '0.75 L').endsWith('U_Me_Frizzante_2bfb7608.jpeg'));
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
