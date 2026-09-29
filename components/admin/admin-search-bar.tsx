/** A plain GET form, so it works without JavaScript. The other address parts ride along as
 *  hidden fields; the page number is left out on purpose, since a new search starts at page 1. */
export function AdminSearchBar({
  action,
  query,
  label,
  hidden,
}: {
  action: string;
  query: string;
  label: string;
  hidden: Record<string, string>;
}) {
  return (
    <form action={action} method="get" role="search" className="flex gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={query}
        maxLength={100}
        placeholder={label}
        aria-label={label}
        className="input input-bordered w-full max-w-sm"
      />
      <button type="submit" className="btn">
        Search
      </button>
    </form>
  );
}
