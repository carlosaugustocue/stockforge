import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "IPN DEV - Inventario",
  description: "Sistema de Gestión de Inventario",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable)}>
      <body className={inter.className}>
        {/* Script para evitar el flash de color (COMENTADO POR MARCA DALUZED) */}
        {/* 
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var color = localStorage.getItem('app-primary-color');
                  if (color) {
                    var hex = color.replace('#', '');
                    var r = parseInt(hex.substring(0, 2), 16);
                    var g = parseInt(hex.substring(2, 4), 16);
                    var b = parseInt(hex.substring(4, 6), 16);
                    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    if (lum > 220) {
                      var f = 0.85;
                      color = '#' + 
                        Math.floor(r*f).toString(16).padStart(2,'0') + 
                        Math.floor(g*f).toString(16).padStart(2,'0') + 
                        Math.floor(b*f).toString(16).padStart(2,'0');
                    }
                    document.documentElement.style.setProperty('--primary', color);
                    document.documentElement.style.setProperty('--secondary', color + 'cc');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
