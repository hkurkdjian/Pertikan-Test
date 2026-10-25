import { useEffect, useState } from 'react';
import { AgeConfirmationModal } from './components/AgeConfirmationModal';
import { ApiaryCollectionSection } from './components/ApiaryCollectionSection';
import { ContactUsPage } from './components/ContactUsPage';
import { FindUsPage } from './components/FindUsPage';
import { HeaderAndHero } from './components/HeaderAndHero';
import { NotFoundPage } from './components/NotFoundPage';
import { OurStoryPage } from './components/OurStoryPage';
import { SiteNavigation } from './components/SiteNavigation';
import {
  ClosingTraditionCallout,
  Footer,
  ServingRitualsCallout,
} from './components/StoryAndFooter';
import { WineCollectionSection } from './components/WineCollectionSection';
import { HoneyProduct, WineProduct } from './data/products';
import {
  AppRoute,
  getPathForRoute,
  resolveRouteFromLocation,
} from './utils/routingAndValidation';

const AGE_VERIFIED_STORAGE_KEY = 'pertikan_age_verified';

function readInitialAgeVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('verified') === '1') {
      return true;
    }
    return window.sessionStorage.getItem(AGE_VERIFIED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined'
      ? resolveRouteFromLocation(window.location.pathname, window.location.hash)
      : 'home'
  );
  const [ageVerified, setAgeVerified] = useState<boolean>(readInitialAgeVerified);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedItemNotice, setSelectedItemNotice] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(resolveRouteFromLocation(window.location.pathname, window.location.hash));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleConfirmAge = () => {
    try {
      window.sessionStorage.setItem(AGE_VERIFIED_STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setAgeVerified(true);
    if (currentRoute === 'age-confirmation') {
      handleNavigate('home');
    }
  };

  const handleNavigate = (targetRoute: AppRoute, hash?: string) => {
    const nextPath = getPathForRoute(targetRoute) + (hash || '');

    if (targetRoute === currentRoute && hash) {
      const targetEl = document.querySelector(hash);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    setIsTransitioning(true);
    window.history.pushState({}, '', nextPath);
    setCurrentRoute(targetRoute);

    window.setTimeout(() => {
      if (hash) {
        const targetEl = document.querySelector(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setIsTransitioning(false);
    }, 60);
  };

  const handleOpenStorefront = (itemTitle?: string) => {
    setSelectedItemNotice(itemTitle || 'Pertikan Storefront');
  };

  const handleBuyWine = (wine: WineProduct) => {
    setSelectedItemNotice(`${wine.name} — ${wine.subtitle}`);
  };

  const handleBuyHoney = (honey: HoneyProduct) => {
    setSelectedItemNotice(`${honey.name} — ${honey.subtitle}`);
  };

  const showAgeGate = !ageVerified || currentRoute === 'age-confirmation';

  return (
    <div
      data-route={currentRoute}
      className="min-h-screen bg-white text-[#111111] flex flex-col justify-between"
    >
      {/* Age Confirmation Gate Overlay */}
      {showAgeGate ? (
        <AgeConfirmationModal onConfirmAge={handleConfirmAge} />
      ) : (
        /* Main Page View with Seamless Opacity Transition */
        <div
          className={`flex-1 flex flex-col transition-opacity duration-200 ease-out ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {currentRoute === 'home' && (
            <>
              <HeaderAndHero
                currentRoute={currentRoute}
                onNavigate={handleNavigate}
                onOpenStorefront={handleOpenStorefront}
              />
              <main>
                <WineCollectionSection onBuyProduct={handleBuyWine} />
                <ServingRitualsCallout onOpenStorefront={handleOpenStorefront} />
                <ApiaryCollectionSection onBuyHoney={handleBuyHoney} />
                <ClosingTraditionCallout onOpenStorefront={handleOpenStorefront} />
              </main>
              <Footer onNavigate={handleNavigate} onOpenStorefront={handleOpenStorefront} />
            </>
          )}

          {currentRoute === 'our-story' && (
            <>
              <header>
                <SiteNavigation
                  variant="light"
                  currentRoute={currentRoute}
                  onNavigate={handleNavigate}
                  onOpenStorefront={handleOpenStorefront}
                />
              </header>
              <main className="flex-1">
                <OurStoryPage />
              </main>
              <Footer onNavigate={handleNavigate} onOpenStorefront={handleOpenStorefront} />
            </>
          )}

          {currentRoute === 'contact-us' && (
            <>
              <header>
                <SiteNavigation
                  variant="light"
                  currentRoute={currentRoute}
                  onNavigate={handleNavigate}
                  onOpenStorefront={handleOpenStorefront}
                />
              </header>
              <main className="flex-1">
                <ContactUsPage />
              </main>
              <Footer onNavigate={handleNavigate} onOpenStorefront={handleOpenStorefront} />
            </>
          )}

          {currentRoute === 'find-us' && (
            <>
              <header>
                <SiteNavigation
                  variant="light"
                  currentRoute={currentRoute}
                  onNavigate={handleNavigate}
                  onOpenStorefront={handleOpenStorefront}
                />
              </header>
              <main className="flex-1">
                <FindUsPage onNavigate={handleNavigate} />
              </main>
              <Footer onNavigate={handleNavigate} onOpenStorefront={handleOpenStorefront} />
            </>
          )}

          {currentRoute === '404' && (
            <>
              <header>
                <SiteNavigation
                  variant="light"
                  currentRoute={currentRoute}
                  onNavigate={handleNavigate}
                  onOpenStorefront={handleOpenStorefront}
                />
              </header>
              <main className="flex-1">
                <NotFoundPage onNavigate={handleNavigate} />
              </main>
            </>
          )}
        </div>
      )}

      {/* Storefront Inquiry Dialog */}
      {selectedItemNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pertikan Storefront"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setSelectedItemNotice(null)}
        >
          <div
            className="bg-white border border-[#E5E5E5] max-w-[420px] w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-[0.05em] text-[#999999] mb-2">
              PERTIKAN OFFICIAL STOREFRONT
            </p>
            <h3 className="font-editorial text-[28px] leading-[1.15] text-[#111111] mb-3">
              {selectedItemNotice}
            </h3>
            <p className="text-[13px] leading-[1.6] text-[#666666] mb-6">
              Direct orders and cellar allocations from our Grosspetersdorf apiary are available via
              our official storefront or direct inquiry at{' '}
              <a href="mailto:pertikan@gmx.at" className="underline text-[#111111]">
                pertikan@gmx.at
              </a>
              .
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="mailto:pertikan@gmx.at?subject=Pertikan%20Order%20Inquiry"
                className="flex-1 h-[42px] inline-flex items-center justify-center bg-black text-white rounded-full text-[12px] font-normal hover:bg-neutral-800 transition-colors"
              >
                Inquire via Email
              </a>
              <button
                type="button"
                onClick={() => setSelectedItemNotice(null)}
                className="px-5 h-[42px] border border-[#E0E0E0] rounded-full text-[12px] text-[#333333] hover:border-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
