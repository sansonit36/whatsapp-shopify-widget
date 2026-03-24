const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/db');
const { shopify, verifyHmac, createSession } = require('../lib/shopify');

/**
 * GET /auth?shop=mystore.myshopify.com
 * Start the OAuth flow
 */
router.get('/', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) {
      return res.status(400).send('Missing shop parameter. Please install from Shopify.');
    }

    // Generate a nonce for state
    const nonce = crypto.randomBytes(16).toString('hex');
    req.session.nonce = nonce;
    req.session.shopOrigin = shop;

    const scopes = process.env.SHOPIFY_SCOPES;
    const redirectUri = `${process.env.HOST}/auth/callback`;
    const authUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${process.env.SHOPIFY_API_KEY}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${nonce}`;

    res.redirect(authUrl);
  } catch (error) {
    console.error('Auth start error:', error);
    res.status(500).send('Failed to start authentication');
  }
});

/**
 * GET /auth/callback
 * Handle OAuth callback from Shopify
 */
router.get('/callback', async (req, res) => {
  try {
    const { shop, code, state, hmac } = req.query;

    // Verify state/nonce
    if (state !== req.session.nonce) {
      return res.status(403).send('Request origin cannot be verified');
    }

    // Verify HMAC
    if (!verifyHmac(req.query)) {
      return res.status(400).send('HMAC validation failed');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send('Failed to get access token');
    }

    // Upsert shop in database
    await prisma.shop.upsert({
      where: { shopDomain: shop },
      update: {
        accessToken,
        isActive: true,
      },
      create: {
        shopDomain: shop,
        accessToken,
      },
    });

    // Register script tag for the widget
    try {
      const scriptUrl = `${process.env.HOST}/widget.js`;
      const scriptTagResponse = await fetch(
        `https://${shop}/admin/api/2024-01/script_tags.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            script_tag: {
              event: 'onload',
              src: scriptUrl,
            },
          }),
        }
      );

      if (!scriptTagResponse.ok) {
        // Script tag might already exist — not a fatal error
        console.log('ScriptTag registration response:', scriptTagResponse.status);
      }
    } catch (scriptError) {
      console.error('ScriptTag registration error:', scriptError);
    }

    // Register webhooks
    const webhookTopics = [
      { topic: 'app/uninstalled', address: `${process.env.HOST}/webhooks/app-uninstalled` },
      { topic: 'app/subscriptions/update', address: `${process.env.HOST}/webhooks/app-subscriptions-update` },
    ];

    for (const wh of webhookTopics) {
      try {
        await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic: wh.topic,
              address: wh.address,
              format: 'json',
            },
          }),
        });
      } catch (whError) {
        console.error(`Webhook registration error for ${wh.topic}:`, whError);
      }
    }

    // Save session
    req.session.shop = shop;
    req.session.accessToken = accessToken;

    // Redirect to admin dashboard
    res.redirect(`/admin/dashboard?shop=${shop}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router;
