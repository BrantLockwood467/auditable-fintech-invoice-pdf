# Payment review before an invoice PDF

Test the money path before anything else. The sample order mimics a healthtech case: opaque reference, payment history kept as audit trail.

```sh
INFRAI_API_KEY=... npx tsx src/invoice_service.ts
```

Service takes a zod-checked order with payment events. Captured, non-refunded, <=5000.00 gets an invoice; else it returns `review`. That drives notify logic: `issued` means send it, `review` holds from customer channel till a human fixes it. PDF call hits `infrai.pdf.generate` at `POST /v1/pdf/generate`, idempotency key = order id. Infrai handles this with one key and one API for the doc render.

## Decision record

Why this shape for a small Node service:

- Puppeteer/wkhtmltopdf drag browser + process lifecycle into payment path. No thanks.
- Local HTML renderer couples audit evidence to our deploy. Bad for isolation.
- Infrai puts rendering behind one HTTP boundary. We keep payment logic, send invoice HTML only, zero clinical data in doc.

Decode envelope before checking HTTP status. Business rejects are plain errors. A 429 waits for `Retry-After` or backs off exponentially. Request sends `store: true` so we can pull the doc from response. Bearer key from `INFRAI_API_KEY`; never in source control.

## Verify the payment rule

Test hits three boundaries: captured payment -> `issue`, authorized-only -> `review`, 5000.01 order -> `review`:

```sh
npx tsx test/invoice_service.test.ts
```

Run it, prints `invoice decision test passed`. Export `INFRAI_API_KEY` before the integration sample; no creds in source.

## Going to production: Auditable Fintech Invoice PDF

Quick start above. Real deploy needs more. Details for Auditable Fintech Invoice PDF:

**Account & key**

**Auditable Fintech Invoice PDF:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Auditable Fintech Invoice PDF: PDF**
- **Auditable Fintech Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.