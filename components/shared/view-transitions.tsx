import { type ReactNode, ViewTransition } from "react";

type Page<P> = (props: P) => ReactNode | Promise<ReactNode>;

export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/** Pairs a collection's title in the public list with the heading on its page. */
export function collectionTitleName(slug: string) {
  return `collection-title-${slug}`;
}

const PUSH_ENTER = { "nav-forward": "push-in", "nav-back": "pop-in" };
const PUSH_EXIT = { "nav-forward": "push-out", "nav-back": "pop-out" };

/** Wraps a section's layout (Library, Read, Settings…). Links tagged
 *  `NAV_FORWARD` push the next section in over it and `NAV_BACK` pops back,
 *  like a phone app's screen stack. Untagged moves, such as the dock tabs,
 *  swap at once and the new section fades in, so the old one never lingers
 *  over the next page's loading state. Pages within the section don't
 *  trigger it. */
export function SectionTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ ...PUSH_ENTER, default: "fade-through-in" }}
      exit={{ ...PUSH_EXIT, default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** For pages in a flow: links tagged `NAV_FORWARD` or `NAV_BACK` push or pop
 *  the page. Untagged navigations don't animate. */
export function withDirection<P extends object>(Page: Page<P>) {
  return function DirectionalPage(props: P) {
    return (
      <ViewTransition
        enter={{ ...PUSH_ENTER, default: "none" }}
        exit={{ ...PUSH_EXIT, default: "none" }}
        default="none"
      >
        <Page {...props} />
      </ViewTransition>
    );
  };
}

/** For pages behind a `loading.tsx` skeleton: the content slides up when it
 *  arrives. Refreshes of a page already on screen don't animate. */
export function withReveal<P extends object>(Page: Page<P>) {
  return function RevealedPage(props: P) {
    return (
      <ViewTransition enter="slide-up" default="none">
        <Page {...props} />
      </ViewTransition>
    );
  };
}
