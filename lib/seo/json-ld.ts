const CONTEXT = "https://schema.org";

type Crumb = { name: string; url: string };

export function breadcrumbs(items: Crumb[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

type TermEntry = { name: string; description: string; url: string };

/** A public collection as a glossary: the set and every term in it. */
export function definedTermSet(set: {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  terms: TermEntry[];
}) {
  return {
    "@context": CONTEXT,
    "@type": "DefinedTermSet",
    "@id": set.url,
    name: set.name,
    description: set.description || undefined,
    url: set.url,
    inLanguage: set.inLanguage,
    hasDefinedTerm: set.terms.map((term) => ({
      "@type": "DefinedTerm",
      name: term.name,
      description: term.description,
      url: term.url,
    })),
  };
}

export function definedTerm(term: {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  set: { name: string; url: string };
}) {
  return {
    "@context": CONTEXT,
    "@type": "DefinedTerm",
    "@id": term.url,
    name: term.name,
    description: term.description,
    url: term.url,
    inLanguage: term.inLanguage,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": term.set.url,
      name: term.set.name,
      url: term.set.url,
    },
  };
}

export function website(site: { name: string; url: string; description: string }) {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon/512`,
    },
  };
}

/** For a <script type="application/ld+json">: `<` is escaped so content can't close the tag. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
