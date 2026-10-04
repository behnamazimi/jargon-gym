import { describe, expect, it } from "vitest";
import { breadcrumbs, definedTerm, definedTermSet, serializeJsonLd, website } from "./json-ld";

describe("JSON-LD builders", () => {
  it("numbers breadcrumbs from 1", () => {
    const list = breadcrumbs([
      { name: "Collections", url: "https://x.test/collections" },
      { name: "Standup", url: "https://x.test/collections/standup" },
    ]);
    expect(list.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(list["@type"]).toBe("BreadcrumbList");
  });

  it("describes a collection as a set of defined terms", () => {
    const set = definedTermSet({
      name: "Standup",
      description: "",
      url: "https://x.test/collections/standup",
      inLanguage: "en",
      terms: [{ name: "Blocker", description: "Stops work.", url: "https://x.test/b" }],
    });
    expect(set.description).toBeUndefined();
    expect(set.hasDefinedTerm).toEqual([
      {
        "@type": "DefinedTerm",
        name: "Blocker",
        description: "Stops work.",
        url: "https://x.test/b",
      },
    ]);
  });

  it("links a term to its set", () => {
    const term = definedTerm({
      name: "lopen",
      description: "to walk",
      url: "https://x.test/collections/dutch/lopen",
      inLanguage: "nl",
      set: { name: "Dutch basics", url: "https://x.test/collections/dutch" },
    });
    expect(term.inDefinedTermSet["@id"]).toBe("https://x.test/collections/dutch");
    expect(term.inLanguage).toBe("nl");
  });

  it("names the site and its publisher", () => {
    expect(
      website({ name: "Lobyas", url: "https://x.test", description: "d" }).publisher.name,
    ).toBe("Lobyas");
  });

  it("escapes < so a value can't end the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
