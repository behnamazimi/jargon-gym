"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useMountEffect } from "@/hooks/use-mount-effect";

const STORAGE_KEY = "lb_viewport_debug";

type Readout = Record<string, string>;

function px(value: number) {
  return `${Math.round(value * 10) / 10}`;
}

function measure(probe: HTMLElement, pathname: string): Readout {
  const safe = getComputedStyle(probe);
  const viewport = window.visualViewport;
  const dock = document.querySelector<HTMLElement>("nav.dock")?.getBoundingClientRect();
  const shell = document.querySelector<HTMLElement>("[data-chrome]")?.getBoundingClientRect();
  return {
    path: pathname,
    innerHeight: px(window.innerHeight),
    clientHeight: px(document.documentElement.clientHeight),
    visualHeight: viewport ? px(viewport.height) : "n/a",
    visualOffsetTop: viewport ? px(viewport.offsetTop) : "n/a",
    scrollY: px(window.scrollY),
    safeTop: safe.paddingTop,
    safeBottom: safe.paddingBottom,
    standalone: String(window.matchMedia("(display-mode: standalone)").matches),
    shell: shell ? `${px(shell.top)}..${px(shell.bottom)}` : "n/a",
    dock: dock ? `${px(dock.top)}..${px(dock.bottom)} (h ${px(dock.height)})` : "n/a",
  };
}

/** Temporary on-screen readout for chasing the iOS PWA dock glitch.
 *  Turn it on with `?debug=viewport` (it sticks), off with `?debug=off`. */
export function ViewportDebug() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [readout, setReadout] = useState<Readout>({});

  useMountEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("debug");
    try {
      if (flag === "viewport") localStorage.setItem(STORAGE_KEY, "1");
      if (flag === "off") localStorage.removeItem(STORAGE_KEY);
      if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    } catch {
      if (flag !== "viewport") return;
    }
    setEnabled(true);

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const update = () => setReadout(measure(probe, window.location.pathname));
    update();
    const timer = setInterval(update, 500);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      probe.remove();
    };
  });

  if (!enabled) return null;

  return (
    <pre
      key={pathname}
      className="pointer-events-none fixed top-14 left-1 z-[200] m-0 rounded bg-black/75 p-1.5 font-mono text-[10px] leading-tight text-white md:hidden"
    >
      {Object.entries(readout)
        .map(([name, value]) => `${name}: ${value}`)
        .join("\n")}
    </pre>
  );
}
