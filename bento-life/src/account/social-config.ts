export type SocialProvider = 'google' | 'apple';
export interface SocialConfig {
  providers: Record<SocialProvider, boolean>;
  socialDeletionReady: boolean;
  /** Exact same-origin application URL; fixed ?bento_social=1 supports standalone hosting. */
  webCallback: string | null;
}
/** Enable only after real provider, redirect and social-deletion verification. No secrets. */
export const socialConfig: SocialConfig = { providers: { google: false, apple: false }, socialDeletionReady: false, webCallback: null };
export const NATIVE_SOCIAL_CALLBACK = 'com.paranstudio.dosirak://auth/social';
export function validateSocialConfig(config: SocialConfig, release = false): void {
  if (!config || Object.keys(config).sort().join() !== 'providers,socialDeletionReady,webCallback'
    || !config.providers || Object.keys(config.providers).sort().join() !== 'apple,google'
    || Object.values(config.providers).some(v => typeof v !== 'boolean') || typeof config.socialDeletionReady !== 'boolean') throw Error('Invalid social readiness configuration');
  if (Object.values(config.providers).some(Boolean) && (!config.socialDeletionReady || !config.webCallback)) throw Error('Social callbacks and deletion must be ready before enabling providers');
  if (config.webCallback !== null) {
    const u = new URL(config.webCallback);
    if (u.protocol !== 'https:' || u.username || u.password || u.hash || config.webCallback !== u.href || u.search !== '?bento_social=1'
      || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(u.hostname) || /(?:^|\.)(?:localhost|local|invalid|test)$/.test(u.hostname)) throw Error('Invalid exact social application callback');
    if (release && (u.port || /(?:^|\.)(?:ts\.net|internal|lan|localdomain|home|corp|onion|arpa|alt|example|example\.(?:com|net|org))$/.test(u.hostname))) throw Error('Release social callback must be public');
  }
}
export function enabledSocialProviders(config: SocialConfig, platform: string): SocialProvider[] {
  validateSocialConfig(config);
  // iOS Apple requires AuthenticationServices and its paid capability, not this web transport.
  return (['google', 'apple'] as const).filter(p => config.providers[p] && !(p === 'apple' && platform === 'ios'));
}
