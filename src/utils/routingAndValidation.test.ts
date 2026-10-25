import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPathForRoute,
  resolveRouteFromLocation,
  validateContactInquiry,
} from './routingAndValidation';

test('resolveRouteFromLocation maps known routes and unknown paths to 404', () => {
  assert.equal(resolveRouteFromLocation('/'), 'home');
  assert.equal(resolveRouteFromLocation('/our-story'), 'our-story');
  assert.equal(resolveRouteFromLocation('/contact-us'), 'contact-us');
  assert.equal(resolveRouteFromLocation('/find-us'), 'find-us');
  assert.equal(resolveRouteFromLocation('/age-confirmation'), 'age-confirmation');
  assert.equal(resolveRouteFromLocation('/404'), '404');
  assert.equal(resolveRouteFromLocation('/events'), '404');
  assert.equal(resolveRouteFromLocation('/blog'), '404');
  assert.equal(resolveRouteFromLocation('/unknown-vintage'), '404');
  assert.equal(getPathForRoute('our-story'), '/our-story');
});

test('validateContactInquiry enforces required fields Name, Phone Number, and Your Email', () => {
  const emptyRes = validateContactInquiry({
    name: '',
    phoneNumber: '',
    companyName: '',
    email: '',
    message: '',
  });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.phoneNumber);
  assert.ok(emptyRes.errors.email);

  const validRes = validateContactInquiry({
    name: 'Lukas Steiner',
    phoneNumber: '+43 664 1234567',
    companyName: 'Hotel Sacher Wien',
    email: 'sommelier@sacher.com',
    message: 'Inquiring about 2026 Mitra & U&Me cellar allocations.',
  });
  assert.equal(validRes.valid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);
});
