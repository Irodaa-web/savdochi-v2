"use client";

import { ArrowLeft, BadgeCheck, Package, ReceiptText, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatDateTime } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { ConversationView, MessageView } from "@/server/chat";

const POLL_MS = 4000;

/** Bitta suhbat: xabarlar har 4 soniyada yangilanadi (Vercel'da WebSocket'siz oddiy yechim). */
export function ChatRoom({ id, role }: { id: string; role: "buyer" | "seller" }) {
  const { t, locale } = useI18n();
  const [conv, setConv] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastAt = useRef<string | undefined>(undefined);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
    const res = await api<{ conversation: ConversationView; messages: MessageView[] }>(`/api/v1/chats/${id}${q}`);
    if (!res.ok) return setFailed(true);
    setFailed(false);
    setConv(res.data.conversation);
    if (res.data.messages.length) {
      lastAt.current = res.data.messages[res.data.messages.length - 1]!.createdAt;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...res.data.messages.filter((m) => !seen.has(m.id))];
      });
    }
  }, [id]);

  useEffect(() => {
    lastAt.current = undefined;
    setMessages([]);
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Qavs ichida: yangi brauzerlarda scrollIntoView Promise qaytaradi, React esa uni tozalash funksiyasi deb oladi.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const res = await api(`/api/v1/chats/${id}`, { body: { text: body } });
    setSending(false);
    if (res.ok) {
      setText("");
      await load();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Link href="/chat" className="text-muted hover:text-text md:hidden" aria-label={t.chat.back}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
        {conv && (
          <Link href={role === "buyer" ? `/suppliers/${conv.partner.id}` : `/partners/${conv.partner.id}`} className="flex items-center gap-1.5 font-semibold hover:text-accent">
            {conv.partner.name}
            {conv.partner.verified && <BadgeCheck size={16} className="text-accent" aria-label={t.catalog.verified} />}
          </Link>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {failed && <p className="text-center text-[13px] text-danger">{t.errors.NETWORK}</p>}
        {messages.length === 0 && !failed && <p className="m-auto text-muted">{t.chat.start}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex max-w-[80%] flex-col gap-1 rounded-2xl px-3.5 py-2 ${m.mine ? "self-end bg-accent text-accent-fg" : "self-start bg-surface-2"}`}>
            {m.order && (
              <Link href={`/orders/${m.order.id}`} className="flex items-center gap-1 text-[12px] font-semibold underline">
                <ReceiptText size={12} aria-hidden />№{m.order.number}
              </Link>
            )}
            {m.product && (
              <Link href={`/catalog/${m.product.id}`} className="flex items-center gap-1 text-[12px] font-semibold underline">
                <Package size={12} aria-hidden />
                {m.product.name}
              </Link>
            )}
            <span className="whitespace-pre-line">{m.text}</span>
            <span className={`text-[11px] ${m.mine ? "text-accent-fg/75" : "text-muted"}`}>{formatDateTime(m.createdAt, locale)}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          aria-label={t.chat.placeholder}
          placeholder={t.chat.placeholder}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent"
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label={t.chat.send} className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-fg disabled:opacity-50">
          <Send size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
