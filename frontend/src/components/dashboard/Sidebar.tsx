'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Scale, AlertTriangle, ArrowLeftRight,
  ChefHat, Flame, Truck, ClipboardList, PackageCheck,
  BarChart2, Box, ShoppingBag, Users, Lock, FileText,
  ChevronDown, ChevronRight, Warehouse,
} from 'lucide-react';
import { useState } from 'react';
import { obtenerSesion } from '@/lib/session';

type NavChild = { label: string; href: string; icon: React.ElementType };
type NavItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
  roles?: string[];
};

const NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Inventario',
    icon: Scale,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'Stock MP',    href: '/dashboard/inventario',                icon: Scale         },
      { label: 'Bodegas',    href: '/dashboard/inventario/bodegas',        icon: Warehouse     },
      { label: 'Alertas',    href: '/dashboard/inventario/alertas',        icon: AlertTriangle },
      { label: 'Traslados',  href: '/dashboard/inventario/traslados',      icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Producción',
    icon: ChefHat,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'Órdenes', href: '/dashboard/produccion', icon: Flame },
    ],
  },
  {
    label: 'Recepciones',
    icon: PackageCheck,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'Órdenes de Pedido', href: '/dashboard/recepciones', icon: ClipboardList },
    ],
  },
  {
    label: 'Despachos',
    icon: Truck,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'Lista', href: '/dashboard/despachos', icon: Truck },
    ],
  },
  {
    label: 'Reportes',
    icon: BarChart2,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'KPIs',        href: '/dashboard/reportes',             icon: BarChart2      },
      { label: 'Stock PT',    href: '/dashboard/reportes/stock-pt',    icon: ShoppingBag    },
      { label: 'Movimientos', href: '/dashboard/reportes/movimientos', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Catálogo',
    icon: Box,
    roles: ['gerencia', 'jefe_produccion', 'encargado_inventarios'],
    children: [
      { label: 'Materias Primas',    href: '/dashboard/catalogo/mp',      icon: Box          },
      { label: 'Prod. Terminados',   href: '/dashboard/catalogo/pt',      icon: ShoppingBag  },
      { label: 'Bodegas',            href: '/dashboard/catalogo/bodegas', icon: Scale        },
      { label: 'Proveedores',        href: '/dashboard/catalogo/proveedores', icon: Truck     },
    ],
  },
  {
    label: 'Administración',
    icon: Users,
    roles: ['administrador'],
    children: [
      { label: 'Usuarios', href: '/dashboard/admin/usuarios', icon: Users    },
      { label: 'Permisos', href: '/dashboard/admin/permisos', icon: Lock     },
      { label: 'Bitácora', href: '/dashboard/admin/bitacora', icon: FileText },
    ],
  },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const sesion    = obtenerSesion();
  const rol       = sesion?.usuario.rol ?? '';

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.href))) {
        init[item.label] = true;
      }
    });
    return init;
  });

  const toggle = (label: string) =>
    setOpen(prev => ({ ...prev, [label]: !prev[label] }));

  const items = NAV.filter(i => !i.roles || i.roles.includes(rol));

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        background: 'var(--primary)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {items.map(item => {
          const isLeaf     = !item.children && item.href;
          const isActive   = isLeaf && pathname === item.href;
          const childMatch = item.children?.some(c => pathname.startsWith(c.href));
          const isOpen     = open[item.label] ?? false;

          if (isLeaf && item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggle(item.label)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  childMatch
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon size={15} />
                <span className="flex-1 text-left">{item.label}</span>
                {isOpen
                  ? <ChevronDown size={12} />
                  : <ChevronRight size={12} />}
              </button>

              {isOpen && item.children && (
                <div className="ml-4 mt-0.5 border-l border-white/15 pl-2 space-y-0.5">
                  {item.children.map(child => {
                    const cActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          cActive
                            ? 'bg-white/20 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <child.icon size={12} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-white/30 font-medium">
          IPN-DEV v1.0
        </p>
      </div>
    </aside>
  );
}
