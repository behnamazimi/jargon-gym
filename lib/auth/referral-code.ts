export function normalizeReferralCode(raw: string | null | undefined): string {
  return raw?.trim().toUpperCase() ?? "";
}
