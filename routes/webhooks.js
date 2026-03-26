const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const { verifyWebhookHmac } = require('../lib/shopify');
const cache = require('memory-cache');

/**
 * POST /webhooks/app-uninstalled
 * Soft-delete shop and deactivate all placements
 */
router.post('/app-uninstalled', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const rawBody = req.body.toString('utf8');

    if (!hmac || !verifyWebhookHmac(rawBody, hmac)) {
      console.error('Webhook HMAC verification failed: app/uninstalled');
      return res.status(401).send('Unauthorized');
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = req.headers['x-shopify-shop-domain'];

    if (!shopDomain) {
      return res.status(400).send('Missing shop domain');
    }

    console.log(`🔴 Shop uninstalled: ${shopDomain}`);

    // Soft-delete: mark shop as inactive, deactivate all placements
    await prisma.shop.update({
      where: { shopDomain },
      data: { isActive: false },
    }).catch(() => {}); // Shop might not exist

    await prisma.placement.updateMany({
      where: { shopDomain },
      data: { isActive: false },
    });

    // Clear config cache
    cache.del(`config_${shopDomain}`);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Uninstall webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * POST /webhooks/app-subscriptions-update
 * Sync plan when subscription changes
 */
router.post('/app-subscriptions-update', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const rawBody = req.body.toString('utf8');

    if (!hmac || !verifyWebhookHmac(rawBody, hmac)) {
      console.error('Webhook HMAC verification failed: app/subscriptions/update');
      return res.status(401).send('Unauthorized');
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = req.headers['x-shopify-shop-domain'];

    if (!shopDomain) {
      return res.status(400).send('Missing shop domain');
    }

    console.log(`💳 Subscription update for: ${shopDomain}`, payload);

    // Determine plan from subscription
    const subscription = payload.app_subscription;
    let plan = 'free';

    if (subscription && subscription.status === 'active') {
      const price = parseFloat(subscription.price || 0);
      if (price >= 7.99) {
        plan = 'pro';
      } else if (price >= 2.99) {
        plan = 'basic';
      }
    }

    await prisma.shop.update({
      where: { shopDomain },
      data: { plan },
    }).catch(() => {});

    // Clear config cache
    cache.del(`config_${shopDomain}`);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Subscription webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * POST /webhooks/gdpr
 * Unified handler for all 3 GDPR compliance topics (used by shopify.app.toml)
 * Shopify sends X-Shopify-Topic header to identify the topic
 */
router.post('/gdpr', async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const rawBody = req.body.toString('utf8');

  if (!hmac || !verifyWebhookHmac(rawBody, hmac)) {
    return res.status(401).send('Unauthorized');
  }

  const topic = req.headers['x-shopify-topic'];
  const shopDomain = req.headers['x-shopify-shop-domain'];

  console.log(`GDPR webhook received: ${topic} for ${shopDomain}`);

  if (topic === 'shop/redact' && shopDomain) {
    try {
      await prisma.clickEvent.deleteMany({ where: { shopDomain } }).catch(() => {});
      await prisma.placement.deleteMany({ where: { shopDomain } }).catch(() => {});
      await prisma.shop.delete({ where: { shopDomain } }).catch(() => {});
      console.log(`GDPR shop erasure complete for: ${shopDomain}`);
    } catch (err) {
      console.error('GDPR shop erasure error:', err);
    }
  }

  // For customers/data_request and customers/redact: we don't store PII
  res.status(200).send('OK');
});

/**
 * POST /webhooks/gdpr/customer-data
 * Mandatory GDPR: Customer data request
 */
router.post('/gdpr/customer-data', (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const rawBody = req.body.toString('utf8');
  if (hmac && !verifyWebhookHmac(rawBody, hmac)) {
    return res.status(401).send('Unauthorized');
  }
  // We do not store personally identifiable customer data
  console.log('GDPR customer data request received');
  res.status(200).send('OK');
});

/**
 * POST /webhooks/gdpr/customer-erasure
 * Mandatory GDPR: Customer data erasure
 */
router.post('/gdpr/customer-erasure', (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const rawBody = req.body.toString('utf8');
  if (hmac && !verifyWebhookHmac(rawBody, hmac)) {
    return res.status(401).send('Unauthorized');
  }
  // We do not store personally identifiable customer data
  console.log('GDPR customer erasure request received');
  res.status(200).send('OK');
});

/**
 * POST /webhooks/gdpr/shop-erasure
 * Mandatory GDPR: Shop data erasure (48 hours after uninstall)
 */
router.post('/gdpr/shop-erasure', async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const rawBody = req.body.toString('utf8');
  if (hmac && !verifyWebhookHmac(rawBody, hmac)) {
    return res.status(401).send('Unauthorized');
  }
  try {
    const shopDomain = req.headers['x-shopify-shop-domain'];
    if (shopDomain) {
      // Permanently delete all shop data
      await prisma.clickEvent.deleteMany({ where: { shopDomain } }).catch(() => {});
      await prisma.placement.deleteMany({ where: { shopDomain } }).catch(() => {});
      await prisma.shop.delete({ where: { shopDomain } }).catch(() => {});
      console.log(`GDPR shop erasure complete for: ${shopDomain}`);
    }
  } catch (err) {
    console.error('GDPR shop erasure error:', err);
  }
  res.status(200).send('OK');
});

module.exports = router;
