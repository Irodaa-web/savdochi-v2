import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import uz, { type Dictionary } from "./dictionaries/uz";
import ru from "./dictionaries/ru";
import en from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { uz, ru, en };

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
