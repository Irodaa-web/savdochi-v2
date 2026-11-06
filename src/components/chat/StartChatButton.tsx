"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Hamkor bilan suhbatni ochadi va chat sahifasiga o'tadi. */
export function StartChatButton({ partnerId, label, ...rest }: Omit<ButtonProps, "onClick"> & { partnerId: string; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const res = await api<{ id: string }>("/api/v1/chats", { body: { partnerId } });
    setBusy(false);
    if (res.ok) router.push(`/chat?c=${res.data.id}`);
  }

  return (
    <Button type="button" variant="secondary" onClick={open} loading={busy} {...rest}>
      <MessageSquare size={16} aria-hidden />
      {label ?? t.chat.write}
    </Button>
  );
}
