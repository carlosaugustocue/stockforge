import Image from "next/image";
import LoginForm from "./LoginForm";

/**
 * Columna derecha: Tarjeta de login con logo y diseño espacioso
 */
export default function LoginRight() {
  return (
    <div className="relative flex items-center justify-center w-full lg:w-1/2 h-full overflow-hidden">

      {/* Contenedor de la Tarjeta - Ahora más amplia */}
      <div className="relative z-10 w-full max-w-[620px] px-8 animate-fade" style={{ animationDelay: '0.1s' }}>

        <div className="bg-white p-16 lg:p-20 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-slate-50 flex flex-col items-center relative overflow-hidden group">
          
          {/* Rayo de luz giratorio (Efecto WOW) */}
          <div className="beam-effect"></div>
          
          {/* Máscara interna para que el rayo solo se vea en el borde de 2px */}
          <div className="absolute inset-[2px] bg-white rounded-[inherit] z-0"></div>

          {/* Figura decorativa INTERNA de la tarjeta */}
          <div className="card-internal-shape z-10"></div>

          {/* Espacio para el Logo - Más grande y con el logo real */}
          <div className="w-36 h-36 mb-10 relative flex items-center justify-center z-10">
            {/* Círculos decorativos del borde */}
            <div className="absolute inset-0 rounded-full border-[4px] border-slate-100 shadow-inner"></div>
            <div className="absolute inset-0 rounded-full border-t-[4px] border-r-[4px] border-[var(--primary)] rotate-[30deg]"></div>

            {/* Imagen del Logo */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
              <Image
                src="/logo/Logo-Daluzed-SF.png"
                alt="Pastelería Daluzed Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight z-10">Iniciar sesión</h2>
          <p className="text-base text-[var(--text-muted)] mt-3 text-center z-10">Ingresa tus credenciales para continuar</p>

          {/* Formulario Modular */}
          <div className="w-full mt-10 z-10">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
