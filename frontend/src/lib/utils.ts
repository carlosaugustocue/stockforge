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

/**
 * Formatea una cantidad junto con su unidad de medida, aplicando conversiones de escala:
 * - g  ≥ 1000 → kg  (6000 g → "6 kg",  1500 g → "1,5 kg")
 * - ml ≥ 1000 → L   (2000 ml → "2 L")
 * Así se evita la ambigüedad de "6.000 g" (¿6 gramos o 6000 gramos?).
 */
export function formatCantidad(
  value: number | string | null | undefined,
  unit: string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';

  const u = unit ?? '';

  if (u === 'g' && n >= 1000) return `${formatNum(n / 1000)} kg`;
  if (u === 'ml' && n >= 1000) return `${formatNum(n / 1000)} L`;

  return u ? `${formatNum(n)} ${u}` : formatNum(n);
}

/** Unidades que representan conteos discretos — no admiten decimales. */
const UNIDADES_DISCRETAS = new Set(['unidad', 'unidades', 'ud', 'uds', 'pieza', 'piezas', 'pza', 'pzas']);

/**
 * Devuelve true si la unidad admite valores decimales (g, kg, ml, L, etc.).
 * Las unidades discretas como "unidad" solo admiten enteros.
 */
export function unidadAdmiteDecimales(unit: string | null | undefined): boolean {
  if (!unit) return true;
  return !UNIDADES_DISCRETAS.has(unit.toLowerCase().trim());
}

/**
 * Parsea el mensaje de error del backend (puede ser JSON de stock insuficiente)
 * y lo convierte en un mensaje legible con unidades de medida.
 *
 * Backend lanza: json_encode({ materia_prima, unidad_medida, requerida, disponible, faltante })
 */
export function parseApiError(message: string): string {
  try {
    const obj = JSON.parse(message);
    if (obj && typeof obj === 'object' && 'materia_prima' in obj) {
      const u   = obj.unidad_medida as string | undefined;
      const req = formatCantidad(obj.requerida,   u);
      const dis = formatCantidad(obj.disponible,  u);
      const fal = formatCantidad(obj.faltante,    u);
      return `Stock insuficiente de "${obj.materia_prima}". Requerido: ${req} · Disponible: ${dis} · Faltante: ${fal}`;
    }
  } catch {
    // no es JSON — devolver el mensaje original
  }
  return message;
}
