import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export interface UpcomingEventItem {
  id: string;
  day: string;
  month: string;
  year: string;
  title: string;
  category: string;
  city: string;
  postalAndArea: string;
  description: string;
  hours: string;
  highlights: string;
}

export const UPCOMING_EVENTS: UpcomingEventItem[] = [
  {
    id: 'autumn-genussmarkt-2026',
    day: '07',
    month: 'October',
    year: '2026',
    title: 'Autumn Genussmarkt',
    category: 'Tasting',
    city: 'Güssing',
    postalAndArea: '7512 Kirchfidisch',
    description: 'Regional producers and handcrafted specialties in the historic castle grounds',
    hours: '10:00 AM – 6:00 PM CET',
    highlights:
      'Open cellar pouring of Mitra (Mead of the Year 2026), Mitra Frizzante, and U&Me alongside seasonal Southern Burgenland blossom, forest, and creamed honeys.',
  },
];

export const UpcomingEventsSection: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEventItem | null>(null);

  return (
    <section
      id="events"
      aria-label="Upcoming Tastings, Gatherings, and Seasonal Celebrations"
      className="w-full bg-white border-b border-[#E5E5E5] py-[64px] md:py-[80px] px-6 md:px-[64px]"
    >
      <div className="max-w-[1312px] mx-auto flex flex-col items-center">
        {/* Kicker */}
        <p className="text-[11.5px] md:text-[12px] uppercase tracking-[0.06em] text-[#999999] text-center mb-[10px] md:mb-[12px]">
          EVENTS
        </p>

        {/* Main Editorial Heading */}
        <h2 className="font-editorial text-[28px] md:text-[44px] leading-[1.16] md:leading-[1.12] text-[#111111] text-center mb-[34px] md:mb-[44px]">
          <span className="md:hidden">
            Upcoming Tastings, Gatherings,
            <br />
            &amp; Seasonal Celebrations
          </span>
          <span className="hidden md:inline">
            Upcoming Tastings, Gatherings, &amp; Seasonal Celebrations
          </span>
        </h2>

        {/* Events List */}
        <div className="w-full flex flex-col gap-6">
          {UPCOMING_EVENTS.map((event) => (
            <article
              key={event.id}
              className="w-full border border-[#E8E8E8] bg-white"
            >
              {/* Desktop Horizontal Event Row */}
              <div className="hidden md:flex md:items-stretch">
                {/* Left Date Box */}
                <div className="w-[152px] shrink-0 border-r border-[#E8E8E8] flex flex-col items-center justify-center py-[32px] px-4 text-center">
                  <span className="font-editorial text-[38px] leading-[1.05] text-[#111111] mb-[8px]">
                    {event.day}
                  </span>
                  <span className="text-[12.5px] leading-[1.4] text-[#7A7A7A]">
                    {event.month}
                  </span>
                  <span className="text-[12.5px] leading-[1.4] text-[#7A7A7A] mt-[2px]">
                    {event.year}
                  </span>
                </div>

                {/* Right Event Content & Action */}
                <div className="flex-1 flex items-center justify-between px-[34px] py-[28px] gap-8">
                  <div className="flex flex-col items-start text-left">
                    {/* Title & Category Tag */}
                    <div className="flex items-center gap-[14px] mb-[12px]">
                      <h3 className="font-editorial text-[24px] leading-[1.15] text-[#111111]">
                        {event.title}
                      </h3>
                      <span className="inline-flex items-center justify-center px-[14px] py-[4px] rounded-full bg-[#EFEFEF] text-[#333333] text-[12px] leading-[1.2] font-normal">
                        {event.category}
                      </span>
                    </div>

                    {/* Location Pin & City */}
                    <div className="flex items-center gap-[6px] mb-[4px] text-[#111111]">
                      <svg
                        className="w-[13.5px] h-[13.5px] text-[#111111] shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
                      </svg>
                      <span className="text-[13px] leading-[1.4] text-[#111111] font-normal">
                        {event.city}
                      </span>
                    </div>

                    {/* Postal & Area */}
                    <p className="text-[12.5px] leading-[1.4] text-[#999999] mb-[14px]">
                      {event.postalAndArea}
                    </p>

                    {/* Description */}
                    <p className="text-[13px] leading-[1.5] text-[#888888]">
                      {event.description}
                    </p>
                  </div>

                  {/* Details Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="inline-flex items-center gap-[8px] text-[12.5px] text-[#333333] hover:text-black transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-[13px] h-[13px]" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Stacked Event Card */}
              <div className="md:hidden flex flex-col">
                {/* Top Date Row */}
                <div className="border-b border-[#EAEAEA] py-[18px] px-5 flex items-baseline justify-center gap-[10px] text-center">
                  <span className="font-editorial text-[22px] leading-none text-[#111111]">
                    {event.day}
                  </span>
                  <span className="text-[15px] leading-none text-[#888888] font-light">
                    {event.month}
                  </span>
                  <span className="text-[15px] leading-none text-[#888888] font-light">
                    {event.year}
                  </span>
                </div>

                {/* Mobile Card Body */}
                <div className="p-[22px] flex flex-col text-left">
                  {/* Title & Category Tag */}
                  <div className="flex items-center gap-[14px] mb-[16px]">
                    <h3 className="font-editorial text-[21px] leading-[1.15] text-[#111111]">
                      {event.title}
                    </h3>
                    <span className="inline-flex items-center justify-center px-[14px] py-[4px] rounded-full bg-[#EFEFEF] text-[#333333] text-[11.5px] leading-[1.2] font-normal shrink-0">
                      {event.category}
                    </span>
                  </div>

                  {/* Location Pin & City */}
                  <div className="flex items-center gap-[7px] mb-[5px] text-[#111111]">
                    <svg
                      className="w-[14px] h-[14px] text-[#111111] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
                    </svg>
                    <span className="text-[13.5px] leading-[1.4] text-[#111111] font-normal">
                      {event.city}
                    </span>
                  </div>

                  {/* Postal & Area */}
                  <p className="text-[13px] leading-[1.4] text-[#999999]">
                    {event.postalAndArea}
                  </p>

                  {/* Divider */}
                  <hr className="border-0 border-t border-[#EAEAEA] my-[18px]" />

                  {/* Description */}
                  <p className="text-[13px] leading-[1.55] text-[#888888] mb-[22px]">
                    {event.description}
                  </p>

                  {/* Centered Details Action */}
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="inline-flex items-center justify-center gap-[8px] text-[13.5px] text-[#222222] hover:text-black transition-colors cursor-pointer self-center py-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-[14px] h-[14px]" strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedEvent.title} Details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white border border-[#E5E5E5] max-w-[460px] w-full p-8 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] uppercase tracking-[0.05em] text-[#999999]">
                {selectedEvent.day} {selectedEvent.month} {selectedEvent.year} · {selectedEvent.hours}
              </p>
              <span className="inline-flex items-center justify-center px-[12px] py-[3px] rounded-full bg-[#EFEFEF] text-[#333333] text-[11px]">
                {selectedEvent.category}
              </span>
            </div>
            <h3 className="font-editorial text-[28px] leading-[1.15] text-[#111111] mb-2">
              {selectedEvent.title}
            </h3>
            <p className="text-[13px] text-[#333333] mb-4">
              {selectedEvent.city} · <span className="text-[#888888]">{selectedEvent.postalAndArea}</span>
            </p>
            <p className="text-[13px] leading-[1.6] text-[#666666] mb-3">
              {selectedEvent.description}.
            </p>
            <p className="text-[13px] leading-[1.6] text-[#666666] mb-6">
              {selectedEvent.highlights}
            </p>
            <div className="flex items-center justify-end gap-3">
              <a
                href={`mailto:pertikan@gmx.at?subject=${encodeURIComponent(
                  `RSVP / Inquiry: ${selectedEvent.title}`
                )}`}
                className="h-[40px] px-5 inline-flex items-center justify-center bg-black text-white rounded-full text-[12px] font-normal hover:bg-neutral-800 transition-colors"
              >
                Inquire via Email
              </a>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-5 h-[40px] border border-[#E0E0E0] rounded-full text-[12px] text-[#333333] hover:border-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
