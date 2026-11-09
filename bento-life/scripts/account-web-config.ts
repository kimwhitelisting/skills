import { assertReleaseConfig } from './release-config.ts';

export interface AccountWebConfig {
  url: string;
  key: string;
  returnURL: string;
  supportEmail: string;
  localOnly: boolean;
}
const fields = ['SUPABASE_URL', 'PUBLISHABLE_KEY', 'RETURN_URL', 'SUPPORT_EMAIL'];
const prefix = 'BENTO_WEB_';
export function accountWebConfig(mode: string, env: Record<string, string | undefined>): AccountWebConfig {
  if (!['account-web', 'account-web-local'].includes(mode)) throw new Error('계정 웹 빌드 모드를 명시하세요.');
  if (Object.keys(env).some(name => name.startsWith(prefix) && !fields.includes(name.slice(prefix.length)))) {
    throw new Error('계정 웹에는 지정된 네 가지 공개 설정만 허용합니다.');
  }
  const values = fields.map(name => env[prefix + name] ?? '');
  if (values.some(value => !value || value !== value.trim() || /sb_secret_|service_role|-----BEGIN/i.test(value))) {
    throw new Error('계정 웹 공개 설정 네 가지가 필요합니다. 비밀 값은 사용할 수 없습니다.');
  }
  const [url, key, returnURL, supportEmail] = values;
  const localOnly = mode === 'account-web-local';
  let api: URL, callback: URL;
  try { api = new URL(url); callback = new URL(returnURL); } catch { throw new Error('계정 웹 주소 형식을 확인하세요.'); }
  if (api.href !== `${api.origin}/` || callback.search || callback.hash || callback.username || callback.password
    || api.username || api.password || /[<>"'\\\s]/.test(returnURL)) {
    throw new Error('계정 웹 주소에는 인증 정보·query·fragment·특수 문자를 넣을 수 없습니다.');
  }
  if (localOnly) {
    if (![api, callback].every(value => value.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(value.hostname))) {
      throw new Error('로컬 시험은 loopback HTTP 주소만 허용합니다.');
    }
    let anonJWT = false;
    try {
      const parts = key.split('.');
      anonJWT = parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'anon';
    } catch { /* Only the local anonymous key or publishable format is allowed. */ }
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) && !anonJWT) throw new Error('로컬 공개 anon 키가 필요합니다.');
  } else {
    assertReleaseConfig('release', { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_AUTH_REDIRECT_URL: returnURL });
  }
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(supportEmail)
    || supportEmail.length > 254) throw new Error('유효한 지원 이메일이 필요합니다.');
  if (!localOnly) {
    assertReleaseConfig('release', { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key,
      VITE_AUTH_REDIRECT_URL: `https://${supportEmail.split('@')[1]}/` });
  }
  return { url: api.origin, key, returnURL: callback.href, supportEmail, localOnly };
}
