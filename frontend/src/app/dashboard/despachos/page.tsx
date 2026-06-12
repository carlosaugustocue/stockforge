'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, X } from 'lucide-react';
import { despachosService } from '@/services/despachos.service';
import { reportesService } from '@/services/reportes.service';

interface DespachoRaw {
  id: number;
  cantidad: number;
  referencia_cliente?: string;
  created_at: string;
  usuario?: { name: string };
  lote_pt?: { producto_terminado?: { nombre: string } };
}

interface LotePt {
  lote_id: number;
  producto_terminado: string;
  bodega: string;
  cantidad_actual: number;
  unidad_medida: string;
  fecha_produccion: string | null;
}

interface StockPtResponse {
  total_lotes: number;
  por_producto: unknown[];
  detalle: LotePt[];
}

export default function DespachosPage() {
  const [despachos, setDespachos] = useState<DespachoRaw[]>([]);
  const [lotesPt,   setLotesPt]   = useState<LotePt[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [msgOk,     setMsgOk]     = useState('');
  const [msgErr,    setMsgErr]    = useState('');

  const [loteId,    setLoteId]    = useState('');
  const [cantidad,  setCantidad]  = useState('');
  const [cliente,   setCliente]   = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      despachosService.listar(),
      reportesService.stockPt(),
    ]).then(([d, s]) => {
      if (d.status === 'fulfilled') setDespachos(d.value as DespachoRaw[]);
      if (s.status === 'fulfilled') {
        const stock = s.value as StockPtResponse;
        setLotesPt(stock.detalle ?? []);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const loteSeleccionado = lotesPt.find(l => String(l.lote_id) === loteId);

  const abrirModal = () => {
    setLoteId(''); setCantidad(''); setCliente(''); setMsgErr('');
    setModal(true);
  };

  const handleDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await despachosService.registrar({
        lote_pt_id:          parseInt(loteId),
        cantidad:            parseFloat(cantidad),
        referencia_cliente:  cliente || undefined,
      });
      setMsgOk(`Despacho registrado correctamente.`);
      setModal(false);
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error al registrar despacho'); }
    finally { setEnviando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Despachos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Salidas de producto terminado hacia clientes
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={abrirModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white"
            style={{ background: 'var(--secondary)' }}>
            <Plus size={13} />
            Registrar despacho
          </button>
        </div>
      </div>

      {msgOk && <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">{msgOk}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Producto', 'Cantidad', 'Cliente', 'Fecha', 'Usuario'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {despachos.map(d => (
                  <tr key={d.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>#{d.id}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>
                      {d.lote_pt?.producto_terminado?.nombre ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{d.cantidad}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{d.referencia_cliente ?? '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(d.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{d.usuario?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {despachos.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay despachos registrados.</div>
            )}
          </div>
        )}

      {/* Modal registrar despacho */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-black/5 relative"
            style={{ background: 'var(--bg-right)' }}>
            <button onClick={() => setModal(false)} className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="text-lg font-black uppercase tracking-tight mb-5" style={{ color: 'var(--text-main)' }}>
              Registrar Despacho
            </h2>

            {msgErr && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}

            {lotesPt.length === 0
              ? (
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
                  No hay lotes de producto terminado disponibles en Bodega Ventas.<br />
                  Completa el ciclo de producción (Crear → Ejecutar → Trasladar PT) primero.
                </div>
              )
              : (
                <form onSubmit={handleDespacho} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Lote de producto terminado *
                    </label>
                    <select value={loteId} onChange={e => { setLoteId(e.target.value); setCantidad(''); }}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                      <option value="">— Seleccionar lote —</option>
                      {lotesPt.map(l => (
                        <option key={l.lote_id} value={l.lote_id}>
                          {l.producto_terminado} — {l.cantidad_actual.toLocaleString('es-CO')} {l.unidad_medida} ({l.bodega})
                        </option>
                      ))}
                    </select>
                    {loteSeleccionado && (
                      <p className="text-[10px] mt-1 font-bold text-green-700">
                        Disponible: {loteSeleccionado.cantidad_actual.toLocaleString('es-CO')} {loteSeleccionado.unidad_medida}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Cantidad a despachar *
                    </label>
                    <input type="number" step="0.001" min="0.001"
                      max={loteSeleccionado?.cantidad_actual}
                      value={cantidad} onChange={e => setCantidad(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Referencia / cliente
                    </label>
                    <input type="text" placeholder="Nombre del cliente o número de pedido"
                      value={cliente} onChange={e => setCliente(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModal(false)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                      style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                    <button type="submit" disabled={enviando}
                      className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
                      style={{ background: 'var(--primary)' }}>
                      {enviando ? 'Registrando…' : 'Registrar despacho'}
                    </button>
                  </div>
                </form>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
