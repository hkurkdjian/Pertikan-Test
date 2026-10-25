import { useState } from 'react';
import { AppRoute, getPathForRoute } from '../utils/routingAndValidation';

export interface SiteNavigationProps {
  variant?: 'hero' | 'light';
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, hash?: string) => void;
  onOpenStorefront: (context?: string) => void;
}

interface NavItem {
  label: string;
  route: AppRoute;
  hash?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Collections', route: 'home', hash: '#wine-collection' },
  { label: 'Our Story', route: 'our-story' },
  { label: 'Contact Us', route: 'contact-us' },
  { label: 'Find Us', route: 'find-us' },
  { label: 'Events', route: '404' },
  { label: 'Blog', route: '404' },
];

export function SiteNavigation({
  variant = 'light',
  currentRoute,
  onNavigate,
  onOpenStorefront,
}: SiteNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHero = variant === 'hero';

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(item.route, item.hash);
  };

  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate('home');
  };

  return (
    <div
      className={
        isHero
          ? 'absolute top-0 left-0 right-0 z-30'
          : 'relative w-full z-30 bg-white border-b border-[#EEEEEE]'
      }
    >
      <div className="flex items-center justify-between gap-8 h-[72px] lg:h-[76px] px-5 md:px-10 lg:px-[64px]">
        {/* Mobile & Tablet Hamburger Button (Left on < lg) */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`lg:hidden flex flex-col justify-center items-center w-10 h-10 -ml-2 focus:outline-none cursor-pointer ${
            isHero ? 'text-white' : 'text-[#111111]'
          }`}
        >
          {isHero ? (
            <>
              <span className="w-[16px] h-[1.5px] bg-current mb-[4px] block transition-transform" />
              <span className="w-[16px] h-[1.5px] bg-current block transition-transform" />
            </>
          ) : (
            <>
              <span className="w-[16px] h-[1.5px] bg-current mb-[3.5px] block transition-transform" />
              <span className="w-[16px] h-[1.5px] bg-current mb-[3.5px] block transition-transform" />
              <span className="w-[16px] h-[1.5px] bg-current block transition-transform" />
            </>
          )}
        </button>

        {/* Zone 1: Brand Wordmark (Left on lg desktop, Centered on < lg mobile/tablet) */}
        <a
          href="/"
          onClick={handleBrandClick}
          aria-label="Pertikan Home"
          className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 flex items-center justify-center whitespace-nowrap shrink-0"
        >
          <img
            src="/pertikan.svg"
            alt="Pertikan"
            className={`h-[21px] lg:h-[22px] w-auto select-none ${
              isHero ? 'brightness-0 invert' : 'brightness-0'
            }`}
          />
        </a>

        {/* Zone 2: Desktop Centered Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className={`hidden lg:flex items-center gap-[34px] xl:gap-[42px] text-[13px] font-normal ${
            isHero ? 'text-white/90' : 'text-[#333333]'
          }`}
        >
          {NAV_ITEMS.map((item) => {
            const href = item.hash ? `/${item.hash}` : getPathForRoute(item.route);
            const isActive =
              !item.hash && currentRoute === item.route && item.route !== '404';
            return (
              <a
                key={item.label}
                href={href}
                onClick={(e) => handleNavClick(e, item)}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  isHero
                    ? 'hover:text-white'
                    : isActive
                    ? 'text-black font-medium'
                    : 'hover:text-black'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Right Primary Action Button (Shop) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onOpenStorefront('Pertikan Collection')}
            className={
              isHero
                ? 'lg:bg-white lg:text-[#111111] lg:border-transparent bg-white/15 text-white border border-white/30 rounded-full px-[22px] lg:px-[25px] py-[7px] lg:py-[8px] text-[13px] font-normal tracking-[-0.01em] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer'
                : 'bg-black text-white rounded-full px-[24px] lg:px-[26px] py-[7.5px] lg:py-[8px] text-[13px] font-normal tracking-[-0.01em] hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            }
          >
            Shop
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Slide-Down Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="Mobile Navigation"
          className={`lg:hidden absolute top-[72px] left-0 right-0 z-40 px-6 py-6 border-b transition-all ${
            isHero
              ? 'bg-[#14170f]/95 border-white/15 text-white'
              : 'bg-white border-[#EEEEEE] text-[#111111] shadow-sm'
          }`}
        >
          <nav aria-label="Mobile Primary Navigation" className="flex flex-col gap-3.5 text-[15px]">
            {NAV_ITEMS.map((item) => {
              const href = item.hash ? `/${item.hash}` : getPathForRoute(item.route);
              return (
                <a
                  key={item.label}
                  href={href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`py-1 transition-colors ${
                    isHero ? 'text-white/90 hover:text-white' : 'text-[#333333] hover:text-black'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
