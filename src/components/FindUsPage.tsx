import { Clock, Globe, MapPin, Phone } from 'lucide-react';
import { AppRoute } from '../utils/routingAndValidation';

interface OpeningHourRow {
  days: string;
  hours: string;
}

interface PartnerOutlet {
  name: string;
  street: string;
  city: string;
  phone: string;
  website: string;
  websiteHref: string;
  hours: OpeningHourRow[];
}

const MEAD_PARTNERS: PartnerOutlet[] = [
  {
    name: 'Dürnbeck Beverage Trade',
    street: 'Greutgasse 2',
    city: '7512 Kirchfidisch',
    phone: '+43 664 4178970',
    website: 'getraenke-duernbeck.at',
    websiteHref: 'https://getraenke-duernbeck.at',
    hours: [
      { days: 'Mon – Fri :', hours: '8:00 – 17:00' },
      { days: 'Sat :', hours: '8:00 – 12:00' },
      { days: 'Sun :', hours: 'Closed' },
    ],
  },
  {
    name: 'CONCLUSIUS',
    street: 'Clusiusweg 2/1',
    city: '7540 Güssing',
    phone: '+43 3322 20602',
    website: 'conclusius.at',
    websiteHref: 'https://conclusius.at',
    hours: [
      { days: 'Wed – Thu :', hours: '9:00 – 12:30 & 14:00 – 18:00' },
      { days: 'Fri :', hours: '9:00 – 12:30 & 14:00 – 20:00' },
      { days: 'Sat :', hours: '9:00 – 13:00' },
      { days: 'Sun – Tue :', hours: 'Closed' },
    ],
  },
  {
    name: 'Wine & Beverage Retailer Markus Friedl',
    street: 'Wiener Straße 17',
    city: '7350 Oberpullendorf',
    phone: '+43 676 4008013',
    website: 'wine specialist retailer.at',
    websiteHref: 'mailto:pertikan@gmx.at',
    hours: [
      { days: 'Mon – Thu :', hours: '10:00 – 13:00 & 14:00 – 18:00' },
      { days: 'Fri :', hours: '10:00 – 19:00' },
      { days: 'Sat :', hours: '9:00 – 15:00' },
      { days: 'Sun :', hours: 'Closed (wholesale market by arrangement)' },
    ],
  },
  {
    name: 'Weinwerk Burgenland',
    street: 'Upper Main Street 31',
    city: '7100 Neusiedl am See',
    phone: '+43 2167 20705',
    website: 'weinwerk-burgenland.at',
    websiteHref: 'https://weinwerk-burgenland.at',
    hours: [
      { days: 'Tue – Wed :', hours: '10:30 – 19:00' },
      { days: 'Thu – Sat :', hours: '10:30 – 20:00' },
      { days: 'Sun :', hours: '10:30 – 19:00' },
      { days: 'Mon :', hours: 'Closed' },
    ],
  },
  {
    name: 'World Honey EU',
    street: 'Hainburger Straße 68-70/45/1',
    city: '1030 Vienna',
    phone: '+43 699 11581331',
    website: 'welthonig.at',
    websiteHref: 'https://welthonig.at',
    hours: [
      { days: 'Tue – Fri :', hours: '9:00 – 12:00 & 14:00 – 18:00' },
      { days: 'Sat – Mon :', hours: 'Closed' },
    ],
  },
];

const APIARY_PARTNERS: PartnerOutlet[] = [
  {
    name: 'BODY NICE supplement shop',
    street: 'Annenstraße 10',
    city: '8020 Graz',
    phone: '+43 688 64673847',
    website: 'bodynicesupplement.com',
    websiteHref: 'https://bodynicesupplement.com',
    hours: [
      { days: 'Mon – Fri :', hours: '10:30 – 19:00' },
      { days: 'Sat :', hours: '11:00 – 17:00' },
      { days: 'Sun :', hours: 'Closed' },
    ],
  },
];

function PartnerOutletCard({ outlet }: { outlet: PartnerOutlet }) {
  return (
    <article className="border border-[#EEEEEE] bg-white p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-editorial text-[22px] md:text-[24px] leading-[1.2] text-[#111111] mb-4">
          {outlet.name}
        </h3>

        {/* Street & City */}
        <div className="pb-4 border-b border-[#F2F2F2]">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#111111] mb-1">
            <MapPin className="w-[13px] h-[13px] text-[#333333] shrink-0" />
            <span>{outlet.street}</span>
          </div>
          <p className="text-[12.5px] text-[#8C8C8C] pl-[21px]">{outlet.city}</p>
        </div>

        {/* Phone & Website */}
        <div className="py-4 space-y-2 text-[12.5px] text-[#222222]">
          <div className="flex items-center gap-2">
            <Phone className="w-[13px] h-[13px] text-[#333333] shrink-0" />
            <a href={`tel:${outlet.phone.replace(/\s+/g, '')}`} className="hover:underline">
              {outlet.phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-[13px] h-[13px] text-[#333333] shrink-0" />
            <a
              href={outlet.websiteHref}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {outlet.website}
            </a>
          </div>
        </div>
      </div>

      {/* Opening Hours Box */}
      <div className="bg-[#F6F6F6] p-4 mt-1">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#111111] mb-2.5">
          <Clock className="w-[13px] h-[13px] text-[#333333] shrink-0" />
          <span>Opening Hours</span>
        </div>
        <dl className="space-y-1.5 text-[11.5px] tabular-nums">
          {outlet.hours.map((row) => (
            <div key={row.days} className="flex items-baseline justify-between gap-2 text-[#8C8C8C]">
              <dt className="shrink-0">{row.days}</dt>
              <dd className="text-right">{row.hours}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

interface FindUsPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function FindUsPage({ onNavigate }: FindUsPageProps) {
  return (
    <div data-testid="find-us-page" className="w-full bg-white">
      {/* Main Content Container */}
      <div className="px-6 md:px-10 lg:px-[64px] pt-10 md:pt-14 pb-20 border-b border-[#EEEEEE]">
        {/* Header Section */}
        <div className="pb-8 border-b border-[#EEEEEE]">
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#999999] mb-2.5">
            FIND US
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <h1 className="font-editorial text-[40px] sm:text-[46px] lg:text-[54px] leading-[1.05] text-[#111111]">
              Sales outlets &amp; partners
            </h1>
            <p className="text-[13px] leading-[1.6] text-[#8C8C8C] max-w-[460px] lg:pb-1">
              Explore our vintages, meads, and seasonal raw honey directly from the apiary or
              through our curated selection of regional partners and merchants.
            </p>
          </div>
        </div>

        {/* Category 1: Mead, Cuvée & Sparkling */}
        <section aria-labelledby="mead-partners-heading" className="pt-9">
          <h2
            id="mead-partners-heading"
            className="font-editorial text-[28px] md:text-[32px] leading-[1.15] text-[#111111] mb-6"
          >
            Mead, Cuvée &amp; Sparkling
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {MEAD_PARTNERS.map((outlet) => (
              <PartnerOutletCard key={outlet.name} outlet={outlet} />
            ))}
          </div>
        </section>

        {/* Category 2: Apiary Harvests */}
        <section aria-labelledby="apiary-partners-heading" className="pt-12">
          <h2
            id="apiary-partners-heading"
            className="font-editorial text-[28px] md:text-[32px] leading-[1.15] text-[#111111] mb-6"
          >
            Apiary Harvests
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {APIARY_PARTNERS.map((outlet) => (
              <PartnerOutletCard key={outlet.name} outlet={outlet} />
            ))}
          </div>
        </section>
      </div>

      {/* Wholesale Partner Callout Section */}
      <section
        aria-label="Partner With Us"
        className="w-full bg-white py-[140px] md:py-[180px] px-6 text-center"
      >
        <div className="max-w-[680px] mx-auto flex flex-col items-center">
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#999999] mb-3">
            PARTNER WITH US
          </p>
          <h2 className="font-editorial text-[36px] md:text-[52px] leading-[1.08] text-[#111111] mb-4">
            Interested in Offering Pertikan?
          </h2>
          <p className="text-[13px] leading-[1.65] text-[#A6A6A6] max-w-[500px] mb-8">
            We collaborate closely with independent sommeliers, fine dining cellars, and boutique
            purveyors on allocated seasonal batches.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('contact-us')}
            className="h-[42px] px-[26px] rounded-full bg-black text-white text-[12px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Inquire for Wholesale
          </button>
        </div>
      </section>
    </div>
  );
}
