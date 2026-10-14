import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultSiteOrigin, resolveSiteOrigin } from '../../src/lib/site-origin';
import { productionOriginSchema } from '../../src/lib/site-schema';

test('an absent hosting override retains the verified Cloudflare production origin', () => {
  assert.equal(defaultSiteOrigin, 'https://forge-portfolio.digivism9.workers.dev');
  assert.equal(resolveSiteOrigin(), defaultSiteOrigin);
  assert.equal(resolveSiteOrigin(undefined), defaultSiteOrigin);
});

test('safe HTTPS origins normalize casing, default ports, and an optional root slash', () => {
  for (const [override, expected] of [
    ['https://forgetopia.github.io', 'https://forgetopia.github.io'],
    ['https://forgetopia.github.io/', 'https://forgetopia.github.io'],
    ['https://FORGETOPIA.GITHUB.IO:443/', 'https://forgetopia.github.io'],
    ['https://example.test:8443/', 'https://example.test:8443'],
  ]) {
    assert.equal(resolveSiteOrigin(override), expected);
    assert.equal(productionOriginSchema.parse(override), expected, 'Authoring and build-time validation must agree');
  }
});

test('unsafe or malformed hosting overrides fail validation instead of falling back silently', () => {
  const invalid = [
    '', ' ', 'not a URL', 'forgetopia.github.io', '//forgetopia.github.io',
    'http://forgetopia.github.io', 'javascript:alert(1)', 'data:text/plain,test',
    'https://name:password@forgetopia.github.io', 'https://name@forgetopia.github.io',
    'https://forgetopia.github.io/forge-portfolio/', 'https://forgetopia.github.io/work/',
    'https://forgetopia.github.io/.', 'https://forgetopia.github.io/../',
    'https://forgetopia.github.io?tracking=1', 'https://forgetopia.github.io?',
    'https://forgetopia.github.io/#fragment', 'https://forgetopia.github.io/#',
    ' https://forgetopia.github.io', 'https://forgetopia.github.io ',
    'https://forgetopia.github.io\n', 'https://forgetopia.github.io\t/',
    'https://forgetopia.github.io\u0000', 'https://forgetopia.github.io\u007f',
    'https:\\forgetopia.github.io', 'https://forgetopia.github.io\\work',
    'https:///forgetopia.github.io', 'https://',
  ];
  for (const override of invalid) {
    assert.throws(() => resolveSiteOrigin(override), /HTTPS|FORGE_SITE_ORIGIN|origin/i, JSON.stringify(override));
    assert.doesNotThrow(() => productionOriginSchema.safeParse(override));
    assert.equal(productionOriginSchema.safeParse(override).success, false, JSON.stringify(override));
  }
});
