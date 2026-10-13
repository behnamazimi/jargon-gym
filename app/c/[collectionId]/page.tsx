import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  SharedCollectionCta,
  type SharedCtaState,
} from "@/components/collections/shared-collection-cta";
import { SharedLandingViewed } from "@/components/collections/shared-landing-viewed";
import { TermCard } from "@/components/collections/term-card";
import { withReveal } from "@/components/shared/view-transitions";
import { getSessionUser } from "@/lib/auth/require-session";
import { getSharedCollectionPreview } from "@/lib/collections/shared-preview";
import { getCollectionMembership } from "@/lib/library/membership";
import { createClient } from "@/lib/supabase/server";
import { countLabel, kindLine } from "@/lib/terms/kinds";

type PageParams = { collectionId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { collectionId } = await params;
  const preview = await getSharedCollectionPreview(collectionId);
  if (!preview) return {};

  const description =
    preview.description || `${countLabel(preview.kind, preview.totalTerms)} in ${preview.name}.`;

  return {
    title: preview.name,
    description,
    robots: { index: false },
    openGraph: { type: "website", title: `${preview.name} | Lobyas`, description },
  };
}

async function SharedCollectionPage({ params }: { params: Promise<PageParams> }) {
  const { collectionId } = await params;
  const [preview, { user }] = await Promise.all([
    getSharedCollectionPreview(collectionId),
    getSessionUser(),
  ]);
  if (!preview) notFound();
  if (preview.publicSlug) permanentRedirect(`/collections/${preview.publicSlug}`);

  const state: SharedCtaState = user
    ? await getCollectionMembership(await createClient(), user.id, preview.id)
    : null;
  const lang = preview.language === "en" ? undefined : preview.language;
  const cta = { id: preview.id, name: preview.name };
  const more = preview.totalTerms - preview.terms.length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-24 sm:py-12">
      <SharedLandingViewed signedIn={user !== null} />
      <header>
        <p className="m-0 text-sm text-base-content/70">
          {kindLine(preview.kind, preview.language)}
          <span className="mx-1.5 text-base-content/50" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">{countLabel(preview.kind, preview.totalTerms)}</span>
        </p>
        <h1
          lang={lang}
          className="mt-2 m-0 text-balance font-heading text-3xl font-medium leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl"
        >
          {preview.name}
        </h1>
        {preview.description ? (
          <p className="mt-3 m-0 max-w-prose text-base leading-relaxed text-base-content/85">
            {preview.description}
          </p>
        ) : null}
        <div className="mt-6">
          <SharedCollectionCta collection={cta} state={state} />
        </div>
      </header>

      {preview.terms.length === 0 ? (
        <p className="mt-10 m-0 text-base text-base-content/70">No terms here yet.</p>
      ) : (
        <ul
          aria-label="Terms from this collection"
          className="mt-10 m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2"
        >
          {preview.terms.map((term) => (
            <li key={term.term}>
              <TermCard term={term} language={preview.language} />
            </li>
          ))}
        </ul>
      )}

      {more > 0 ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-base text-base-content/70">+{more} more in this collection</p>
          <SharedCollectionCta collection={cta} state={state} compact />
        </div>
      ) : null}
    </div>
  );
}

export default withReveal(SharedCollectionPage);
