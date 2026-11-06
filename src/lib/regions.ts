export const REGION_CODES = [
  "tashkent_city",
  "tashkent",
  "andijan",
  "bukhara",
  "fergana",
  "jizzakh",
  "khorezm",
  "namangan",
  "navoi",
  "kashkadarya",
  "karakalpakstan",
  "samarkand",
  "syrdarya",
  "surkhandarya",
] as const;

export type RegionCode = (typeof REGION_CODES)[number];
