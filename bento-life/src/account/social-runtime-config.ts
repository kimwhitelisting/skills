import { accountBuildConfig } from './build-config.ts';
import { socialConfig as disabled, validateSocialConfig, type SocialConfig } from './social-config.ts';
const raw = accountBuildConfig().VITE_SOCIAL_AUTH_CONFIG;
if (raw && raw.length > 2048) throw Error('Invalid social configuration');
export const socialConfig: SocialConfig = raw ? JSON.parse(raw) : disabled;
validateSocialConfig(socialConfig, import.meta.env.MODE === 'release');
