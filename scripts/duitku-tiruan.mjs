// Server DuitKu TIRUAN untuk uji lokal (bukan DuitKu asli). Menjalankan: node scripts/duitku-tiruan.mjs
// Env: MOCK_MERCHANT, MOCK_KEY (wajib, sama dengan DUITKU_MERCHANT_CODE/DUITKU_API_KEY app uji), MOCK_PORT (3199),
//      APP_CALLBACK_URL (bawaan http://localhost:3100/api/duitku/callback).
// Tanda tangan HMAC-SHA256 sesuai docs.duitku.com. Endpoint kendali uji: GET /_state, POST /_bayar?order=&callback=1, POST /_callback?order=&hasil=00&salah=1&jumlah=
import http from "node:http";
import { createHmac } from "node:crypto";

const KODE = process.env.MOCK_MERCHANT, KUNCI = process.env.MOCK_KEY, PORT = Number(process.env.MOCK_PORT ?? 3199);
const CB = process.env.APP_CALLBACK_URL ?? "http://localhost:3100/api/duitku/callback";
if (!KODE || !KUNCI) { console.error("MOCK_MERCHANT dan MOCK_KEY wajib"); process.exit(1); }
const hmac = (s) => createHmac("sha256", KUNCI).update(s).digest("hex");
const pesanan = new Map(); // merchantOrderId -> { jumlah, metode, ref, status, returnUrl, callbackUrl }
const METODE = [["VA", "MAYBANK VA", 0], ["BT", "PERMATA VA", 3500], ["M2", "MANDIRI VA", 4000], ["SP", "QRIS SHOPEEPAY", "0.7%"]];

const baca = (req) => new Promise((ok) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => ok(b)); });
const json = (res, kode, o) => { res.writeHead(kode, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
const hurufBesar = (x) => String(x);

async function kirimCallback(id, { hasil = "00", salah = false, jumlah } = {}) {
  const p = pesanan.get(id); if (!p) return { status: 0, badan: "tidak ada" };
  const amount = String(jumlah ?? p.jumlah);
  const sig = hmac(`${KODE}${amount}${id}`);
  const f = new URLSearchParams({ merchantCode: KODE, amount, merchantOrderId: id, productDetail: "uji", additionalParam: "", paymentCode: p.metode, resultCode: hasil, merchantUserId: "uji@example.com", reference: p.ref, signature: salah ? "0".repeat(64) : sig, publisherOrderId: "PUB" + p.ref, settlementDate: "2026-11-30" });
  try { const r = await fetch(p.callbackUrl || CB, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: f.toString() }); return { status: r.status, badan: await r.text() }; }
  catch (e) { return { status: -1, badan: String(e) }; }
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const raw = req.method === "POST" ? await baca(req) : "";
  let b = {}; try { b = raw ? JSON.parse(raw) : {}; } catch { b = Object.fromEntries(new URLSearchParams(raw)); }
  const p = u.pathname.replace(/^\/webapi\/api\/merchant/, "");

  if (p === "/paymentmethod/getpaymentmethod") {
    if (b.merchantcode !== KODE || b.signature !== hmac(`${KODE}${b.amount}${b.datetime}`)) return json(res, 400, { Message: "Wrong signature" });
    const daftar = METODE.map(([k, n, f]) => ({ paymentMethod: k, paymentName: n, paymentImage: "", totalFee: String(typeof f === "string" ? Math.ceil(b.amount * 0.007) : f) }));
    return json(res, 200, { paymentFee: daftar, responseCode: "00", responseMessage: "SUCCESS" });
  }
  if (p === "/v2/inquiry") {
    if (b.merchantCode !== KODE || b.signature !== hmac(`${KODE}${b.merchantOrderId}${b.paymentAmount}`)) return json(res, 400, { Message: "Wrong signature" });
    if (pesanan.has(b.merchantOrderId)) return json(res, 400, { Message: "Duplicate merchantOrderId" });
    const ref = "DS" + Math.random().toString(36).slice(2, 10).toUpperCase();
    pesanan.set(b.merchantOrderId, { jumlah: b.paymentAmount, metode: b.paymentMethod, ref, status: "01", returnUrl: b.returnUrl, callbackUrl: b.callbackUrl });
    return json(res, 200, { merchantCode: KODE, reference: ref, paymentUrl: `http://localhost:${PORT}/bayar/${ref}`, vaNumber: "8001", amount: String(b.paymentAmount), statusCode: "00", statusMessage: "SUCCESS" });
  }
  if (p === "/transactionStatus") {
    if (b.merchantCode !== KODE || b.signature !== hmac(`${KODE}${b.merchantOrderId}`)) return json(res, 400, { Message: "Wrong signature" });
    const o = pesanan.get(b.merchantOrderId); if (!o) return json(res, 404, { Message: "Not found" });
    return json(res, 200, { merchantOrderId: b.merchantOrderId, reference: o.ref, amount: String(o.jumlah), fee: "0.00", statusCode: o.status, statusMessage: o.status === "00" ? "SUCCESS" : o.status === "02" ? "CANCELED" : "PROCESS" });
  }
  const bayar = /^\/bayar\/(\w+)(\/(ok|batal))?$/.exec(u.pathname);
  if (bayar) {
    const id = [...pesanan.keys()].find((k) => pesanan.get(k).ref === bayar[1]); const o = id && pesanan.get(id);
    if (!o) { res.writeHead(404); return res.end("tidak ada"); }
    if (bayar[3]) {
      o.status = bayar[3] === "ok" ? "00" : "02";
      if (bayar[3] === "ok") await kirimCallback(id, { hasil: "00" });
      const balik = `${o.returnUrl}?merchantOrderId=${id}&resultCode=${o.status}&reference=${o.ref}`;
      res.writeHead(302, { Location: balik }); return res.end();
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><meta name=viewport content="width=device-width"><body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px"><h2>DuitKu TIRUAN (uji)</h2><p>Order <b>${id}</b><br>Metode ${o.metode}<br>Jumlah <b>Rp ${Number(o.jumlah).toLocaleString("id-ID")}</b></p><form method=post action="/bayar/${bayar[1]}/ok"><button style="padding:12px 18px">Bayar (sukses)</button></form><br><form method=post action="/bayar/${bayar[1]}/batal"><button style="padding:12px 18px">Batalkan</button></form></body>`);
  }
  if (u.pathname === "/_state") return json(res, 200, Object.fromEntries(pesanan));
  if (u.pathname === "/_bayar") { const o = pesanan.get(u.searchParams.get("order")); if (!o) return json(res, 404, {}); o.status = "00"; if (u.searchParams.get("callback")) return json(res, 200, await kirimCallback(u.searchParams.get("order"))); return json(res, 200, { ok: 1 }); }
  if (u.pathname === "/_callback") return json(res, 200, await kirimCallback(u.searchParams.get("order"), { hasil: u.searchParams.get("hasil") ?? "00", salah: u.searchParams.get("salah") === "1", jumlah: u.searchParams.get("jumlah") ?? undefined }));
  res.writeHead(404); res.end("tidak ada");
}).listen(PORT, () => console.log(`DuitKu TIRUAN di http://localhost:${PORT}`));
