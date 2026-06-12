//Pagina Raiz: Redirige automáticamente al login
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion, rutaPorRol } from '@/lib/session';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      router.replace(rutaPorRol(sesion.usuario.rol));
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--primary)' }}>
      <div className="text-white/70 text-sm animate-pulse">Cargando IPN DEV...</div>
    </div>
  );
}
