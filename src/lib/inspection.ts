import type { InspectionHistoryAction, InspectionItemStatus, InspectionStatus } from "@/types/database";

// Copied from MotorellOps' INSPEKSI_SECTIONS / INS_STATUS so both apps
// inspect the same things. 58 items across 6 sections.
export const INSPEKSI_SECTIONS: { key: string; title: string; items: string[] }[] = [
  { key: "A", title: "Dokumen", items: ["Foto STNK", "Foto BPKB", "Foto Faktur (jika ada)", "Foto Manual Book", "Foto Kunci Utama", "Foto Kunci Cadangan", "Nomor Rangka", "Nomor Mesin", "Verifikasi kesesuaian nomor", "Pemeriksaan UV", "Status Pajak"] },
  { key: "B", title: "Body", items: ["Cover body", "Body halus", "Cover retak", "Cover patah", "Bekas dempul", "Bekas repaint", "Bekas jatuh", "Bekas tabrak", "Kelengkapan body"] },
  { key: "C", title: "Mesin", items: ["Starter", "Idle", "Tarikan", "Kompresi", "Suara mesin", "Kebocoran oli", "Bekas bongkar mesin", "Kondisi fisik mesin", "Asap knalpot", "Colek bagian dalam knalpot", "Getaran"] },
  { key: "D", title: "Rangka", items: ["Nomor rangka", "Bekas las", "Bekas tabrak", "Bekas bengkok", "Karat"] },
  { key: "E", title: "Kaki-kaki", items: ["Ban depan", "Ban belakang", "Velg depan", "Velg belakang", "Suspensi depan", "Suspensi belakang", "Bearing", "Rem depan", "Rem belakang", "Disc", "Kampas rem", "Rantai", "Gear"] },
  { key: "F", title: "Kelistrikan", items: ["Lampu utama", "Lampu jauh", "Lampu rem", "Sein", "Klakson", "Speedometer", "Fuel meter", "Indikator", "Charging system"] },
];

export const INS_STATUS: { k: InspectionItemStatus; l: string; c: string }[] = [
  { k: "baik", l: "Baik", c: "#10b981" },
  { k: "perhatian", l: "Perlu perhatian", c: "#eab308" },
  { k: "masalah", l: "Bermasalah", c: "#ef4444" },
];

export const INS_TOTAL = INSPEKSI_SECTIONS.reduce((a, s) => a + s.items.length, 0);

export function isKnownItem(section: string, item: string): boolean {
  return INSPEKSI_SECTIONS.some((s) => s.key === section && s.items.includes(item));
}

// Indonesian labels, matching MotorellOps. draft and selesai are both
// "not decided yet" to the business, but staff need to tell them apart:
// draft is being filled in right now (and can be watched live).
export const INSPECTION_STATUS_LABEL: Record<InspectionStatus, string> = {
  draft: "Berlangsung",
  selesai: "Pending",
  beli: "Beli",
  tidak: "Tidak dibeli",
};

// Same pastel token pairs the unit status badges use; tidak is red.
export const INSPECTION_STATUS_STYLE: Record<InspectionStatus, string> = {
  draft: "bg-[image:var(--cream-orange-bg)] text-[var(--cream-orange-fg)]",
  selesai: "bg-[image:var(--cream-purple-bg)] text-[var(--cream-purple-fg)]",
  beli: "bg-[image:var(--cream-green-bg)] text-[var(--cream-green-fg)]",
  tidak: "bg-destructive/20 text-destructive",
};

export const HISTORY_ACTION_LABEL: Record<InspectionHistoryAction, string> = {
  created: "Inspeksi dimulai",
  completed: "Inspeksi selesai",
  decided: "Keputusan",
  deleted: "Inspeksi dihapus",
};
