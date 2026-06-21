# Cloudflare Environment And Bindings

The application runs on Cloudflare Pages with Cloudflare Functions, D1 and R2.

## Pages Build

- Build command: `npm run build`
- Output directory: `dist`
- Wrangler config: `wrangler.toml`

## Required Bindings

- `DB`: D1 database binding.
- `PRODUCT_IMAGES`: R2 bucket binding for product image objects.

Current production resources:

- D1 database: `kodesh-books-db-v2`
- D1 database id: `587caf85-8ac5-4b12-b417-70e7b730e551`
- R2 bucket: `kodesh-books-product-images-v2`

## Required Secrets

Set these in Cloudflare Pages project settings or with `wrangler secret put`.

- `BOOTSTRAP_ADMIN_EMAIL`: first admin login email.
- `BOOTSTRAP_ADMIN_PASSWORD`: first admin login password.
- `RESEND_API_KEY`: Resend API key for server-side order email sending.

Optional server-side variables:

- `RESEND_FROM_EMAIL`: verified sender address in Resend.
- `ORDER_ADMIN_EMAIL`: fallback admin recipient for new-order emails.
- `R2_PUBLIC_BASE_URL`: public custom domain for R2 images.

Do not create frontend `VITE_*` variables for secrets. Vite exposes `VITE_*` values to browser code.

## D1 Schema

Apply migrations before deploying features that read or write D1:

```powershell
npx.cmd wrangler d1 migrations apply kodesh-books-db-v2 --remote
```

Local development:

```powershell
npx.cmd wrangler d1 migrations apply kodesh-books-db-v2 --local
```

## Admin Authentication

Admin login is D1-backed:

- `admin_users`: admin login records.
- `sessions`: HttpOnly admin sessions.

Bootstrap behavior:

- If `admin_users` is empty, the first admin login attempt creates an admin from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
- After an admin exists, bootstrap variables do not overwrite users.
- `/api/admin/*` routes are protected by the admin session middleware.

## Customer Authentication

Customer login is D1-backed:

- `customers`: customer profile and password hash fields.
- `customer_sessions`: HttpOnly customer sessions.

Public registration always creates a regular customer. Admin-created users go through the protected admin API. If an admin-created customer has role `admin`, a matching `admin_users` record is created or re-enabled.

## Catalog

Public catalog reads use internal Functions:

- `GET /api/products`
- `GET /api/products?category=halacha`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/search?q=...`

If D1 is empty in a local environment, use `docs/d1-seed-catalog.sql` for test data only. Do not seed production over real catalog data.

## Cart, Checkout And Orders

Checkout writes to D1 and does not use a payment gateway yet.

Relevant endpoints:

- `POST /api/carts`
- `PUT /api/carts/:cartId/items`
- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:orderId/status`
- `GET /api/admin/orders/:orderId/print`
- `POST /api/analytics`

Optional `site_settings` keys:

- `shipping_cost`
- `free_shipping_threshold`
- `enforce_stock_limit`
- `reduce_stock_on_order_confirmation`

## Order Email Automation

Order emails are sent server-side through Resend. The browser never receives the provider API key.

Email behavior is controlled with these optional `site_settings` keys:

- `enable_order_emails`
- `enable_customer_order_emails`
- `enable_approval_emails`
- `enable_delivery_emails`
- `enable_cancelled_emails`
- `email_from` or `from_email`
- `admin_email`

Every attempt is written to `email_logs`; email-related admin notifications are written to `notifications`.

## Product Images

Image uploads go through `POST /api/admin/uploads/product-image`, store objects in R2 and store metadata in D1 `product_images`.

If `R2_PUBLIC_BASE_URL` is not set, uploaded images are served through `/api/images/:key`.

Existing imported product image URLs can remain external until the image migration is completed.
