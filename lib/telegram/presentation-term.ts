import { escapeText } from "entities";
import type { TermCard, TermCardRelationship } from "@/lib/jargon/term-card";
import type { InlineKeyboardMarkup } from "./actions";

const TELEGRAM_MESSAGE_LIMIT = 4096;

function buildGoogleSearchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${term} definition`)}`;
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
}

function formatInlineSection(emoji: string, label: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return `\n\n${emoji} <b>${escapeText(label)}:</b> ${escapeText(trimmed)}`;
}

function formatRelationships(relationships: TermCardRelationship[]): string {
  if (relationships.length === 0) return "";

  let section = "";
  for (const relationship of relationships) {
    const type = escapeText(relationship.relationshipType);
    const name = escapeText(relationship.relatedTermName);
    section += `\n\n• ${type} <b>${name}</b>`;
    if (relationship.description?.trim()) {
      section += `\n  ${escapeText(relationship.description.trim())}`;
    }
  }
  return `\n${section}`;
}

function buildTermHeader(term: TermCard): string {
  return (
    `<b>${escapeText(term.term)}</b>\n` +
    `${escapeText(term.domainName)} · ${escapeText(term.category)}`
  );
}

export function buildTermDetails(term: TermCard): string {
  let details = escapeText((term.definition ?? "").trim());
  details += formatInlineSection("💡", "Mental model", term.mentalModel ?? "");
  details += formatInlineSection("📌", "Example", term.example ?? "");
  details += formatInlineSection("⚠️", "Anti-example", term.antiExample ?? "");
  details += formatInlineSection("🛠", "In practice", term.discussion ?? "");
  details += formatInlineSection("⚡", "Debated", term.controversy ?? "");
  details += formatRelationships(term.relationships ?? []);
  return details;
}

function buildTermMessageBody(term: TermCard): string {
  return `${buildTermHeader(term)}\n\n${buildTermDetails(term)}`;
}

function appendSearchLink(message: string, termName: string): string {
  const searchUrl = buildGoogleSearchUrl(termName);
  return `${message}\n\n<a href="${searchUrl}">Search "${escapeText(termName)}" on Google</a>`;
}

function trimMessageBody(body: string, reservedLength: number): string {
  const maxBodyLength = TELEGRAM_MESSAGE_LIMIT - reservedLength;
  if (body.length <= maxBodyLength) return body;
  return `${body.slice(0, Math.max(0, maxBodyLength - 1)).trimEnd()}…`;
}

export function formatTermMessage(term: TermCard): string {
  const body = buildTermMessageBody(term);
  const searchLink = appendSearchLink("", term.term);
  const reservedLength = searchLink.length;

  const trimmed =
    body.length + reservedLength <= TELEGRAM_MESSAGE_LIMIT
      ? body
      : trimMessageBody(body, reservedLength);

  return appendSearchLink(trimmed, term.term);
}

function appendOpenInWebRow(rows: InlineKeyboardMarkup["inline_keyboard"], termId: string): void {
  const base = getAppBaseUrl();
  // Telegram already recorded this term as read when it delivered the message.
  const webUrl = `${base}/jargon/read?termId=${encodeURIComponent(termId)}&alreadyRead=true`;
  try {
    if (base && new URL(webUrl).protocol === "https:") {
      rows.push([{ text: "Open in web", url: webUrl }]);
    }
  } catch {
    // skip invalid APP_BASE_URL
  }
}

/** Masked prompt: term/domain/category only, gating the definition behind a
 *  reveal tap so the read only counts once the user actually looks. */
export function formatReadPrompt(term: TermCard): string {
  return `${buildTermHeader(term)}\n\n<i>Tap Reveal to see the definition.</i>`;
}

export function buildReadRevealKeyboard(termId: string): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: "Reveal", callback_data: `read:reveal:${termId}` }]] };
}

export function buildTermInlineKeyboard(
  term: TermCard,
  isNewToUser?: boolean,
): InlineKeyboardMarkup {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: "Read next", callback_data: `read:${term.id}` }],
  ];
  if (isNewToUser) {
    rows.push([{ text: "I already know this", callback_data: `read:known:${term.id}` }]);
  }
  appendOpenInWebRow(rows, term.id);
  return { inline_keyboard: rows };
}
