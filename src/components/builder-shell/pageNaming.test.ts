import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./pageNaming";

describe("slugify", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugify("About Us")).toBe("about-us");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(slugify("  Contact!! & Info  ")).toBe("contact-info");
  });

  it("falls back to 'page' when nothing alphanumeric remains", () => {
    expect(slugify("!!!")).toBe("page");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it is not taken", () => {
    expect(uniqueSlug("about", ["home"])).toBe("about");
  });

  it("appends -2 when the base slug is taken", () => {
    expect(uniqueSlug("home", ["home"])).toBe("home-2");
  });

  it("keeps incrementing until a free slug is found", () => {
    expect(uniqueSlug("home", ["home", "home-2", "home-3"])).toBe("home-4");
  });
});
