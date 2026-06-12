// Gestión de sesión en localStorage

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  rol: string;
  creado_en?: string;
}

export function guardarSesion(token: string, usuario: Usuario) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

export function obtenerSesion(): { token: string; usuario: Usuario } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  const usuario = localStorage.getItem('usuario');
  if (!token || !usuario) return null;
  try {
    return { token, usuario: JSON.parse(usuario) };
  } catch (e) {
    return null;
  }
}

export function limpiarSesion() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

export function rutaPorRol(rol: string): string {
  const rolesValidos = ['administrador', 'gerencia', 'jefe_produccion', 'encargado_inventarios'];
  return rolesValidos.includes(rol) ? '/dashboard' : '/login';
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => {});
}
