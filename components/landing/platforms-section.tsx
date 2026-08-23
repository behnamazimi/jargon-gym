import { Globe, Monitor, Send, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PLATFORMS: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: "Web" },
  { icon: Smartphone, label: "Mobile" },
  { icon: Monitor, label: "macOS widget" },
  { icon: Send, label: "Telegram" },
];

export function PlatformsSection() {
  return (
    <div>
      <h2 className="m-0 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
        Same queue, <span className="italic">everywhere</span>
      </h2>
      <p className="mt-3 m-0 max-w-[48ch] text-base leading-relaxed text-base-content/85">
        Install it on your phone, glance at a macOS widget, or run it through Telegram, it&apos;s
        the same ranked queue wherever you open it.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {PLATFORMS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full bg-base-100 px-4 py-2 text-base-content/80 shadow-surface ring-1 ring-base-content/5"
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
