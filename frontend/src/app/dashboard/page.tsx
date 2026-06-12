'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerSesion, Usuario } from '@/lib/session';
import AdminView from '@/components/dashboard/AdminView';
import GerenciaView from '@/components/dashboard/GerenciaView';
import ProduccionView from '@/components/dashboard/ProduccionView';
import InventarioView from '@/components/dashboard/InventarioView';

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace('/login');
      return;
    }
    setUsuario(sesion.usuario);
  }, [router]);

  if (!usuario) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  // Despachador de vistas según el rol
  switch (usuario.rol) {
    case 'administrador':
      return <AdminView />;
    case 'gerencia':
      return <GerenciaView />;
    case 'jefe_produccion':
      return <ProduccionView />;
    case 'encargado_inventarios':
      return <InventarioView />;
    default:
      return (
        <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100">
          <h2 className="text-xl font-bold text-red-600">Acceso no autorizado</h2>
          <p className="text-gray-600 mt-2">Tu rol ({usuario.rol}) no tiene una vista asignada.</p>
        </div>
      );
  }
}
