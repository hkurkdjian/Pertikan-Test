import { ArrowRight } from 'lucide-react';
import { AppRoute, getPathForRoute } from '../utils/routingAndValidation';

interface CalloutProps {
  onOpenStorefront: (context?: string) => void;
}

interface FooterProps {
  onNavigate: (route: AppRoute, hash?: string) => void;
  onOpenStorefront: (context?: string) => void;
}

export function ServingRitualsCallout({ onOpenStorefront }: CalloutProps) {
  return (
    <section
      aria-label="Serving Rituals and Gastronomy"
      className="bg-white w-full py-[140px] md:py-[200px] px-6 text-center"
    >
      <div className="max-w-[760px] mx-auto flex flex-col items-center">
        <p className="text-[11px] uppercase tracking-[0.05em] text-[#999999] mb-[16px]">
          SERVING RITUALS &amp; GASTRONOMY
        </p>
        <h2 className="font-editorial text-[36px] md:text-[54px] leading-[1.08] text-[#111111] mb-[20px]">
          <span className="md:hidden">
            Made for moments
            <br />
            worth keeping.
          </span>
          <span className="hidden md:inline">Made for moments worth keeping.</span>
        </h2>
        <p className="text-[13px] leading-[1.65] text-[#A6A6A6] max-w-[330px] md:max-w-[540px] mb-[32px]">
          Whether poured chilled as a luminous aperitif, paired beside aged alpine cheeses and spicy
          cured Burgenland ham, or savored slowly as an evening digestif, honey wine rewards
          unhurried table craft.
        </p>
        <button
          type="button"
          onClick={() => onOpenStorefront('Serving Rituals & Gastronomy')}
          className="inline-flex items-center justify-center gap-[10px] bg-black text-white rounded-full px-[26px] h-[44px] text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Enter Shopify Storefront</span>
          <ArrowRight className="w-[14px] h-[14px]" />
        </button>
      </div>
    </section>
  );
}

export function ClosingTraditionCallout({ onOpenStorefront }: CalloutProps) {
  return (
    <section
      id="shopify-storefront"
      aria-label="Discover Your New Tradition"
      className="bg-white w-full py-[140px] md:py-[200px] px-6 text-center"
    >
      <div className="max-w-[760px] mx-auto flex flex-col items-center">
        <h2 className="font-editorial text-[36px] md:text-[54px] leading-[1.08] text-[#111111] mb-[18px]">
          <span className="md:hidden">
            Discover your <span className="text-[#C4A98B]">new</span>
            <br />
            <span className="text-[#C4A98B]">tradition.</span>
          </span>
          <span className="hidden md:inline">
            Discover your <span className="text-[#C4A98B]">new tradition.</span>
          </span>
        </h2>
        <p className="text-[13px] leading-[1.65] text-[#A6A6A6] max-w-[320px] md:max-w-[460px] mb-[32px]">
          Acquire our award-winning Mitra honey wine, wild Southern Burgenland U&amp;Me cuvées, and
          raw apiary honeys directly through our official online storefront.
        </p>
        <button
          type="button"
          onClick={() => onOpenStorefront('Official Online Storefront')}
          className="inline-flex items-center justify-center gap-[10px] bg-black text-white rounded-full px-[26px] h-[44px] text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Enter Shopify Storefront</span>
          <ArrowRight className="w-[14px] h-[14px]" />
        </button>
      </div>
    </section>
  );
}

export function Footer({ onNavigate, onOpenStorefront }: FooterProps) {
  const handleRouteLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    route: AppRoute,
    hash?: string
  ) => {
    e.preventDefault();
    onNavigate(route, hash);
  };

  return (
    <footer className="bg-white w-full border-t border-[#EEEEEE] text-[#333333]">
      {/* Desktop Footer Layout (matching footer_190829b6.png) */}
      <div className="hidden md:block px-10 lg:px-[64px] pt-[56px] pb-[32px]">
        <div className="grid grid-cols-12 gap-8 pb-[48px] border-b border-[#EEEEEE]">
          {/* Column 1: Brand & Contact */}
          <div className="col-span-4">
            <p className="font-editorial text-[22px] text-[#111111] mb-[18px]">
              Pertikan Beekeeping
            </p>
            <address className="not-italic text-[12.5px] leading-[1.65] text-[#333333] mb-[14px]">
              Burgerstraße 36,
              <br />
              A-7503 Grosspetersdorf,
            </address>
            <div className="text-[12.5px] leading-[1.65] text-[#333333] mb-[14px]">
              <p>+43 681 2051 5033</p>
              <p>+43 660 8280 418</p>
            </div>
            <a
              href="mailto:pertikan@gmx.at"
              className="text-[12.5px] text-[#333333] underline underline-offset-4 hover:text-black"
            >
              pertikan@gmx.at
            </a>
          </div>

          {/* Column 2: Explore (Collections, Shop, Our Story, Events) */}
          <div className="col-span-3">
            <p className="text-[12.5px] text-[#999999] mb-[16px]">Explore</p>
            <ul className="space-y-[12px] text-[12.5px] text-[#333333]">
              <li>
                <a
                  href="/#wine-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#wine-collection')}
                  className="hover:text-black transition-colors"
                >
                  Collections
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenStorefront('Pertikan Storefront')}
                  className="hover:text-black transition-colors cursor-pointer text-left"
                >
                  Shop
                </button>
              </li>
              <li>
                <a
                  href={getPathForRoute('our-story')}
                  onClick={(e) => handleRouteLink(e, 'our-story')}
                  className="hover:text-black transition-colors"
                >
                  Our Story
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('404')}
                  onClick={(e) => handleRouteLink(e, '404')}
                  className="hover:text-black transition-colors"
                >
                  Events
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Explore (Contact Us, Find Us, Blog) */}
          <div className="col-span-3 lg:pt-[34px]">
            <p className="text-[12.5px] text-[#999999] mb-[16px]">Explore</p>
            <ul className="space-y-[12px] text-[12.5px] text-[#333333]">
              <li>
                <a
                  href={getPathForRoute('contact-us')}
                  onClick={(e) => handleRouteLink(e, 'contact-us')}
                  className="hover:text-black transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('find-us')}
                  onClick={(e) => handleRouteLink(e, 'find-us')}
                  className="hover:text-black transition-colors"
                >
                  Find Us
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('404')}
                  onClick={(e) => handleRouteLink(e, '404')}
                  className="hover:text-black transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Shop (Wine Collection, Honey, Propolis Tropfen, Beeswax Candles) */}
          <div className="col-span-2">
            <p className="text-[12.5px] text-[#999999] mb-[16px]">Shop</p>
            <ul className="space-y-[12px] text-[12.5px] text-[#333333]">
              <li>
                <a
                  href="/#wine-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#wine-collection')}
                  className="hover:text-black transition-colors"
                >
                  Wine Collection
                </a>
              </li>
              <li>
                <a
                  href="/#apiary-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#apiary-collection')}
                  className="hover:text-black transition-colors"
                >
                  Honey
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenStorefront('Propolis Tropfen')}
                  className="hover:text-black transition-colors cursor-pointer text-left"
                >
                  Propolis Tropfen
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenStorefront('Beeswax Candles')}
                  className="hover:text-black transition-colors cursor-pointer text-left"
                >
                  Beeswax Candles
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-[26px] flex items-center justify-between text-[12px] text-[#333333]">
          <div className="flex items-center gap-[14px]">
            <a
              href="mailto:pertikan@gmx.at"
              aria-label="Pertikan Facebook"
              className="text-[#333333] hover:text-black transition-colors"
            >
              <svg
                className="w-[16px] h-[16px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="12" cy="12" r="9.5" />
                <path
                  d="M13.5 8.5H12.5C11.4 8.5 11 9.2 11 10.2V12H13.5L13.1 14.5H11V21"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="mailto:pertikan@gmx.at"
              aria-label="Pertikan Instagram"
              className="text-[#333333] hover:text-black transition-colors"
            >
              <svg
                className="w-[16px] h-[16px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>

          <p>© 2026 Pertikan Beekeeping . All rights reserved.</p>

          <p>By TabDeal</p>
        </div>
      </div>

      {/* Mobile Footer Layout */}
      <div className="md:hidden px-6 pt-[44px] pb-[32px]">
        <div className="text-center pb-[28px] border-b border-[#EEEEEE]">
          <p className="font-editorial text-[22px] text-[#111111] mb-[16px]">
            Pertikan Beekeeping
          </p>
          <address className="not-italic text-[12.5px] leading-[1.6] text-[#333333] mb-[12px]">
            Burgerstraße 36,
            <br />
            A-7503 Grosspetersdorf,
          </address>
          <div className="text-[12.5px] leading-[1.6] text-[#333333] mb-[12px]">
            <p>+43 681 2051 5033</p>
            <p>+43 660 8280 418</p>
          </div>
          <a
            href="mailto:pertikan@gmx.at"
            className="text-[12.5px] text-[#333333] underline underline-offset-4"
          >
            pertikan@gmx.at
          </a>
        </div>

        <div className="grid grid-cols-2 gap-6 py-[28px] border-b border-[#EEEEEE] text-left">
          <div>
            <p className="text-[12px] text-[#999999] mb-[14px]">Explore</p>
            <ul className="space-y-[12px] text-[13px] text-[#333333]">
              <li>
                <a
                  href="/#wine-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#wine-collection')}
                >
                  Collections
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('our-story')}
                  onClick={(e) => handleRouteLink(e, 'our-story')}
                >
                  Our Story
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('contact-us')}
                  onClick={(e) => handleRouteLink(e, 'contact-us')}
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href={getPathForRoute('find-us')}
                  onClick={(e) => handleRouteLink(e, 'find-us')}
                >
                  Find Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] text-[#999999] mb-[14px]">Shop</p>
            <ul className="space-y-[12px] text-[13px] text-[#333333]">
              <li>
                <a
                  href="/#wine-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#wine-collection')}
                >
                  Wine Collection
                </a>
              </li>
              <li>
                <a
                  href="/#apiary-collection"
                  onClick={(e) => handleRouteLink(e, 'home', '#apiary-collection')}
                >
                  Honey
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenStorefront('Propolis Tropfen')}
                  className="text-left"
                >
                  Propolis Tropfen
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenStorefront('Beeswax Candles')}
                  className="text-left"
                >
                  Beeswax Candles
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-[22px] border-b border-[#EEEEEE] flex items-center justify-center gap-4">
          <a
            href="mailto:pertikan@gmx.at"
            aria-label="Pertikan Facebook Mobile"
            className="text-[#333333]"
          >
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="12" cy="12" r="9.5" />
              <path
                d="M13.5 8.5H12.5C11.4 8.5 11 9.2 11 10.2V12H13.5L13.1 14.5H11V21"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href="mailto:pertikan@gmx.at"
            aria-label="Pertikan Instagram Mobile"
            className="text-[#333333]"
          >
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>

        <div className="pt-[24px] text-center text-[12px] text-[#333333] space-y-3">
          <p>© 2026 Pertikan Beekeeping . All rights reserved.</p>
          <p>By TabDeal</p>
        </div>
      </div>
    </footer>
  );
}
