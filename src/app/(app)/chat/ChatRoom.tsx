"use client";

import clsx from "clsx";
import { ArrowLeft, BadgeCheck, ImagePlus, Loader2, MoreVertical, Package, Paperclip, ReceiptText, Send, Smile, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { formatDateTime } from "@/i18n/format";
import { api } from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";
import type { ConversationView, MessageView } from "@/server/chat";
import { dayKey, EMOJIS, OrderCard, Picker, ProductCard, Ticks, timeOf } from "./ChatParts";

const POLL_MS = 3000;
const TYPING_EVERY_MS = 3000;

type Payload = { text?: string; image?: string; productId?: string; orderId?: string };

/**
 * Bitta suhbat. Yangi va o'zgargan (o'chirilgan) xabarlar har 3 soniyada olinadi (Vercel'da WebSocket'siz).
 * Rasm, mahsulot/buyurtma kartasi, emoji, tezkor javoblar, ✓/✓✓, "yozmoqda…", o'chirish va tarixni tozalash.
 */
export function ChatRoom({ id, role }: { id: string; role: "buyer" | "seller" }) {
  const { t, locale } = useI18n();
  const c = t.chat;
  const [conv, setConv] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"attach" | "emoji" | "menu" | null>(null);
  const [picker, setPicker] = useState<"product" | "order" | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "message"; id: string } | { kind: "clear" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const cursor = useRef<string | undefined>(undefined);
  const lastTyping = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const errors = t.errors as Record<string, string>;

  const load = useCallback(async () => {
    const q = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : "";
    const res = await api<{ conversation: ConversationView; messages: MessageView[]; cursor: string }>(`/api/v1/chats/${id}${q}`);
    if (!res.ok) return setFailed(true);
    setFailed(false);
    setConv(res.data.conversation);
    cursor.current = res.data.cursor;
    if (res.data.messages.length) {
      // Yangilari qo'shiladi, o'zgarganlari (o'chirilgan) almashtiriladi.
      setMessages((prev) => {
        const by = new Map(prev.map((m) => [m.id, m]));
        for (const m of res.data.messages) by.set(m.id, m);
        return [...by.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    }
  }, [id]);

  const reset = useCallback(() => {
    cursor.current = undefined;
    setMessages([]);
  }, []);

  useEffect(() => {
    reset();
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load, reset]);

  const lastId = messages[messages.length - 1]?.id;
  // Qavs ichida: yangi brauzerlarda scrollIntoView Promise qaytaradi, React esa uni tozalash funksiyasi deb oladi.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lastId, conv?.partnerTyping]);

  async function post(payload: Payload): Promise<boolean> {
    setSending(true);
    setError(null);
    const res = await api(`/api/v1/chats/${id}`, { body: payload });
    setSending(false);
    if (!res.ok) {
      setError(errors[res.fields?.text ?? res.fields?.image ?? res.error] ?? errors.SERVER_ERROR!);
      return false;
    }
    await load();
    return true;
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (await post({ text: body })) {
      setText("");
      if (input.current) input.current.style.height = "";
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter — yuborish, Shift+Enter — yangi qator (telefonda klaviatura tugmasi yangi qator beradi).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      void send();
    }
  }

  function onType(value: string) {
    setText(value);
    const el = input.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    }
    if (value && Date.now() - lastTyping.current > TYPING_EVERY_MS) {
      lastTyping.current = Date.now();
      void api(`/api/v1/chats/${id}/typing`, { method: "POST" });
    }
  }

  async function sendImage(f: File | undefined) {
    if (!f) return;
    setPanel(null);
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", await compressImage(f));
      body.append("kind", "chat");
      const res = await fetch("/api/v1/uploads", { method: "POST", body }).then((r) => r.json()).catch(() => null);
      if (!res?.ok) throw new Error(errors[res?.fields?.file ?? res?.error ?? "SERVER_ERROR"] ?? errors.SERVER_ERROR);
      // Yozilgan matn rasmga izoh bo'lib ketadi.
      if (await post({ image: res.data.url, text: text.trim() })) setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }

  async function confirmAction() {
    if (!confirm) return;
    setBusy(true);
    if (confirm.kind === "message") {
      await api(`/api/v1/chats/${id}/messages/${confirm.id}`, { method: "DELETE" });
      await load();
    } else {
      await api(`/api/v1/chats/${id}/clear`, { method: "POST" });
      reset();
      await load();
    }
    setBusy(false);
    setConfirm(null);
  }

  const readAt = conv?.partnerReadAt ?? null;
  const quick = role === "buyer" ? c.quickBuyer : c.quickSeller;
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const dayLabel = (key: string, iso: string) => (key === today ? c.today : key === yesterday ? c.yesterday : formatDateTime(iso, locale, false));
  const iconBtn = "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Link href="/chat" className={clsx(iconBtn, "md:hidden")} aria-label={c.back}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
        {conv && (
          <Link href={role === "buyer" ? `/suppliers/${conv.partner.id}` : `/partners/${conv.partner.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-accent">
            <Avatar name={conv.partner.name} src={conv.partner.logo} />
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate font-semibold">
                <span className="truncate">{conv.partner.name}</span>
                {conv.partner.verified && <BadgeCheck size={16} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
              </span>
              <span className={clsx("block text-[12px]", conv.partnerTyping ? "text-accent" : "text-muted")}>{conv.partnerTyping ? c.typing : role === "buyer" ? t.roles.seller : t.roles.buyer}</span>
            </span>
          </Link>
        )}
        <div className="relative ml-auto">
          <button type="button" className={iconBtn} aria-label={c.menu} aria-expanded={panel === "menu"} onClick={() => setPanel((p) => (p === "menu" ? null : "menu"))}>
            <MoreVertical size={18} aria-hidden />
          </button>
          {panel === "menu" && (
            <div role="menu" className="glass-strong menu-in absolute top-11 right-0 z-20 w-60 rounded-xl p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPanel(null);
                  setConfirm({ kind: "clear" });
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] text-danger hover:bg-danger-soft"
              >
                <Trash2 size={16} aria-hidden />
                {c.clear}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
        {failed && <p className="text-center text-[13px] text-danger">{t.errors.NETWORK}</p>}
        {messages.length === 0 && !failed && <p className="m-auto max-w-sm text-center text-muted">{c.start}</p>}
        {messages.map((m, i) => {
          const key = dayKey(m.createdAt);
          const newDay = i === 0 || dayKey(messages[i - 1]!.createdAt) !== key;
          const bare = !m.text && !m.deleted && (m.product || m.order) && !m.image;
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && (
                <span className="my-2 self-center rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-muted">{dayLabel(key, m.createdAt)}</span>
              )}
              <div className={clsx("group flex max-w-[85%] items-end gap-1.5 sm:max-w-[75%]", m.mine ? "flex-row-reverse self-end" : "self-start")}>
                <div
                  className={clsx(
                    "flex min-w-0 flex-col gap-1.5 rounded-2xl",
                    bare ? "p-0" : "px-3 py-2",
                    m.deleted ? "border border-dashed border-line bg-transparent text-muted italic" : m.mine ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-surface-2",
                  )}
                >
                  {m.deleted ? (
                    <span className="text-[14px]">{c.deleted}</span>
                  ) : (
                    <>
                      {m.image && (
                        <button type="button" onClick={() => setLightbox(m.image)} className="-mx-1 -mt-0.5 block cursor-zoom-in overflow-hidden rounded-xl" aria-label={c.photo}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- chat rasmi asl o'lchamida, lazy */}
                          <img src={m.image} alt="" loading="lazy" className="max-h-72 w-auto max-w-full object-cover" />
                        </button>
                      )}
                      {m.product && <ProductCard p={m.product} buyer={role === "buyer"} />}
                      {m.order && <OrderCard o={m.order} />}
                      {m.text && <span className="text-[14px] break-words whitespace-pre-line">{m.text}</span>}
                    </>
                  )}
                  <span className={clsx("flex items-center gap-1 self-end text-[11px]", bare && "px-2 pb-1 text-muted", !bare && (m.mine && !m.deleted ? "text-accent-fg/80" : "text-muted"))}>
                    {timeOf(m.createdAt)}
                    {m.mine && !m.deleted && !bare && <Ticks read={Boolean(readAt && m.createdAt <= readAt)} />}
                  </span>
                </div>
                {m.mine && !m.deleted && (
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "message", id: m.id })}
                    aria-label={c.deleteMsg}
                    className="mb-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted opacity-60 hover:bg-danger-soft hover:text-danger focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {conv?.partnerTyping && (
          <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-3" aria-label={c.typing}>
            {[0, 1, 2].map((n) => (
              <span key={n} className="size-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${n * 150}ms` }} />
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>

      {!text && !uploading && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2" aria-label={c.quick}>
          {quick.map((q) => (
            <button key={q} type="button" disabled={sending} onClick={() => void post({ text: q })} className="shrink-0 cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
      )}

      {(error || uploading) && <p className={clsx("px-4 pt-2 text-[13px]", error ? "text-danger" : "text-muted")}>{error ?? c.uploading}</p>}

      <form onSubmit={send} className="relative flex items-end gap-1.5 border-t border-line p-2.5 sm:p-3">
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => sendImage(e.target.files?.[0])} aria-label={c.attachImage} />
        <div className="relative">
          <button type="button" className={iconBtn} aria-label={c.attach} aria-expanded={panel === "attach"} onClick={() => setPanel((p) => (p === "attach" ? null : "attach"))}>
            {uploading ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <Paperclip size={19} aria-hidden />}
          </button>
          {panel === "attach" && (
            <div role="menu" className="glass-strong menu-in absolute bottom-12 left-0 z-20 w-52 rounded-xl p-1.5">
              {(
                [
                  [ImagePlus, c.attachImage, () => file.current?.click()],
                  [Package, c.attachProduct, () => setPicker("product")],
                  [ReceiptText, c.attachOrder, () => setPicker("order")],
                ] as const
              ).map(([Icon, label, act]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPanel(null);
                    act();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] hover:bg-accent-soft/70 hover:text-accent"
                >
                  <Icon size={17} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative hidden sm:block">
          <button type="button" className={iconBtn} aria-label={c.emoji} aria-expanded={panel === "emoji"} onClick={() => setPanel((p) => (p === "emoji" ? null : "emoji"))}>
            <Smile size={19} aria-hidden />
          </button>
          {panel === "emoji" && (
            <div className="glass-strong menu-in absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-0.5 rounded-xl p-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onType(text + e);
                    input.current?.focus();
                  }}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-[18px] hover:bg-surface-2"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          ref={input}
          rows={1}
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setPanel(null)}
          maxLength={2000}
          aria-label={c.placeholder}
          placeholder={c.placeholder}
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 leading-snug outline-none focus:border-accent"
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label={c.send} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-fg hover:opacity-90 disabled:opacity-50">
          {sending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}
        </button>
      </form>

      {conv && (
        <Picker
          kind={picker}
          onClose={() => setPicker(null)}
          onPick={(payload) => {
            setPicker(null);
            void post(payload);
          }}
          sellerId={conv.sellerId}
          partnerId={conv.partner.id}
          seller={role === "seller"}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "clear" ? c.clearTitle : c.deleteTitle}
        message={confirm?.kind === "clear" ? c.clearConfirm : c.deleteConfirm}
        confirmLabel={confirm?.kind === "clear" ? c.clear : c.deleteMsg}
        danger
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
      <Modal open={lightbox !== null} onClose={() => setLightbox(null)} title={c.photo}>
        {/* eslint-disable-next-line @next/next/no-img-element -- to'liq o'lchamdagi rasm */}
        {lightbox && <img src={lightbox} alt="" className="max-h-[75vh] w-full rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}
