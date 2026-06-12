"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthInput from "../ui/AuthInput";
import { loginUser, fetchMe } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { guardarSesion, rutaPorRol } from "@/lib/session";

/**
 * Componente que maneja la lógica del formulario de login
 */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await loginUser({ email, password });
      const usuario = await fetchMe(data.token);
      guardarSesion(data.token, usuario);
      router.push(rutaPorRol(data.rol));
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full mt-8">
      {/* Input de Correo */}
      <AuthInput
        id="email"
        label="Correo electrónico"
        type="email"
        value={email}
        placeholder="ejemplo@empresa.com"
        icon={Mail}
        onChange={setEmail}
      />

      {/* Input de Contraseña */}
      <AuthInput
        id="password"
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        value={password}
        placeholder="••••••••"
        icon={Lock}
        onChange={setPassword}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-[var(--primary)] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

      {/* Botón de Ingreso */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] hover:bg-[var(--secondary)] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
      >
        {loading ? "Verificando..." : "Ingresar"}
        {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
