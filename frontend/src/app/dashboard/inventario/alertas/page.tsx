'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { formatNum } from '@/lib/utils';

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaMp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    inventarioService.alertas()
      .then(setAlertas)
      .catch(e => setError(e.message ?? 'Error al cargar alertas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Alertas de Reorden
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Materias primas con stock por debajo del punto de reorden
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      )}

      {!loading && !error && alertas.length === 0 && (
        <div className="rounded-xl p-12 text-center border-2 border-dashed border-green-200 bg-green-50">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-green-500" />
          </div>
          <h3 className="font-black text-lg text-green-700">Sin alertas activas</h3>
          <p className="text-sm text-green-600 mt-1">Todos los insumos están sobre su punto de reorden.</p>
        </div>
      )}

      {!loading && alertas.length > 0 && (
        <>
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">
              {alertas.length} materia{alertas.length !== 1 ? 's prima' : ' prima'} {alertas.length !== 1 ? 'requieren' : 'requiere'} reposición urgente.
            </p>
          </div>

          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Materia Prima</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Stock actual</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Punto reorden</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Faltante</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {alertas.map(mp => (
                  <tr key={mp.materia_prima_id} className="border-b border-black/5 hover:bg-red-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-black" style={{ color: 'var(--text-main)' }}>{mp.nombre}</p>
                      <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{mp.unidad_medida}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">
                      {formatNum(mp.stock_total)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: 'var(--text-muted)' }}>
                      {formatNum(mp.punto_reorden)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-black text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">
                        -{formatNum(mp.faltante)} {mp.unidad_medida}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href="/dashboard/recepciones"
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white px-2 py-1 rounded transition-all hover:opacity-80"
                        style={{ background: 'var(--primary)' }}>
                        <ArrowLeftRight size={10} />
                        Pedir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
