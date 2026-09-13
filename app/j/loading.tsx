export default function PublicCollectionsLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10"
      aria-busy="true"
      aria-label="Loading collections"
    >
      <div>
        <div className="skeleton h-9 w-64 bg-base-200" />
        <div className="skeleton mt-2 h-5 w-full max-w-md bg-base-200" />
      </div>
      <ul className="flex flex-col gap-3">
        <li className="skeleton h-24 w-full rounded-lg bg-base-200" />
        <li className="skeleton h-24 w-full rounded-lg bg-base-200" />
        <li className="skeleton h-24 w-full rounded-lg bg-base-200" />
      </ul>
    </div>
  );
}
