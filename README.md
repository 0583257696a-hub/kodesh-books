**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

## Cloudflare Pages scaffold

This repository includes a Phase 2 Cloudflare scaffold only. The app still uses Base44 at runtime.

- Cloudflare Pages build command: `npm run build`
- Cloudflare Pages output directory: `dist`
- Required D1 binding: `DB`
- Required R2 binding: `PRODUCT_IMAGES`
- Current D1 database: `kodesh-books-db-v2`
- Current R2 bucket: `kodesh-books-product-images-v2`
- Required admin bootstrap secrets: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
- Wrangler config: `wrangler.toml`
- D1 migrations directory: `migrations`

Environment and binding notes are documented in `docs/cloudflare-env.md`.

### Public catalog on D1

Public product/category browsing now reads through internal Cloudflare Functions:

- `GET /api/products`
- `GET /api/products?category=...`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/search?q=...`

If D1 is empty, use `docs/d1-seed-catalog.sql` for local testing after applying migrations. Do not seed production over real catalog data.

### Independent admin auth

Admin login uses D1 tables `admin_users` and `sessions`. Configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` as Cloudflare secrets before first login. Do not expose these values as `VITE_*` variables.

### Order email automation

Order emails are sent by Cloudflare Functions through Resend and logged in D1.

Required:

- Apply `migrations/0015_email_notifications.sql`.
- Configure `RESEND_API_KEY` as a Cloudflare secret.
- Configure a verified sender via `RESEND_FROM_EMAIL` or `site_settings.email_from`.
- Configure the admin recipient via `site_settings.admin_email` or `site_settings.email`.

The frontend does not contain email API keys and no longer sends order emails through Base44.

### Product images on Cloudflare R2

Product image uploads are handled by `POST /api/admin/uploads/product-image`.

Required Cloudflare setup:

1. Create an R2 bucket, for example `kodesh-books-product-images-v2`.
2. Bind it to Cloudflare Pages/Functions as `PRODUCT_IMAGES`.
3. Apply the D1 migrations so `product_images` exists in the `DB` binding.
4. Optional but recommended: connect a custom public image domain to the R2 bucket and set `R2_PUBLIC_BASE_URL`.

If no custom image domain is configured, the app serves uploaded images through `/api/images/:key`.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
