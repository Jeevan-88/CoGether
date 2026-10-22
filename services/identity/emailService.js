/**
 * Multi-Provider Transactional Email Delivery Service
 * Supports Resend, SMTP, and secure development delivery.
 */

const { getConfig } = require('../../packages/config');
const { logger } = require('../../packages/observability');

class EmailService {
  constructor() {
    this.lastSentOtp = null; // Captured only for testing/inspection in test environment
  }

  async sendOtpEmail({ to, otp, purpose = 'signup' }) {
    const config = getConfig();
    const { provider, apiKey, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass } = config.auth.email;

    const subject = purpose === 'login' 
      ? `Your CoGether Login Passcode: ${otp}` 
      : purpose === 'reset_password'
      ? `Your CoGether Password Reset Passcode: ${otp}`
      : `Verify your CoGether account: ${otp}`;

    const subtitle = purpose === 'login'
      ? 'Sign In Passcode'
      : purpose === 'reset_password'
      ? 'Password Reset Passcode'
      : 'Identity & Security Passcode';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b0b0f; color: #ffffff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #FFE500; margin: 0;">COGETHER</h1>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px;">${subtitle}</p>
        </div>
        <div style="background: #14141a; border-radius: 8px; padding: 24px; text-align: center; border: 1px solid rgba(255,255,255,0.06);">
          <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 16px 0;">Use the single-use passcode below to complete your authentication:</p>
          <div style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #FFE500; background: rgba(255,229,0,0.08); padding: 16px 24px; border-radius: 8px; display: inline-block; border: 1px dashed rgba(255,229,0,0.3);">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 16px;">This code expires in 10 minutes and can only be used once. Never share this code with anyone.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #475569;">
          © 2026 CoGether Platform Inc. Synchronized Watch, Play, Shop & Study.
        </div>
      </div>
    `;

    // 1. Resend API delivery if configured
    if (apiKey && (provider === 'resend' || apiKey.startsWith('re_'))) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject,
            html
          })
        });

        if (res.ok) {
          logger.info('OTP email delivered via Resend API', { to, purpose });
          return { success: true, provider: 'resend' };
        } else {
          const errText = await res.text();
          logger.error('Resend delivery failed, falling back to local handler', { error: errText });
        }
      } catch (err) {
        logger.error('Resend request exception', { error: err.message });
      }
    }

    // 2. SMTP Delivery if configured
    if (smtpHost && smtpUser && smtpPass) {
      try {
        let nodemailer;
        try { nodemailer = require('nodemailer'); } catch (e) {}
        if (nodemailer) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort || 587,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
          });
          await transporter.sendMail({
            from: fromEmail,
            to,
            subject,
            html
          });
          logger.info('OTP email delivered via SMTP', { to, purpose });
          return { success: true, provider: 'smtp' };
        }
      } catch (smtpErr) {
        logger.error('SMTP delivery failed', { error: smtpErr.message });
      }
    }

    // In production or staging, strictly fail closed if real delivery was not completed
    const isProdOrStaging = config.env === 'production' || 
                            config.env === 'staging' || 
                            process.env.NODE_ENV === 'production' || 
                            process.env.NODE_ENV === 'staging' || 
                            process.env.STAGING === 'true' || 
                            config.isProd ||
                            (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rds.amazonaws.com'));

    if (isProdOrStaging || (!config.isTest && provider !== 'console_test')) {
      logger.error('Email delivery failed: neither Resend nor SMTP succeeded and environment requires real delivery', { to, purpose });
      return {
        success: false,
        error: 'EMAIL_SERVICE_NOT_CONFIGURED',
        message: 'Transactional email delivery is not configured or failed to deliver. Please configure RESEND_API_KEY or SMTP credentials in the backend environment.'
      };
    }

    // 3. Development / Test delivery tracking (active ONLY in development/test with console_test provider)
    this.lastSentOtp = { to, otp, purpose, timestamp: new Date().toISOString() };
    try {
      const fs = require('fs');
      const path = require('path');
      const testOtpFile = path.join(__dirname, '../../.test_last_otp.json');
      let otpMap = {};
      if (fs.existsSync(testOtpFile)) {
        try {
          otpMap = JSON.parse(fs.readFileSync(testOtpFile, 'utf8'));
        } catch (e) {}
      }
      otpMap[to] = this.lastSentOtp;
      otpMap._latest = this.lastSentOtp;
      fs.writeFileSync(testOtpFile, JSON.stringify(otpMap, null, 2));
    } catch (err) {
      // Non-fatal
    }

    logger.info('OTP generated for email verification', {
      to,
      purpose,
      provider: 'console_test',
      expiresInMinutes: 10
    });

    return {
      success: true,
      provider: 'console_test',
      message: 'OTP delivered to local test handler'
    };
  }

  getLastSentOtpForTest(email = null) {
    const config = getConfig();
    const isProdOrStaging = config.env === 'production' || 
                            config.env === 'staging' || 
                            process.env.NODE_ENV === 'production' || 
                            process.env.NODE_ENV === 'staging' || 
                            process.env.STAGING === 'true' || 
                            config.isProd ||
                            (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rds.amazonaws.com'));
    if (isProdOrStaging) {
      return null;
    }
    try {
      const fs = require('fs');
      const path = require('path');
      const testOtpFile = path.join(__dirname, '../../.test_last_otp.json');
      if (fs.existsSync(testOtpFile)) {
        const otpMap = JSON.parse(fs.readFileSync(testOtpFile, 'utf8'));
        if (email && otpMap[email]) {
          return otpMap[email];
        }
        if (otpMap._latest) {
          return otpMap._latest;
        }
      }
    } catch (e) {}
    return this.lastSentOtp;
  }
}

const emailService = new EmailService();

module.exports = {
  emailService,
  EmailService
};
