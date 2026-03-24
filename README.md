# WhatsApp Chat Widget — Shopify App

A Shopify app that lets merchants place WhatsApp contact buttons in multiple locations across their store: floating bubbles, product page buttons, inline embeds, order confirmation buttons, and announcement bars.

## Tech Stack

- **Backend**: Node.js + Express
- **Views**: EJS templates
- **Database**: PostgreSQL via Prisma ORM
- **Shopify**: @shopify/shopify-api v9+
- **Widget**: Vanilla JavaScript (~12kb)

---

## 1. Register the App in Shopify Partner Dashboard

### Step-by-step

1. Go to [partners.shopify.com](https://partners.shopify.com) and log in (create account if needed)
2. Click **Apps** in the sidebar → **Create app** → **Create app manually**
3. Enter:
   - **App name**: WhatsApp Chat Widget
   - **App URL**: `https://your-app-domain.railway.app`
   - **Allowed redirection URLs**: `https://your-app-domain.railway.app/auth/callback`
4. After creation, go to the app's **Configuration** page
5. Under **App setup**:
   - **App URL**: `https://YOUR-DOMAIN/`
   - **Allowed redirection URL(s)**: `https://YOUR-DOMAIN/auth/callback`
   - **GDPR mandatory webhooks** (set these even if placeholder):
     - Customer data request: `https://YOUR-DOMAIN/webhooks/gdpr/customer-data`
     - Customer data erasure: `https://YOUR-DOMAIN/webhooks/gdpr/customer-erasure`
     - Shop data erasure: `https://YOUR-DOMAIN/webhooks/gdpr/shop-erasure`
6. Under **API credentials**, copy:
   - **API key** → `SHOPIFY_API_KEY`
   - **API secret key** → `SHOPIFY_API_SECRET`
7. Under **App distribution**, choose "Public" or "Custom" depending on your goal

---

## 2. Set Up a Free PostgreSQL Database

### Option A: Railway (recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → **Add a service** → **Database** → **PostgreSQL**
3. Click the PostgreSQL service → **Variables** tab
4. Copy the `DATABASE_URL` (format: `postgresql://user:pass@host:port/dbname`)

### Option B: Neon (serverless Postgres)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project, choose the closest region
3. Copy the connection string from the dashboard
4. Use the **pooled** connection string ending in `?sslmode=require`

---

## 3. Deploy to Railway

### Prerequisites
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- Git initialized in the project root

### Steps

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create a new Railway project (or link existing)
railway init

# 4. Add PostgreSQL service (if not done via UI)
railway add --database postgresql

# 5. Link your service
railway link

# 6. Set environment variables
railway variables set SHOPIFY_API_KEY=your_api_key
railway variables set SHOPIFY_API_SECRET=your_api_secret
railway variables set SHOPIFY_SCOPES=write_script_tags,read_script_tags,read_orders
railway variables set HOST=https://your-app.up.railway.app
railway variables set SESSION_SECRET=$(openssl rand -hex 32)
# DATABASE_URL is auto-set if using Railway PostgreSQL

# 7. Deploy
railway up
```

The app will deploy and Railway will provide a URL like `https://your-app.up.railway.app`.

**Update your Shopify Partner Dashboard** with this URL in the App URL and Redirect URL fields.

---

## 4. Run Prisma Migrations on Live DB

```bash
# Locally, with DATABASE_URL set to your live database:
npx prisma migrate dev --name init

# Or on Railway:
railway run npx prisma migrate deploy

# Generate Prisma client
railway run npx prisma generate
```

The migration creates three tables: `Shop`, `Placement`, `ClickEvent`.

---

## 5. Test on a Shopify Development Store

1. In your Shopify Partner Dashboard, go to **Stores** → **Add store**
2. Choose **Development store** → fill in details → **Save**
3. Wait for store to be created, then open it
4. Install your app:
   - Go to `https://YOUR-DOMAIN/?shop=your-dev-store.myshopify.com`
   - Or from Partner Dashboard: Apps → Your App → **Test on development store**
5. Complete OAuth flow — you'll land on the admin dashboard
6. Create a floating bubble placement with your WhatsApp number
7. Visit your dev store's storefront — you should see the WhatsApp bubble
8. Click it — verify it opens WhatsApp with the pre-filled message
9. Test other placement types: product page button, announcement bar, order confirmation

---

## 6. Shopify App Store Submission Checklist

### Required items:
- [ ] **App listing info**: name, tagline (100 chars), detailed description, category
- [ ] **Screenshots**: 3-6 screenshots showing admin UI + storefront widget (1600×900px)
- [ ] **App icon**: 1200×1200px square PNG
- [ ] **Demo store URL**: link to your dev store with the app installed
- [ ] **Privacy policy URL**: hosted on your domain
- [ ] **Terms of service URL**: hosted on your domain
- [ ] **GDPR webhooks**: all three mandatory endpoints must respond (even if no-op)
- [ ] **Contact email**: for Shopify review team

### Technical requirements:
- [ ] App installs without errors
- [ ] OAuth flow works correctly
- [ ] Webhooks (app/uninstalled) are handled
- [ ] No console errors on storefront
- [ ] Widget doesn't break existing theme
- [ ] Billing via Shopify API (no external payment)
- [ ] ScriptTag or theme app extension registered properly

### Submission:
1. In Partner Dashboard → Apps → Your App → **App listing**
2. Fill out all sections
3. Upload screenshots
4. Click **Submit for review**
5. Shopify review typically takes 5-10 business days

---

## Environment Variables

```
SHOPIFY_API_KEY=         # From Partner Dashboard
SHOPIFY_API_SECRET=      # From Partner Dashboard
SHOPIFY_SCOPES=write_script_tags,read_script_tags,read_orders
HOST=https://your-app.railway.app
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3000
SESSION_SECRET=random-secret-string
```

## File Structure

```
├── server.js                 # Express entry point
├── prisma/schema.prisma      # Database schema
├── routes/
│   ├── auth.js               # Shopify OAuth
│   ├── admin.js              # Dashboard + placement CRUD
│   ├── api.js                # Public config + click tracking
│   ├── billing.js            # Subscription plans
│   └── webhooks.js           # App lifecycle webhooks
├── public/
│   ├── widget.js             # Master storefront widget
│   └── admin.css             # Admin panel styles
├── views/
│   ├── layout.ejs            # Shared layout
│   ├── dashboard.ejs         # Placement list + stats
│   ├── placement.ejs         # Placement builder
│   ├── settings.ejs          # Global settings
│   └── billing.ejs           # Plan selection
├── lib/
│   ├── shopify.js            # Shopify API setup
│   ├── db.js                 # Prisma client
│   └── snippet-generator.js  # Liquid snippet builder
├── .env.example
├── .gitignore
└── README.md
```

## License

MIT
