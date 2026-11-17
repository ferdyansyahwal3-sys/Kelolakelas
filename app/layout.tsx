import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Archivo } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-inter" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["300", "500", "600"], variable: "--f-tight" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--f-archivo" });

export const metadata: Metadata = {
  title: "KelolaKelas",
  description: "Jadwal, kuota, pendaftaran, dan tagihan les dalam satu link.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1d4d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="gelap" suppressHydrationWarning className={`${inter.variable} ${tight.variable} ${archivo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('kk-tema');if(t==='gelap'||t==='terang')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
