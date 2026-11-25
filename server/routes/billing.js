/**
 * Billing & Keypass Pro Entitlement Routes
 * Replaces mocked frontend timeout payments with real backend verification
 * and persistent identity.entitlements records.
 */

const express = require('express');
const crypto = require('crypto');
const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { requireAuth } = require('./auth');
const { logger } = require('../../packages/observability');

const router = express.Router();

const KEYPASS_PRICE_INR = 49;
const KEYPASS_PRICE_PAISE = 4900;

async function checkBillingRateLimit(key, limit, windowSec) {
  try {
    const res = await redis.consumeRateLimit(`billing:${key}`, limit, windowSec);
    return res.allowed;
  } catch {
    return true;
  }
}

router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let entitlement = {
      tier: 'FREE',
      planCode: 'free',
      status: 'active',
      expiresAt: null,
      isPro: false
    };

    try {
      const result = await db.query(
        `SELECT tier, plan_code, status, expires_at, payment_provider, updated_at
         FROM identity.entitlements
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const notExpired = !row.expires_at || new Date(row.expires_at) > new Date();
        const isPro = (row.tier === 'KEYPASS_PRO' || row.plan_code === 'keypass_monthly') && row.status === 'active' && notExpired;
        entitlement = {
          tier: row.tier || 'FREE',
          planCode: row.plan_code || 'free',
          status: row.status || 'active',
          expiresAt: row.expires_at || null,
          paymentProvider: row.payment_provider || null,
          isPro
        };
      }
    } catch {
      // Simulated fallback returns baseline free tier if table not yet queried
    }

    res.json({
      success: true,
      entitlement,
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    });
  } catch (err) {
    logger.error('Failed to read billing status', { error: err.message });
    res.status(500).json({ success: false, error: 'BILLING_STATUS_FAILED', message: 'Unable to fetch membership status.' });
  }
});

router.post('/keypass/create-order', requireAuth, async (req, res) => {
  try {
    const allowed = await checkBillingRateLimit(`order:${req.user.id}`, 10, 600);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many checkout requests. Please wait a few minutes.'
      });
    }

    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const receipt = `kp_${req.user.id.slice(0, 8)}_${Date.now()}`;

    if (rzpKeyId && rzpKeySecret) {
      const authHeader = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: KEYPASS_PRICE_PAISE,
          currency: 'INR',
          receipt,
          notes: { userId: req.user.id, plan: 'keypass_monthly' }
        })
      });

      const orderData = await rzpRes.json().catch(() => ({}));
      if (!rzpRes.ok || !orderData.id) {
        logger.error('Razorpay order creation failed', { status: rzpRes.status, orderData });
        return res.status(502).json({
          success: false,
          error: 'PAYMENT_GATEWAY_ERROR',
          message: 'Payment gateway failed to initialize checkout order.'
        });
      }

      return res.json({
        success: true,
        provider: 'razorpay',
        keyId: rzpKeyId,
        orderId: orderData.id,
        amountPaise: KEYPASS_PRICE_PAISE,
        amountInr: KEYPASS_PRICE_INR,
        currency: 'INR'
      });
    }

    // No live Razorpay credentials in environment
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        requiresLiveCredentials: true,
        message: 'Live Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the backend yet.'
      });
    }

    return res.json({
      success: true,
      provider: 'sandbox_preview',
      requiresLiveCredentials: true,
      orderId: `ord_sandbox_${crypto.randomBytes(6).toString('hex')}`,
      amountPaise: KEYPASS_PRICE_PAISE,
      amountInr: KEYPASS_PRICE_INR,
      currency: 'INR'
    });
  } catch (err) {
    logger.error('Keypass create-order error', { error: err.message });
    res.status(500).json({ success: false, error: 'CREATE_ORDER_FAILED', message: 'Failed to create checkout order.' });
  }
});

router.post('/keypass/activate', requireAuth, async (req, res) => {
  try {
    const allowed = await checkBillingRateLimit(`activate:${req.user.id}`, 8, 900);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many activation attempts. Please try again shortly.'
      });
    }

    const { provider, orderId, paymentId, signature } = req.body || {};
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    if (rzpKeySecret) {
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PAYMENT_PROOF',
          message: 'Valid Razorpay payment confirmation fields are required.'
        });
      }
      const expected = crypto
        .createHmac('sha256', rzpKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const sigBuf = Buffer.from(String(signature));
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PAYMENT_SIGNATURE',
          message: 'Payment signature verification failed.'
        });
      }
    } else if (isProd || provider !== 'sandbox_preview') {
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        message: 'Payments cannot be activated in production without configured Razorpay API keys.'
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const appliedProvider = rzpKeySecret ? 'razorpay' : 'sandbox_preview';
    const paymentRef = paymentId || orderId || `sandbox_${Date.now()}`;

    await db.query(
      `INSERT INTO identity.entitlements (user_id, tier, plan_code, status, expires_at, payment_provider, payment_reference, amount_inr, updated_at)
       VALUES ($1, 'KEYPASS_PRO', 'keypass_monthly', 'active', $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         tier = 'KEYPASS_PRO',
         plan_code = 'keypass_monthly',
         status = 'active',
         expires_at = EXCLUDED.expires_at,
         payment_provider = EXCLUDED.payment_provider,
         payment_reference = EXCLUDED.payment_reference,
         amount_inr = EXCLUDED.amount_inr,
         updated_at = NOW()`,
      [req.user.id, expiresAt, appliedProvider, paymentRef, KEYPASS_PRICE_INR]
    );

    const entitlement = {
      tier: 'KEYPASS_PRO',
      planCode: 'keypass_monthly',
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      paymentProvider: appliedProvider,
      isPro: true
    };

    res.json({
      success: true,
      message: appliedProvider === 'sandbox_preview'
        ? 'Keypass Pro activated in local sandbox mode (30 days).'
        : 'Keypass Pro membership activated!',
      entitlement
    });
  } catch (err) {
    logger.error('Keypass activation error', { error: err.message });
    res.status(500).json({ success: false, error: 'ACTIVATION_FAILED', message: 'Could not activate Keypass membership.' });
  }
});

module.exports = { billingRouter: router };
