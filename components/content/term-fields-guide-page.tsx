import { BookOpen } from "lucide-react";
import { JARGON_HOME_PATH, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import {
  ContentPageBulletList,
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageSection,
  ContentPageShell,
  ContentPageTitledBulletList,
} from "@/components/content";

type TermFieldsGuidePageProps = {
  isLoggedIn?: boolean;
};

const TERM_FIELDS = [
  {
    title: "Term",
    body: "The word or phrase. Keep it short.",
  },
  {
    title: "Category",
    body: "A label so the list doesn't turn into one blob, Architecture, Testing, whatever helps you find things later.",
  },
  {
    title: "Definition",
    body: "What it means, in plain language. Required. If you can't say it simply, you probably don't have it yet.",
  },
  {
    title: "Example",
    body: "Optional. One sentence or situation where you've actually seen it. This is what made terms stick for me, more than the definition alone.",
  },
  {
    title: "In practice",
    body: "Optional. How people use it day to day, when you'd reach for it, what tradeoff it implies, what it doesn't cover.",
  },
  {
    title: "Debated",
    body: "Optional. Some terms everyone throws around but nobody agrees on. Worth noting before you sound too sure.",
  },
  {
    title: "Relationships",
    body: 'Optional links to other terms, often confused with, builds on, opposite of. "Often confused with" is the one used most. You can add a line on how they differ.',
  },
] as const;

export function TermFieldsGuidePage({ isLoggedIn = false }: TermFieldsGuidePageProps) {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={BookOpen}
          title="How terms are built"
          description="I kept learning jargon the wrong way, memorizing definitions I couldn't use. This is the shape that came out of that."
          backHref={isLoggedIn ? JARGON_HOME_PATH : PUBLIC_HOME_PATH}
          backLabel={isLoggedIn ? "Back to collection" : "Back to home"}
        />

        <ContentPageSection title="Why not just a definition">
          <p className="m-0">
            Flashcards and glossaries gave me the word and a one-line meaning. That was enough to
            recognize it in a slide deck, not enough to use it in conversation.
          </p>
          <p className="m-0">
            I also had a passive memory problem: I&apos;d read a definition, feel like I got it, and
            forget it a week later. Or recognize the word when someone else said it but draw a blank
            when it was my turn to use it. The definition was going in, but it wasn&apos;t sticking
            in a way that actually held.
          </p>
          <p className="m-0">
            What I kept wanting, for almost every term: an example, how people actually talk about
            it, where they disagree, and what it gets mixed up with. So I split those into separate
            fields instead of cramming everything into the definition.
          </p>
        </ContentPageSection>
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="What goes in a term">
          <p className="m-0">
            Every term needs a name, category, and definition, the minimum before it&apos;s worth
            keeping. I only add the rest when it actually helped me understand the word.
          </p>
          <ContentPageTitledBulletList items={TERM_FIELDS} />
        </ContentPageSection>

        <ContentPageSection title="What this is not">
          <ContentPageBulletList
            items={[
              <>Not a wiki article, a few focused lines beat a long write-up</>,
              <>Not a strict taxonomy, categories are just browse labels</>,
              <>Not every field on every term, leave optional ones empty</>,
            ]}
          />
        </ContentPageSection>
      </ContentPageMain>
    </ContentPageShell>
  );
}
