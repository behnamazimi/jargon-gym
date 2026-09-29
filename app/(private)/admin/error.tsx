"use client";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function AdminError({ reset, unstable_retry }: AdminErrorProps) {
  const retry = unstable_retry ?? reset;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-4 py-8">
      <div role="alert" className="alert alert-error w-full">
        Something went wrong loading this page.
      </div>
      {retry ? (
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
