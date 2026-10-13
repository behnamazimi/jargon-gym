export default function SharedCollectionLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12"
      aria-busy="true"
      aria-label="Loading collection"
    >
      <div>
        <div className="skeleton h-4 w-40 bg-base-200" />
        <div className="skeleton mt-3 h-9 w-64 bg-base-200" />
        <div className="skeleton mt-3 h-5 w-full max-w-md bg-base-200" />
        <div className="skeleton mt-6 h-12 w-full rounded-field bg-base-200 sm:w-48" />
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        <li className="skeleton h-28 w-full rounded-box bg-base-200" />
        <li className="skeleton h-28 w-full rounded-box bg-base-200" />
        <li className="skeleton h-28 w-full rounded-box bg-base-200" />
        <li className="skeleton h-28 w-full rounded-box bg-base-200" />
      </ul>
    </div>
  );
}
