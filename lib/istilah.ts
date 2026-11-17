export interface Istilah {
  murid: string;
  sesi: string;
  pengajar: string;
}

export const istilahBawaan: Istilah = { murid: "murid", sesi: "sesi", pengajar: "pengajar" };

export function getIstilah(dariTenant?: Partial<Istilah> | null): Istilah {
  return { ...istilahBawaan, ...(dariTenant ?? {}) };
}

export function kapital(kata: string): string {
  return kata.charAt(0).toUpperCase() + kata.slice(1);
}
