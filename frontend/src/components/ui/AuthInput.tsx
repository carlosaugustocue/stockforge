"use client";

import { LucideIcon } from "lucide-react";

interface AuthInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  icon: LucideIcon;
  onChange: (val: string) => void;
  required?: boolean;
  rightElement?: React.ReactNode;
}

/**
 * Componente atómico para campos de entrada con íconos
 */
export default function AuthInput({
  id,
  label,
  type,
  value,
  placeholder,
  icon: Icon,
  onChange,
  required = true,
  rightElement
}: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>
      <div className="relative flex items-center group">
        <div className="absolute left-3 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors">
          <Icon size={18} />
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 py-3.5 bg-slate-50/60 border border-slate-200 rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:bg-white transition-all text-sm text-[var(--text-main)] placeholder:text-slate-300"
        />
        {rightElement && (
          <div className="absolute right-3">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
