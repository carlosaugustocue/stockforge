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
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
      <AuthInput
        id="email"
        label="Correo electrónico"
        type="email"
        value={email}
        placeholder="ejemplo@empresa.com"
        icon={Mail}
        onChange={setEmail}
      />

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

      {error && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none mt-1 shadow-md hover:shadow-lg"
        style={{
          background: loading
            ? 'var(--primary)'
            : 'linear-gradient(135deg, #8B2323 0%, #A52828 100%)',
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Verificando…
          </>
        ) : (
          <>
            Ingresar al sistema
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
