import type { CategoryCode, PriceTier, UnitCode } from "@/lib/catalog";

/**
 * Demo kompaniyalarning namuna mahsulotlari (DEMO_MODE da yaratiladi).
 * Rasmlar — 4 ta: oldi, orqasi, yoni, yuqoridan (PRODUCT_ANGLES tartibida).
 */
export interface DemoProduct {
  seller: "seller" | "seller2";
  name: string;
  category: CategoryCode;
  unit: UnitCode;
  /** Bir birlik narxi, so'mda. */
  price: number;
  minOrder: number;
  stock: number;
  /** Bir birlikdagi dona soni (blokda 6 ta shisha). */
  packSize: number;
  priceTiers: PriceTier[];
  description: string;
  images: string[];
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    seller: "seller",
    name: "Paxta yog‘i, 5 l",
    category: "food",
    unit: "piece",
    price: 98000,
    minOrder: 10,
    stock: 400,
    packSize: 1,
    priceTiers: [
      { min: 50, price: 94000 },
      { min: 100, price: 91000 },
    ],
    description: "5 litrli idishdagi tozalangan paxta yog‘i. Kundalik ovqat tayyorlash uchun. Muhrlangan idishni quruq, salqin joyda saqlang.",
    images: [],
  },
  {
    seller: "seller",
    name: "Un, oliy nav, 50 kg",
    category: "food",
    unit: "bag",
    price: 310000,
    minOrder: 5,
    stock: 120,
    packSize: 1,
    priceTiers: [{ min: 20, price: 299000 }],
    description: "50 kg li qopdagi oliy nav bug‘doy uni. Non, xamir va konditer mahsulotlari uchun. Quruq joyda saqlang.",
    images: [],
  },
  {
    seller: "seller",
    name: "Shakar, 50 kg",
    category: "food",
    unit: "bag",
    price: 420000,
    minOrder: 2,
    stock: 80,
    packSize: 1,
    priceTiers: [],
    description: "50 kg li qopdagi oq donador shakar. Choy, sharbat va konditer mahsulotlari uchun. Quruq joyda saqlang.",
    images: [],
  },
  {
    seller: "seller",
    name: "Guruch Lazer, 25 kg",
    category: "food",
    unit: "bag",
    price: 375000,
    minOrder: 4,
    stock: 60,
    packSize: 1,
    priceTiers: [],
    description: "25 kg li qopdagi Lazer navli guruch. Palov va boshqa taomlar uchun. Quruq joyda saqlang.",
    images: [],
  },
  {
    seller: "seller2",
    name: "Gazlangan suv, 1.5 l",
    category: "drinks",
    unit: "block",
    price: 36000,
    minOrder: 20,
    stock: 900,
    packSize: 6,
    priceTiers: [{ min: 100, price: 33000 }],
    description: "1,5 litrli gazlangan suv. Bir blokda 6 ta shisha. Sovutib iste’mol qiling.",
    images: [],
  },
  {
    seller: "seller2",
    name: "Sharbat, 1 l",
    category: "drinks",
    unit: "block",
    price: 72000,
    minOrder: 10,
    stock: 300,
    packSize: 12,
    priceTiers: [],
    description: "1 litrli meva sharbati. Bir blokda 12 ta idish. Sovutib iste’mol qiling.",
    images: [],
  },
];
