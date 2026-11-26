import { headers } from "next/headers";
import { ATURAN, ambilIp, kunciIp, type AksiBatas } from "./rateLimit";
import { klienAdmin } from "./supabase/server";

/** true = lanjut, false = terlalu sering. Bila database galat, dibiarkan lolos (jangan menutup layanan karena penghitung rusak). */
export async function bolehLanjut(aksi: AksiBatas): Promise<boolean> {
  try {
    const garam = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!garam) return true;
    const ip = ambilIp(headers().get("x-forwarded-for"));
    const { maks, detik } = ATURAN[aksi];
    const { data, error } = await klienAdmin().rpc("cek_rate_limit", { p_kunci: kunciIp(ip, garam), p_aksi: aksi, p_maks: maks, p_detik: detik });
    if (error) return true;
    return data === true;
  } catch { return true; }
}
