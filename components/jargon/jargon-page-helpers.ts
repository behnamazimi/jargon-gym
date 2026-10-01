/** Drops a one-time query param (like ?added=) without a navigation. */
export function dropSearchParamFromUrl(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
