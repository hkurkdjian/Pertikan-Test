import { ArrowRight } from 'lucide-react';
import { AppRoute } from '../utils/routingAndValidation';
import { HoneyBee3D } from './HoneyBee3D';

interface NotFoundPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <section
      data-testid="not-found-page"
      aria-labelledby="not-found-heading"
      className="relative w-full min-h-[calc(100vh-76px)] bg-white flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
    >
      {/* Anatomically faithful 3D Apis mellifera honeybee bounded to the negative space above typography */}
      <HoneyBee3D />

      {/* Centered 404 Typography & CTA (matching 404-1_3c234f94.png & 404-2_9649d090.png) */}
      <div className="relative z-20 max-w-[360px] sm:max-w-[780px] mx-auto flex flex-col items-center text-center mt-12 md:mt-14">
        <h1
          id="not-found-heading"
          className="font-editorial text-[42px] sm:text-[48px] md:text-[54px] leading-[1.06] text-[#111111] mb-5 sm:whitespace-nowrap"
        >
          Well, this isn&apos;t quite the sweet spot.
        </h1>

        <p className="text-[14px] md:text-[15px] leading-[1.62] text-[#8C8C8C] max-w-[330px] sm:max-w-[490px] mb-9">
          The page you&apos;re looking for is nowhere to be found. Fortunately, there&apos;s more to
          Pertikan than meets the hive.
        </p>

        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center justify-center gap-3 bg-black text-white rounded-full px-[30px] h-[48px] text-[13.5px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Back to Pertikan</span>
          <ArrowRight className="w-[15px] h-[15px]" />
        </button>
      </div>
    </section>
  );
}
