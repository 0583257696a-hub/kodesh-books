# Email Providers

Server-side transactional emails use `functions/_services/emailService.js`, which selects a provider through `functions/_services/emailProviders.js`.

## Provider Selection

Provider priority:

1. `site_settings.email_provider`
2. `EMAIL_PROVIDER`
3. `MAIL_PROVIDER`
4. `EMAIL_AUTOMATION_PROVIDER`
5. fallback: `mailjet`

Supported values:

- `mailjet`
- `resend`
- `cloudflare`
- `poptin`

`poptin` is currently wired as a known provider name and Poptin Pixel is loaded in the browser. Transactional email sending through Poptin still requires real Poptin API or webhook details before it can send order emails.

## Mailjet

Required Cloudflare secrets:

- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`

Optional:

- `MAILJET_FROM_EMAIL`
- `MAILJET_FROM_NAME`

## Resend

Required Cloudflare secret:

- `RESEND_API_KEY`

Optional:

- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

## Cloudflare Email

Required Worker binding in `wrangler.jsonc`:

```json
"send_email": [
  {
    "name": "EMAIL",
    "allowed_sender_addresses": ["welcome@otzar-hakodesh.shop"]
  }
]
```

Set `site_settings.email_provider` to `cloudflare`, or use `EMAIL_PROVIDER=cloudflare`.
The sender should be a verified Cloudflare Email Routing address, for example:

```text
EMAIL_FROM=welcome@otzar-hakodesh.shop
```

## Shared Sender Variables

These override provider-specific sender settings:

- `EMAIL_FROM`
- `EMAIL_FROM_NAME`

## Poptin Pixel

The browser pixel is controlled by site settings:

- `enable_poptin_pixel`
- `poptin_pixel_id`

Default pixel id:

```text
11e54a5a6477a
```

The runtime injects this script:

```html
<script id="pixel-script-poptin" src="https://cdn.popt.in/pixel.js?id=11e54a5a6477a" async="true"></script>
```

Do not put provider API keys in frontend `VITE_*` variables.
