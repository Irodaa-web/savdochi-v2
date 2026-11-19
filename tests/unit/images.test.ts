import { describe, expect, it } from "vitest";
import { isOptimizable, isWikimediaThumb, wikimediaLoader } from "@/lib/images";

const wiki = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Bottle_1_liter_Sunflower_refined_oil.jpg/960px-Bottle_1_liter_Sunflower_refined_oil.jpg";
const blob = "https://3djniloasbbypaxp.public.blob.vercel-storage.com/products/abc/1f2e.jpg";

describe("rasm manzillari", () => {
  it("Wikimedia eskizi taniladi, boshqalari — yo'q", () => {
    expect(isWikimediaThumb(wiki)).toBe(true);
    expect(isWikimediaThumb("https://upload.wikimedia.org/wikipedia/commons/3/33/Bottle.jpg")).toBe(false);
    expect(isWikimediaThumb(blob)).toBe(false);
  });

  it("faqat Vercel Blob rasmlari optimizatsiya qilinadi", () => {
    expect(isOptimizable(blob)).toBe(true);
    expect(isOptimizable(wiki)).toBe(false);
    expect(isOptimizable("https://example.com/a.jpg")).toBe(false);
    expect(isOptimizable("https://evil.public.blob.vercel-storage.com.example.com/a.jpg")).toBe(false);
  });

  it("so'ralgan kenglikning kamida 75% iga teng eng kichik tayyor eskiz tanlanadi", () => {
    const at = (width: number) => wikimediaLoader({ src: wiki, width }).match(/\/(\d+)px-[^/]+$/)?.[1];
    expect(at(100)).toBe("120");
    expect(at(256)).toBe("250");
    expect(at(384)).toBe("330");
    expect(at(640)).toBe("500");
    expect(at(1080)).toBe("960");
    expect(at(3840)).toBe("1920");
    expect(wikimediaLoader({ src: wiki, width: 640 })).toBe(wiki.replace("/960px-", "/500px-"));
  });
});
