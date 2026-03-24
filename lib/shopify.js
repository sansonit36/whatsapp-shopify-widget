require('@shopify/shopify-api/adapters/node');
const { shopifyApi, LATEST_API_VERSION, Session } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2024-04');
const crypto = require('crypto');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES.split(','),
  hostName: process.env.HOST.replace(/https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
  restResources,
});

/**
 * Verify the HMAC query parameter from Shopify requests
 */
function verifyHmac(query) {
  const { hmac, ...params } = query;
  if (!hmac) return false;

  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(sorted)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
}

/**
 * Verify webhook HMAC from the X-Shopify-Hmac-Sha256 header
 */
function verifyWebhookHmac(rawBody, hmacHeader) {
  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader)
    );
  } catch {
    return false;
  }
}

/**
 * Create a Shopify REST client session for a given shop
 */
function createSession(shopDomain, accessToken) {
  const session = new Session({
    id: `offline_${shopDomain}`,
    shop: shopDomain,
    state: '',
    isOnline: false,
    accessToken,
  });
  return session;
}

/**
 * Middleware: verify that admin request comes from Shopify
 */
function verifyRequest(req, res, next) {
  if (!req.query.shop) {
    return res.status(401).send('Missing shop parameter');
  }

  if (req.query.hmac && !verifyHmac(req.query)) {
    return res.status(401).send('HMAC validation failed');
  }

  // Check session
  if (!req.session || !req.session.shop) {
    const shop = req.query.shop;
    return res.redirect(`/auth?shop=${shop}`);
  }

  if (req.session.shop !== req.query.shop) {
    return res.redirect(`/auth?shop=${req.query.shop}`);
  }

  next();
}

module.exports = {
  shopify,
  verifyHmac,
  verifyWebhookHmac,
  createSession,
  verifyRequest,
};
