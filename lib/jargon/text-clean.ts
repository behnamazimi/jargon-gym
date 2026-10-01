/** Control characters (except tab, newline and carriage return), DEL, and the
 *  bidirectional overrides and isolates that can make text read differently
 *  from how it is stored. Left-to-right and right-to-left marks stay, since
 *  real right-to-left text needs them. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;

export function cleanText(value: string): string {
  return value.replace(UNSAFE, "");
}
