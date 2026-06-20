# Cloudflare environment and bindings

This project still uses Base44 for most runtime features. These notes document the Cloudflare scaffold and the Phase 5 product image upload path.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Wrangler config: `wrangler.toml`

## Required Cloudflare bindings

- `DB`: D1 database binding for migrated tables and product image metadata.
- `PRODUCT_IMAGES`: R2 bucket binding for product image objects.

Before deploying Cloudflare Functions that use these bindings, replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the real D1 database ID created in Cloudflare.

## Admin authentication

Phase 4 replaces Base44 admin login with an internal D1-backed admin session.

Required for first login only:

- `BOOTSTRAP_ADMIN_EMAIL`: initial admin email.
- `BOOTSTRAP_ADMIN_PASSWORD`: initial admin password.

Bootstrap behavior:

- On the first successful `/api/admin/auth/login` attempt, if `admin_users` is empty, the function creates one admin user from these environment variables.
- After at least one admin exists, these variables are no longer used to overwrite users.
- Store `BOOTSTRAP_ADMIN_PASSWORD` as a Cloudflare secret, not as a `VITE_*` frontend variable.

Relevant endpoints:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/logout`

Admin sessions are stored in the `sessions` D1 table and sent to the browser as an HttpOnly cookie.

## Existing Base44 runtime variables

These are still required while the app uses Base44:

- `VITE_BASE44_APP_ID`
- `VITE_BASE44_APP_BASE_URL`
- `VITE_BASE44_FUNCTIONS_VERSION` optional, only if Base44 function version pinning is needed.
- `BASE44_LEGACY_SDK_IMPORTS` optional build-time flag used by `vite.config.js`.

Do not put private API keys or service credentials in `VITE_*` variables. Vite exposes `VITE_*` values to browser code.

## Product images on R2

Phase 5 stores uploaded product images in R2 and writes image metadata to D1 `product_images`.

Required:

- Cloudflare R2 bucket bound as `PRODUCT_IMAGES`.
- D1 database bound as `DB`.
- Applied D1 migrations, including `migrations/0003_product_images.sql`.

Optional:

- `R2_PUBLIC_BASE_URL`: public custom domain for R2 product images, for example `https://images.example.com`.

If `R2_PUBLIC_BASE_URL` is not set, uploaded images use the app route `/api/images/:key`, which streams the object through the Cloudflare Pages Function.

The frontend should not receive R2 credentials. Browser uploads go through `POST /api/admin/uploads/product-image`, which uses the server-side `PRODUCT_IMAGES` binding.

Until product CRUD is migrated to D1, `product_images.product_id` may contain the existing Base44 product id. It is intentionally not a foreign key in this phase.

Security note: Phase 5 does not implement independent admin authentication. The upload endpoint includes same-origin request checks only. Full protection belongs in Phase 4 admin auth.

## Cart, checkout, and orders on D1

Phase 6 stores carts and manual-payment orders in D1 through Cloudflare Pages Functions.

Relevant endpoints:

- `POST /api/carts`
- `PUT /api/carts/:cartId/items`
- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:orderId/status`
- `GET /api/admin/orders/:orderId/print`
- `POST /api/analytics`

Optional `site_settings` keys in D1:

- `enforce_stock_limit`: when `true`, checkout validates D1 product stock before creating an order.
- `reduce_stock_on_order_confirmation`: when `true`, stock is reduced only when an admin changes the order status to `approved`.
- `enable_order_emails`: when not `false`, sends the admin email for a new order.
- `enable_customer_order_emails`: when not `false`, sends the customer order confirmation.
- `enable_approval_emails`: when not `false`, sends the customer approval email.
- `enable_delivery_emails`: when not `false`, sends the customer delivered email.
- `enable_cancelled_emails`: when not `false`, sends the customer cancelled email.
- `email_from` or `from_email`: optional verified sender address for Resend. If omitted, the function falls back to `settings.email`.
- `admin_email`: recipient for new-order admin emails. If omitted, the function falls back to `settings.email`.

If `enforce_stock_limit` is enabled before products are migrated into D1, checkout will fail for products that do not exist in the D1 `products` table.

## Order email automation with Resend

Order emails are sent server-side from Cloudflare Pages Functions. The browser never receives the email provider API key.

Required secret:

- `RESEND_API_KEY`: Resend API key, configured as a Cloudflare secret.

Optional server-side variables:

- `RESEND_FROM_EMAIL`: verified sender address in Resend. This can also be set in D1 `site_settings.email_from`.
- `ORDER_ADMIN_EMAIL`: fallback admin recipient if `site_settings.admin_email` and `site_settings.email` are empty.

Every email attempt is logged in D1 `email_logs` with:

- `pending`
- `sent`
- `failed`
- `error_message`
- `sent_at`

The system also writes email notifications to the `notifications` table. Apply `migrations/0015_email_notifications.sql` before enabling this flow.

## Public catalog on D1

Phase 3 reads public product and category browsing from D1 through internal Cloudflare Functions:

- `GET /api/products`
- `GET /api/products?category=halacha`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/search?q=...`

The public React catalog uses these APIs for product/category reads. Admin product CRUD is still Base44 in this phase.

If D1 has no catalog data yet, apply the schema migrations and then optionally apply the sample seed file for local testing:

```powershell
npx.cmd wrangler d1 migrations apply kodesh-books-db --local
npx.cmd wrangler d1 execute kodesh-books-db --local --file docs/d1-seed-catalog.sql
```

Replace `kodesh-books-db` with the real D1 database name. Do not apply `docs/d1-seed-catalog.sql` to production if real catalog data already exists.

## Future server-side secrets

No replacement email, payment, or WhatsApp provider has been selected in this phase. Add provider secrets only after the matching Cloudflare Function is implemented, and store them as Cloudflare secrets, not frontend environment variables.
