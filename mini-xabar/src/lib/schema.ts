import { z } from "zod";

export const messageSchema = z.object({
  senderName: z.string().trim().min(2, "Ism kamida 2 harf").max(80, "Ism juda uzun"),
  to: z.email("Email noto'g'ri"),
  message: z.string().trim().min(1, "Xabar bo'sh").max(5000, "Xabar 5000 belgidan oshmasin"),
});

export type MessageInput = z.infer<typeof messageSchema>;
