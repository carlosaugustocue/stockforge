"use client";

// import ThemeSwitcher from "../ui/ThemeSwitcher";

/**
 * Columna izquierda: Información y branding (Ajustada: más grande y más arriba)
 */
export default function LoginLeft() {
  return (
    <div className="relative hidden lg:flex flex-col justify-start pt-32 px-24 w-1/2 h-full z-10">
      
      <div className="animate-fade">
        <p className="text-sm font-bold tracking-[0.3em] text-[var(--text-muted)] uppercase mb-4">
          Sistema de Inventario
        </p>
        <h1 className="text-8xl font-black text-[var(--text-main)] mb-6 tracking-tighter">
          Bienvenido
        </h1>
        <div className="w-24 h-2 bg-[var(--primary)] rounded-full mb-10"></div>
        
        <p className="max-w-lg text-xl text-[var(--text-muted)] leading-relaxed">
          Inicia sesión para acceder a tu sistema de inventario y gestionar tu negocio de manera eficiente.
        </p>
      </div>

      {/* Triángulo decorativo subido */}
      <div className="shape-left-bottom"></div>

      {/* Theme Switcher Real y Funcional (Comentado por requerimiento de marca) */}
      {/* 
      <div className="absolute bottom-16 left-24">
        <ThemeSwitcher />
      </div>
      */}
    </div>
  );
}
