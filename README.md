# Kodesh Books

Hebrew RTL online bookstore deployed on Cloudflare Pages with Cloudflare Functions, D1 and R2.

## Local Development

```powershell
npm install
npm run dev
```

Build locally:

```powershell
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Wrangler config: `wrangler.toml`
- Required D1 binding: `DB`
- Required R2 binding: `PRODUCT_IMAGES`
- Current D1 database: `kodesh-books-db-v2`
- Current R2 bucket: `kodesh-books-product-images-v2`

## Required Secrets And Variables

Configure these in Cloudflare Pages, not in frontend code:
 
- `BOOTSTRAP_ADMIN_EMAIL`: first admin email.
- `BOOTSTRAP_ADMIN_PASSWORD`: first admin password.
- `RESEND_API_KEY`: Resend API key for order emails.
- `RESEND_FROM_EMAIL`: optional verified sender address.
- `ORDER_ADMIN_EMAIL`: optional fallback recipient for new order emails.
- `R2_PUBLIC_BASE_URL`: optional public image domain for R2.

The frontend must not receive private API keys or service credentials.

## D1 Migrations

Migrations live in `migrations`.

Apply locally:

```powershell
npx.cmd wrangler d1 migrations apply kodesh-books-db-v2 --local
```

Apply to production:

```powershell
npx.cmd wrangler d1 migrations apply kodesh-books-db-v2 --remote
```

## Internal APIs

Public catalog:

- `GET /api/products`
- `GET /api/products?category=...`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/search?q=...`

Checkout and orders:

- `POST /api/carts`
- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:orderId/status`
- `GET /api/admin/orders/:orderId/print`

Admin and entities:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/logout`
- `GET /api/admin/entities/:entity`
- `POST /api/admin/entities/:entity`
- `PATCH /api/admin/entities/:entity/:id`
- `DELETE /api/admin/entities/:entity/:id`

## Order Email Automation

Order emails are sent server-side through Resend and logged in D1.

Templates exist for:

- New order to admin.
- Order confirmation to customer.
- Order approved.
- Order delivered.
- Order cancelled.

Every attempt is logged in `email_logs` with `pending`, `sent`, `failed`, `error_message` and `sent_at`. Notifications are stored in `notifications`.

## Product Images

Product image uploads use `POST /api/admin/uploads/product-image` and store objects in the `PRODUCT_IMAGES` R2 bucket. D1 stores image keys and public URLs only.

Imported product images were migrated to R2 and are served through `/api/images/:key` when no `R2_PUBLIC_BASE_URL` is configured.

The one-time migration script is:

```powershell

node scripts\migrate-product-images-to-r2.mjs --dry-run --limit=3
node scripts\migrate-product-images-to-r2.mjs --limit=30
```

The script writes local backups to `.migration-backups/`, uploads each image to `PRODUCT_IMAGES`, updates D1 only after a successful upload, and keeps the original URL in `product_images.base44_url` for rollback/audit.
