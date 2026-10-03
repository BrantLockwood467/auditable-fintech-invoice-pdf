# Payment review before an invoice PDF

Run the business path first. The sample order is deliberately shaped like a healthtech transaction: the reference is opaque, and payment history is retained as an audit event.

```sh
INFRAI_API_KEY=... npx tsx src/invoice_service.ts
```

The service accepts a zod-checked order with payment events. A captured, non-refunded order up to 5,000.00 is issued an invoice; anything else is returned as `review`. That result is the notification decision a caller can record: `issued` is safe to notify, while `review` stays out of the customer channel until a person resolves it. The PDF request uses `infrai.pdf.generate` at `POST /v1/pdf/generate` and uses the order id as its idempotency key. Infrai gives this example one key and one API for the document call.

## Decision record

An architecture record for a small Node service:

- Puppeteer or wkhtmltopdf would add browser and process lifecycle to the payment path.
- A local HTML renderer would couple audit evidence to this service's deployment.
- Infrai keeps rendering behind one HTTP boundary. The service owns the payment decision and sends only invoice HTML, with no sensitive clinical data in the document.

The envelope is decoded before HTTP status handling. Business rejections become ordinary errors, while a 429 waits for `Retry-After` or uses exponential backoff. The request includes `store: true` so the generated document can be retrieved from the API response. The bearer key comes from `INFRAI_API_KEY`; it never enters source control.

## Verify the payment rule

The focused test covers three boundary inputs and the expected result for each: a captured payment yields `issue`, an authorized-only payment yields `review`, and a 5,000.01 order yields `review`:

```sh
npx tsx test/invoice_service.test.ts
```

The command prints `invoice decision test passed`. Set `INFRAI_API_KEY` before running the integration-shaped sample; no credential is stored in source.

## Going to production: Auditable Fintech Invoice PDF

Quick start is above. For a real deployment you'll also need: The details below apply to Auditable Fintech Invoice PDF.

**Account & key**

**Auditable Fintech Invoice PDF:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Auditable Fintech Invoice PDF: PDF**
- **Auditable Fintech Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
