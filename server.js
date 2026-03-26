require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
app.set('trust proxy', 1); // Trust the Railway load balancer so secure cookies work!
const PORT = process.env.PORT || 3000;

// ── View engine ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Raw body capture for webhook HMAC verification ──────────
app.use('/webhooks', express.raw({ type: 'application/json' }));

// ── Standard middleware ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Session ─────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'wa-widget-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Always true for Shopify Production environments
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none', // Required for cross-site Shopify auth redirects
    },
  })
);

// ── Static files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── CORS for widget.js API calls ────────────────────────────
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Routes ──────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const billingRoutes = require('./routes/billing');
const webhookRoutes = require('./routes/webhooks');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/admin/billing', billingRoutes);
app.use('/webhooks', webhookRoutes);

// ── Privacy Policy ──────────────────────────────────────────
app.get('/privacy', (req, res) => {
  res.render('privacy');
});

// ── Root redirect ───────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.query.shop) {
    return res.redirect(`/auth?shop=${req.query.shop}`);
  }
  res.send('WhatsApp Chat Widget — Shopify App');
});

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ WhatsApp Widget app running on port ${PORT}`);
  console.log(`📡 Host: ${process.env.HOST || 'http://localhost:' + PORT}`);
});

module.exports = app;
