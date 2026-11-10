export type AccountBuildConfig = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_AUTH_REDIRECT_URL?: string;
  VITE_SOCIAL_AUTH_CONFIG?: string;
};

/** Release has one configuration source, shared with the package verifier. */
export function readReleaseAccountConfig(document: Pick<Document, 'querySelectorAll'>): AccountBuildConfig {
  const blocks = document.querySelectorAll('script#bento-release-config');
  if (blocks.length !== 1 || blocks[0].getAttribute('type') !== 'application/json') {
    throw new Error('Release account configuration is missing or duplicated.');
  }
  const raw = blocks[0].textContent ?? '';
  if (raw.length > 4096) throw new Error('Invalid release account configuration.');
  const value: unknown = JSON.parse(raw);
  const keys = ['VITE_AUTH_REDIRECT_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || (Object.keys(value).some(key => ![...keys, 'VITE_SOCIAL_AUTH_CONFIG'].includes(key)) || keys.some(key => !(key in value)))
    || Object.values(value).some(item => typeof item !== 'string' || !item)) {
    throw new Error('Invalid release account configuration.');
  }
  return value as AccountBuildConfig;
}

export function accountBuildConfig(): AccountBuildConfig {
  if (import.meta.env.MODE === 'release') return readReleaseAccountConfig(document);
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_AUTH_REDIRECT_URL: import.meta.env.VITE_AUTH_REDIRECT_URL,
    VITE_SOCIAL_AUTH_CONFIG: import.meta.env.VITE_SOCIAL_AUTH_CONFIG,
  };
}
