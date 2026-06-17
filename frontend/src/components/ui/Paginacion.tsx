'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginacionProps {
  total:     number;
  porPagina: number;
  pagina:    number;
  onChange:  (p: number) => void;
}

function paginas(total: number, actual: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 1;
  const inicio = Math.max(2, actual - delta);
  const fin    = Math.min(total - 1, actual + delta);
  const nums: (number | '...')[] = [1];
  if (inicio > 2)     nums.push('...');
  for (let i = inicio; i <= fin; i++) nums.push(i);
  if (fin < total - 1) nums.push('...');
  nums.push(total);
  return nums;
}

export default function Paginacion({ total, porPagina, pagina, onChange }: PaginacionProps) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  const btn = (p: number | '...', key: string | number) => {
    if (p === '...') {
      return (
        <span key={key} className="w-8 h-8 flex items-center justify-center text-xs"
          style={{ color: 'var(--text-muted)' }}>
          …
        </span>
      );
    }
    const activa = p === pagina;
    return (
      <button
        key={key}
        onClick={() => onChange(p)}
        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
          activa
            ? 'text-white shadow-sm'
            : 'hover:bg-black/5'
        }`}
        style={activa ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text-main)' }}
      >
        {p}
      </button>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t-2 border-black/5">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Mostrando <span className="font-bold" style={{ color: 'var(--text-main)' }}>{desde}–{hasta}</span> de{' '}
        <span className="font-bold" style={{ color: 'var(--text-main)' }}>{total}</span> registros
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={14} />
        </button>

        {paginas(totalPaginas, pagina).map((p, i) => btn(p, i))}

        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
