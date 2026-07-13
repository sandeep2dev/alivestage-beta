const TOKEN_KEY = 'as_access_token';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    clearAccessToken();
  }
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export async function apiAuthFetch(path, { method = 'GET', body } = {}) {
  const { apiFetch } = await import('./api');
  const token = getAccessToken();
  return apiFetch(path, { method, body, token });
}
