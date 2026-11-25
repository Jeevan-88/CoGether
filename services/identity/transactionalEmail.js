/**
 * Transactional Email Sender (Verification Links, Password Reset Links & Security Alerts)
 * Reuses configured Resend or SMTP credentials from packages/config and gracefully
 * logs development preview links outside production so local flows remain testable.
 */

const { getConfig } = require('../../packages/config');
const { logger } = require('../../packages/observability');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  // Optional SMTP transport fallback when Resend is used
}

let lastSentEmailPreview = null;

async function sendTransactionalEmail({ to, subject, html, text, category = 'transactional' }) {
  const normalizedTo = String(to || '').trim().toLowerCase();
  if (!normalizedTo || !normalizedTo.includes('@')) {
    return { success: false, error: 'INVALID_RECIPIENT' };
  }

  const config = getConfig();
  const { provider, apiKey, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass } = config.auth.email;
  const sender = fromEmail || 'CoGether <noreply@cogether.tech>';

  // 1. Resend API delivery
  if (apiKey && (provider === 'resend' || apiKey.startsWith('re_'))) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: [normalizedTo],
          subject,
          html,
          text
        })
      });

      if (response.ok) {
        logger.info('Transactional email delivered via Resend', { to: normalizedTo, category });
        return { success: true, provider: 'resend' };
      }

      const errText = await response.text().catch(() => '');
      logger.error('Resend transactional email failed', { status: response.status, error: errText, category });
    } catch (err) {
      logger.error('Resend transactional email exception', { error: err.message, category });
    }
  }

  // 2. SMTP delivery
  if (smtpHost && smtpUser && smtpPass && nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: sender,
        to: normalizedTo,
        subject,
        text,
        html
      });

      logger.info('Transactional email delivered via SMTP', { to: normalizedTo, category });
      return { success: true, provider: 'smtp' };
    } catch (err) {
      logger.error('SMTP transactional email failed', { error: err.message, category });
    }
  }

  const isProdOrStaging = config.env === 'production' || config.env === 'staging';
  lastSentEmailPreview = { to: normalizedTo, subject, text, category, createdAt: new Date().toISOString() };

  if (isProdOrStaging) {
    logger.warn('Transactional email not delivered: configure RESEND_API_KEY or SMTP credentials', {
      to: normalizedTo,
      category
    });
    return {
      success: false,
      provider: 'unconfigured',
      error: 'EMAIL_PROVIDER_UNCONFIGURED'
    };
  }

  logger.info(`[DEV EMAIL PREVIEW] (${category}) -> ${normalizedTo} | ${subject}\n${text}`);
  return { success: true, provider: 'dev_console' };
}

async function sendVerificationLinkEmail({ to, verifyUrl, name }) {
  const greetingName = name ? ` ${name}` : '';
  const subject = 'Verify your CoGether email address';
  const text = `Hi${greetingName},\n\nVerify your CoGether account by visiting this link (valid for 24 hours):\n${verifyUrl}\n\nIf you did not create this account, you can ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0f1014; color: #f3f4f6; border-radius: 16px; border: 1px solid #23262f;">
      <h2 style="margin: 0 0 12px; color: #ffffff;">Verify your email for <span style="color: #10b981;">CoGether</span></h2>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Hi${greetingName}, click the button below to verify your email address and unlock full profile sync across Co-Watch, Co-Play, Co-Shop, and Co-Study.</p>
      <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #10b981; color: #052e16; font-weight: 700; text-decoration: none; border-radius: 10px;">Verify Email Address</a>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">Or copy this link: ${verifyUrl}</p>
    </div>
  `;
  return sendTransactionalEmail({ to, subject, html, text, category: 'email_verification' });
}

async function sendPasswordResetLinkEmail({ to, resetUrl, name }) {
  const greetingName = name ? ` ${name}` : '';
  const subject = 'Reset your CoGether password';
  const text = `Hi${greetingName},\n\nReset your CoGether password by visiting this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request a password reset, you can safely ignore this message.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0f1014; color: #f3f4f6; border-radius: 16px; border: 1px solid #23262f;">
      <h2 style="margin: 0 0 12px; color: #ffffff;">Password reset for <span style="color: #10b981;">CoGether</span></h2>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Hi${greetingName}, use the link below to set a new password. It expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #10b981; color: #052e16; font-weight: 700; text-decoration: none; border-radius: 10px;">Reset Password</a>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
    </div>
  `;
  return sendTransactionalEmail({ to, subject, html, text, category: 'password_reset' });
}

module.exports = {
  sendTransactionalEmail,
  sendVerificationLinkEmail,
  sendPasswordResetLinkEmail,
  getLastSentEmailPreviewForTest: () => lastSentEmailPreview
};
