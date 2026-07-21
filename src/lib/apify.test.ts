import { describe, expect, it } from "vitest";
import { apifyInput, normalizeApifyPosts, toIso } from "./apify";

describe("toIso", () => {
  it("accepte les chaînes ISO", () => {
    expect(toIso("2026-07-16T10:00:00.000Z")).toBe("2026-07-16T10:00:00.000Z");
  });
  it("convertit les timestamps Unix en secondes", () => {
    expect(toIso(1_752_660_000)).toBe(new Date(1_752_660_000_000).toISOString());
  });
  it("convertit les timestamps Unix en millisecondes", () => {
    expect(toIso(1_752_660_000_000)).toBe(new Date(1_752_660_000_000).toISOString());
  });
  it("rejette les valeurs invalides", () => {
    expect(toIso(null)).toBeNull();
    expect(toIso("pas une date")).toBeNull();
    expect(toIso("")).toBeNull();
  });
});

describe("apifyInput", () => {
  it("construit l'entrée avec startUrls et limite", () => {
    expect(apifyInput(["https://facebook.com/a", "https://facebook.com/b"], 15)).toEqual({
      startUrls: [{ url: "https://facebook.com/a" }, { url: "https://facebook.com/b" }],
      resultsLimit: 15,
    });
  });
});

describe("normalizeApifyPosts", () => {
  it("normalise les champs courants (text/url/time)", () => {
    const posts = normalizeApifyPosts([
      { text: "Ouvert dimanche !", url: "https://facebook.com/mx/posts/1", time: "2026-07-16T10:00:00.000Z" },
    ]);
    expect(posts).toEqual([
      { title: null, content: "Ouvert dimanche !", link: "https://facebook.com/mx/posts/1", published_at: "2026-07-16T10:00:00.000Z" },
    ]);
  });

  it("gère les variantes de champs (message/postUrl/timestamp)", () => {
    const posts = normalizeApifyPosts([
      { message: "Fermé ce week-end", postUrl: "https://facebook.com/mx/posts/2", timestamp: 1_752_660_000 },
    ]);
    expect(posts[0].content).toBe("Fermé ce week-end");
    expect(posts[0].link).toBe("https://facebook.com/mx/posts/2");
    expect(posts[0].published_at).toBe(new Date(1_752_660_000_000).toISOString());
  });

  it("ignore les items sans lien ou sans date", () => {
    const posts = normalizeApifyPosts([
      { text: "sans lien", time: "2026-07-16T10:00:00.000Z" },
      { text: "sans date", url: "https://facebook.com/mx/posts/3" },
      "pas un objet",
      null,
    ]);
    expect(posts).toHaveLength(0);
  });
});
