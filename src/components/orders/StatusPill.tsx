import { Pill } from "@/components/ui/Card";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";

const statusTone: Record<OrderStatus, "neutral" | "accent" | "success" | "danger"> = {
  new: "accent",
  confirmed: "accent",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
};
const paymentTone: Record<PaymentStatus, "neutral" | "accent" | "success" | "danger"> = { unpaid: "danger", partial: "accent", paid: "success" };

export function StatusPill({ status, t }: { status: OrderStatus; t: Dictionary }) {
  return <Pill tone={statusTone[status]}>{t.orderStatus[status]}</Pill>;
}

export function PaymentPill({ status, t }: { status: PaymentStatus; t: Dictionary }) {
  return <Pill tone={paymentTone[status]}>{t.paymentStatus[status]}</Pill>;
}
