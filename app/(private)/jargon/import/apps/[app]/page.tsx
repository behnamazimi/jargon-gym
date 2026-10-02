import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/jargon/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { APP_GUIDES, findGuide } from "@/lib/jargon/import/guides";

type PageProps = {
  params: Promise<{ app: string }>;
};

export function generateStaticParams() {
  return APP_GUIDES.map((guide) => ({ app: guide.slug }));
}

export default async function AppGuidePage({ params }: PageProps) {
  const { app } = await params;
  const guide = findGuide(app);
  if (!guide) notFound();

  const steps = guide.canExport ? [...guide.steps, "Come back here and paste."] : [];

  return (
    <>
      <PageHeader
        icon={Layers}
        title={`From ${guide.name}`}
        backHref="/jargon/import/apps"
        backLabel="Other apps"
        compactOnPhone
      />
      {steps.length > 0 ? (
        <ol className="shadow-surface flex list-none flex-col gap-3 rounded-box bg-base-100 p-4">
          {steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-text">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {guide.note ? (
        <Alert variant="info">
          <AlertDescription>{guide.note}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <LinkButton href="/jargon/import/paste" className="min-h-12 w-full md:min-h-11 md:w-auto">
          {guide.canExport ? `Paste from ${guide.name}` : "Paste a list"}
        </LinkButton>
        {!guide.canExport ? (
          <LinkButton
            href="/jargon/browse"
            variant="outline"
            className="min-h-12 w-full md:min-h-11 md:w-auto"
          >
            Browse shared collections
          </LinkButton>
        ) : null}
        {guide.link ? (
          <LinkButton href={guide.link.href} variant="ghost" className="min-h-11 w-full md:w-auto">
            {guide.link.label}
          </LinkButton>
        ) : null}
      </div>
    </>
  );
}
