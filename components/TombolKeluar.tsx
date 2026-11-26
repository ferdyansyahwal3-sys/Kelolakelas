import { keluar } from "@/app/(umum)/masuk/actions";

/** Keluar dari akun (server action: menghapus sesi di server, lalu ke /masuk). */
export function TombolKeluar() {
  return (
    <form action={keluar}>
      <button type="submit" className="btn btn-2" style={{ width: "100%" }}>Keluar</button>
    </form>
  );
}
