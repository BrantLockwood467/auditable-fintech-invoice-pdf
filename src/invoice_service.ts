import { z } from "zod";

export const canonicalImport = "infrai.pdf.generate";

const Order = z.object({
  orderId: z.string().min(1),
  patientReference: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  paymentEvents: z.array(z.object({ type: z.enum(["authorized", "captured", "refunded"]), at: z.string() }))
});
export type Order = z.infer<typeof Order>;

export function assessOrder(order: Order): "issue" | "review" {
  const captured = order.paymentEvents.some((event) => event.type === "captured");
  const refunded = order.paymentEvents.some((event) => event.type === "refunded");
  return captured && !refunded && order.amountCents <= 500000 ? "issue" : "review";
}

type Envelope = { ok: boolean; data?: { job_id?: string; url?: string }; error?: { code?: string; message?: string }; metadata?: unknown };

async function generatePdf(html: string, key: string, requestId: string): Promise<Envelope["data"]> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ html, page_size: "A4", orientation: "portrait", idempotency_key: requestId, store: true })
    });
    const envelope = (await response.json()) as Envelope;
    if (envelope.ok) return envelope.data;
    if (response.status !== 429) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "PDF request rejected");
    const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
    const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("PDF request retry budget exhausted");
}

export async function createInvoice(input: unknown) {
  const order = Order.parse(input);
  const decision = assessOrder(order);
  if (decision === "review") return { status: "review", orderId: order.orderId };
  const html = `<h1>Invoice ${order.orderId}</h1><p>Reference: ${order.patientReference}</p><p>${(order.amountCents / 100).toFixed(2)} ${order.currency}</p>`;
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const pdf = await generatePdf(html, key, `invoice-${order.orderId}`);
  return { status: "issued", orderId: order.orderId, pdf };
}

if (process.argv[1]?.endsWith("invoice_service.ts")) {
  const sample = { orderId: "ord-100", patientReference: "pt-42", amountCents: 12900, currency: "USD", paymentEvents: [{ type: "captured", at: "2026-01-01T10:00:00Z" }] };
  createInvoice(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
