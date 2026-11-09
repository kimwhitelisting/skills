type Environment = Record<string, string | undefined>;
const CLIENT_VARIABLES = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_AUTH_REDIRECT_URL']);

function publicWebHost(host: string): boolean {
  if (/^[0-9.]+$/.test(host) || host.includes(':')) return false; // URL normalizes IPv4/IPv6 literals.
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) return false;
  return !/(?:^|\.)(?:ts\.net|local|localhost|internal|lan|localdomain|home|corp|onion|arpa|alt|test|invalid|example|example\.(?:com|net|org))$/.test(host);
}

/** Validate syntax without contacting the server or printing configuration values. */
export function assertReleaseConfig(mode: string, env: Environment): void {
  if (mode !== 'release') return;

  if (Object.entries(env).some(([name, value]) => value && name.startsWith('VITE_')
    && (/SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD/i.test(name) || value.trim().startsWith('sb_secret_')))) {
    throw new Error('출시 앱의 VITE_ 환경에는 서버 비밀을 넣을 수 없습니다. 공개 클라이언트 설정만 사용하세요.');
  }
  if (Object.keys(env).some(name => name.startsWith('VITE_') && !CLIENT_VARIABLES.has(name))) {
    throw new Error('출시 앱에는 승인된 세 가지 VITE_ 계정 설정만 허용합니다. 다른 공개 환경 변수는 제거하거나 별도 검토하세요.');
  }

  const url = env.VITE_SUPABASE_URL;
  if (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    throw new Error('출시 빌드에는 올바른 VITE_SUPABASE_URL이 필요합니다. HTTPS 프로젝트 기본 주소를 확인하세요.');
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('출시 빌드에는 VITE_SUPABASE_PUBLISHABLE_KEY가 필요합니다. 새 공개 클라이언트 키만 허용하며 secret/service_role/JWT 키는 사용할 수 없습니다.');
  }

  let redirect: URL;
  const redirectValue = env.VITE_AUTH_REDIRECT_URL ?? '';
  try {
    redirect = new URL(redirectValue);
  } catch {
    throw new Error('출시 빌드에는 확인·재설정 메일이 돌아올 VITE_AUTH_REDIRECT_URL이 필요합니다.');
  }
  if (redirectValue !== redirectValue.trim() || redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.hash
    || !publicWebHost(redirect.hostname)) {
    throw new Error('VITE_AUTH_REDIRECT_URL은 공개 HTTPS 도메인이어야 합니다. 인증 정보·fragment·IP 주소·사설/예약 도메인은 허용하지 않습니다.');
  }
}
