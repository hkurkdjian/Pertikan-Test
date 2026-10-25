import { useEffect, useRef, useState } from 'react';
import { HONEY_PRODUCTS, HoneyProduct } from '../data/products';
import {
  calculateStickyProgress,
  calculateTargetScrollYForIndex,
  computeScrollSequenceState,
} from '../utils/scrollMath';
import { HoneyJar3D } from './HoneyJar3D';

interface ApiaryCollectionSectionProps {
  onBuyHoney: (product: HoneyProduct) => void;
}

export function ApiaryCollectionSection({ onBuyHoney }: ApiaryCollectionSectionProps) {
  const stickyTrackRef = useRef<HTMLDivElement | null>(null);
  const [rawProgress, setRawProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let rafId = 0;
    const updateScroll = () => {
      const track = stickyTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const vw = window.innerWidth || 1440;
      setViewportWidth(vw);
      const nextProgress = calculateStickyProgress(rect.top, rect.height, vh);
      setRawProgress((prev) => (Math.abs(prev - nextProgress) > 0.0005 ? nextProgress : prev));
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const seqState = computeScrollSequenceState(rawProgress, HONEY_PRODUCTS.length, reducedMotion);
  const activeHoney = HONEY_PRODUCTS[seqState.activeIndex] || HONEY_PRODUCTS[0];

  // Desktop 3-column track: 3 * 600px = 1800px total width.
  // At progress=0, translateX is 0px (matching desktop_3.png 100% pixel-for-pixel).
  // As user scrolls through the sticky Apiary runway, smoothly glides horizontally to reveal all 3 columns while rotating the 3D jars.
  const totalTrackWidth = 1800;
  const maxHorizontalShift = Math.max(0, totalTrackWidth - viewportWidth);
  const desktopTranslateX = reducedMotion ? 0 : -seqState.progress * maxHorizontalShift;

  const handleSelectIndex = (targetIdx: number) => {
    const track = stickyTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pageTop = window.scrollY + rect.top;
    const targetY = calculateTargetScrollYForIndex(
      pageTop,
      rect.height,
      window.innerHeight || 900,
      targetIdx,
      HONEY_PRODUCTS.length
    );
    window.scrollTo({
      top: targetY,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      id="apiary-collection"
      aria-label="The Apiary Collection"
      className="bg-white w-full border-t border-[#E5E5E5]"
    >
      {/* Editorial Introduction Header */}
      <div className="px-6 md:px-[64px] pt-[56px] md:pt-[64px] pb-[40px] md:pb-[56px]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-[11px] uppercase tracking-[0.04em] text-[#999999] mb-[12px]">
              THE APIARY COLLECTION
            </p>
            <h2 className="font-editorial text-[36px] md:text-[44px] leading-[1.08] text-[#111111]">
              <span className="md:hidden">
                Honey
                <br />
                Nature’s Gold.
              </span>
              <span className="hidden md:inline">Honey — Nature’s Gold.</span>
            </h2>
          </div>

          <p className="text-center md:text-left text-[13px] leading-[1.6] text-[#808080] max-w-[340px] md:max-w-[540px] mx-auto md:mx-0">
            100% unadulterated beekeeping artistry directly from Southern Burgenland. Before a
            single drop of mead is fermented, our bees gather the seasonal nectar of meadows,
            robinia groves, and linden avenues around Grosspetersdorf.
          </p>
        </div>
      </div>

      {/* Scroll-Driven Sticky Honey Sequence Track */}
      <div
        ref={stickyTrackRef}
        data-testid="honey-sticky-track"
        data-active-honey={activeHoney.id}
        data-active-index={seqState.activeIndex}
        className="relative w-full h-[270vh]"
      >
        <div className="sticky top-0 w-full min-h-screen flex flex-col justify-center bg-white overflow-hidden">
          {/* Desktop Horizontal Scroll-Synchronized 3-Card Showcase (600px per card, matching desktop_3.png) */}
          <div className="hidden md:block w-full border-t border-b border-[#E5E5E5] overflow-hidden">
            <div
              style={{
                width: `${totalTrackWidth}px`,
                transform: `translate3d(${desktopTranslateX.toFixed(1)}px, 0, 0)`,
              }}
              className="grid grid-cols-3 will-change-transform"
            >
              {HONEY_PRODUCTS.map((honey, idx) => {
                const itemState = seqState.items[idx];
                const jarRotation = reducedMotion ? 0 : seqState.rotationY;
                const jarScaleOffset = reducedMotion ? 0 : (itemState.isActive ? 0.015 : 0);

                return (
                  <article
                    key={honey.id}
                    onClick={() => handleSelectIndex(idx)}
                    className="w-[600px] border-r border-[#E5E5E5] last:border-r-0 flex flex-col bg-white"
                  >
                    {/* Top Cell: 3D Hexagonal Honey Jar Viewport (430px high) */}
                    <div className="h-[430px] border-b border-[#E5E5E5] flex items-center justify-center p-8">
                      <div className="w-[300px] h-[320px]">
                        {viewportWidth >= 768 && (
                          <HoneyJar3D
                            product={honey}
                            rotationY={jarRotation}
                            tiltZ={itemState.isActive ? seqState.tiltZ * 0.6 : 0}
                            scaleOffset={jarScaleOffset}
                          />
                        )}
                      </div>
                    </div>

                    {/* Bottom Cell: Product Copy & Buy Now Button */}
                    <div className="px-[64px] pt-[56px] pb-[56px] flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-editorial text-[36px] leading-[1.1] text-[#111111] mb-[8px]">
                          {honey.name}
                        </h3>
                        <p className="text-[13px] text-[#999999] mb-[26px]">{honey.subtitle}</p>

                        <div className="mb-[22px]">
                          <p className="text-[13px] text-[#999999] mb-[4px]">Aroma &amp; Palate</p>
                          <p className="text-[13px] leading-[1.6] text-[#333333]">
                            {honey.aromaAndPalate}
                          </p>
                        </div>

                        <div className="mb-[22px]">
                          <p className="text-[13px] text-[#999999] mb-[4px]">
                            Texture &amp; Crystallyzation
                          </p>
                          <p className="text-[13px] leading-[1.6] text-[#333333]">
                            {honey.textureAndCrystallization}
                          </p>
                        </div>

                        <div className="mb-[36px]">
                          <p className="text-[13px] text-[#999999] mb-[4px]">
                            Table &amp; Culinary Ritual
                          </p>
                          <p className="text-[13px] leading-[1.6] text-[#333333]">
                            {honey.tableAndCulinaryRitual}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyHoney(honey);
                        }}
                        className="w-full h-[46px] bg-black text-white rounded-full text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Buy Now
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Mobile Single-Card Sticky Showcase (matching mobile_3.png) */}
          <div className="md:hidden flex-1 flex flex-col justify-between border-t border-b border-[#E5E5E5] px-6 py-7">
            {/* Top 3-Pill Indicator + Synchronized Title */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-[8px] mb-5">
                {HONEY_PRODUCTS.map((honey, idx) => {
                  const itemState = seqState.items[idx];
                  return (
                    <button
                      key={honey.id}
                      type="button"
                      aria-label={`Select ${honey.name}`}
                      onClick={() => handleSelectIndex(idx)}
                      style={{ width: `${Math.round(itemState.indicatorWidth)}px` }}
                      className={`h-[4px] rounded-full transition-colors ${
                        itemState.isActive ? 'bg-black' : 'bg-[#D9D9D9]'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="relative w-full h-[68px] text-center">
                {HONEY_PRODUCTS.map((honey, idx) => {
                  const itemState = seqState.items[idx];
                  return (
                    <div
                      key={honey.id}
                      style={{
                        opacity: itemState.opacity,
                        transform: `translate3d(0, ${(itemState.translateY * 0.5).toFixed(1)}px, 0)`,
                        pointerEvents: itemState.isActive ? 'auto' : 'none',
                      }}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                      <h3 className="font-editorial text-[36px] leading-[1.08] text-[#111111] mb-1">
                        {honey.mobileName}
                      </h3>
                      <p className="text-[12px] text-[#999999]">{honey.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile 3D Honey Jar Viewport */}
            <div className="relative w-full h-[300px] my-2 flex items-center justify-center">
              <div className="w-[260px] h-full">
                {viewportWidth < 768 && (
                  <HoneyJar3D
                    product={activeHoney}
                    rotationY={seqState.rotationY}
                    tiltZ={seqState.tiltZ}
                  />
                )}
              </div>
            </div>

            {/* Mobile Synchronized Aroma & Palate + Buy Now Button */}
            <div className="relative w-full h-[155px]">
              {HONEY_PRODUCTS.map((honey, idx) => {
                const itemState = seqState.items[idx];
                return (
                  <div
                    key={honey.id}
                    style={{
                      opacity: itemState.opacity,
                      transform: `translate3d(0, ${(itemState.translateY * 0.5).toFixed(1)}px, 0)`,
                      pointerEvents: itemState.isActive ? 'auto' : 'none',
                    }}
                    className="absolute inset-0 flex flex-col justify-end text-left"
                  >
                    <p className="text-[12px] text-[#999999] mb-1">Aroma &amp; Palate</p>
                    <p className="text-[12.5px] leading-[1.55] text-[#333333] mb-4">
                      {honey.aromaAndPalate}
                    </p>
                    <button
                      type="button"
                      onClick={() => onBuyHoney(honey)}
                      className="w-full h-[46px] bg-black text-white rounded-full text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
