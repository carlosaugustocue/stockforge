'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Warehouse } from 'lucide-react';
import { catalogoService, type Bodega } from '@/services/catalogo.service';

const TIPO_BADGE: Record<string, string> = {
  principal:  'bg-blue-100 text-blue-700',
  produccion: 'bg-yellow-100 text-yellow-700',
  ventas:     'bg-green-100 text-green-700',
};

export default function BodegasPage() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    catalogoService.bodegas()
      .then(setBodegas)
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Bodegas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {bodegas.length} bodega{bodegas.length !== 1 ? 's' : ''} registrada{bodegas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bodegas.map(b => (
              <div key={b.id}
                className="rounded-xl border-2 border-black/5 p-6 flex flex-col gap-3"
                style={{ background: 'var(--bg-left)' }}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: 'var(--primary)' }}>
                    <Warehouse size={18} />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${TIPO_BADGE[b.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                    {b.tipo}
                  </span>
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: 'var(--text-main)' }}>{b.nombre}</p>
                  {b.descripcion && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{b.descripcion}</p>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  ID #{b.id}
                </p>
              </div>
            ))}
            {bodegas.length === 0 && (
              <div className="col-span-3 text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay bodegas registradas.</div>
            )}
          </div>
        )}
    </div>
  );
}
