const DIALOG = "[role='dialog'], [role='alertdialog']";

/** Whether a key event came from inside an open dialog. The study pages listen
 *  for keys on the window, and a dialog's own keys must not reach them. */
export function isInsideDialog(target: EventTarget | null): boolean {
  const element = target as { closest?: (selector: string) => unknown } | null;
  return typeof element?.closest === "function" && element.closest(DIALOG) !== null;
}
