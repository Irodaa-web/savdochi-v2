import clsx from "clsx";
import { BrandImage, coverFor, initials } from "@/components/catalog/BrandImage";

const SIZES = { xs: "size-6 rounded-md text-[10px]", sm: "size-8 rounded-lg text-[11px]", md: "size-10 rounded-xl text-[13px]", lg: "size-14 rounded-2xl text-[16px]" } as const;
const PX = { xs: "24px", sm: "32px", md: "40px", lg: "56px" } as const;

/**
 * Hisob rasmi (kompaniya logotipi yoki do'kon rasmi). Rasm bo'lmasa — hisobning o'z rangidagi
 * gradient fonda bosh harflar (har hisob o'z rangida, kulrang doira emas). Hamma ro'yxatlarda bir xil.
 */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold text-white shadow-sm ring-1 ring-black/5",
        SIZES[size],
        !src && ["bg-gradient-to-br", coverFor(name)],
        className,
      )}
    >
      {src ? <BrandImage src={src} sizes={PX[size]} className="bg-white object-cover" /> : initials(name)}
    </span>
  );
}
