import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SplashAwal } from "@/components/SplashAwal";
import { BarNavigasi } from "@/components/BarNavigasi";

// Font lokal (variable, subset latin, lisensi OFL dari @fontsource-variable): build tidak lagi mengambil CSS Google Fonts.
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", display: "swap", variable: "--f-inter" });
const tight = localFont({ src: "./fonts/inter-tight-latin-wght-normal.woff2", weight: "100 900", display: "swap", variable: "--f-tight" });
const archivo = localFont({
  src: "./fonts/archivo-latin-wdth-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--f-archivo",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  title: "KelolaKelas",
  description: "Jadwal, kuota, pendaftaran, dan tagihan les dalam satu link.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1d4d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="gelap" suppressHydrationWarning className={`${inter.variable} ${tight.variable} ${archivo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('kk-tema');if(t==='gelap'||t==='terang')document.documentElement.setAttribute('data-theme',t)}catch(e){}try{var d=location.pathname.indexOf('/demo')===0?'kk-demo-side':'kk-side',v=localStorage.getItem(d);if(v==='buka'||v==='ciut')document.documentElement.setAttribute('data-side',v)}catch(e){}try{var q=location.pathname;if(window.self===window.top&&!sessionStorage.getItem('kk-splash')&&/^\\/(app|pengajar|masuk|daftar-usaha|demo|platform)(\\/|$)/.test(q))document.documentElement.setAttribute('data-splash','ya')}catch(e){}" }} />
      </head>
      <body>
        <SplashAwal />
        <BarNavigasi />
        {children}
      </body>
    </html>
  );
}
