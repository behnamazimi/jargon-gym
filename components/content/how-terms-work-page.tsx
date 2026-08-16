import { BookOpen } from "lucide-react";
import Link from "next/link";
import { JARGON_HOME_PATH, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import {
  ContentPageBulletList,
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageSection,
  ContentPageShell,
  ContentPageTitledBulletList,
  contentPageLinkClass,
} from "@/components/content/content-page-shell";

const TERM_FIELDS = [
  {
    title: "Term",
    body: "The word or phrase. Keep it short.",
  },
  {
    title: "Category",
    body: "A browse label so the list doesn't turn into one blob, Architecture, Testing, whatever helps you find things later. Not a learning field.",
  },
  {
    title: "Definition",
    body: "What the term means, in plain language. Required. Meaning only, not when to use it, not how people disagree, not how it differs from a related term. If you can't say it simply, you probably don't have it yet.",
  },
  {
    title: "Example",
    body: "Optional. Add when the definition alone wouldn't let you use the word. A concrete scene (where you've seen it apply) or a natural sentence (the word used in speech), whichever makes it click.",
  },
  {
    title: "Mental model",
    body: "Optional. A comparison or analogy, a way to think about the term rather than what it does. Add it when it would make the term click faster than the definition alone.",
  },
  {
    title: "In practice",
    body: "Optional. Tradeoffs, team conventions, when you'd reach for it, usage nuance that isn't obvious from the definition. Common misuse fits here too, as does a caution about overuse, not in Debated.",
  },
  {
    title: "Anti-example",
    body: "Optional and rare. A near-miss, something that looks like this term but isn't, so you can tell them apart. Only when there's a real risk of confusing the two.",
  },
  {
    title: "Debated",
    body: "Optional and rare. Only when practitioners genuinely disagree on meaning or scope, not loose usage, not a caution about overuse.",
  },
  {
    title: "Relationships",
    body: "Optional links to other terms in the collection, often confused with, depends on, builds on, opposite of, or any real connection worth pointing out. Add a line on how they differ when it helps.",
  },
] as const;

const OPTIONAL_FIELD_TRIGGERS = [
  {
    title: "Example",
    body: "The definition is solid but I still couldn't use the word in conversation from it alone.",
  },
  {
    title: "Mental model",
    body: "A comparison or analogy would make this click faster than the definition alone.",
  },
  {
    title: "In practice",
    body: "There's a tradeoff, convention, or \"when you'd reach for it\" that the definition and example don't cover for me.",
  },
  {
    title: "Anti-example",
    body: "There's something people commonly mistake for this term, and naming the difference would help.",
  },
  {
    title: "Debated",
    body: "People in the field actually disagree on what this term means or how far it extends.",
  },
  {
    title: "Relationships",
    body: "This term connects to another one in a way worth naming, confusion, dependency, contrast, or otherwise.",
  },
] as const;

type HowTermsWorkPageProps = {
  isLoggedIn?: boolean;
};

export function HowTermsWorkPage({ isLoggedIn = false }: HowTermsWorkPageProps) {
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

        <p className="m-0 mb-4 text-sm leading-relaxed text-base-content/80">
          This is for anyone who wants to understand how content is structured in the app, or who
          plans to add terms of their own. You can import a JSON list, paste output from an LLM
          prompt I prepared for generating a field&apos;s jargon, or add terms one at a time.
        </p>

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
            Two problems kept showing up: shallow understanding (I could repeat a definition but not
            apply the word) and mixing terms up (coupling vs cohesion, that kind of thing). What I
            kept wanting was an example, how people actually use it, where they disagree, and how it
            connects to nearby terms, so I split those into separate fields instead of cramming
            everything into the definition.
          </p>
          <p className="m-0">
            A term is &ldquo;known&rdquo; when I could define it, use it correctly, and spot misuse
            or nuance, not just recognize it on a slide.
          </p>
        </ContentPageSection>
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="What goes in a term">
          <p className="m-0">
            Every term needs a name, category, and definition, the minimum before it&apos;s worth
            keeping. I import lists or add terms one at a time into collections. This structure is
            the main thing that separates it from a one-line flashcard.
          </p>
          <ContentPageTitledBulletList items={TERM_FIELDS} />
        </ContentPageSection>

        <ContentPageSection title="When to add optional fields">
          <p className="m-0">
            Empty optional fields mean &ldquo;not needed,&rdquo; not &ldquo;TODO.&rdquo; I add a
            field only when it would have helped me understand or use the word.
          </p>
          <ContentPageTitledBulletList items={OPTIONAL_FIELD_TRIGGERS} />
        </ContentPageSection>

        <ContentPageSection title="Known and unknown">
          <p className="m-0">
            Every term is either something I{" "}
            <strong className="font-medium text-base-content">already know</strong> or something
            I&apos;m <strong className="font-medium text-base-content">still learning</strong>. That
            split is the term&apos;s state, not a queue setting. I kept mixing known and unknown
            terms in one deck and wasted time on words I didn&apos;t need, so the two never mix now.
          </p>
          <p className="m-0">
            Mark a term known or unknown anywhere, in review, the collection list, Telegram, or the
            desktop widget, and it moves between states. I wanted that to follow the term
            everywhere. Review always draws from whichever pool you pick; Quiz only ever draws from
            the known pool, since it&apos;s a check on terms you&apos;ve already marked known, not a
            way to learn new ones, a miss there sends the term back to unknown automatically.{" "}
            <Link href="/how-smart-queue-works" className={contentPageLinkClass}>
              How the Smart Queue works
            </Link>{" "}
            covers how the queue ranks terms inside each pool.
          </p>
        </ContentPageSection>

        <ContentPageSection title="When a term is done">
          <p className="m-0">
            Done means I could use the word correctly in conversation, not that every optional field
            is filled. I revisit terms when I encounter them in the wild and realize something is
            missing.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What this is not">
          <ContentPageBulletList
            items={[
              <>Not a wiki article, a few focused lines beat a long write-up</>,
              <>Not a strict taxonomy, categories are browse labels, not a learning hierarchy</>,
              <>Not every field on every term, leave optional ones empty</>,
              <>Not complete when all fields are full, complete when the use test passes</>,
            ]}
          />
        </ContentPageSection>
      </ContentPageMain>
    </ContentPageShell>
  );
}
