import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";

const menu = [
  { href: "/app/pengaturan", nama: "Pengaturan", ket: "Profil, tema, rekening, aturan sesi", icon: "grid", siap: true },
  { href: "/app/paket", nama: "Paket dan harga", ket: "Jumlah sesi, masa berlaku, harga", icon: "doc", siap: true },
  { href: "/app/jadwal", nama: "Jadwal dan kuota", ket: "Slot per pengajar", icon: "cal", siap: true },
  { href: "/app/promo", nama: "Promo dan referral", ket: "Kode diskon murid", icon: "tag", siap: true },
  { href: "/app/rekap", nama: "Rekap pemasukan", ket: "Per bulan, paket, dan bagi hasil", icon: "chart", siap: true },
  { href: "/app/pengajar", nama: "Pengajar", ket: "Undang dan atur bagi hasil", icon: "users", siap: true },
  { href: "/app/langganan", nama: "Langganan", ket: "Paket KelolaKelas kamu", icon: "bill", siap: true },
];

export default function Lainnya() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Lainnya" icon="grid" />
      <div className="surface">
        {menu.map((m) => {
          const isi = (
            <>
              <span className="circ"><Icon name={m.icon} /></span>
              <span className="grow"><span className="name" style={{ display: "block" }}>{m.nama}</span><span className="meta">{m.ket}</span></span>
              {m.siap ? <Icon name="arrow" /> : <span className="st st-free">Segera</span>}
            </>
          );
          return m.siap ? (
            <Link key={m.nama} href={m.href} className="item" style={{ borderTop: 0 }}>{isi}</Link>
          ) : (
            <div key={m.nama} className="item item-off" style={{ borderTop: 0 }} aria-disabled="true">{isi}</div>
          );
        })}
      </div>
    </main>
  );
}
