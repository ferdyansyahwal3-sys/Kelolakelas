/** Kerangka halaman owner saat data dimuat (kilau halus, tanpa spinner). Bentuknya mirip halaman daftar: kepala, kartu besar, beberapa baris. */
export function SkeletonHalaman() {
  return (
    <main className="scroll sk-halaman" aria-busy="true" aria-label="Memuat halaman">
      <div className="hrow">
        <span className="skel sk-bulat" />
        <div className="t" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span className="skel" style={{ width: "46%", height: 16 }} /><span className="skel" style={{ width: "28%" }} /></div>
        <span className="skel sk-bulat" />
      </div>
      <div className="surface sk-kartu"><span className="skel" style={{ width: "34%" }} /><span className="skel" style={{ width: "62%", height: 28 }} /><span className="skel" style={{ width: "48%" }} /></div>
      <div className="surface">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="item">
            <span className="skel sk-bulat" />
            <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span className="skel" style={{ width: `${58 - i * 4}%`, height: 12 }} /><span className="skel" style={{ width: "34%" }} /></div>
            <span className="skel" style={{ width: 52, height: 22, borderRadius: 99 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
