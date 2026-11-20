/**
 * Rasmni yuklashdan oldin brauzerda kichraytirish (faqat mijoz tomonida ishlaydi).
 * Telefon surati (3–8 MB, 4000 px) → eng uzun tomoni 1600 px, JPEG ~85% sifat (odatda 200–500 KB).
 * Natija kattaroq chiqsa yoki brauzer qo'llamasa — asl fayl qaytariladi (hech narsa buzilmaydi).
 */
export const MAX_SIDE = 1600;
const SMALL_ENOUGH = 600 * 1024;

export async function compressImage(file: File, maxSide = MAX_SIDE, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    // EXIF bo'yicha burish hisobga olinadi (telefonda yonboshlab tushgan suratlar to'g'ri turadi).
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // PNG'dagi shaffof joy JPEG'da qora bo'lib qolmasin.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
