function StoryParagraphs() {
  return (
    <div className="space-y-[18px] text-[13.5px] leading-[1.68] text-[#333333]">
      <p>
        There, at the edge of the high mountain pastures of Aligudarz, his father taught him a
        quiet ethic of stewardship that would guide every season of his life: “Heivanat be daste to
        negah mikonan” — the animals look to your hand. When you care for living creatures, your
        patience, humility, and restraint determine their survival. You never take more than the
        season offers; you never rush what nature refines slowly.
      </p>
      <p>
        Decades later, that dawn lesson found a new home in the rolling hills and wild meadows of
        Southern Burgenland, Austria. Drawn by the region’s untouched biodiversity and ancient
        winemaking culture, Mohammad established Pertikan Beekeeping in Grosspetersdorf.
      </p>
      <p>
        Today, whether tending wooden hives at first light, harvesting raw blossom honey, or
        co-fermenting wild Burgenland Uhudler grapes with 18-month aged mead, the covenant remains
        unbroken: listen to the hive, honor the terroir, and let time compose the wine.
      </p>
    </div>
  );
}

function FounderSignature() {
  return (
    <div className="border-t border-[#EEEEEE] pt-[24px] mt-[32px] flex items-center gap-[16px]">
      <div
        aria-hidden="true"
        className="w-[52px] h-[52px] rounded-full checkerboard-avatar shrink-0"
      />
      <div>
        <p className="font-editorial text-[20px] leading-[1.2] text-[#111111] mb-[3px]">
          Mohammad Akbari
        </p>
        <p className="text-[12.5px] text-[#8C8C8C]">
          Founder &amp; Master Apiarist . Pertikan Beekiping
        </p>
      </div>
    </div>
  );
}

export function OurStoryPage() {
  return (
    <div data-testid="our-story-page" className="w-full bg-white">
      {/* Desktop 3-Row Alternating 2-Column Split Grid (matching our_story_f19c1733.png) */}
      <div className="hidden lg:block w-full border-b border-[#EEEEEE]">
        {/* Row 1: Narrative Left | Checkerboard Right */}
        <section
          aria-label="Our Story Part 1"
          className="grid grid-cols-2 border-b border-[#EEEEEE]"
        >
          <div className="border-r border-[#EEEEEE] px-[64px] py-[68px] flex flex-col justify-center">
            <div className="max-w-[560px]">
              <h1 className="font-editorial text-[42px] leading-[1.12] text-[#111111] mb-[22px]">
                It&apos;s 5 a.m. in Aligudarz.
              </h1>
              <p className="font-editorial text-[22px] leading-[1.38] text-[#111111] mb-[28px]">
                Before the sun clears the jagged limestone ridges of the Zagros Mountains, a young
                Mohammad Akbari stands beside his father in the cold morning stillness.
              </p>
              <StoryParagraphs />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="w-full h-full min-h-[540px] checkerboard-placeholder"
          />
        </section>

        {/* Row 2: Checkerboard Left | Narrative Right */}
        <section
          aria-label="Our Story Part 2"
          className="grid grid-cols-2 border-b border-[#EEEEEE]"
        >
          <div
            aria-hidden="true"
            className="w-full h-full min-h-[480px] border-r border-[#EEEEEE] checkerboard-placeholder"
          />
          <div className="px-[64px] py-[68px] flex flex-col justify-center">
            <div className="max-w-[560px]">
              <StoryParagraphs />
            </div>
          </div>
        </section>

        {/* Row 3: Narrative + Signature Left | Checkerboard Right */}
        <section aria-label="Our Story Part 3" className="grid grid-cols-2">
          <div className="border-r border-[#EEEEEE] px-[64px] py-[68px] flex flex-col justify-center">
            <div className="max-w-[560px]">
              <StoryParagraphs />
              <FounderSignature />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="w-full h-full min-h-[540px] checkerboard-placeholder"
          />
        </section>
      </div>

      {/* Mobile & Tablet Stacked Alternating Layout (matching our_story-1_b798a2c8.png & our_story-2_706cccd1.png) */}
      <div className="lg:hidden w-full border-b border-[#EEEEEE]">
        {/* Block 1: Top Checkerboard Visual */}
        <div
          aria-hidden="true"
          className="w-full h-[360px] sm:h-[440px] checkerboard-placeholder border-b border-[#EEEEEE]"
        />

        {/* Block 2: First Story Section */}
        <section className="px-6 md:px-10 py-10 md:py-12 border-b border-[#EEEEEE]">
          <h1 className="font-editorial text-[36px] md:text-[42px] leading-[1.12] text-[#111111] mb-[18px]">
            It&apos;s 5 a.m. in Aligudarz.
          </h1>
          <p className="font-editorial text-[20px] md:text-[22px] leading-[1.38] text-[#111111] mb-[24px]">
            Before the sun clears the jagged limestone ridges of the Zagros Mountains, a young
            Mohammad Akbari stands beside his father in the cold morning stillness.
          </p>
          <StoryParagraphs />
        </section>

        {/* Block 3: Second Checkerboard Visual */}
        <div
          aria-hidden="true"
          className="w-full h-[360px] sm:h-[440px] checkerboard-placeholder border-b border-[#EEEEEE]"
        />

        {/* Block 4: Second Story Section */}
        <section className="px-6 md:px-10 py-10 md:py-12 border-b border-[#EEEEEE]">
          <StoryParagraphs />
        </section>

        {/* Block 5: Third Checkerboard Visual */}
        <div
          aria-hidden="true"
          className="w-full h-[360px] sm:h-[440px] checkerboard-placeholder border-b border-[#EEEEEE]"
        />

        {/* Block 6: Third Story Section + Founder Signature */}
        <section className="px-6 md:px-10 py-10 md:py-12">
          <StoryParagraphs />
          <FounderSignature />
        </section>
      </div>
    </div>
  );
}
