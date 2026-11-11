import type { Dictionary } from "@/i18n/dictionaries/uz";
import { formatPhone } from "@/lib/phone";

export type PartyInfo = { name: string; phone: string; address: string; inn?: string; bankName?: string; bankAccount?: string; mfo?: string };

/** Hujjatdagi tomon rekvizitlari. */
export function Party({ title, p, t }: { title: string; p: PartyInfo; t: Dictionary }) {
  return (
    <div className="flex flex-col gap-0.5 text-[13px] leading-snug">
      <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">{title}</span>
      <b className="text-[14px]">{p.name}</b>
      {p.inn && (
        <span>
          {t.profile.inn}: {p.inn}
        </span>
      )}
      {p.address && (
        <span>
          {t.docs.address}: {p.address}
        </span>
      )}
      <span>
        {t.docs.phone}: {formatPhone(p.phone)}
      </span>
      {p.bankAccount && (
        <span>
          {t.profile.bankAccount}: {p.bankAccount}
          {p.bankName && `, ${p.bankName}`}
          {p.mfo && `, ${t.profile.mfo} ${p.mfo}`}
        </span>
      )}
    </div>
  );
}
