const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const { verifyRequest } = require('../lib/shopify');

const PLANS = {
  basic: {
    name: 'Basic Plan',
    price: 2.99,
    trialDays: 7,
    features: ['Up to 3 placements', 'Any placement type', '7-day analytics', 'Business hours', 'No badge'],
    test: true,
  },
  pro: {
    name: 'Pro Plan',
    price: 7.99,
    trialDays: 7,
    features: ['Unlimited placements', '90-day analytics with charts', 'Multiple WhatsApp numbers', 'GDPR consent mode', 'Priority support', 'No badge'],
    test: true,
  },
};

/**
 * GET /admin/billing
 */
router.get('/', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });

    res.render('billing', {
      shop,
      plans: PLANS,
      reason: req.query.reason || null,
      host: process.env.HOST,
    });
  } catch (error) {
    console.error('Billing page error:', error);
    res.status(500).send('Failed to load billing');
  }
});

/**
 * POST /admin/billing/subscribe
 * With Managed Pricing, redirect to Shopify's plan selection page
 */
router.post('/subscribe', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const apiKey = process.env.SHOPIFY_API_KEY;

    // Redirect merchant to Shopify's native Managed Pricing page
    const pricingUrl = `https://${shopDomain}/admin/charges/${apiKey}/pricing_plans`;
    return res.redirect(pricingUrl);
  } catch (error) {
    console.error('Subscribe redirect error:', error);
    res.status(500).send('Failed to redirect to pricing page');
  }
});

/**
 * GET /admin/billing/callback
 * Shopify redirects here after merchant accepts/declines charge
 */
router.get('/callback', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const planKey = req.query.plan;
    const chargeId = req.query.charge_id;

    if (chargeId && planKey && PLANS[planKey]) {
      // Update shop plan
      await prisma.shop.update({
        where: { shopDomain },
        data: { plan: planKey },
      });
    }

    res.redirect(`/admin/dashboard?shop=${shopDomain}`);
  } catch (error) {
    console.error('Billing callback error:', error);
    res.status(500).send('Failed to process billing callback');
  }
});

module.exports = router;
