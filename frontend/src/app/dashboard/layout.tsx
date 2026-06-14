'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { obtenerSesion, limpiarSesion, logout, Usuario } from '@/lib/session';
import Sidebar from '@/components/dashboard/Sidebar';
// import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'Administrador',
  gerencia: 'Gerencia',
  jefe_produccion: 'Jefe de Producción',
  encargado_inventarios: 'Encargado de Inventarios',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cerrando, setCerrando] = useState(false);
  // const [mostrarTema, setMostrarTema] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace('/login');
      return;
    }
    setUsuario(sesion.usuario);
  }, [router]);

  async function handleLogout() {
    setCerrando(true);
    const sesion = obtenerSesion();
    if (sesion) await logout(sesion.token).catch(() => { });
    limpiarSesion();
    router.replace('/login');
  }

  if (!usuario) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-right)' }}>

      {/* Navbar */}
      <nav className="z-50 flex-shrink-0 border-b border-black/10" style={{ background: 'var(--primary)' }}>
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 relative">
          <div className="flex items-center justify-between h-16">

            {/* Logo + título */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src="/logo/Logo-Daluzed-SF.png"
                  alt="Daluzed"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <div className="text-white font-bold text-base leading-none">Daluzed</div>
                <div className="text-white/55 text-xs font-medium mt-0.5">Sistema IPN</div>
              </div>
            </div>

            {/* Derecha: rol + logout */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hidden sm:inline-block bg-white/10 border border-white/15">
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </span>
              <button
                onClick={handleLogout}
                disabled={cerrando}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/10 text-xs font-medium text-white hover:bg-white/20 transition-colors border border-white/15 disabled:opacity-50 active:scale-95"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{cerrando ? 'Saliendo...' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Cuerpo: sidebar + contenido */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-8 animate-fade bg-slate-50/60">
          {children}
        </main>
      </div>
    </div>
  );
}
