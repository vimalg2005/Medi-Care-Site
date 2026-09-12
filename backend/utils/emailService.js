import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure Nodemailer transport
 * Reads EMAIL_USER and EMAIL_PASS from environment
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  // If EMAIL_HOST is provided, use standard SMTP; otherwise default to Gmail service
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

/**
 * Send OTP Verification Email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit verification code
 * @param {string} recipientName - Recipient name
 */
export const sendOTPEmail = async (to, otp, recipientName = "Valued Patient") => {
  const transporter = createTransporter();

  // If no SMTP configured, log in console for development
  if (!transporter) {
    console.log("\n=======================================================");
    console.log(`[OTP EMAIL SERVICE - DEVELOPMENT MODE]`);
    console.log(`To: ${to} (${recipientName})`);
    console.log(`Your MediCare OTP Verification Code is: >>> ${otp} <<<`);
    console.log(`Validity: 10 minutes`);
    console.log(`(Configure EMAIL_USER and EMAIL_PASS in .env to send real emails)`);
    console.log("=======================================================\n");
    return { sent: true, mode: "console" };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #d1fae5; }
          .header { background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 32px 28px; text-align: center; color: #1e293b; }
          .otp-box { margin: 24px 0; padding: 18px 24px; background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; display: inline-block; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: monospace; }
          .badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
          .note { font-size: 13px; color: #64748b; line-height: 1.6; margin-top: 16px; }
          .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MediCare Health Portal</h1>
            <p>Patient Account Verification</p>
          </div>
          <div class="content">
            <span class="badge">Verification Required</span>
            <h2 style="font-size: 20px; margin: 8px 0 12px; color: #0f172a;">Hello, ${recipientName}</h2>
            <p style="font-size: 15px; line-height: 1.5; color: #475569; margin: 0;">
              Thank you for choosing MediCare. Use the 6-digit One-Time Password (OTP) below to verify your account and activate your patient session.
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="note">
              This code will expire in <strong>10 minutes</strong>.<br />
              If you didn't create a MediCare account, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} MediCare Health Services. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MediCare Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your MediCare Verification Code: ${otp}`,
      text: `Hello ${recipientName}, your MediCare verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });
    console.log(`[OTP EMAIL] Sent to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    console.error("[OTP EMAIL ERROR]:", error);
    // Fallback to console log in case of SMTP failure so user isn't stuck
    console.log(`[OTP FALLBACK CODE for ${to}]: ${otp}`);
    return { sent: false, error: error.message, fallbackOtp: otp };
  }
};

/**
 * Send Newsletter Welcome Email
 * @param {string} to - Subscriber email
 */
export const sendNewsletterWelcomeEmail = async (to) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log("\n=======================================================");
    console.log(`[NEWSLETTER EMAIL SERVICE - DEVELOPMENT MODE]`);
    console.log(`To: ${to}`);
    console.log(`Subject: Welcome to MediCare Health & Wellness Insights!`);
    console.log(`Message: Thank you for subscribing to MediCare health tips.`);
    console.log("=======================================================\n");
    return { sent: true, mode: "console" };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #d1fae5; }
          .header { background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 32px 28px; text-align: left; color: #1e293b; }
          .highlight { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MediCare Health & Wellness</h1>
            <p>Welcome to our Community</p>
          </div>
          <div class="content">
            <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Thank you for subscribing!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              You have successfully joined the MediCare wellness newsletter. You will now receive:
            </p>
            <div class="highlight">
              <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.8;">
                <li>Verified health & preventative care tips from specialists</li>
                <li>Exclusive seasonal wellness guides</li>
                <li>Updates on new diagnostic services and clinic schedules</li>
              </ul>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              Have urgent health questions? You can reach us directly on WhatsApp at <strong>+91 9660802511</strong> or book an appointment online anytime.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} MediCare Health Services. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MediCare Wellness" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to MediCare Health & Wellness Insights!",
      text: "Welcome to MediCare! Thank you for subscribing to our health tips and clinic updates.",
      html: htmlContent,
    });
    console.log(`[NEWSLETTER WELCOME EMAIL] Sent to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    console.error("[NEWSLETTER EMAIL ERROR]:", error.message);
    return { sent: false, error: error.message };
  }
};

