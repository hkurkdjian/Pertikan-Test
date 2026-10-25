import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'rene-kollegger',
    quote:
      "“What's a Persian doing in Grosspetersdorf, in southern Burgenland? Making honey wine, of course – or in short: mead! Mead is one of the oldest alcoholic beverages known to humankind. In Grosspetersdorf, this classic gets a very special twist: Southern Burgenland honey forms the basis for a drink that develops its own unique character after 15 months of maturation. Completely free of sulfur or other additives, the mead is allowed to show what it's made of. On the nose and palate, we encounter a pleasant honey note that, thankfully, doesn't tip over into heavy or overly sweet flavors. This is complemented by exciting aromas of licorice, thyme, orange zest, and gingerbread. This makes it not only an interesting drink on its own, but also a surprising accompaniment to red smear cheese and a variety of desserts. A drink that sparks curiosity, invites experimentation, and brings a whole lot of fun to the glass. Anyone who hasn't tasted mead in ages should definitely remedy that. Perhaps this encounter with this ancient beverage will spark a whole new love affair! ...”",
    author: 'René Kollegger',
    role: 'Gault & Millau . Sommelier of the Year 2026',
    avatar: '/assets/rene-kollegger.png',
  },
  {
    id: 'clara-von-stein',
    quote:
      "“Golden Hive operates with the discipline of a premier cru estate. By fermenting raw Southern Burgenland forest and blossom honey without sulfites or forced filtration, they achieve a remarkable crystalline tension on the palate. Notes of wild thyme, toasted beeswax, and candied Seville orange peel unfold in layers that rival aged Chenin Blanc and oxidative Jura wines.”",
    author: 'Clara von Stein',
    role: 'Falstaff Wine Guide . Senior Tasting Editor',
    avatar: '/assets/rene-kollegger.png',
  },
  {
    id: 'lukas-brenner',
    quote:
      "“When we first poured the 2024 Forest Honey Reserve alongside our cheese course in Vienna, guests were astonished. It bridges the gap between botanical complexity and dry gastronomic structure—offering a long, saline-mineral finish with delicate hints of propolis, warm spice, and wild meadow herbs.”",
    author: 'Lukas Brenner',
    role: 'Two-Michelin-Starred Head Sommelier . Vienna',
    avatar: '/assets/rene-kollegger.png',
  },
  {
    id: 'sophie-laurent',
    quote:
      "“A revelation in modern European fermentation. Fifteen months of patient cellar maturation transforms raw apiary nectar into a deeply expressive, dry-leaning honey wine with extraordinary aromatic lift—licorice root, dried apricot, and warm gingerbread lingering effortlessly on the finish.”",
    author: 'Sophie Laurent',
    role: 'Artisanal Cellar Journal . European Natural Wine Critic',
    avatar: '/assets/rene-kollegger.png',
  },
];

export const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const current = TESTIMONIALS[activeIndex];

  return (
    <section
      id="testimonials"
      aria-label="As Tasted by Experts"
      className="w-full bg-white border-t border-b border-[#EEEEEE] py-[84px] md:py-[124px] px-6 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-[980px] mx-auto flex flex-col items-center">
        {/* Heading */}
        <h2 className="font-editorial text-[34px] md:text-[42px] leading-[1.12] tracking-[-0.01em] text-[#111111] text-center mb-[36px] md:mb-[46px]">
          As Tasted by Experts
        </h2>

        {/* Main Carousel Row */}
        <div className="w-full flex items-center justify-between gap-6 md:gap-10">
          {/* Desktop Left Chevron */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous testimonial"
            className="hidden md:flex items-center justify-center w-9 h-9 text-[#111111] hover:opacity-55 transition-opacity cursor-pointer shrink-0 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.6} />
          </button>

          {/* Center Testimonial Content */}
          <div className="w-full max-w-[800px] mx-auto transition-opacity duration-300">
            <blockquote className="text-left text-[15px] md:text-[14.5px] leading-[1.68] text-[#333333] font-normal">
              {current.quote}
            </blockquote>

            {/* Horizontal Divider */}
            <hr className="border-0 border-t border-[#EAEAEA] my-[28px] md:my-[32px]" />

            {/* Author Meta Row */}
            <div className="flex items-center gap-[18px] md:gap-[20px]">
              <img
                src={current.avatar}
                alt={current.author}
                className="w-[64px] h-[64px] md:w-[68px] md:h-[68px] rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col text-left">
                <span className="font-editorial text-[22px] md:text-[24px] leading-[1.15] text-[#111111] mb-[4px]">
                  {current.author}
                </span>
                <span className="text-[12.5px] md:text-[14px] leading-[1.4] text-[#999999] whitespace-nowrap">
                  {current.role}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Right Chevron */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next testimonial"
            className="hidden md:flex items-center justify-center w-9 h-9 text-[#111111] hover:opacity-55 transition-opacity cursor-pointer shrink-0 -mr-2"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={1.6} />
          </button>
        </div>

        {/* Bottom 4-Slide Pagination Indicator */}
        <div
          className="mt-[38px] md:mt-[44px] flex items-center justify-center gap-[7px]"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {TESTIMONIALS.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View testimonial by ${item.author}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-[4px] rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-[30px] bg-[#111111]'
                    : 'w-[4px] bg-[#D6D6D6] hover:bg-[#999999]'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
