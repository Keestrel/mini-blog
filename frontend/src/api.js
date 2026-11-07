export const API_URL = 'http://192.168.1.182:8000';
export const WS_URL = 'ws://192.168.1.182:8000';


 // Проверяет валидность токена и не истек ли его срок действия
export function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(
      window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return true; // если exp не задан, токен считается бессрочным
    
    // exp хранится в секундах, Date.now() возвращает миллисекунды
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch {
    return false;
  }
}

export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return Number(payload.sub);
  } catch {
    return null;
  }
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Обертка над fetch, перехватывающая 401 Unauthorized
 */
export async function fetchWithAuth(url, options = {}, token, onUnauthorized) {
  const headers = {
    ...options.headers,
    ...authHeader(token),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (typeof onUnauthorized === 'function') {
      onUnauthorized();
    }
    throw new Error('Сессия истекла. Требуется повторная авторизация.');
  }

  return response;
}