import { Resend } from "resend";

const FROM = "Jargon Gym <jargon-gym@bhnmzm.com>";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }
  return new Resend(apiKey);
}

type SendEmailParams = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({ from: FROM, to, subject, text, html });

  if (error) {
    throw new Error(error.message ?? "Failed to send email.");
  }
}

type SendInviteEmailParams = {
  to: string;
  signupUrl: string;
};

export async function sendInviteEmail({ to, signupUrl }: SendInviteEmailParams): Promise<void> {
  await sendEmail({
    to,
    subject: "You're invited to Jargon Gym",
    text: `You're in.\n\nJargon Gym is ready for you — use the link below to create your account:\n\n${signupUrl}\n\nSee you inside.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">You're in.</h1>
        <p>Jargon Gym is ready for you — use the link below to create your account.</p>
        <p>
          <a href="${signupUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Create your account
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Or paste this link into your browser: ${signupUrl}</p>
      </div>
    `,
  });
}

type SendWaitlistRequestNotificationParams = {
  to: string[];
  requesterEmail: string;
  adminUrl: string;
};

export async function sendWaitlistRequestNotification({
  to,
  requesterEmail,
  adminUrl,
}: SendWaitlistRequestNotificationParams): Promise<void> {
  if (to.length === 0) return;

  await sendEmail({
    to,
    subject: "New Jargon Gym access request",
    text: `${requesterEmail} just asked for access to Jargon Gym.\n\nReview it here:\n\n${adminUrl}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">New access request</h1>
        <p><strong>${requesterEmail}</strong> just asked for access to Jargon Gym.</p>
        <p>
          <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Review request
          </a>
        </p>
      </div>
    `,
  });
}
