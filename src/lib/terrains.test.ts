import { describe, expect, it } from "vitest";
import { classifyText, classifyWeekend, nextWeekend, parseRss } from "./terrains";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>MX Park</title>
  <item>
    <title>Ouverture ce week-end !</title>
    <description><![CDATA[Le terrain sera <b>ouvert</b> samedi &amp; dimanche de 9h &#224; 18h]]></description>
    <link>https://facebook.com/mxpark/posts/1</link>
    <pubDate>Thu, 16 Jul 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title></title>
    <description>Entretien de la piste cette semaine</description>
    <link>https://facebook.com/mxpark/posts/2</link>
    <pubDate>Mon, 13 Jul 2026 08:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe("parseRss", () => {
  it("extrait les items avec nettoyage du HTML et des entités", () => {
    const items = parseRss(SAMPLE_RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Ouverture ce week-end !");
    expect(items[0].content).toBe("Le terrain sera ouvert samedi & dimanche de 9h à 18h");
    expect(items[0].link).toBe("https://facebook.com/mxpark/posts/1");
    expect(items[0].published_at).toBe("2026-07-16T10:00:00.000Z");
  });

  it("retourne un tableau vide pour un contenu non RSS", () => {
    expect(parseRss("<html>pas un flux</html>")).toEqual([]);
  });
});

describe("nextWeekend", () => {
  it("trouve le week-end à venir en semaine", () => {
    expect(nextWeekend(new Date(2026, 6, 15))).toEqual({ saturday: "2026-07-18", sunday: "2026-07-19" }); // mercredi
  });
  it("reste sur le week-end en cours le samedi et le dimanche", () => {
    expect(nextWeekend(new Date(2026, 6, 18))).toEqual({ saturday: "2026-07-18", sunday: "2026-07-19" }); // samedi
    expect(nextWeekend(new Date(2026, 6, 19))).toEqual({ saturday: "2026-07-18", sunday: "2026-07-19" }); // dimanche
  });
});

describe("classifyText", () => {
  it("détecte l'ouverture", () => {
    expect(classifyText("Le terrain sera ouvert dimanche")).toBe("ouvert");
    expect(classifyText("Ouverture 9h-18h, roulage libre")).toBe("ouvert");
  });
  it("détecte la fermeture, y compris les négations", () => {
    expect(classifyText("Terrain fermé ce week-end, pluie")).toBe("ferme");
    expect(classifyText("Le terrain ne sera pas ouvert dimanche")).toBe("ferme");
    expect(classifyText("Journée annulée")).toBe("ferme");
  });
  it("reste inconnu sans mot-clé", () => {
    expect(classifyText("Belle journée d'entraînement hier !")).toBe("inconnu");
  });
});

describe("classifyWeekend", () => {
  const weekend = { saturday: "2026-07-18", sunday: "2026-07-19" };
  const post = (published_at: string, content: string) => ({ title: null, content, published_at });

  it("prend le post concluant le plus récent de la semaine", () => {
    const verdict = classifyWeekend(
      [
        post("2026-07-14T10:00:00.000Z", "Le terrain sera ouvert samedi"),
        post("2026-07-17T18:00:00.000Z", "Finalement fermé, orages annoncés"),
      ],
      weekend,
    );
    expect(verdict.status).toBe("ferme");
    expect(verdict.post?.content).toContain("orages");
  });

  it("ignore les posts trop anciens ou hors fenêtre", () => {
    const verdict = classifyWeekend([post("2026-07-05T10:00:00.000Z", "Ouvert le 5 juillet")], weekend);
    expect(verdict.status).toBe("inconnu");
    expect(verdict.post).toBeNull();
  });

  it("saute les posts non concluants pour trouver une annonce", () => {
    const verdict = classifyWeekend(
      [
        post("2026-07-17T10:00:00.000Z", "Photo de la nouvelle table !"),
        post("2026-07-16T10:00:00.000Z", "Ouverture samedi et dimanche"),
      ],
      weekend,
    );
    expect(verdict.status).toBe("ouvert");
  });
});
