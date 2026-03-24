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

module.exports = router;
