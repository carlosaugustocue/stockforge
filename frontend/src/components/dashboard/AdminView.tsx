'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Lock, FileText, Settings, AlertTriangle, BarChart2 } from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { adminService, type Usuario } from '@/services/admin.service';

const modulos = [
  { nombre: 'Gestión de Usuarios', desc: 'Crear, editar y desactivar usuarios',       Icono: Users,    href: '/dashboard/admin/usuarios' },
  { nombre: 'Gestión de Permisos', desc: 'Configurar la matriz RBAC por rol',         Icono: Lock,     href: '/dashboard/admin/permisos' },
  { nombre: 'Bitácora de accesos', desc: 'Registro inmutable de eventos del sistema', Icono: FileText, href: '/dashboard/admin/bitacora' },
];

export default function AdminView() {
  const sesion = obtenerSesion();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    adminService.listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false));
  }, []);

  const activos   = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;

  const tarjetas = [
    { titulo: 'Usuarios activos',   valor: loading ? '…' : activos.toString(),    Icono: Users,         color: 'text-green-600'  },
    { titulo: 'Usuarios inactivos', valor: loading ? '…' : inactivos.toString(),  Icono: AlertTriangle, color: 'text-slate-400'  },
    { titulo: 'Total usuarios',     valor: loading ? '…' : usuarios.length.toString(), Icono: BarChart2, color: 'text-blue-600'  },
    { titulo: 'Roles en sistema',   valor: '4',                                   Icono: Lock,          color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* COLUMNA IZQUIERDA */}
      <div className="lg:col-span-8 space-y-8">

        {/* Banner */}
        <div className="rounded-xl p-8 text-white shadow-xl relative overflow-hidden border-b-4 border-r-4 border-black/10"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 border-8 border-white/5 rounded-full -mr-20 -mt-20" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}>
              <Settings size={36} className="text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Panel de Administrador</h1>
              <p className="text-base mt-1 text-white/80 font-medium">
                SISTEMA IPN-DEV <span className="mx-2 opacity-30">|</span>
                <span className="text-white">{sesion?.usuario.nombre}</span>
              </p>
              <span className="inline-block mt-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-black/20 border border-white/10">
                Full Access
              </span>
            </div>
          </div>
        </div>

        {/* Módulos del sistema */}
        <div className="rounded-xl shadow-lg p-6 border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black/5 pb-4">
            <div className="w-3 h-3 rotate-45" style={{ background: 'var(--primary)' }} />
            <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
              Módulos del Sistema
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modulos.map(({ nombre, desc, Icono, href }) => (
              <Link key={nombre} href={href}
                className="group rounded-xl p-5 flex items-center gap-4 border-2 border-black/5 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                style={{ background: 'var(--bg-right)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:rotate-6"
                  style={{ background: 'var(--primary)' }}>
                  <Icono size={22} color="white" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{nombre}</div>
                  <div className="text-xs mt-0.5 italic" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tabla rápida de usuarios */}
        {!loading && usuarios.length > 0 && (
          <div className="rounded-xl shadow-lg p-6 border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
            <h2 className="text-sm font-black uppercase tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>
              Usuarios registrados
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left py-2 px-3 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Nombre</th>
                    <th className="text-left py-2 px-3 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Email</th>
                    <th className="text-left py-2 px-3 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Rol</th>
                    <th className="text-left py-2 px-3 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b border-black/3 hover:bg-black/2 transition-colors">
                      <td className="py-2 px-3 font-bold" style={{ color: 'var(--text-main)' }}>{u.name}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                          style={{ background: 'var(--primary)', color: 'white' }}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* COLUMNA DERECHA — KPIs */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Estado del sistema</h3>
        {tarjetas.map(({ titulo, valor, Icono, color }) => (
          <div key={titulo}
            className="rounded-xl shadow-md p-5 flex items-center gap-4 border-2 border-black/5 transition-all hover:translate-x-1"
            style={{ background: 'var(--bg-left)' }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-white/50"
              style={{ background: 'var(--bg-right)' }}>
              <Icono size={20} className={color} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{titulo}</div>
              <div className="text-2xl font-black tracking-tighter mt-0.5" style={{ color: 'var(--text-main)' }}>{valor}</div>
            </div>
          </div>
        ))}
        <Link href="/dashboard/admin/usuarios"
          className="block w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest text-white text-center transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary)' }}>
          Gestionar usuarios
        </Link>
      </div>
    </div>
  );
}
