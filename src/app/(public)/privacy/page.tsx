import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalDoc } from "@/content/legal";
import { getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: legalDoc("privacy", await getLocale()).title };
}

export default function Page() {
  return <LegalPage kind="privacy" />;
}
