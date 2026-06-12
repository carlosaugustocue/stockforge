"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// Definimos qué información va a compartir este Contexto
interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Función de seguridad para evitar colores demasiado claros (que se pierdan contra el blanco)
 */
const clampColor = (hex: string) => {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (luminance > 220) {
    const factor = 0.85; 
    const newR = Math.floor(r * factor).toString(16).padStart(2, '0');
    const newG = Math.floor(g * factor).toString(16).padStart(2, '0');
    const newB = Math.floor(b * factor).toString(16).padStart(2, '0');
    return `#${newR}${newG}${newB}`;
  }
  return hex;
};

/**
 * Proveedor de Tema: Envuelve la aplicación para dar acceso al color global
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Color por defecto (Vino tinto de Daluzed)
  const [primaryColor, setPrimaryColor] = useState("#8B2323");

  // 1. Al cargar la app, buscamos si el usuario ya tenía un color guardado (COMENTADO POR MARCA)
  /*
  useEffect(() => {
    const savedColor = localStorage.getItem("app-primary-color");
    if (savedColor) {
      const safeColor = clampColor(savedColor);
      setPrimaryColor(safeColor);
      applyTheme(safeColor);
    }
  }, []);
  */

  // 2. Función para aplicar el color a las variables CSS del :root
  const applyTheme = (color: string) => {
    const safeColor = clampColor(color);
    const root = document.documentElement;
    root.style.setProperty("--primary", safeColor);

    // Creamos un "secundario" basado en el primario pero con transparencia
    root.style.setProperty("--secondary", `${safeColor}cc`); 

    // localStorage.setItem("app-primary-color", safeColor);
  };

  // 3. Cada vez que el estado 'primaryColor' cambie, ejecutamos la aplicación del tema
  const handleSetPrimaryColor = (color: string) => {
    const safeColor = clampColor(color);
    setPrimaryColor(safeColor);
    applyTheme(safeColor);
  };

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor: handleSetPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el tema fácilmente en cualquier componente
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  return context;
};
