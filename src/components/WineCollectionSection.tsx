import { useEffect, useRef, useState } from 'react';
import { WINE_PRODUCTS, WineProduct } from '../data/products';
import {
  calculateStickyProgress,
  calculateTargetScrollYForIndex,
  computeScrollSequenceState,
} from '../utils/scrollMath';
import { WineBottle3D } from './WineBottle3D';

interface WineCollectionSectionProps {
  onBuyProduct: (product: WineProduct) => void;
}

export function WineCollectionSection({ onBuyProduct }: WineCollectionSectionProps) {
  const stickyTrackRef = useRef<HTMLDivElement | null>(null);
  const [rawProgress, setRawProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
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
      setIsDesktop((window.innerWidth || 1440) >= 768);
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

  const seqState = computeScrollSequenceState(rawProgress, WINE_PRODUCTS.length, reducedMotion);
  const activeProduct = WINE_PRODUCTS[seqState.activeIndex] || WINE_PRODUCTS[0];

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
      WINE_PRODUCTS.length
    );
    window.scrollTo({
      top: targetY,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      id="wine-collection"
      aria-label="The Wine Collection"
      className="bg-white w-full"
    >
      {/* Editorial Introduction Header */}
      <div className="px-6 md:px-[64px] pt-[56px] md:pt-[64px] pb-[36px] md:pb-[28px]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-[11px] uppercase tracking-[0.04em] text-[#999999] mb-[12px]">
              THE WINE COLLECTION
            </p>
            <h2 className="font-editorial text-[36px] md:text-[44px] leading-[1.08] text-[#111111]">
              Three expressions.
              <br />
              One philosophy.
            </h2>
          </div>

          <p className="text-center md:text-left text-[13px] leading-[1.6] text-[#808080] max-w-[340px] md:max-w-[540px] mx-auto md:mx-0 md:pb-[4px]">
            Every bottle begins in our Southern Burgenland apiary. Matured patiently for 15 to 18
            months without chemical additives, our three alcoholic honey wines honor both ancient
            fermentation and the untamed character of regional Uhudler grapes.
          </p>
        </div>
      </div>

      {/* Scroll-Driven Sticky Wine Sequence Track */}
      <div
        ref={stickyTrackRef}
        data-testid="wine-sticky-track"
        data-active-wine={activeProduct.id}
        data-active-index={seqState.activeIndex}
        className="relative w-full h-[340vh]"
      >
        <div className="sticky top-0 w-full min-h-screen md:h-screen flex flex-col justify-between bg-white overflow-hidden">
          {/* Desktop Top Progress Indicator Row */}
          <div className="hidden md:flex items-center justify-center pt-[16px] pb-[20px] border-b border-[#E5E5E5] shrink-0">
            <div
              role="tablist"
              aria-label="Wine Collection Expressions"
              className="flex items-center gap-[8px]"
            >
              {WINE_PRODUCTS.map((wine, idx) => {
                const itemState = seqState.items[idx];
                return (
                  <button
                    key={wine.id}
                    type="button"
                    role="tab"
                    aria-selected={itemState.isActive}
                    aria-label={`Show ${wine.name}`}
                    onClick={() => handleSelectIndex(idx)}
                    style={{ width: `${Math.round(itemState.indicatorWidth)}px` }}
                    className={`h-[4px] rounded-full transition-colors duration-150 cursor-pointer ${
                      itemState.isActive ? 'bg-black' : 'bg-[#D9D9D9] hover:bg-[#B0B0B0]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Desktop 2-Column Sticky Showcase */}
          <div className="hidden md:grid md:grid-cols-2 flex-1 min-h-0 border-b border-[#E5E5E5]">
            {/* Left Column: 3D Wine Bottle Stage */}
            <div className="relative h-full border-r border-[#E5E5E5] flex items-center justify-center py-8 px-12">
              <div className="w-full h-full max-w-[380px] max-h-[560px]">
                {isDesktop && (
                  <WineBottle3D
                    product={activeProduct}
                    rotationY={seqState.rotationY}
                    tiltZ={seqState.tiltZ}
                    depthOffset={seqState.depthOffset}
                  />
                )}
              </div>
            </div>

            {/* Right Column: Synchronized Product Details */}
            <div className="relative h-full flex items-center px-[64px] lg:px-[88px]">
              <div className="relative w-full max-w-[490px] h-[500px]">
                {WINE_PRODUCTS.map((wine, idx) => {
                  const itemState = seqState.items[idx];
                  const visible = itemState.opacity > 0.01;
                  return (
                    <article
                      key={wine.id}
                      aria-hidden={!itemState.isActive}
                      style={{
                        opacity: itemState.opacity,
                        transform: `translate3d(0, ${itemState.translateY.toFixed(1)}px, 0) scale(${itemState.scale.toFixed(3)})`,
                        pointerEvents: itemState.isActive ? 'auto' : 'none',
                        visibility: visible ? 'visible' : 'hidden',
                      }}
                      className="absolute inset-0 flex flex-col justify-center will-change-transform"
                    >
                      <h3 className="font-editorial text-[48px] leading-[1.06] text-[#111111] mb-[8px]">
                        {wine.name}
                      </h3>
                      <p className="text-[13px] text-[#999999] mb-[22px]">{wine.subtitle}</p>

                      <p className="text-[13px] leading-[1.6] text-[#333333] mb-[22px]">
                        {wine.description}
                      </p>

                      <div className="mb-[28px]">
                        <p className="text-[13px] text-[#999999] mb-[6px]">Tasting Notes</p>
                        <p className="text-[13px] leading-[1.6] text-[#333333]">
                          {wine.tastingNotes}
                        </p>
                      </div>

                      {/* 3-Row Specification Table */}
                      <dl className="w-full text-[13px] mb-[32px]">
                        <div className="flex items-center justify-between py-[12px] border-b border-[#EFEFEF]">
                          <dt className="text-[#B0B0B0]">Maturation</dt>
                          <dd className="text-[#333333] text-right">{wine.maturation}</dd>
                        </div>
                        <div className="flex items-center justify-between py-[12px] border-b border-[#EFEFEF]">
                          <dt className="text-[#B0B0B0]">Purity &amp; Sulfites</dt>
                          <dd className="text-[#333333] text-right">{wine.purityAndSulfites}</dd>
                        </div>
                        <div className="flex items-center justify-between py-[12px]">
                          <dt className="text-[#B0B0B0]">Recommended Service</dt>
                          <dd className="text-[#333333] text-right">{wine.recommendedService}</dd>
                        </div>
                      </dl>

                      <button
                        type="button"
                        onClick={() => onBuyProduct(wine)}
                        className="w-full h-[46px] bg-black text-white rounded-full text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Buy Now
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Sticky Single-Column Showcase */}
          <div className="md:hidden flex-1 flex flex-col justify-between border-t border-b border-[#E5E5E5] px-6 py-7">
            {/* Mobile Progress Indicator */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-[8px] mb-5">
                {WINE_PRODUCTS.map((wine, idx) => {
                  const itemState = seqState.items[idx];
                  return (
                    <button
                      key={wine.id}
                      type="button"
                      aria-label={`Select ${wine.name}`}
                      onClick={() => handleSelectIndex(idx)}
                      style={{ width: `${Math.round(itemState.indicatorWidth)}px` }}
                      className={`h-[4px] rounded-full transition-colors ${
                        itemState.isActive ? 'bg-black' : 'bg-[#D9D9D9]'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Mobile Synchronized Title & Subtitle */}
              <div className="relative w-full h-[68px] text-center">
                {WINE_PRODUCTS.map((wine, idx) => {
                  const itemState = seqState.items[idx];
                  return (
                    <div
                      key={wine.id}
                      style={{
                        opacity: itemState.opacity,
                        transform: `translate3d(0, ${(itemState.translateY * 0.5).toFixed(1)}px, 0)`,
                        pointerEvents: itemState.isActive ? 'auto' : 'none',
                      }}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                      <h3 className="font-editorial text-[36px] leading-[1.08] text-[#111111] mb-1">
                        {wine.name}
                      </h3>
                      <p className="text-[12px] text-[#999999]">{wine.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile 3D Bottle Viewport */}
            <div className="relative w-full h-[350px] my-2 flex items-center justify-center">
              <div className="w-[240px] h-full">
                {!isDesktop && (
                  <WineBottle3D
                    product={activeProduct}
                    rotationY={seqState.rotationY}
                    tiltZ={seqState.tiltZ}
                    depthOffset={seqState.depthOffset}
                  />
                )}
              </div>
            </div>

            {/* Mobile Synchronized Description & CTA */}
            <div className="relative w-full h-[132px]">
              {WINE_PRODUCTS.map((wine, idx) => {
                const itemState = seqState.items[idx];
                return (
                  <div
                    key={wine.id}
                    style={{
                      opacity: itemState.opacity,
                      transform: `translate3d(0, ${(itemState.translateY * 0.5).toFixed(1)}px, 0)`,
                      pointerEvents: itemState.isActive ? 'auto' : 'none',
                    }}
                    className="absolute inset-0 flex flex-col justify-end text-center"
                  >
                    <p className="text-[12.5px] leading-[1.55] text-[#444444] mb-4 px-2">
                      {wine.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => onBuyProduct(wine)}
                      className="w-full h-[46px] bg-black text-white rounded-full text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer"
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
