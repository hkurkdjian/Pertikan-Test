import { useState } from 'react';
import {
  ContactInquiryInput,
  validateContactInquiry,
} from '../utils/routingAndValidation';

export function ContactUsPage() {
  const [formData, setFormData] = useState<ContactInquiryInput>({
    name: '',
    phoneNumber: '',
    companyName: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInquiryInput, string>>>({});
  const [submittedInquiry, setSubmittedInquiry] = useState<ContactInquiryInput | null>(null);

  const handleChange = (field: keyof ContactInquiryInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateContactInquiry(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmittedInquiry(formData);
  };

  return (
    <div
      data-testid="contact-us-page"
      className="w-full bg-white border-b border-[#EEEEEE] grid grid-cols-1 lg:grid-cols-2 lg:min-h-[780px]"
    >
      {/* Left Column: Editorial Contact Details */}
      <section
        aria-label="Apiary Contact Information"
        className="border-b lg:border-b-0 lg:border-r border-[#EEEEEE] px-6 md:px-10 lg:px-[64px] py-12 md:py-16 lg:py-[180px] flex flex-col justify-center"
      >
        <div className="max-w-[460px]">
          <h1 className="font-editorial text-[26px] md:text-[32px] leading-[1.15] text-[#111111] mb-4">
            From the Hive to Your Table.
          </h1>
          <p className="text-[13.5px] leading-[1.68] text-[#8C8C8C] pb-7 border-b border-[#EEEEEE] mb-7">
            Whether you are curating a wine list, seeking private cellar allocations of our
            18-month aged Uhudler mead, or inquiring about seasonal raw blossom honey, we welcome
            conversations with sommeliers, hospitality partners, and private collectors.
          </p>

          <address className="not-italic text-[14px] leading-[1.65] text-[#222222] mb-4">
            Burgerstraße 36,
            <br />
            A-7503 Grosspetersdorf,
          </address>

          <div className="text-[14px] leading-[1.65] text-[#222222] mb-4">
            <p>+43 681 2051 5033</p>
            <p>+43 660 8280 418</p>
          </div>

          <a
            href="mailto:pertikan@gmx.at"
            className="text-[14px] text-[#222222] underline underline-offset-4 hover:text-black"
          >
            pertikan@gmx.at
          </a>
        </div>
      </section>

      {/* Right Column: Business & Trade Inquiries Form */}
      <section
        aria-label="Business and Trade Inquiries"
        className="px-6 md:px-10 lg:px-[64px] py-12 md:py-16 lg:py-[150px] flex flex-col justify-center"
      >
        <div className="w-full max-w-[540px]">
          <h2 className="font-editorial text-[26px] md:text-[30px] leading-[1.15] text-[#111111] mb-7">
            Business &amp; Trade Inquiries
          </h2>

          {submittedInquiry ? (
            <div
              role="status"
              data-testid="contact-inquiry-confirmation"
              className="border border-[#E5E5E5] rounded-[20px] p-6 bg-[#FAFAFA]"
            >
              <p className="font-editorial text-[22px] text-[#111111] mb-2">
                Thank you, {submittedInquiry.name}.
              </p>
              <p className="text-[13px] leading-[1.6] text-[#666666] mb-5">
                Your trade inquiry has been received by our Grosspetersdorf cellar team. We will
                respond via{' '}
                <span className="text-[#111111] font-medium">{submittedInquiry.email}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmittedInquiry(null);
                  setFormData({
                    name: '',
                    phoneNumber: '',
                    companyName: '',
                    email: '',
                    message: '',
                  });
                }}
                className="h-[38px] px-5 rounded-full bg-black text-white text-[12px] hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Row 1: Name * & Phone Number * */}
              <div className="grid grid-cols-2 gap-4 md:gap-5">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-[13px] text-[#222222] mb-2"
                  >
                    Name <span className="text-[#222222] ml-0.5">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    className="w-full h-[42px] md:h-[44px] rounded-full border border-[#E5E5E5] px-4 text-[13px] text-[#111111] focus:outline-none focus:border-black transition-colors"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-[13px] text-[#222222] mb-2"
                  >
                    Phone Number <span className="text-[#222222] ml-0.5">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    aria-invalid={Boolean(errors.phoneNumber)}
                    className="w-full h-[42px] md:h-[44px] rounded-full border border-[#E5E5E5] px-4 text-[13px] text-[#111111] focus:outline-none focus:border-black transition-colors"
                  />
                  {errors.phoneNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.phoneNumber}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Company Name & Your Email * */}
              <div className="grid grid-cols-2 gap-4 md:gap-5">
                <div>
                  <label
                    htmlFor="contact-company"
                    className="block text-[13px] text-[#222222] mb-2"
                  >
                    Company Name
                  </label>
                  <input
                    id="contact-company"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full h-[42px] md:h-[44px] rounded-full border border-[#E5E5E5] px-4 text-[13px] text-[#111111] focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-[13px] text-[#222222] mb-2"
                  >
                    Your Email <span className="text-[#222222] ml-0.5">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    className="w-full h-[42px] md:h-[44px] rounded-full border border-[#E5E5E5] px-4 text-[13px] text-[#111111] focus:outline-none focus:border-black transition-colors"
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Message */}
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-[13px] text-[#222222] mb-2"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="w-full min-h-[136px] rounded-[20px] border border-[#E5E5E5] p-4 text-[13px] text-[#111111] focus:outline-none focus:border-black transition-colors resize-y"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="h-[42px] px-7 rounded-full bg-black text-white text-[12.5px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
