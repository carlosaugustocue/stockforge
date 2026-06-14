import LoginForm from "./LoginForm";

export default function LoginRight() {
  return (
    <div className="relative flex items-center justify-center w-full lg:w-7/12 h-full bg-white overflow-hidden">

      {/* Blobs de fondo suaves */}
      <div className="login-blob-1" />
      <div className="login-blob-2" />

      {/* Contenido centrado */}
      <div className="relative z-10 w-full max-w-sm px-8 animate-fade" style={{ animationDelay: '0.12s' }}>

        {/* Ícono / badge superior */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
            style={{ background: 'rgba(139,35,35,0.08)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B2323" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="text-[28px] font-black text-[var(--text-main)] tracking-tight text-center leading-tight mb-2">
            Iniciar sesión
          </h2>
          <p className="text-sm text-[var(--text-muted)] text-center">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Formulario */}
        <LoginForm />

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-300 mt-10">
          Pastelería Daluzed · Sistema de Inventario
        </p>
      </div>
    </div>
  );
}
