/** Sends a save that doesn't change the page, such as a setting synced on
 *  load. It is a plain request rather than a Server Action on purpose: an
 *  action's reply updates Next's router, and one that lands while a redirect
 *  is reloading the page crashes the router (React error #310). Resolves to
 *  the error message, or null once saved. */
export async function saveInBackground(path: string, body: unknown): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Lets the save finish when the page is being left, as during a redirect.
      keepalive: true,
      // An expired session makes the proxy redirect to the login page.
      redirect: "manual",
    });
    if (response.ok) return null;
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    return result?.error ?? `Request failed (${response.status}).`;
  } catch (err) {
    return err instanceof Error ? err.message : "Request failed.";
  }
}
