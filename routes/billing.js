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
 * Creates an appSubscription via GraphQL
 */
router.post('/subscribe', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const accessToken = req.session.accessToken;
    const planKey = req.body.plan; // 'basic' or 'pro'

    if (!PLANS[planKey]) {
      return res.status(400).send('Invalid plan');
    }

    const plan = PLANS[planKey];
    const returnUrl = `${process.env.HOST}/admin/billing/callback?shop=${shopDomain}&plan=${planKey}`;

    const mutation = `
      mutation {
        appSubscriptionCreate(
          name: "WhatsApp Widget ${plan.name}",
          returnUrl: "${returnUrl}",
          trialDays: ${plan.trialDays},
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: ${plan.price}, currencyCode: USD }
              }
            }
          }]
        ) {
          userErrors { field message }
          confirmationUrl
          appSubscription { id }
        }
      }
    `;

    const graphqlResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query: mutation }),
      }
    );

    const result = await graphqlResponse.json();
    const { confirmationUrl, userErrors } = result.data?.appSubscriptionCreate || {};

    if (userErrors && userErrors.length > 0) {
      console.error('Billing errors:', userErrors);
      return res.status(400).send('Billing error: ' + userErrors.map((e) => e.message).join(', '));
    }

    if (confirmationUrl) {
      return res.redirect(confirmationUrl);
    }

    res.status(500).send('Failed to create subscription');
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).send('Failed to create subscription');
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
