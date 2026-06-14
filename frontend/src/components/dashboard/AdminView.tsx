'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Lock, FileText, Settings,
  AlertTriangle, BarChart2, ChevronRight,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { adminService, type Usuario } from '@/services/admin.service';

const MODULOS = [
  { nombre: 'Gestión de Usuarios', desc: 'Crear, editar y desactivar cuentas',      Icono: Users,    href: '/dashboard/admin/usuarios' },
  { nombre: 'Gestión de Permisos', desc: 'Configurar la matriz RBAC por rol',       Icono: Lock,     href: '/dashboard/admin/permisos' },
  { nombre: 'Bitácora de accesos', desc: 'Registro inmutable de eventos',           Icono: FileText, href: '/dashboard/admin/bitacora' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateStr() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function AdminView() {
  const sesion    = obtenerSesion();
  const firstName = sesion?.usuario.nombre?.split(' ')[0] ?? '';

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
    { titulo: 'Usuarios activos',   valor: loading ? '—' : activos.toString(),         Icono: Users,         color: 'text-green-600',  bg: 'bg-green-50'  },
    { titulo: 'Usuarios inactivos', valor: loading ? '—' : inactivos.toString(),       Icono: AlertTriangle, color: 'text-slate-400',  bg: 'bg-slate-50'  },
    { titulo: 'Total usuarios',     valor: loading ? '—' : usuarios.length.toString(), Icono: BarChart2,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { titulo: 'Roles en sistema',   valor: '4',                                         Icono: Lock,          color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between" style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Settings size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">
              {getGreeting()},{' '}
              <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Administración</h1>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5">
          <span className="text-xs text-white/60 capitalize">{getDateStr()}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
            Administrador · Full Access
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {tarjetas.map(({ titulo, valor, Icono, color, bg }) => (
          <div key={titulo} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
              <Icono size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-800 tabular-nums">{valor}</div>
            <div className="text-xs font-medium text-slate-400 mt-1">{titulo}</div>
          </div>
        ))}
      </div>

      {/* Módulos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Módulos del sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {MODULOS.map(({ nombre, desc, Icono, href }) => (
            <Link key={nombre} href={href}
              className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-150">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(139,35,35,0.08)' }}>
                <Icono size={17} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700 truncate">{nombre}</div>
                <div className="text-xs text-slate-400 truncate">{desc}</div>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla rápida de usuarios */}
      {!loading && usuarios.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Usuarios registrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nombre</th>
                  <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                  <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Rol</th>
                  <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 font-medium text-slate-700">{u.name}</td>
                    <td className="py-3 px-5 text-slate-400 text-xs">{u.email}</td>
                    <td className="py-3 px-5">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(139,35,35,0.1)', color: 'var(--primary)' }}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${u.activo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
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

      {/* CTA */}
      <Link href="/dashboard/admin/usuarios"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-95"
        style={{ background: 'var(--primary)' }}>
        <Users size={15} />
        Gestionar usuarios
      </Link>
    </div>
  );
}
