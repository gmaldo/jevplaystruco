import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JevTruco - Truco Argentino con IA Jev",
  description: "Juego de Truco Argentino impulsado por el modelo System One de TypeSafe AI (Jev)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
