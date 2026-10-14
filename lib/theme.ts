export const THEME_COOKIE_NAME = "theme";
export const LIGHT_THEME = "emerald";
export const DARK_THEME = "dim";

/** Runs in the page before it paints, for pages cached without a cookie: the
 *  server renders the light theme and this puts the visitor's choice back. */
export const THEME_RESTORE_SCRIPT = `try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE_NAME}=(${LIGHT_THEME}|${DARK_THEME})/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}`;
