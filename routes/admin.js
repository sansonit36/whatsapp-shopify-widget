const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const { verifyRequest } = require('../lib/shopify');
const { generateLiquidSnippet } = require('../lib/snippet-generator');

// Plan limits
const PLAN_LIMITS = {
  free: { maxPlacements: 1, allowedTypes: ['FLOATING'], analyticsRetention: 0 },
  basic: { maxPlacements: 3, allowedTypes: ['FLOATING', 'PRODUCT_PAGE', 'INLINE', 'ORDER_CONFIRM', 'ANNOUNCEMENT_BAR'], analyticsRetention: 7 },
  pro: { maxPlacements: Infinity, allowedTypes: ['FLOATING', 'PRODUCT_PAGE', 'INLINE', 'ORDER_CONFIRM', 'ANNOUNCEMENT_BAR'], analyticsRetention: 90 },
};

/**
 * GET /admin/dashboard
 */
router.get('/dashboard', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });

    if (!shop) {
      return res.redirect(`/auth?shop=${shopDomain}`);
    }

    // Get placements
    const placements = await prisma.placement.findMany({
      where: { shopDomain },
      orderBy: { createdAt: 'desc' },
    });

    // Click stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const [clicksToday, clicksWeek, clicksMonth] = await Promise.all([
      prisma.clickEvent.count({ where: { shopDomain, timestamp: { gte: todayStart } } }),
      prisma.clickEvent.count({ where: { shopDomain, timestamp: { gte: weekStart } } }),
      prisma.clickEvent.count({ where: { shopDomain, timestamp: { gte: monthStart } } }),
    ]);

    const planLimits = PLAN_LIMITS[shop.plan] || PLAN_LIMITS.free;

    res.render('dashboard', {
      shop,
      placements,
      stats: { today: clicksToday, week: clicksWeek, month: clicksMonth },
      planLimits,
      host: process.env.HOST,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Failed to load dashboard');
  }
});

/**
 * GET /admin/placement/new
 */
router.get('/placement/new', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    const type = req.query.type || 'FLOATING';

    res.render('placement', {
      shop,
      placement: null,
      type,
      isNew: true,
      host: process.env.HOST,
      snippet: null,
    });
  } catch (error) {
    console.error('New placement error:', error);
    res.status(500).send('Failed to load placement form');
  }
});

/**
 * GET /admin/placement/:id
 */
router.get('/placement/:id', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    const placement = await prisma.placement.findFirst({
      where: { id: req.params.id, shopDomain },
    });

    if (!placement) {
      return res.redirect(`/admin/dashboard?shop=${shopDomain}`);
    }

    // Generate snippet if inline type
    let snippet = null;
    if (placement.type === 'INLINE') {
      snippet = generateLiquidSnippet(placement, process.env.HOST);
    }

    res.render('placement', {
      shop,
      placement,
      type: placement.type,
      isNew: false,
      host: process.env.HOST,
      snippet,
    });
  } catch (error) {
    console.error('Edit placement error:', error);
    res.status(500).send('Failed to load placement');
  }
});

/**
 * POST /admin/placement
 * Create new placement
 */
router.post('/placement', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    const planLimits = PLAN_LIMITS[shop.plan] || PLAN_LIMITS.free;

    // Check plan limits
    const existingCount = await prisma.placement.count({ where: { shopDomain } });
    if (existingCount >= planLimits.maxPlacements) {
      return res.redirect(`/admin/billing?shop=${shopDomain}&reason=limit`);
    }

    const { type, phoneNumber, welcomeMessage, buttonLabel } = req.body;

    // Check if type is allowed on current plan
    if (!planLimits.allowedTypes.includes(type)) {
      return res.redirect(`/admin/billing?shop=${shopDomain}&reason=type`);
    }

    // Build style config from form
    const styleConfig = buildStyleConfig(type, req.body);
    const scheduleConfig = buildScheduleConfig(req.body);
    const pageTargeting = buildPageTargeting(req.body);

    const placement = await prisma.placement.create({
      data: {
        shopDomain,
        type,
        phoneNumber: phoneNumber || shop.defaultPhone || '',
        welcomeMessage: welcomeMessage || '',
        buttonLabel: buttonLabel || 'Chat on WhatsApp',
        styleConfig,
        scheduleConfig,
        pageTargeting,
      },
    });

    res.redirect(`/admin/placement/${placement.id}?shop=${shopDomain}&saved=1`);
  } catch (error) {
    console.error('Create placement error:', error);
    res.status(500).send('Failed to create placement');
  }
});

/**
 * POST /admin/placement/:id
 * Update placement
 */
router.post('/placement/:id', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const { phoneNumber, welcomeMessage, buttonLabel } = req.body;

    const styleConfig = buildStyleConfig(req.body.type || '', req.body);
    const scheduleConfig = buildScheduleConfig(req.body);
    const pageTargeting = buildPageTargeting(req.body);

    await prisma.placement.update({
      where: { id: req.params.id },
      data: {
        phoneNumber,
        welcomeMessage,
        buttonLabel,
        styleConfig,
        scheduleConfig,
        pageTargeting,
      },
    });

    res.redirect(`/admin/placement/${req.params.id}?shop=${shopDomain}&saved=1`);
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).send('Failed to update placement');
  }
});

/**
 * POST /admin/placement/:id/toggle
 */
router.post('/placement/:id/toggle', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const placement = await prisma.placement.findFirst({
      where: { id: req.params.id, shopDomain },
    });

    if (!placement) {
      return res.status(404).send('Placement not found');
    }

    await prisma.placement.update({
      where: { id: req.params.id },
      data: { isActive: !placement.isActive },
    });

    res.redirect(`/admin/dashboard?shop=${shopDomain}`);
  } catch (error) {
    console.error('Toggle placement error:', error);
    res.status(500).send('Failed to toggle placement');
  }
});

/**
 * POST /admin/placement/:id/delete
 */
router.post('/placement/:id/delete', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    await prisma.placement.deleteMany({
      where: { id: req.params.id, shopDomain },
    });

    res.redirect(`/admin/dashboard?shop=${shopDomain}`);
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).send('Failed to delete placement');
  }
});

/**
 * GET /admin/settings
 */
router.get('/settings', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });

    res.render('settings', { shop, host: process.env.HOST });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).send('Failed to load settings');
  }
});

/**
 * POST /admin/settings
 */
router.post('/settings', verifyRequest, async (req, res) => {
  try {
    const shopDomain = req.session.shop;
    const { defaultPhone, brandColor, gdprConsent, language } = req.body;

    await prisma.shop.update({
      where: { shopDomain },
      data: {
        defaultPhone: defaultPhone || null,
        brandColor: brandColor || '#25D366',
        gdprConsent: gdprConsent === 'on',
        language: language || 'en',
      },
    });

    res.redirect(`/admin/settings?shop=${shopDomain}&saved=1`);
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).send('Failed to save settings');
  }
});

// ── Helper: build style config from form body ───────────────
function buildStyleConfig(type, body) {
  const config = {};

  switch (type) {
    case 'FLOATING':
      config.size = body.size || 'medium';
      config.position = body.position || 'bottom-right';
      config.bottomOffset = parseInt(body.bottomOffset) || 20;
      config.sideOffset = parseInt(body.sideOffset) || 20;
      config.tooltipText = body.tooltipText || '';
      config.animation = body.animation || 'none';
      config.bgColor = body.bgColor || '#25D366';
      config.textColor = body.textColor || '#ffffff';
      break;

    case 'PRODUCT_PAGE':
      config.buttonStyle = body.buttonStyle || 'filled';
      config.bgColor = body.bgColor || '#25D366';
      config.textColor = body.textColor || '#ffffff';
      config.position = body.position || 'below_atc';
      config.messageTemplate = body.messageTemplate || 'Hi, I want to ask about: {{product_name}} - {{product_url}}';
      break;

    case 'INLINE':
      config.alignment = body.alignment || 'center';
      config.width = body.width || 'auto';
      config.bgColor = body.bgColor || '#25D366';
      config.textColor = body.textColor || '#ffffff';
      config.borderRadius = body.borderRadius || '8px';
      break;

    case 'ORDER_CONFIRM':
      config.messageTemplate = body.messageTemplate || 'Hi, I have a question about my order #{{order_number}}';
      config.bgColor = body.bgColor || '#25D366';
      config.textColor = body.textColor || '#ffffff';
      break;

    case 'ANNOUNCEMENT_BAR':
      config.bgColor = body.bgColor || '#25D366';
      config.textColor = body.textColor || '#ffffff';
      config.dismissible = body.dismissible === 'on';
      break;
  }

  return config;
}

// ── Helper: build schedule config ───────────────────────────
function buildScheduleConfig(body) {
  if (body.enableSchedule !== 'on') return {};

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = { enabled: true, days: {} };

  for (const day of days) {
    const enabled = body[`schedule_${day}_enabled`] === 'on';
    const start = body[`schedule_${day}_start`] || '09:00';
    const end = body[`schedule_${day}_end`] || '17:00';
    schedule.days[day] = { enabled, start, end };
  }

  return schedule;
}

// ── Helper: build page targeting config ─────────────────────
function buildPageTargeting(body) {
  const showOn = body.showOn || 'all';
  if (showOn === 'all') return { showOn: 'all' };

  return {
    showOn: 'specific',
    pages: {
      homepage: body.page_homepage === 'on',
      product: body.page_product === 'on',
      collection: body.page_collection === 'on',
      cart: body.page_cart === 'on',
    },
  };
}

module.exports = router;
