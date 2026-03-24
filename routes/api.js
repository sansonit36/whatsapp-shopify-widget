const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const cache = require('memory-cache');

const CONFIG_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * GET /api/config?shop=SHOP_DOMAIN
 * Returns all active placements for a shop — public, no auth required
 * Target: <100ms response time (in-memory cache)
 */
router.get('/config', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    // Check memory cache first
    const cacheKey = `config_${shop}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Fetch shop + active placements from DB
    const shopData = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      select: {
        plan: true,
        brandColor: true,
        gdprConsent: true,
        language: true,
        defaultPhone: true,
        isActive: true,
      },
    });

    if (!shopData || !shopData.isActive) {
      return res.json({ placements: [], shop: null });
    }

    const placements = await prisma.placement.findMany({
      where: { shopDomain: shop, isActive: true },
      select: {
        id: true,
        type: true,
        phoneNumber: true,
        welcomeMessage: true,
        buttonLabel: true,
        styleConfig: true,
        scheduleConfig: true,
        pageTargeting: true,
      },
    });

    const response = {
      shop: {
        plan: shopData.plan,
        brandColor: shopData.brandColor,
        gdprConsent: shopData.gdprConsent,
        language: shopData.language,
        defaultPhone: shopData.defaultPhone,
      },
      placements,
    };

    // Cache in memory
    cache.put(cacheKey, response, CONFIG_CACHE_TTL);
    res.set('X-Cache', 'MISS');
    res.json(response);
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

/**
 * POST /api/click
 * Record a click event — called from widget.js
 */
router.post('/click', async (req, res) => {
  try {
    const { placementId, pageUrl, productId, orderId, shop } = req.body;

    if (!placementId) {
      return res.status(400).json({ error: 'Missing placementId' });
    }

    // Find placement to get shopDomain and type
    const placement = await prisma.placement.findUnique({
      where: { id: placementId },
      select: { shopDomain: true, type: true },
    });

    if (!placement) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    // Insert click event asynchronously — don't block response
    prisma.clickEvent.create({
      data: {
        shopDomain: placement.shopDomain,
        placementId,
        placementType: placement.type,
        pageUrl: pageUrl || '',
        productId: productId || null,
        orderId: orderId || null,
        userAgent: req.headers['user-agent'] || '',
      },
    }).catch((err) => console.error('Click tracking error:', err));

    res.json({ success: true });
  } catch (error) {
    console.error('Click API error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

module.exports = router;
