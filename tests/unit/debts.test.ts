import { describe, expect, it } from "vitest";
import { allocateFifo } from "@/lib/debts";

describe("to'lovni taqsimlash (FIFO)", () => {
  const orders = [
    { id: "a", total: 1000, paid: 1000 },
    { id: "b", total: 1000, paid: 400 },
    { id: "c", total: 500, paid: 0 },
  ];
  it("to'langan buyurtma o'tkazib yuboriladi, eng eskidan boshlanadi", () => {
    expect(allocateFifo(orders, 800)).toEqual({ allocations: [{ id: "b", amount: 600 }, { id: "c", amount: 200 }], rest: 0 });
  });
  it("aniq qarz summasi hammasini yopadi", () => {
    expect(allocateFifo(orders, 1100)).toEqual({ allocations: [{ id: "b", amount: 600 }, { id: "c", amount: 500 }], rest: 0 });
  });
  it("ortiqcha summa qaytadi", () => expect(allocateFifo(orders, 2000).rest).toBe(900));
  it("nol summa", () => expect(allocateFifo(orders, 0)).toEqual({ allocations: [], rest: 0 }));
});
