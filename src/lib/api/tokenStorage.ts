/**
 * Token storage.
 *
 * Only the opaque JWTs are persisted so the session survives a reload. The
 * user object, role and permissions are NEVER persisted: they are always
 * re-fetched from the backend (GET /auth/me) on boot, so a tampered value in
 * browser storage cannot elevate access. The access token is short-lived; the
 * refresh token is rotated by the backend on every refresh and revoked on logout.
 */
const ACCESS_KEY = 'kanak.accessToken';
const REFRESH_KEY = 'kanak.refreshToken';

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readKey = (key: string): string | null => {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeKey = (key: string, value: string | null) => {
  try {
    if (value) storage()?.setItem(key, value);
    else storage()?.removeItem(key);
  } catch {
    /* storage unavailable: keep in memory only */
  }
};

export const tokenStorage = {
  /** Current access token, if any. */
  get(): string | null {
    if (!memoryAccess) memoryAccess = readKey(ACCESS_KEY);
    return memoryAccess;
  },
  /** Current refresh token, if any. */
  getRefresh(): string | null {
    if (!memoryRefresh) memoryRefresh = readKey(REFRESH_KEY);
    return memoryRefresh;
  },
  /** Store a new token pair. Omitting the refresh token keeps the existing one. */
  set(accessToken: string, refreshToken?: string) {
    memoryAccess = accessToken;
    writeKey(ACCESS_KEY, accessToken);
    if (refreshToken) {
      memoryRefresh = refreshToken;
      writeKey(REFRESH_KEY, refreshToken);
    }
  },
  clear() {
    memoryAccess = null;
    memoryRefresh = null;
    writeKey(ACCESS_KEY, null);
    writeKey(REFRESH_KEY, null);
  },
};
