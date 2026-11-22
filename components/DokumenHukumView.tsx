import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Icon } from "./Icon";
import type { DokumenHukum } from "@/lib/hukum";

const TGL = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function DokumenHukumView({ dok, lain }: { dok: DokumenHukum; lain: { href: string; label: string } }) {
  return (
    <div className="shell">
      <main className="scroll hukum" style={{ paddingTop: 28 }}>
        <header className="phead">
          <div className="hrow">
            <Link href="/" className="circ" aria-label="Ke beranda KelolaKelas"><Icon name="back" /></Link>
            <div className="t"><div className="label">KelolaKelas</div></div>
            <ThemeToggle />
          </div>
          <h1 className="title">{dok.judul}</h1>
          <p className="label" style={{ margin: 0, lineHeight: 1.5 }}>{dok.ringkas}</p>
          <span className="pill"><span className="dot" />Diperbarui {TGL.format(new Date(dok.diperbarui))}</span>
        </header>

        <nav className="surface" aria-label="Isi halaman" style={{ padding: 16 }}>
          <span className="label l2" style={{ fontWeight: 600 }}>Isi</span>
          <ol className="aturan" style={{ marginTop: 8 }}>
            {dok.bagian.map((b) => <li key={b.id}><a href={`#${b.id}`} className="link">{b.judul}</a></li>)}
          </ol>
        </nav>

        {dok.bagian.map((b, i) => (
          <section key={b.id} id={b.id} className="grp" style={{ scrollMarginTop: 16 }}>
            <h2 className="h2" style={{ color: "var(--head-text)" }}>{i + 1}. {b.judul}</h2>
            <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {b.isi.map((p) => <p key={p} style={{ margin: 0, lineHeight: 1.6, color: "var(--text-2)" }}>{p}</p>)}
              {b.butir && <ul className="aturan" style={{ lineHeight: 1.55 }}>{b.butir.map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
          </section>
        ))}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <Link href={lain.href} className="link">{lain.label}</Link>
          <span className="meta">KelolaKelas · tombol tema ada di kanan atas</span>
        </div>
      </main>
    </div>
  );
}
