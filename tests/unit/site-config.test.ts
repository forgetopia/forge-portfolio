import assert from 'node:assert/strict';
import test from 'node:test';
import { site } from '../../src/data/site';
import {
  buildMailtoLink,
  collaborationAvailabilityLabel,
  productionOriginSchema,
  siteConfigSchema,
  socialLinkSchema,
} from '../../src/lib/site-schema';

test('the public brand has no fabricated personal identity, services, contacts, or availability', () => {
  for (const value of [site.creatorDisplayName, site.professionalTitle, site.studioName, site.shortBio, site.contactEmail, site.profileImage]) {
    assert.equal(value, null);
  }
  assert.deepEqual(site.socialLinks, []);
  assert.deepEqual(site.creativeServices, []);
  assert.deepEqual(site.capabilities, []);
  assert.equal(site.collaborationAvailability, 'unspecified');
  assert.equal(site.productionOrigin, 'https://forge-portfolio.digivism9.workers.dev');
  assert.match(site.about.workflowIntroduction, /typical|outline/i);
  assert.match(site.about.workflowIntroduction, /not a record/i);
  assert.equal(site.about.productionWorkflow.length, 4);
  assert.ok(site.creativeDisciplines.includes('Cinematic AI Filmmaking'));
});

test('unconfigured optional profile fields have usable defaults alongside editable brand content', () => {
  const config = siteConfigSchema.parse({ name: site.name, tagline: site.tagline, description: site.description, about: site.about });
  for (const value of [config.creatorDisplayName, config.professionalTitle, config.studioName, config.shortBio, config.profileImage, config.contactEmail, config.collaborationIntroduction, config.productionOrigin]) {
    assert.equal(value, null);
  }
  assert.deepEqual(config.creativeDisciplines, []);
  assert.deepEqual(config.creativeServices, []);
  assert.deepEqual(config.capabilities, []);
  assert.deepEqual(config.socialLinks, []);
  assert.equal(config.collaborationAvailability, 'unspecified');
  assert.equal(buildMailtoLink(config.contactEmail, config.contactSubject), null);
  assert.equal(collaborationAvailabilityLabel(config.collaborationAvailability), null);
});

test('approved identity and contact fixture fields accept data-driven profile content', () => {
  const config = siteConfigSchema.parse({
    ...site,
    creatorDisplayName: 'Test Creator',
    professionalTitle: 'Test Visual Artist',
    studioName: 'Test Studio',
    shortBio: 'A biography fixture, not public creator information.',
    contactEmail: 'creator+collaboration@example.test',
    creativeServices: [{ title: 'Test service', description: 'Owner-approved service fixture.' }],
    capabilities: [{ title: 'Test capability', description: 'Owner-approved capability fixture.' }],
    socialLinks: [{ label: 'Portfolio fixture', url: 'https://portfolio.example.test/artist' }],
    collaborationAvailability: 'limited',
    collaborationIntroduction: 'An introduction fixture.',
    profileImage: {
      src: '/placeholders/portrait.svg', alt: 'A portrait placeholder used only for a configuration test',
      width: 640, height: 896, orientation: 'portrait', placeholder: true,
    },
  });
  assert.equal(config.creatorDisplayName, 'Test Creator');
  assert.equal(config.profileImage?.orientation, 'portrait');
  assert.equal(config.creativeServices.length, 1);
  assert.equal(config.capabilities.length, 1);
  assert.equal(collaborationAvailabilityLabel(config.collaborationAvailability), 'Limited collaboration availability');
});

test('mailto links encode address parts and the subject without allowing extra email headers', () => {
  const href = buildMailtoLink('creator+collaboration@example.test', 'FORGE: Film & art? #1');
  assert.equal(href, 'mailto:creator%2Bcollaboration@example.test?subject=FORGE%3A%20Film%20%26%20art%3F%20%231');
  assert.equal(new URL(href!).searchParams.get('subject'), 'FORGE: Film & art? #1');
  assert.throws(() => buildMailtoLink('invalid-address', 'Collaboration'));
  assert.throws(() => buildMailtoLink('creator@example.test', 'Collaboration\r\nBcc: other@example.test'));
  assert.throws(() => buildMailtoLink('creator@example.test', ''));
});

test('profile URLs reject unsafe protocols, credentials, and malformed strings without throwing', () => {
  for (const url of ['not a URL', '%invalid', '', 'http://example.test/artist', '//example.test/artist', 'javascript:alert(1)', 'data:text/plain,test', 'https://name:password@example.test/artist']) {
    assert.doesNotThrow(() => socialLinkSchema.safeParse({ label: 'Profile fixture', url }));
    assert.equal(socialLinkSchema.safeParse({ label: 'Profile fixture', url }).success, false, url);
  }
  assert.equal(socialLinkSchema.safeParse({ label: 'Profile fixture', url: 'https://example.test/artist' }).success, true);
});

test('production origins accept HTTPS roots and reject URLs containing paths or sensitive components', () => {
  assert.equal(productionOriginSchema.safeParse(site.productionOrigin).success, true);
  assert.equal(productionOriginSchema.safeParse('https://example.test/').success, true);
  for (const url of ['not a URL', '', 'http://example.test', 'https://example.test/work/', 'https://example.test/?token=value', 'https://example.test/#fragment', 'https://name:password@example.test/']) {
    assert.doesNotThrow(() => productionOriginSchema.safeParse(url));
    assert.equal(productionOriginSchema.safeParse(url).success, false, url);
  }
});

test('invalid identity metadata fails authoring validation instead of producing broken public content', () => {
  for (const change of [
    { creatorDisplayName: '' }, { professionalTitle: ' ' }, { contactEmail: 'invalid' },
    { contactEmail: 'creator@example.test?subject=injection' },
    { creativeServices: [{ title: '', description: 'Description' }] },
    { capabilities: [{ title: 'Capability', description: '' }] },
    { profileImage: { src: 'javascript:alert(1)', alt: 'Invalid', width: 1, height: 2, orientation: 'portrait', placeholder: false } },
    { socialLinks: [{ label: '', url: 'https://example.test' }] },
    { collaborationAvailability: 'always available' }, { contactSubject: 'Subject\nBcc: other@example.test' },
    { about: { ...site.about, productionWorkflow: [] } }, { unexpected: true },
  ]) {
    assert.equal(siteConfigSchema.safeParse({ ...site, ...change }).success, false, JSON.stringify(change));
  }
  assert.equal(collaborationAvailabilityLabel('open'), 'Open to collaboration');
  assert.equal(collaborationAvailabilityLabel('unavailable'), 'Currently unavailable for new collaborations');
});
