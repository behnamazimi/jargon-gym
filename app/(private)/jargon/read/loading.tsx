export default function ReadLoading() {
  return (
    <div
      className="shadow-surface overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-content/5"
      aria-busy="true"
      aria-label="Loading term"
    >
      <div className="border-b border-base-300/60 px-5 py-5 sm:px-6">
        <div className="skeleton h-8 w-2/3 bg-base-200" />
        <div className="skeleton mt-3 h-3 w-40 bg-base-200" />
      </div>
      <div className="space-y-3 px-5 py-5 sm:px-6">
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-5/6 bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton mt-6 h-10 w-28 bg-base-200 ms-auto" />
      </div>
    </div>
  );
}
