import { Resend } from "resend";
import type { RequestEmail } from "@/lib/requests/email-copy";

const FROM = "Lobyas <team@lobyas.com>";

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
    subject: "Your Lobyas invite is here",
    text: `Hi,\n\nGood news: your Lobyas invite just came through. Use the link below to finish signing up and you can start learning right away.\n\n${signupUrl}\n\nSee you inside,\nThe Lobyas team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Your invite is here</h1>
        <p>Good news: your Lobyas invite just came through. Use the button below to finish signing up and you can start learning right away.</p>
        <p>
          <a href="${signupUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Finish signing up
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Or paste this link into your browser: ${signupUrl}</p>
        <p>See you inside,<br />The Lobyas team</p>
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
    subject: `${requesterEmail} asked for access to Lobyas`,
    text: `Hi,\n\n${requesterEmail} just asked for access to Lobyas and is waiting on the waitlist. You can approve or review the request here:\n\n${adminUrl}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Someone new wants in</h1>
        <p><strong>${requesterEmail}</strong> just asked for access to Lobyas and is waiting on the waitlist. You can approve or review the request below.</p>
        <p>
          <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Review request
          </a>
        </p>
      </div>
    `,
  });
}

/** A status email about a collection request, or the notice that tells the team about a new one. */
export async function sendRequestEmail({
  to,
  email,
}: {
  to: string | string[];
  email: RequestEmail;
}): Promise<void> {
  if (Array.isArray(to) && to.length === 0) return;
  await sendEmail({ to, ...email });
}
