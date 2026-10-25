export type AppRoute = 'home' | 'our-story' | 'contact-us' | 'find-us' | 'age-confirmation' | '404';

export interface ContactInquiryInput {
  name: string;
  phoneNumber: string;
  companyName: string;
  email: string;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ContactInquiryInput, string>>;
}

/**
 * Resolves the active application route from a URL pathname and hash.
 */
export function resolveRouteFromLocation(pathname: string, hash = ''): AppRoute {
  const cleanHash = hash.replace(/^#\/?/, '').trim().toLowerCase();
  const cleanPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';

  if (cleanPath === '/our-story' || cleanHash === 'our-story') {
    return 'our-story';
  }
  if (cleanPath === '/contact-us' || cleanPath === '/contact' || cleanHash === 'contact-us') {
    return 'contact-us';
  }
  if (cleanPath === '/find-us' || cleanHash === 'find-us') {
    return 'find-us';
  }
  if (cleanPath === '/age-confirmation' || cleanHash === 'age-confirmation') {
    return 'age-confirmation';
  }
  if (cleanPath === '/404' || cleanHash === '404') {
    return '404';
  }
  if (cleanPath === '/' || cleanPath === '/index.html') {
    return 'home';
  }
  // Any other route (such as /events, /blog, or unknown URLs) renders the 404 page
  return '404';
}

/**
 * Maps an AppRoute to its canonical URL path.
 */
export function getPathForRoute(route: AppRoute): string {
  switch (route) {
    case 'home':
      return '/';
    case 'our-story':
      return '/our-story';
    case 'contact-us':
      return '/contact-us';
    case 'find-us':
      return '/find-us';
    case 'age-confirmation':
      return '/age-confirmation';
    case '404':
      return '/404';
  }
}

/**
 * Validates the Business & Trade Inquiries form on the Contact Us page.
 * Required fields marked with `*` in the design: Name *, Phone Number *, Your Email *.
 */
export function validateContactInquiry(input: ContactInquiryInput): ContactValidationResult {
  const errors: Partial<Record<keyof ContactInquiryInput, string>> = {};

  if (!input.name.trim()) {
    errors.name = 'Please enter your name.';
  }
  if (!input.phoneNumber.trim()) {
    errors.phoneNumber = 'Please enter your phone number.';
  }
  const trimmedEmail = input.email.trim();
  if (!trimmedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
