// Servicio de autenticación: maneja la comunicación con el backend Laravel
import { Usuario } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    rol: string;
  };
}

/**
 * Paso 1 — obtiene token y rol (mínimo necesario para autenticar).
 * Lanza Error con el mensaje del backend en caso de fallo.
 */
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Credenciales inválidas.");
  }

  return response.json();
}

/**
 * Paso 2 — obtiene el perfil completo del usuario autenticado.
 * Se llama inmediatamente después de loginUser con el token recibido.
 */
export async function fetchMe(token: string): Promise<Usuario> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el perfil del usuario.");
  }

  const json = await response.json();
  return json.data as Usuario;
}
