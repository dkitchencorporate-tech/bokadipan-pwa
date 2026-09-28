// Cliente HTTP propio hacia api/*.js — sustituye por completo al cliente de
// @supabase/supabase-js. El navegador solo guarda el JWT (nunca contraseñas
// ni hashes); cada llamada autenticada lo manda como Bearer token y el
// backend decide con eso (más una comprobación fresca de is_admin en la
// base de datos) qué puede hacer.
const TOKEN_KEY = 'brand_auth_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('sff_auth_token');
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('sff_auth_token');
    }
  } catch {
    /* almacenamiento no disponible — no debe romper la app */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Error ${res.status}`, res.status);
  }
  return data;
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any) => request(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: (path: string, body?: any) => request(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined })
};
