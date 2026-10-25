import { useState } from 'react';

interface AgeConfirmationModalProps {
  onConfirmAge: () => void;
}

export function AgeConfirmationModal({ onConfirmAge }: AgeConfirmationModalProps) {
  const [exitedUnderage, setExitedUnderage] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      data-testid="age-confirmation-gate"
      className="fixed inset-0 z-50 w-full h-full overflow-hidden flex flex-col items-center justify-between py-7 md:py-10 px-6 bg-[#232619] text-white select-none"
    >
      {/* Blurred Vineyard Background Image */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <picture className="w-full h-full block">
          <source media="(min-width: 768px)" srcSet="/assets/hero-desktop.jpg" />
          <img
            src="/assets/hero-mobile.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center scale-110 blur-[26px] brightness-[0.72]"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-[#282b1d]/30 to-black/45" />
      </div>

      {/* Top Centered Pertikan Brand Mark */}
      <div className="relative z-10 pt-1">
        <img
          src="/pertikan.svg"
          alt="Pertikan"
          className="h-[21px] md:h-[24px] w-auto brightness-0 invert"
        />
      </div>

      {/* Center Age Verification Prompt */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-[680px] mx-auto my-auto">
        <p className="font-editorial text-[16px] sm:text-[18px] md:text-[22px] leading-[1.35] text-white/95 mb-3 md:mb-4">
          We believe the best things reveal themselves in time.
        </p>

        <h1
          id="age-gate-title"
          className="font-editorial text-[42px] sm:text-[56px] md:text-[68px] leading-[1.05] text-white mb-8 md:mb-10"
        >
          Are you of legal drinking age?
        </h1>

        {!exitedUnderage ? (
          <div className="flex items-center justify-center gap-3.5 md:gap-4">
            <button
              type="button"
              onClick={onConfirmAge}
              className="min-w-[126px] md:min-w-[134px] h-[46px] md:h-[48px] px-7 rounded-full bg-[#4a4637]/65 hover:bg-[#5b5644]/85 border border-white/35 text-white text-[13.5px] md:text-[14px] font-normal transition-colors cursor-pointer whitespace-nowrap"
            >
              Yes, Enter
            </button>
            <button
              type="button"
              onClick={() => setExitedUnderage(true)}
              className="min-w-[114px] md:min-w-[122px] h-[46px] md:h-[48px] px-7 rounded-full bg-[#4a4637]/65 hover:bg-[#5b5644]/85 border border-white/35 text-white text-[13.5px] md:text-[14px] font-normal transition-colors cursor-pointer whitespace-nowrap"
            >
              No, Exit
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-[14px] text-white/85 max-w-[380px] leading-[1.6]">
              You must be of legal drinking age in your country of residence to explore the Pertikan
              wine cellar.
            </p>
            <button
              type="button"
              onClick={() => setExitedUnderage(false)}
              className="h-[42px] px-6 rounded-full bg-[#4a4637]/65 hover:bg-[#5b5644]/85 border border-white/35 text-white text-[13px] font-normal transition-colors cursor-pointer"
            >
              Back to Verification
            </button>
          </div>
        )}
      </div>

      {/* Bottom spacer for optical vertical centering */}
      <div className="relative z-10 h-[24px]" aria-hidden="true" />
    </div>
  );
}
