export type WineSize = '0.75 L' | '0.5 L';
export type HoneySize = '250g' | '500g' | '900g' | '1kg';
export type BottleShapeVariant = 'bordeaux-075' | 'bordeaux-050' | 'frizzante-075';
export type BottlePhotoKey =
  | 'mitra-075'
  | 'mitra-050'
  | 'mitra-frizzante'
  | 'ume-075'
  | 'ume-050'
  | 'ume-frizzante';

export const BOTTLE_PHOTO_URLS: Record<BottlePhotoKey, string> = {
  'mitra-075': '/assets/aistudio/Mitra_0_75_d987df6d.jpeg',
  'mitra-050': '/assets/aistudio/Mitra_0_5_12f2eeed.jpeg',
  'mitra-frizzante': '/assets/aistudio/Mitra_Frizzante_480c394f.jpeg',
  'ume-075': '/assets/aistudio/U_Me_0_75_66007e63.jpeg',
  'ume-050': '/assets/aistudio/U_Me_0_5_659946d1.jpeg',
  'ume-frizzante': '/assets/aistudio/U_Me_Frizzante_2bfb7608.jpeg',
};

export function getBottlePhotoKey(productId: string, size: WineSize): BottlePhotoKey {
  if (productId === 'mitra-frizzante') return 'mitra-frizzante';
  if (productId === 'u-and-me-frizzante' || productId === 'ume-frizzante') return 'ume-frizzante';
  if (productId === 'u-and-me' || productId === 'ume') return size === '0.5 L' ? 'ume-050' : 'ume-075';
  return size === '0.5 L' ? 'mitra-050' : 'mitra-075';
}

export function getBottlePhotoUrl(productId: string, size: WineSize): string {
  return BOTTLE_PHOTO_URLS[getBottlePhotoKey(productId, size)];
}

export const HONEY_SIZES: HoneySize[] = ['250g', '500g', '900g', '1kg'];

export interface WineBottleDimensions {
  shapeVariant: BottleShapeVariant;
  radialScale: number;
  heightScale: number;
  bodyRadius: number;
  neckScaleY: number;
  labelScaleY: number;
  labelRadius: number;
  labelHeight: number;
  labelCenterY: number;
}

export interface HoneyJarDimensions {
  radialScale: number;
  heightScale: number;
  labelScaleY: number;
}

export function getWineBottleShapeVariant(
  isSparkling: boolean,
  size: WineSize
): BottleShapeVariant {
  if (isSparkling) return 'frizzante-075';
  return size === '0.5 L' ? 'bordeaux-050' : 'bordeaux-075';
}

export function getWineBottleDimensions(
  size: WineSize,
  isSparkling = false
): WineBottleDimensions {
  const shapeVariant = getWineBottleShapeVariant(isSparkling, size);
  if (shapeVariant === 'frizzante-075') {
    return {
      shapeVariant,
      radialScale: 1.12,
      heightScale: 1.0,
      bodyRadius: 0.745,
      neckScaleY: 1.0,
      labelScaleY: 0.71,
      labelRadius: 0.751,
      labelHeight: 1.34,
      labelCenterY: -1.25,
    };
  }
  if (shapeVariant === 'bordeaux-050') {
    return {
      shapeVariant,
      radialScale: 0.775,
      heightScale: 0.91,
      bodyRadius: 0.515,
      neckScaleY: 1.12,
      labelScaleY: 0.91,
      labelRadius: 0.521,
      labelHeight: 1.72,
      labelCenterY: -0.84,
    };
  }
  return {
    shapeVariant: 'bordeaux-075',
    radialScale: 1.0,
    heightScale: 1.0,
    bodyRadius: 0.665,
    neckScaleY: 1.0,
    labelScaleY: 1.0,
    labelRadius: 0.671,
    labelHeight: 1.88,
    labelCenterY: -0.78,
  };
}

export function getHoneyJarDimensions(size: HoneySize): HoneyJarDimensions {
  switch (size) {
    case '250g':
      return {
        radialScale: 0.78,
        heightScale: 0.72,
        labelScaleY: 0.78,
      };
    case '500g':
      return {
        radialScale: 0.86,
        heightScale: 0.82,
        labelScaleY: 0.86,
      };
    case '900g':
      return {
        radialScale: 0.94,
        heightScale: 0.92,
        labelScaleY: 0.94,
      };
    case '1kg':
      return {
        radialScale: 1.0,
        heightScale: 1.0,
        labelScaleY: 1.0,
      };
  }
}

export interface WineProduct {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tastingNotes: string;
  maturation: string;
  purityAndSulfites: string;
  recommendedService: string;
  sizes: WineSize[];
  defaultSize: WineSize;
  glassColor: string;
  liquidColor: string;
  liquidGlowColor: string;
  capsuleColor: string;
  labelTint: string;
  isSparkling: boolean;
  ctaUrl: string;
}

export interface HoneyProduct {
  id: string;
  name: string;
  mobileName: string;
  subtitle: string;
  aromaAndPalate: string;
  textureAndCrystallization: string;
  tableAndCulinaryRitual: string;
  sizes: HoneySize[];
  defaultSize: HoneySize;
  honeyColor: string;
  honeyDeepColor: string;
  honeyHighlightColor: string;
  clarity: number; // 0 = creamed/velvety, 1 = crystal clear fluid
  ctaUrl: string;
}

export interface AwardHighlight {
  kicker: string;
  title: string;
  subtitle: string;
}

export const AWARD_HIGHLIGHTS: AwardHighlight[] = [
  {
    kicker: 'AWARDED EXCELLENCE',
    title: 'Mead of the Year 2026',
    subtitle: 'Mitra — Austria’s Best Mead',
  },
  {
    kicker: 'BARREL MATURATION',
    title: '15 to 18 Months',
    subtitle: 'Patient oak rest until full aroma',
  },
  {
    kicker: 'PURITY STANDARD',
    title: '0% Chemical Additives',
    subtitle: 'Zero sulfites in pure honey wine',
  },
];

export const WINE_PRODUCTS: WineProduct[] = [
  {
    id: 'mitra',
    name: 'Mitra',
    subtitle: 'Honey Wine — The Original',
    description:
      "One of humanity's oldest alcoholic beverages, brewed according to an old recipe using fine honey from Pertikan's own apiary and pure water.",
    tastingNotes:
      'Deep warm blossom honey on the nose, evolving into structured beeswax, dried meadow herbs, and a long, velvety amber finish developed through patient barrel rest.',
    maturation: '15–18 Months Barrel Aged',
    purityAndSulfites: 'Zero Chemical Additives · No Sulfites',
    recommendedService: '10–14 °C · Tulip White Wine or Digestif Stem',
    sizes: ['0.75 L', '0.5 L'],
    defaultSize: '0.75 L',
    glassColor: '#5c3103',
    liquidColor: '#d98c0a',
    liquidGlowColor: '#f7c82a',
    capsuleColor: '#541620',
    labelTint: '#381c1e',
    isSparkling: false,
    ctaUrl: '#shopify-storefront',
  },
  {
    id: 'mitra-frizzante',
    name: 'Mitra Frizzante',
    subtitle: 'Sparkling Honey Wine',
    description:
      'A refreshing, sparkling interpretation of traditional mead, crafted from fine honey and pure water, then refined with delicate carbonation.',
    tastingNotes:
      'Golden honey warmth meets lively effervescence, with a delicate sweetness and a bright, refreshing finish.',
    maturation: '15–18 Months Barrel Aged',
    purityAndSulfites: 'Zero Chemical Additives · No Sulfites',
    recommendedService: 'Well Chilled · Sparkling Wine Glass',
    sizes: ['0.75 L'],
    defaultSize: '0.75 L',
    glassColor: '#5e3404',
    liquidColor: '#e0960c',
    liquidGlowColor: '#fae34c',
    capsuleColor: '#c2a260',
    labelTint: '#3b2022',
    isSparkling: true,
    ctaUrl: '#shopify-storefront',
  },
  {
    id: 'u-and-me',
    name: 'U&Me',
    subtitle: 'Uhudler & Met — Sweet & Wild',
    description:
      "A distinctive blend of wild Uhudler grapes and traditional mead from Pertikan's own apiary, both originating in the meadows and vineyards of Southern Burgenland.",
    tastingNotes:
      'Combines the wild, unmistakable woodland strawberry and blackcurrant berry-forward flavor of the authentic Uhudler grape with the gentle, rounded sweetness of 15-month matured honey wine.',
    maturation: '15 Months Matured Mead Base',
    purityAndSulfites: 'Zero Chemical Additives · Natural Sulfites (Uhudler Only)',
    recommendedService: '10–12 °C · Universal Burgundy or Aromatic Wine Glass',
    sizes: ['0.75 L', '0.5 L'],
    defaultSize: '0.75 L',
    glassColor: '#3d0404',
    liquidColor: '#b51712',
    liquidGlowColor: '#e83c25',
    capsuleColor: '#1a1a1a',
    labelTint: '#181818',
    isSparkling: false,
    ctaUrl: '#shopify-storefront',
  },
  {
    id: 'u-and-me-frizzante',
    name: 'U&Me Frizzante',
    subtitle: 'Sparkling Uhudler & Met',
    description:
      'A refreshingly sparkling interpretation uniting the Southern Burgenland Uhudler grape and 15-month aged apiary mead.',
    tastingNotes:
      'Vibrant, fruity acidity meets delicate honey sweetness, lifted by fine, persistent perlage for a lively lightness on the palate.',
    maturation: '15 Months Aged Apiary Mead',
    purityAndSulfites: 'Without Chemical Additives · Sulfites (Uhudler Component Only)',
    recommendedService: '6–8 °C · Slender Flute or Sparkling Tulip Glass',
    sizes: ['0.75 L'],
    defaultSize: '0.75 L',
    glassColor: '#3a0404',
    liquidColor: '#ba1a15',
    liquidGlowColor: '#ea402a',
    capsuleColor: '#1a1a1a',
    labelTint: '#181818',
    isSparkling: true,
    ctaUrl: '#shopify-storefront',
  },
];

export const HONEY_PRODUCTS: HoneyProduct[] = [
  {
    id: 'creamed-honey',
    name: 'Creamed Honey',
    mobileName: 'Creamed Honey',
    subtitle: 'Spring & Early Summer Meadow Harvest',
    aromaAndPalate:
      'Finely whipped through gentle mechanical stirring for a velvety, spreadable consistency. Delicate orchard blossom sweetness that melts effortlessly on the tongue.',
    textureAndCrystallization:
      'Naturally fine, stable micro-crystalline texture; never drips.',
    tableAndCulinaryRitual:
      'Warm sourdough crust, alpine butter, soft ripened cheeses, and morning herbal infusions.',
    sizes: ['250g', '500g', '900g', '1kg'],
    defaultSize: '250g',
    honeyColor: '#b55e10',
    honeyDeepColor: '#7c3905',
    honeyHighlightColor: '#df8c2e',
    clarity: 0.35,
    ctaUrl: '#shopify-storefront',
  },
  {
    id: 'acacia-honey',
    name: 'Acacia Honey',
    mobileName: 'Acacia',
    subtitle: 'Late May Robinia Groves',
    aromaAndPalate:
      'Exceptionally clear and fluid with a subtle vanilla-blossom bouquet. Mild, refined floral sweetness without overpowering acidity.',
    textureAndCrystallization:
      'Remains liquid for many months due to its naturally high fructose harmony.',
    tableAndCulinaryRitual:
      'Sweetening fragrant black tea, drizzling over aged pecorino or walnut pastries, and fine baking.',
    sizes: ['250g', '500g', '900g', '1kg'],
    defaultSize: '250g',
    honeyColor: '#c26a14',
    honeyDeepColor: '#863f06',
    honeyHighlightColor: '#eb9938',
    clarity: 0.9,
    ctaUrl: '#shopify-storefront',
  },
  {
    id: 'linden-blossom',
    name: 'Linden Blossom',
    mobileName: 'Linden Blossom',
    subtitle: 'Midsummer Linden Avenue Harvest',
    aromaAndPalate:
      'Intensely aromatic and expressive, carrying unmistakable notes of blooming linden trees, cool summer foliage, and a whisper of wild mint.',
    textureAndCrystallization:
      'Develops a noble, medium-fine crystallization with a supple, creamy melt.',
    tableAndCulinaryRitual:
      'Evening herbal teas, soothing infusions, roasted root vegetables, and spiced compotes.',
    sizes: ['250g', '500g', '900g', '1kg'],
    defaultSize: '250g',
    honeyColor: '#ac560d',
    honeyDeepColor: '#733304',
    honeyHighlightColor: '#d68227',
    clarity: 0.6,
    ctaUrl: '#shopify-storefront',
  },
];
