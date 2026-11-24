import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bacaEnvPublik } from "@/lib/supabase/env";
import { ambilPeran } from "@/lib/supabase/peran";
import { tujuanSetelahMasuk } from "@/lib/daftarUsaha";

/**
 * Penjaga rute. Menyegarkan sesi Supabase (cookie) dan mengarahkan:
 *  - /app/* butuh login + peran owner; /pengajar/* butuh login + peran owner atau pengajar
 *  - /masuk dan /daftar-usaha dilewati bila sudah punya usaha
 * Ini lapisan pertama saja. Penjaga yang sebenarnya adalah RLS di database; jangan mengandalkan middleware untuk keamanan data.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const dilindungi = pathname === "/app" || pathname.startsWith("/app/") || pathname === "/pengajar" || pathname.startsWith("/pengajar/");
  const env = bacaEnvPublik();

  const alihkan = (ke: string, dari?: NextResponse) => {
    const url = req.nextUrl.clone();
    const [path, query] = ke.split("?");
    url.pathname = path!;
    url.search = query ? `?${query}` : "";
    const r = NextResponse.redirect(url);
    dari?.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!env) return dilindungi ? alihkan("/masuk") : NextResponse.next(); // tanpa konfigurasi: tertutup, bukan terbuka

  let res = NextResponse.next({ request: req });
  const db = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (daftar) => {
        daftar.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        daftar.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await db.auth.getClaims();
  const userId = data?.claims?.sub ?? "";
  const masuk = userId !== "";

  if (!masuk) {
    if (dilindungi) return alihkan(`/masuk?lanjut=${encodeURIComponent(pathname + search)}`, res);
    return res;
  }

  const peran = await ambilPeran(db, userId);

  if (pathname === "/masuk") return alihkan(tujuanSetelahMasuk(peran), res);
  if (pathname === "/daftar-usaha") return peran.length > 0 ? alihkan(tujuanSetelahMasuk(peran), res) : res;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (peran.includes("owner")) return res;
    return alihkan(tujuanSetelahMasuk(peran), res);
  }
  if (pathname === "/pengajar" || pathname.startsWith("/pengajar/")) {
    if (peran.length > 0) return res;
    return alihkan("/daftar-usaha", res);
  }
  return res;
}

export const config = {
  matcher: ["/app/:path*", "/pengajar/:path*", "/masuk", "/daftar-usaha"],
};
