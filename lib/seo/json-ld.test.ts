import { describe, expect, it } from "vitest";
import { breadcrumbs, definedTermSet, serializeJsonLd, website } from "./json-ld";

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
      terms: [{ name: "Blocker", description: "Stops work." }],
    });
    expect(set.description).toBeUndefined();
    expect(set.hasDefinedTerm).toEqual([
      {
        "@type": "DefinedTerm",
        name: "Blocker",
        description: "Stops work.",
      },
    ]);
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
