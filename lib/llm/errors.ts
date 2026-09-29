import { APICallError, RetryError } from "ai";

function innerError(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

/** HTTP status of a failed provider call, looking through the SDK's retry wrapper. */
export function providerStatus(error: unknown): number | undefined {
  const inner = innerError(error);
  return APICallError.isInstance(inner) ? inner.statusCode : undefined;
}

/** The provider refused the key itself. Google answers a bad key with a 400
 *  that says so, where Anthropic uses 401 or 403. */
export function isKeyRejected(error: unknown): boolean {
  const status = providerStatus(error);
  if (status === 401 || status === 403) return true;

  const inner = innerError(error);
  return status === 400 && inner instanceof Error && /api key/i.test(inner.message);
}

/** The key was refused or the provider has no quota left. For the app's own
 *  key that is our problem, not something the user can fix. */
export function isProviderKeyFault(error: unknown): boolean {
  const status = providerStatus(error);
  return isKeyRejected(error) || status === 402 || status === 429;
}
