import { AWARD_HIGHLIGHTS } from '../data/products';
import { AppRoute } from '../utils/routingAndValidation';
import { SiteNavigation } from './SiteNavigation';

interface HeaderAndHeroProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, hash?: string) => void;
  onOpenStorefront: (productName?: string) => void;
}

export function HeaderAndHero({
  currentRoute,
  onNavigate,
  onOpenStorefront,
}: HeaderAndHeroProps) {
  const handleSeeCollections = () => {
    const el = document.getElementById('wine-collection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Top Navigation & Hero Container */}
      <header className="relative w-full overflow-hidden">
        <SiteNavigation
          variant="hero"
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onOpenStorefront={onOpenStorefront}
        />

        {/* Vineyard Hero Section */}
        <section
          id="top"
          aria-label="Pertikan Vineyard Hero"
          className="relative w-full h-[844px] md:h-[1024px] flex flex-col items-center justify-center overflow-hidden bg-[#1b2012]"
        >
          {/* Responsive Original Vineyard Background Picture */}
          <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
            <source media="(min-width: 768px)" srcSet="/assets/hero-desktop.jpg" />
            <img
              src="/assets/hero-mobile.jpg"
              alt="Aerial view of Southern Burgenland vineyards and rolling hills"
              className="w-full h-full object-cover object-center"
            />
          </picture>

          {/* Hero Center Lockup */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 -mt-[14px] md:-mt-[10px]">
            <h1 className="sr-only">Pertikan — A Heritage That Travels.</h1>
            <img
              src="/pertikan.svg"
              alt=""
              aria-hidden="true"
              className="w-[228px] md:w-[448px] h-auto brightness-0 invert select-none"
            />
            <p className="mt-[18px] md:mt-[28px] text-white text-[13px] md:text-[21px] font-normal tracking-[0.04em] uppercase">
              A HERITAGE THAT TRAVELS.
            </p>

            {/* Hero Action Buttons (See Collections & Find Us as in homepage_6e8bdff9.png) */}
            <div className="hidden md:flex items-center justify-center gap-3 mt-[26px]">
              <button
                type="button"
                onClick={handleSeeCollections}
                className="h-[38px] px-[22px] rounded-full bg-white text-[#111111] text-[12.5px] font-normal hover:bg-white/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                See Collections
              </button>
              <button
                type="button"
                onClick={() => onNavigate('find-us')}
                className="h-[38px] px-[22px] rounded-full bg-[#2a2d22]/65 hover:bg-[#2a2d22]/85 border border-white/25 text-white text-[12.5px] font-normal transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Find Us
              </button>
            </div>
          </div>
        </section>
      </header>

      {/* Responsive Awards & Maturation Strip (VP2) */}
      <section
        id="standards"
        aria-label="Quality and Maturation Standards"
        className="grid grid-cols-1 gap-y-[54px] md:grid-cols-3 md:gap-y-0 md:gap-x-8 border-b border-[#E5E5E5] bg-white py-[64px] md:py-[56px] px-6 md:px-[64px]"
      >
        {AWARD_HIGHLIGHTS.map((item) => (
          <div key={item.kicker} className="flex flex-col items-center text-center px-2 md:px-4">
            <span className="text-[12px] md:text-[11px] uppercase tracking-[0.04em] text-[#1A1A1A] md:text-[#4A4A4A] mb-[12px] md:mb-[10px]">
              {item.kicker}
            </span>
            <h2 className="font-editorial text-[32px] md:text-[28px] leading-[1.15] text-[#111111] mb-[10px] md:mb-[8px]">
              {item.title}
            </h2>
            <p className="text-[13.5px] md:text-[12px] text-[#B0B0B0] font-normal">
              {item.subtitle}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
