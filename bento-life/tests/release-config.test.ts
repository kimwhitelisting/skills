import { describe, expect, it } from 'vitest';
import { assertReleaseConfig } from '../scripts/release-config.ts';

const configured = () => ({
  VITE_SUPABASE_URL: 'https://testproject.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_test_value',
  VITE_AUTH_REDIRECT_URL: 'https://play.release-demo.com/account/return',
});

describe('release-only account configuration', () => {
  it('permits guest development, ordinary builds and standalone previews without cloud settings', () => {
    for (const mode of ['development', 'production', 'preview-page', 'test']) {
      expect(() => assertReleaseConfig(mode, {})).not.toThrow();
    }
  });
  it('accepts public client configuration without querying or proving server readiness', () => {
    expect(() => assertReleaseConfig('release', configured())).not.toThrow();
  });
  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_AUTH_REDIRECT_URL'] as const)('rejects missing %s', name => {
    expect(() => assertReleaseConfig('release', { ...configured(), [name]: '' })).toThrow();
  });
  it.each(['http://testproject.supabase.co', 'https://testproject.supabase.co/rest/v1', 'https://testproject.supabase.co.attacker.test', 'https://user:pass@testproject.supabase.co'])('rejects malformed or unsupported project URL %s', value => {
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_SUPABASE_URL: value })).toThrow('VITE_SUPABASE_URL');
  });
  const serviceRole = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.synthetic`;
  it.each(['sb_secret_synthetic_do_not_ship', serviceRole, 'sb_publishable_', 'sb_publishable_has whitespace', 'not-a-key'])('rejects unsupported keys without including their value in the error (%#)', value => {
    let message = '';
    try { assertReleaseConfig('release', { ...configured(), VITE_SUPABASE_PUBLISHABLE_KEY: value }); }
    catch (error) { message = (error as Error).message; }
    expect(message).not.toBe('');
    expect(message).not.toContain(value);
  });
  it('rejects accidentally exposed secret variables as well as the selected public key', () => {
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_SUPABASE_SERVICE_ROLE_KEY: serviceRole })).toThrow('서버 비밀');
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_EXTRA: '  sb_secret_synthetic  ' })).toThrow('서버 비밀');
  });
  it('rejects alternate public variables even if a credential is not recognizable by prefix', () => {
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_TOKEN: serviceRole })).toThrow('세 가지');
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_UNUSED: '' })).toThrow('세 가지');
  });
  it.each([
    'https://macbook.tail-example.ts.net:8443/',
    'https://192.168.1.5/', 'https://10.0.0.5/', 'https://172.16.0.5/', 'https://100.64.0.5/',
    'https://8.8.8.8/', 'https://[::1]/', 'https://[2001:4860:4860::8888]/',
    'https://preview.local/', 'https://preview.localhost/', 'https://preview.internal/', 'https://preview.lan/',
    'https://preview.alt/', 'https://preview.test/', 'https://preview.invalid/', 'https://preview.example/', 'https://example.com/',
  ])('rejects private, reserved or literal callback hosts (%#)', value => {
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_AUTH_REDIRECT_URL: value })).toThrow('공개 HTTPS');
  });
  it.each(['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://user:pass@example.com', 'https://example.com/#access_token=synthetic', ' https://example.com/', 'not a url'])('rejects unsafe or invalid return URL (%#)', value => {
    expect(() => assertReleaseConfig('release', { ...configured(), VITE_AUTH_REDIRECT_URL: value })).toThrow('VITE_AUTH_REDIRECT_URL');
  });
});
