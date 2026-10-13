import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalURL, pageMetadata, sitemapXML } from '../../src/lib/seo';

const origin = 'https://forge-portfolio.digivism9.workers.dev';
const site = { name: 'FORGE', tagline: 'Visual Universe', productionOrigin: origin };

test('canonical metadata uses the verified production origin and excludes query parameters and fragments', () => {
  assert.equal(canonicalURL(origin, '/work/the-long-night/?campaign=test#film'), `${origin}/work/the-long-night/`);
  assert.equal(canonicalURL(origin, '//untrusted.test/path/'), `${origin}/untrusted.test/path/`);
  assert.equal(canonicalURL(null, '/work/'), undefined);
  const metadata = pageMetadata({ site, title: 'The Long Night', description: 'A labeled sample project.', path: '/work/the-long-night/' });
  assert.equal(metadata.title, 'The Long Night — FORGE');
  assert.equal(metadata.canonical, `${origin}/work/the-long-night/`);
  assert.equal(metadata.description, 'A labeled sample project.');
});

test('project social metadata preserves cover dimensions and truthful placeholder alternative text', () => {
  const shareImage = { src: '/placeholders/portrait.svg', alt: 'Portrait placeholder; no original image supplied.', width: 1000, height: 1400, orientation: 'portrait' as const, placeholder: true };
  const metadata = pageMetadata({ site, title: 'Sample', description: 'Sample details.', path: '/work/sample/', shareImage });
  assert.equal(metadata.imageURL, `${origin}/placeholders/portrait.svg`);
  assert.deepEqual(metadata.shareImage, shareImage);
  assert.equal(pageMetadata({ site: { ...site, productionOrigin: null }, description: 'Unconfigured origin.', path: '/', shareImage }).imageURL, undefined);
});

test('sitemap serializes only caller-supplied public paths and never invents an origin', () => {
  const xml = sitemapXML(origin, ['/', '/work/', '/work/the-long-night/', '/work/']);
  assert.equal((xml.match(/<url>/g) ?? []).length, 3);
  assert.ok(xml.includes(`<loc>${origin}/work/the-long-night/</loc>`));
  assert.ok(!xml.includes('lastmod'));
  assert.equal((sitemapXML(null, ['/']).match(/<url>/g) ?? []).length, 0);
});
