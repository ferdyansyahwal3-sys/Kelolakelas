import { createHash } from "node:crypto";

/** Hash kode undangan (huruf besar, tanpa spasi). Hanya untuk kode server; jangan diimpor dari komponen client. */
export const hashKode = (kode: string) => createHash("sha256").update(kode.trim().toUpperCase()).digest("hex");
