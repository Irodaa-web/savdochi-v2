import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en";
import ru from "@/i18n/dictionaries/ru";
import uz from "@/i18n/dictionaries/uz";

type Tree = string | Tree[] | { [k: string]: Tree };
/** Lug'atni "bo'lim.kalit" → matn ko'rinishiga yoyadi (massivlar va ichma-ich obyektlar bilan). */
function flatten(node: Tree, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") out.set(prefix, node);
  else if (Array.isArray(node)) node.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
  else for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("tarjimalar", () => {
  const base = flatten(uz as unknown as Tree);
  for (const [name, dict] of [["ru", ru], ["en", en]] as const) {
    const other = flatten(dict as unknown as Tree);
    it(`${name}: kalitlar uz bilan bir xil`, () => expect([...other.keys()].sort()).toEqual([...base.keys()].sort()));
    it(`${name}: bo'sh matn yo'q va {o'zgaruvchilar} mos`, () => {
      for (const [key, text] of base) {
        const tr = other.get(key) ?? "";
        expect(tr.trim(), key).not.toBe("");
        expect(placeholders(tr), key).toEqual(placeholders(text));
      }
    });
  }
});
