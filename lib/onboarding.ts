export interface DataOnboarding {
  profil: { nama: string; kategori: string; kota: string; slug: string };
  paketAktif: number;
  slot: number;
  rekening: number;
  linkDibagikan: boolean;
  murid: number;
}

export interface Langkah { id: "profil" | "paket" | "jadwal" | "rekening" | "link" | "murid"; judul: string; ket: string; href: string; selesai: boolean }

/** Profil dianggap lengkap bila nama, kategori, kota, dan alamat link sudah diisi dengan benar. */
export function profilLengkap(p: DataOnboarding["profil"]): boolean {
  return p.nama.trim().length >= 3 && p.kategori.trim().length > 0 && p.kota.trim().length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) && p.slug.length >= 3;
}

export function hitungChecklist(d: DataOnboarding): { langkah: Langkah[]; selesai: number; total: number; persen: number; berikutnya: Langkah | null; lengkap: boolean } {
  const langkah: Langkah[] = [
    { id: "profil", judul: "Lengkapi profil usaha", ket: "Nama, kategori, kota, dan alamat link", href: "/app/pengaturan", selesai: profilLengkap(d.profil) },
    { id: "paket", judul: "Atur paket dan harga", ket: "Minimal satu paket aktif", href: "/app/paket", selesai: d.paketAktif >= 1 },
    { id: "jadwal", judul: "Buat jadwal dan kuota", ket: "Minimal satu slot latihan", href: "/app/jadwal", selesai: d.slot >= 1 },
    { id: "rekening", judul: "Isi rekening pembayaran", ket: "Supaya murid tahu ke mana transfer", href: "/app/pengaturan", selesai: d.rekening >= 1 },
    { id: "link", judul: "Bagikan link pendaftaran", ket: "Salin lalu kirim ke grup WA", href: `/u/${d.profil.slug}`, selesai: d.linkDibagikan },
    { id: "murid", judul: "Terima murid pertama", ket: "Setelah ada pendaftaran, ACC dari menu Pendaftaran", href: "/app/pendaftaran", selesai: d.murid >= 1 },
  ];
  const selesai = langkah.filter((l) => l.selesai).length;
  return { langkah, selesai, total: langkah.length, persen: Math.round((selesai / langkah.length) * 100), berikutnya: langkah.find((l) => !l.selesai) ?? null, lengkap: selesai === langkah.length };
}
