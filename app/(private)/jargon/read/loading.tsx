export default function ReadLoading() {
  return (
    <div
      className="shadow-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-content/5"
      aria-busy="true"
      aria-label="Loading term"
    >
      <div className="shrink-0 border-b border-base-300/60 px-5 py-3 sm:px-6">
        <div className="skeleton h-7 w-2/3 bg-base-200" />
        <div className="skeleton mt-2 h-3 w-40 bg-base-200" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 px-5 py-4 sm:px-6">
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-5/6 bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-4/5 bg-base-200" />
      </div>
      <div className="flex shrink-0 justify-end border-t border-base-300/60 px-5 py-3 sm:px-6">
        <div className="skeleton h-11 w-full bg-base-200 md:w-32" />
      </div>
    </div>
  );
}
