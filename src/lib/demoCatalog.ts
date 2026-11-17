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
    description: "50 kg li qopdagi oliy nav bug‘doy uni. Non, xamir va konditer mahsulotlari uchun. Quruq joyda saqlang. Rasm manbalari (Wikimedia Commons): «A man carring wheat flour sacks for sale» (CC BY-SA 4.0), «Weizenmehl Type 405» (CC BY-SA 3.0), «Uskladněná mouka» (CC BY 3.0), «Men loading wheat sacks at Flour Mill Port Adelaide» (CC0).",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/A_man_carring_wheat_flour_sacks_for_sale.jpg/960px-A_man_carring_wheat_flour_sacks_for_sale.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Weizenmehl_Type_405.jpg/960px-Weizenmehl_Type_405.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Uskladn%C4%9Bn%C3%A1_mouka.JPG/960px-Uskladn%C4%9Bn%C3%A1_mouka.JPG",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Men_loading_wheat_sacks_at_Flour_Mill_Port_Adelaide%28GN02259%29.jpg/960px-Men_loading_wheat_sacks_at_Flour_Mill_Port_Adelaide%28GN02259%29.jpg",
    ],
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
    description: "50 kg li qopdagi oq donador shakar. Choy, sharbat va konditer mahsulotlari uchun. Quruq joyda saqlang. Rasm manbalari (Wikimedia Commons): «Kenana sugar Kosti» (CC BY 3.0), «Sacks of raw sugar in the Philippines» (CC BY-SA 3.0), «Filling sugar sacks, Hawaii» (ommaviy mulk), «Filling, weighing and sewing 25 lb sacks of sugar» (ommaviy mulk).",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Kenana_sugar_Kosti.jpg/960px-Kenana_sugar_Kosti.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Sacks_of_raw_sugar_in_the_Philippines.jpg/960px-Sacks_of_raw_sugar_in_the_Philippines.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Filling_sugar_sacks%2C_Hawaii.jpg/960px-Filling_sugar_sacks%2C_Hawaii.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Filling%2C_weighing_and_sewing_25_lb_sacks_of_sugar_LCCN2016824512.jpg/960px-Filling%2C_weighing_and_sewing_25_lb_sacks_of_sugar_LCCN2016824512.jpg",
    ],
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
    description: "25 kg li qopdagi Lazer navli guruch. Palov va boshqa taomlar uchun. Quruq joyda saqlang. Rasm manbalari (Wikimedia Commons): «AAA Golden Boy Fragrant Rice Sack» (1 va 2-rasm, CC BY-SA 4.0).",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/AAA_Golden_Boy_Fragrant_Rice_Sack_%281%29.jpg/960px-AAA_Golden_Boy_Fragrant_Rice_Sack_%281%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/AAA_Golden_Boy_Fragrant_Rice_Sack_%282%29.jpg/960px-AAA_Golden_Boy_Fragrant_Rice_Sack_%282%29.jpg",
    ],
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
