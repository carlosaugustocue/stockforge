import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un valor numérico (number | string) para mostrar en la UI.
 * - Usa separadores colombianos (punto miles, coma decimal).
 * - Muestra hasta 3 decimales, eliminando los ceros finales.
 * - Ej: "10.000" → "10", "1.500" → "1,5", "1.250" → "1,25"
 */
export function formatNum(value: number | string | null | undefined, maxDecimals = 3): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: maxDecimals });
}
