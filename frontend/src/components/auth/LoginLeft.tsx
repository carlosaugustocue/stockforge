"use client";

import Image from "next/image";

export default function LoginLeft() {
  return (
    <div className="login-panel-left relative hidden lg:flex flex-col justify-between py-14 px-14 w-5/12 h-full overflow-hidden">

      {/* Anillos decorativos — esquina superior derecha */}
      <div className="login-ring absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
      <div className="login-ring-2 absolute -top-16 -right-16 w-72 h-72 rounded-full border border-white/10 pointer-events-none" />
      <div className="login-ring absolute -top-8 -right-8 w-48 h-48 rounded-full border border-white/15 pointer-events-none" />

      {/* Círculo grande inferior izquierdo */}
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full border border-white/10 pointer-events-none" />

      {/* Cabecera — eyebrow */}
      <div className="relative z-10 animate-fade">
        <div className="flex items-center gap-2.5">
          <div className="w-px h-5 bg-white/30 rounded-full" />
          <span className="text-[11px] font-bold tracking-[0.35em] text-white/45 uppercase">
            Sistema de Inventario · IPN
          </span>
        </div>
      </div>

      {/* Centro — logo + nombre + tagline */}
      <div className="relative z-10 flex flex-col gap-8 animate-fade" style={{ animationDelay: '0.1s' }}>

        {/* Logo */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white/10 backdrop-blur-sm p-1.5">
          <div className="w-full h-full rounded-xl overflow-hidden relative">
            <Image
              src="/logo/Logo-Daluzed-SF.png"
              alt="Pastelería Daluzed"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Nombre + acento */}
        <div>
          <h1 className="text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
            Pastelería<br />
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>Daluzed</span>
          </h1>
          <div className="w-10 h-[3px] rounded-full bg-white/35 mb-5" />
          <p className="text-[15px] text-white/50 leading-relaxed max-w-[260px]">
            Gestiona inventario, producción y despachos desde un solo lugar.
          </p>
        </div>

        {/* Características */}
        <div className="flex flex-col gap-3">
          {[
            'Inventario en tiempo real',
            'Control de producción FEFO',
            'Trazabilidad completa de lotes',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
              <span className="text-[13px] text-white/45">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pie */}
      <div className="relative z-10 animate-fade" style={{ animationDelay: '0.2s' }}>
        <p className="text-[11px] text-white/25">© 2025 Daluzed · Todos los derechos reservados</p>
      </div>
    </div>
  );
}
