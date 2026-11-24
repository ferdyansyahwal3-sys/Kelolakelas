import { GRACE_HARI, TANGGUH_HARI } from "./langganan";
import { JENIS, PAKET, TRIAL_HARI as TRIAL, rupiah } from "./paketLangganan";

export interface BagianHukum { id: string; judul: string; isi: string[]; butir?: string[] }
export interface DokumenHukum { judul: string; ringkas: string; diperbarui: string; bagian: BagianHukum[] }

/** Tanggal naskah ini ditulis. Ganti saat isi diubah atau setelah ditinjau ahli hukum. */
export const NASKAH_DIPERBARUI = "2026-11-23";
export const TRIAL_HARI = TRIAL;
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export const privasi: DokumenHukum = {
  judul: "Kebijakan Privasi",
  ringkas: "Data apa yang kami simpan, untuk apa, dan hak kamu atasnya, termasuk data anak.",
  diperbarui: NASKAH_DIPERBARUI,
  bagian: [
    {
      id: "untuk-siapa", judul: "Dokumen ini berlaku untuk siapa",
      isi: ["Kebijakan ini berlaku untuk dua kelompok yang berbeda:"],
      butir: [
        "Pemilik usaha dan pelatih yang memakai KelolaKelas untuk mengelola les. Mereka membuat akun dan berlangganan.",
        "Murid dan orang tua/wali yang mendaftar les ke sebuah usaha. Mereka tidak perlu membuat akun KelolaKelas. Datanya dimasukkan lewat form pendaftaran milik usaha tempat mereka les.",
      ],
    },
    {
      id: "peran", judul: "Siapa yang memegang data",
      isi: [
        "KelolaKelas adalah aplikasi untuk pelatih dan pengelola les. Ada dua pihak yang berbeda, dan peran keduanya berbeda juga.",
        "Pemilik usaha (pelatih, studio, atau lembaga) memutuskan data murid apa yang dikumpulkan dan untuk apa. Dalam bahasa UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022), pemilik usaha adalah pengendali data untuk data murid dan orang tua mereka.",
        "KelolaKelas menyimpan dan memproses data itu atas perintah pemilik usaha, sebagai prosesor data. Untuk data akun pemilik usaha sendiri dan data tagihan langganan, KelolaKelas yang menjadi pengendali.",
      ],
    },
    {
      id: "data", judul: "Data yang kami simpan",
      isi: ["Data yang masuk ke KelolaKelas hanya yang dibutuhkan untuk menjalankan les:"],
      butir: [
        "Murid dan orang tua/wali: nama, usia atau kategori (anak/dewasa), nomor WhatsApp, nama orang tua/wali untuk murid anak.",
        "Pendaftaran dan sesi: slot yang dipilih, paket, kehadiran (hadir, izin, alpa), catatan perkembangan dari pelatih.",
        "Pembayaran: nominal, status, dan bukti bayar yang diunggah (foto atau PDF). Nomor kartu tidak pernah kami simpan.",
        "Pemilik usaha dan pelatih: nama, email, nama usaha, serta pengaturan usaha.",
        "Teknis: catatan akses seperlunya untuk keamanan dan memperbaiki gangguan.",
      ],
    },
    {
      id: "anak", judul: "Data anak",
      isi: [
        "Banyak murid adalah anak. Menurut UU PDP, data anak diproses dengan persetujuan orang tua atau wali. Karena itu form pendaftaran untuk murid anak diisi oleh orang tua/wali, dan nama serta nomor WhatsApp yang tercatat adalah milik orang tua/wali.",
        "Data anak yang tersimpan dibatasi pada nama, usia, kehadiran, dan catatan perkembangan latihan. Kami tidak meminta foto wajah, alamat rumah, atau data sekolah anak.",
        "Pemilik usaha bertanggung jawab memastikan persetujuan orang tua/wali ada sebelum mendaftarkan anak. Link portal murid bersifat pribadi: siapa pun yang memegang link bisa melihat data murid itu, jadi bagikan hanya kepada orang tua/wali.",
      ],
    },
    {
      id: "tujuan", judul: "Untuk apa data dipakai",
      isi: ["Data dipakai hanya untuk:"],
      butir: [
        "menjalankan jadwal, kuota, pendaftaran, absensi, dan tagihan les;",
        "menampilkan status pendaftaran dan portal kepada murid atau orang tua/wali yang bersangkutan;",
        "menagih dan memproses langganan KelolaKelas;",
        "mengirim pengingat dan pemberitahuan yang berkaitan dengan les atau langganan;",
        "menjaga keamanan dan memperbaiki gangguan layanan.",
      ],
    },
    {
      id: "tidak", judul: "Yang tidak kami lakukan",
      isi: ["Kami tidak menjual data murid atau pemilik usaha. Kami tidak memakai data murid untuk iklan, dan tidak membagikannya ke pemilik usaha lain. Antar usaha, data dipisahkan oleh aturan akses di database sehingga satu usaha tidak bisa membaca usaha lain."],
    },
    {
      id: "pihak-ketiga", judul: "Pihak ketiga yang membantu",
      isi: ["Untuk menjalankan layanan, kami memakai penyedia berikut. Mereka hanya menerima data seperlunya:"],
      butir: [
        "Supabase: penyimpanan database dan berkas bukti bayar.",
        "DuitKu: pemrosesan pembayaran langganan (QRIS, virtual account, e-wallet).",
        "Resend: pengiriman email tagihan dan pengingat.",
        "WhatsApp: kami hanya menyiapkan pesan siap kirim; pengiriman dilakukan dari akun WhatsApp pemilik usaha atau pengguna sendiri.",
      ],
    },
    {
      id: "simpan", judul: "Berapa lama data disimpan",
      isi: [
        `Selama usaha berlangganan, data disimpan. Bila langganan berhenti, usaha masuk masa tangguh selama ${TANGGUH_HARI} hari: pemilik masih bisa melihat dan mengekspor data. Setelah itu data diarsipkan dan dapat dihapus atas permintaan.`,
        "Bukti bayar dan data tagihan dapat kami simpan lebih lama bila diperlukan untuk pembukuan atau penyelesaian sengketa.",
      ],
    },
    {
      id: "hak", judul: "Hak kamu",
      isi: ["Sesuai UU PDP, kamu berhak:"],
      butir: [
        "mengetahui data apa yang tersimpan tentang kamu atau anakmu;",
        "meminta data dikoreksi bila salah;",
        "meminta data dihapus atau penggunaannya dihentikan, sepanjang tidak bertentangan dengan kewajiban hukum;",
        "menarik persetujuan yang pernah diberikan;",
        "mendapat salinan data (pemilik usaha bisa mengekspor data murid dan tagihan dalam format CSV kapan saja).",
      ],
    },
    {
      id: "keamanan", judul: "Keamanan",
      isi: [
        "Koneksi dienkripsi (HTTPS). Data tiap usaha dipisahkan lewat aturan akses di database. Bukti bayar disimpan di penyimpanan privat yang tidak bisa dibuka tanpa izin. Link portal murid memakai kode acak panjang yang tidak bisa ditebak dan bisa dicabut oleh pemilik usaha.",
        "Tidak ada sistem yang sepenuhnya kebal. Bila terjadi kebocoran yang berisiko bagi kamu, kami akan memberi tahu pihak yang terdampak sesuai ketentuan yang berlaku.",
      ],
    },
    {
      id: "kontak", judul: "Menghubungi kami",
      isi: [
        "Untuk pertanyaan, koreksi, atau permintaan penghapusan data, hubungi pemilik usaha tempat kamu atau anakmu les. Untuk hal yang menjadi tanggung jawab KelolaKelas, hubungi kami di [alamat email kontak, diisi sebelum rilis publik].",
        "Kebijakan ini bisa berubah. Perubahan penting diumumkan di halaman ini dan lewat email untuk pemilik usaha.",
      ],
    },
  ],
};

export const syarat: DokumenHukum = {
  judul: "Syarat Layanan",
  ringkas: "Aturan memakai KelolaKelas: akun, langganan, pembayaran, dan data kamu.",
  diperbarui: NASKAH_DIPERBARUI,
  bagian: [
    {
      id: "untuk-siapa", judul: "Syarat ini untuk siapa",
      isi: [
        "Syarat Layanan ini untuk pemilik usaha dan pelatih yang memakai KelolaKelas untuk mengelola les. Ini bukan syarat untuk mendaftar les.",
        "Murid atau orang tua yang mendaftar les ke sebuah usaha mengikuti aturan sesi dan syarat milik usaha itu, yang tampil di form pendaftaran dan portal murid. Cara KelolaKelas memperlakukan data mereka diatur di Kebijakan Privasi.",
      ],
    },
    {
      id: "layanan", judul: "Tentang layanan",
      isi: [
        "KelolaKelas membantu pelatih dan pengelola les mengatur jadwal, kuota sesi, pendaftaran, pembayaran, dan murid, lewat halaman pribadi untuk usaha masing-masing. KelolaKelas bukan penyedia les dan bukan pihak dalam hubungan antara pemilik usaha dan muridnya.",
        "Dengan membuat akun atau memakai layanan, kamu setuju dengan syarat ini. Bila kamu mendaftar atas nama usaha, kamu menyatakan berwenang melakukannya.",
      ],
    },
    {
      id: "akun", judul: "Akun",
      isi: [
        "Kamu bertanggung jawab atas keamanan akunmu dan atas semua yang terjadi lewat akun itu. Beri tahu kami bila akunmu dipakai orang lain tanpa izin.",
        "Informasi yang kamu isi harus benar. Alamat link usaha (misalnya kelolakelas.id/u/nama-usahamu) tidak boleh menyerupai pihak lain atau menyesatkan.",
      ],
    },
    {
      id: "trial", judul: "Masa coba dan paket",
      isi: [`Setiap usaha baru mendapat masa coba gratis ${TRIAL_HARI} hari tanpa kartu. Setelah itu kamu bisa memilih paket berbayar:`],
      butir: [
        `Guru Les (kamu mengajar sendiri, 1 pengajar): ${JENIS.guru_les.paket.map((k) => `${PAKET[k].nama} ${rupiah(PAKET[k].hargaNormal)}`).join(", ")} per bulan.`,
        `Agensi/Club (banyak pelatih): ${JENIS.agensi.paket.map((k) => `${PAKET[k].nama} ${rupiah(PAKET[k].hargaNormal)}`).join(", ")} per bulan.`,
        "Harga di atas adalah harga normal. Pada jendela waktu promo yang tertera di halaman Harga, harga promo berlaku untuk semua orang; di luar jendela itu berlaku harga normal. Batas murid, pelatih, dan fitur tiap paket tercantum di halaman Harga.",
        "Paket tahunan: bayar 10 bulan untuk 12 bulan.",
        "Harga dan isi paket bisa berubah. Perubahan tidak berlaku untuk periode yang sudah dibayar.",
      ],
    },
    {
      id: "bayar", judul: "Pembayaran dan masa aktif",
      isi: [
        "Langganan dibayar per periode lewat tagihan yang kami terbitkan. Pembayaran lewat DuitKu atau, bila disepakati, transfer bank yang kami aktifkan secara manual. Perpanjangan tidak otomatis memotong rekening kamu.",
        "Bayar lebih awal tidak menghanguskan sisa hari: periode baru dimulai dari akhir periode berjalan. Bayar terlambat memulai periode dari tanggal pembayaran.",
        "Pembayaran yang sudah masuk tidak dapat dikembalikan, kecuali ada kesalahan dari pihak kami atau diwajibkan hukum.",
      ],
    },
    {
      id: "telat", judul: "Bila langganan tidak dibayar",
      isi: ["Akses diturunkan bertahap, bukan langsung dimatikan:"],
      butir: [
        `Jatuh tempo (${GRACE_HARI} hari setelah periode berakhir): semua fitur tetap jalan, dengan peringatan.`,
        `Ditangguhkan (${TANGGUH_HARI} hari berikutnya): kamu hanya bisa melihat dan mengekspor data; halaman pendaftaran publik usahamu ditutup sementara.`,
        "Berhenti: akses ditutup dan data diarsipkan. Kamu bisa meminta data diekspor atau dihapus.",
        "Membayar kapan pun sebelum data dihapus mengaktifkan kembali akses.",
      ],
    },
    {
      id: "data", judul: "Data murid kamu",
      isi: [
        "Data murid dan orang tua yang kamu masukkan tetap milikmu. Kamu bertanggung jawab memastikan punya hak dan persetujuan yang sah untuk memasukkannya, termasuk persetujuan orang tua/wali untuk murid anak.",
        "Kamu bisa mengekspor data murid dan tagihan kapan saja. Cara kami memproses data diatur di Kebijakan Privasi.",
      ],
    },
    {
      id: "larangan", judul: "Yang tidak boleh",
      isi: ["Kamu tidak boleh memakai KelolaKelas untuk:"],
      butir: [
        "kegiatan yang melanggar hukum, atau menyesatkan dan menipu murid maupun orang tua;",
        "mengirim spam atau pesan yang tidak diminta ke murid atau orang lain;",
        "mencoba membuka data usaha lain, mengganggu layanan, atau mengakali pembatasan paket;",
        "menyimpan data yang tidak dibutuhkan untuk les, misalnya data sensitif anak yang tidak berkaitan dengan latihan.",
      ],
    },
    {
      id: "tanggung", judul: "Tanggung jawab",
      isi: [
        "Kami berusaha menjaga layanan tetap berjalan dan datanya aman, tetapi layanan diberikan apa adanya. Tidak ada jaminan bebas gangguan sepanjang waktu.",
        "Sejauh diizinkan hukum, tanggung jawab kami terbatas pada jumlah yang kamu bayarkan untuk langganan dalam 3 bulan terakhir. Hubungan antara kamu dan murid, termasuk keselamatan dan mutu les, sepenuhnya tanggung jawabmu.",
      ],
    },
    {
      id: "berhenti", judul: "Berhenti dan perubahan",
      isi: [
        "Kamu bisa berhenti kapan saja dengan tidak memperpanjang. Kami dapat menangguhkan atau menutup akun yang melanggar syarat ini, dengan pemberitahuan bila memungkinkan.",
        "Syarat ini bisa diubah. Perubahan penting diberitahukan lewat email atau di dalam aplikasi sebelum berlaku. Memakai layanan setelah itu berarti kamu menerima perubahannya.",
        "Syarat ini tunduk pada hukum Republik Indonesia.",
      ],
    },
    {
      id: "kontak", judul: "Kontak",
      isi: ["Pertanyaan soal syarat ini bisa dikirim ke [alamat email kontak, diisi sebelum rilis publik]."],
    },
  ],
};
