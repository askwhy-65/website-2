# Kajaria showroom website — Vercel edition

A responsive, multi-page tile showroom website prepared for Vercel hosting. The site uses static HTML/CSS/images for fast delivery and small Node.js serverless functions for the enquiry form, tile catalogue API, and password-protected admin dashboard. Enquiries are stored in Supabase so they survive serverless function restarts and deployments.

## Project layout

```text
.
├── api/
│   ├── admin/
│   │   ├── login.js
│   │   ├── logout.js
│   │   └── leads/
│   │       ├── index.js
│   │       └── [id].js
│   ├── catalog.js
│   ├── enquiries.js
│   ├── health.js
│   └── site-config.js
├── lib/api.js                 # Shared API, session and database helpers
├── public/                    # Website pages, styles, scripts and images
├── scripts/build.js           # Canonicals, structured data, sitemap and robots
├── supabase-schema.sql        # Database table setup
├── catalog.json               # Collection cards used by the website
├── vercel.json                # Routing aliases and security/cache headers
└── package.json
```

## Deploy to Vercel

### 1. Create the Supabase database

1. Create a project at [Supabase](https://supabase.com/).
2. Open **SQL Editor**, paste the contents of `supabase-schema.sql`, and run it.
3. In **Project Settings → API**, copy the project URL and the **service_role** key. The service-role key is secret; never put it in browser JavaScript or commit it to Git.

### 2. Put the project on GitHub

1. Extract this ZIP.
2. Create a new GitHub repository and upload the extracted project files, including the `api`, `lib`, `public`, and `scripts` folders.
3. Do not upload `.env` or secret keys. `.gitignore` excludes `.env` and local dependencies.

### 3. Import into Vercel

1. Sign in to [Vercel](https://vercel.com/).
2. Select **Add New → Project** and import the GitHub repository.
3. Use the default project settings. The `build` script is `npm run build`; the output is the `public` directory and Vercel discovers serverless functions in `api` automatically.
4. Before deploying, add the environment variables below in **Project → Settings → Environment Variables**. Apply them to Production and Preview as appropriate.
5. Deploy. After changing environment variables, redeploy for the changes to take effect.

### 4. Required Vercel environment variables

| Variable | Example / guidance |
| --- | --- |
| `SITE_URL` | `https://your-project.vercel.app` or your custom HTTPS domain; no trailing slash |
| `BUSINESS_NAME` | Your actual showroom/business name |
| `CITY`, `STATE` | Correct showroom location |
| `STREET_ADDRESS`, `POSTAL_CODE` | Verified physical address and PIN code |
| `PHONE_DISPLAY`, `PHONE_E164` | Public phone number and international-format number, e.g. `+91...` |
| `WHATSAPP_NUMBER` | Digits only, country code included, e.g. `91...` |
| `PUBLIC_EMAIL`, `OPENING_HOURS` | Verified public contact details and hours |
| `ADMIN_USERNAME` | A private username for `/admin` |
| `ADMIN_PASSWORD` | A unique, strong password; never use the example value |
| `SESSION_SECRET` | Random secret with at least 32 characters |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; server-side only |
| `ENQUIRY_WEBHOOK_URL` | Optional secure automation/webhook URL; may be left empty |

You can generate a strong session secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` in a terminal. Set environment variables in Vercel; do not commit them to source control.

## Local development

You need Node.js 20+ and the Vercel CLI. In the project folder run:

```bash
npm install
npx vercel login
npx vercel dev
```

Add local environment values using `vercel env pull .env.local` after linking the project, or create a local `.env` using `.env.example` as a reference. The serverless functions expect Supabase to be configured for saving and viewing enquiries.

To run static build and check JavaScript syntax:

```bash
npm run build
npm run check
```

Note: `npm run build` replaces SEO placeholders in `public/*.html` and generates `public/sitemap.xml` and `public/robots.txt`. If you run it locally, set `SITE_URL` first to avoid using the fallback `https://example.com` in canonical URLs.

## Website pages

- `/` — Home
- `/collections` and `/collections.html` — Searchable tile inspiration catalogue
- `/about` — About the showroom
- `/contact` — Contact and enquiry form
- `/guides/choosing-tiles` — Tile selection guide
- `/privacy.html` and `/terms.html` — Policy pages
- `/admin` — Password-protected enquiry dashboard

## API routes

- `GET /api/health`
- `GET /api/site-config`
- `GET /api/catalog?q=marble&category=Design%20style`
- `POST /api/enquiries`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/leads` (signed-in admin only)
- `PATCH /api/admin/leads/:id` (signed-in admin only)

## Before publishing

- Replace every example business detail with verified showroom information.
- Confirm that your business is entitled to use Kajaria branding and do not imply that this is Kajaria's official manufacturer website unless that is true and authorized.
- Review privacy policy and terms for your actual data collection and business practices.
- Check that the enquiry form successfully saves to Supabase and the admin dashboard can update enquiry status.
- Test mobile layout, phone/WhatsApp links, page titles, canonical URLs, sitemap, and `robots.txt` after deployment.
- The catalogue is design inspiration only; it does not claim to represent verified stock, prices, SKUs, or manufacturer specifications.

## Notes on Vercel storage

Vercel serverless filesystems are not a durable database. This edition stores enquiries in Supabase instead of writing to a local JSON file. The Supabase service-role key is used only by serverless functions. Do not expose it in client-side code or make the enquiries table publicly readable.

## Image sources and usage

The showroom photography referenced by the website uses image URLs from Unsplash. Unsplash states that its standard-license images can be used for commercial and non-commercial projects; attribution is appreciated. Check the current license and image page before launch, and do not imply that the photographed properties or products are your own showroom or Kajaria product photography.

| Website use | Photographer | Source photo |
| --- | --- | --- |
| `living-room-vitrified.jpg` | BLACK AND WHITE DESIGNING | https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-large-window-sNwHCsDAT1c |
| `bathroom-tiles.jpg` | Smart Renovations | https://unsplash.com/photos/modern-bathroom-with-glass-enclosed-shower-and-marble-walls-Ies-rhvusTs |
| `statuario-marble-look.jpg` | Ela De Pure | https://unsplash.com/photos/modern-bathroom-with-marble-vanity-and-double-sinks-fTcI7Ji5k2Q |
| `kitchen-tiles.jpg` | Franco Debartolo | https://unsplash.com/photos/modern-kitchen-with-marble-countertops-and-sleek-cabinetry-3qDLsz4tCsI |
| `outdoor-parking.jpg` | Martina Jorden | https://unsplash.com/photos/a-patio-area-with-a-tiled-floor-and-potted-trees-hJlrZg8aL_A |
| `wood-look-vitrified.jpg` | Tile Merchant Ireland | https://unsplash.com/photos/a-living-room-with-a-tv-and-couches-yLMMFckCUkg |
| `glossy-endless.jpg` | Franco Debartolo | https://unsplash.com/photos/modern-bathroom-with-marble-tile-and-black-fixtures-tEEsSLv3xTE |
| `living-room-large-format.jpg` | Frames For Your Heart | https://unsplash.com/photos/white-chairs-and-table-on-white-floor-tiles-kToEIcYPky4 |
| `commercial-flooring.jpg` | Fer Troulik | https://unsplash.com/photos/modern-office-interior-with-glass-walls-and-reflections-lIipHR8mi3o |
| `bedroom-wood-look.jpg` | Marcel Strauß | https://unsplash.com/photos/modern-bedroom-with-wooden-accents-and-natural-light-CMHgRFDANH8 |

Images are served from the Unsplash CDN, so the deployed site needs internet access to display them. If you prefer fully self-hosted images, download the source images under the applicable license and update the references to local files.
