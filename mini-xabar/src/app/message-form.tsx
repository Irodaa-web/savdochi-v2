"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { messageSchema, type MessageInput } from "@/lib/schema";

export default function MessageForm() {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MessageInput>({
    resolver: zodResolver(messageSchema),
    defaultValues: { senderName: "", to: "", message: "" },
  });

  const onSubmit = async (data: MessageInput) => {
    setResult(null);
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult({ ok: true, text: "Xabar yuborildi ✓" });
      reset({ senderName: data.senderName, to: "", message: "" });
    } else {
      setResult({ ok: false, text: body.error ?? "Xatolik yuz berdi" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="senderName">Ismingiz</label>
      <input id="senderName" {...register("senderName")} placeholder="Ali Valiyev" />
      {errors.senderName && <p className="err">{errors.senderName.message}</p>}

      <label htmlFor="to">Kimga (email)</label>
      <input id="to" type="email" {...register("to")} placeholder="dost@example.com" />
      {errors.to && <p className="err">{errors.to.message}</p>}

      <label htmlFor="message">Xabar</label>
      <textarea id="message" {...register("message")} placeholder="Xabaringizni yozing..." />
      {errors.message && <p className="err">{errors.message.message}</p>}

      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Yuborilmoqda..." : "Yuborish"}</button>
      {result && <p className={result.ok ? "ok" : "err"}>{result.text}</p>}
    </form>
  );
}
