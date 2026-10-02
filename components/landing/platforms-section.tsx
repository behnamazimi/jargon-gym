const PLATFORMS = ["Web", "Mobile", "macOS widget", "Telegram"];

export function PlatformsSection() {
  return (
    <div className="max-w-3xl">
      <h2 className="m-0 text-balance text-3xl font-medium tracking-tight sm:text-4xl">
        Same queue, everywhere
      </h2>
      <p className="mt-4 m-0 max-w-[52ch] text-base leading-relaxed text-base-content/85">
        Install it on your phone, glance at a macOS widget, or run it through Telegram, it&apos;s
        the same ranked queue wherever you open it.
      </p>
      <ul className="font-mono m-0 mt-5 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm text-base-content/75">
        {PLATFORMS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
