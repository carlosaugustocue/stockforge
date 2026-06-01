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
      <nav className="shadow-lg z-50 overflow-visible flex-shrink-0" style={{ background: 'var(--primary)' }}>
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 relative">
          <div className="flex items-center justify-between h-20">

            {/* Logo flotante centrado en el borde izquierdo del navbar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
              <div className="w-32 h-32 rounded-2xl bg-white p-1" style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                <img
                  src="/logo/Logo-Daluzed-SF.png"
                  alt="Daluzed Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Título con padding para no solaparse con el logo */}
            <div className="pl-36">
              <div className="text-white font-black text-xl leading-tight tracking-tighter italic uppercase">Daluzed</div>
              <div className="text-xs leading-tight text-white/60 font-bold uppercase tracking-widest">SISTEMA IPN</div>
            </div>

            {/* Derecha: tema (comentado), rol, logout */}
            <div className="flex items-center gap-4">

              {/* Selector de tema (Comentado por requerimiento de marca) */}
              {/* 
              <div className="relative">
                <button
                  onClick={() => setMostrarTema(v => !v)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-white/70 hover:text-white hover:bg-white/10"
                  title="Cambiar tema"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                </button>
                {mostrarTema && (
                  <div className="absolute right-0 top-10 z-50">
                    <ThemeSwitcher />
                  </div>
                )}
              </div>
              */}

              {/* Badge rol */}
              <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white hidden sm:inline-block bg-white/10 border border-white/20">
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </span>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={cerrando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20 transition-all border border-white/20 disabled:opacity-50 group active:scale-95"
              >
                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline uppercase tracking-widest text-[10px]">{cerrando ? 'Saliendo...' : 'Salir'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Franja decorativa */}
      <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary), var(--primary))' }} />

      {/* Cuerpo: sidebar + contenido */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-8 animate-fade relative">
          {/* Fondo decorativo sutil */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10"
              style={{ background: 'var(--primary)' }} />
            <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full blur-[150px] opacity-8"
              style={{ background: 'var(--secondary)' }} />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
                backgroundSize: '80px 80px',
              }} />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
