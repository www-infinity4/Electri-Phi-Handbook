interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  INGEST_TOKEN: string;
}

type CardInput = {
  id?: string; title: string; summary: string; sourceUrl: string;
  sourceSite?: string; sourceAuthor?: string; sourceDate?: string;
  originalText: string; engineeringNotes?: string; factCheck?: string;
  confidence?: number; topics?: string[]; components?: string[];
  models?: string[]; measurements?: unknown[]; imageUrl?: string | null;
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "access-control-allow-origin": "*" } });

const text = (value: unknown) => String(value ?? "").trim();
const list = (value: unknown) => JSON.stringify(Array.isArray(value) ? value : []);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const db = await env.DB.prepare("SELECT 1 AS ok").first();
      return json({ ok: db?.ok === 1, service: "electri-phi-handbook" });
    }

    if (url.pathname === "/api/search" && request.method === "GET") {
      const q = text(url.searchParams.get("q"));
      if (!q) return json({ query: "", cards: [] });
      const match = q.replace(/[^\p{L}\p{N}_-]+/gu, " ").trim().split(/\s+/).map(x => x + "*").join(" ");
      const result = await env.DB.prepare(
        `SELECT c.* FROM cards_fts f JOIN cards c ON c.rowid=f.rowid
         WHERE cards_fts MATCH ? ORDER BY bm25(cards_fts) LIMIT 50`
      ).bind(match).all();
      return json({ query: q, cards: (result.results ?? []).map(decodeCard) });
    }

    const cardMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
    if (cardMatch && request.method === "GET") {
      const card = await env.DB.prepare("SELECT * FROM cards WHERE id=?").bind(cardMatch[1]).first();
      return card ? json(decodeCard(card)) : json({ error: "Card not found" }, 404);
    }

    if (url.pathname === "/api/cards" && request.method === "POST") {
      if (request.headers.get("authorization") !== `Bearer ${env.INGEST_TOKEN}`)
        return json({ error: "Unauthorized" }, 401);

      const card = await request.json<CardInput>();
      if (!text(card.title) || !text(card.summary) || !text(card.sourceUrl) || !text(card.originalText))
        return json({ error: "title, summary, sourceUrl, and originalText are required" }, 400);

      const id = text(card.id) || crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO cards
        (id,title,summary,source_url,source_site,source_author,source_date,original_text,
         engineering_notes,fact_check,confidence,topics,components,models,measurements,image_url)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_url) DO UPDATE SET
          title=excluded.title,summary=excluded.summary,engineering_notes=excluded.engineering_notes,
          fact_check=excluded.fact_check,confidence=excluded.confidence,topics=excluded.topics,
          components=excluded.components,models=excluded.models,measurements=excluded.measurements,
          image_url=excluded.image_url,updated_at=CURRENT_TIMESTAMP`
      ).bind(id,text(card.title),text(card.summary),text(card.sourceUrl),text(card.sourceSite),
        text(card.sourceAuthor),text(card.sourceDate),text(card.originalText),text(card.engineeringNotes),
        text(card.factCheck)||"unverified",Number(card.confidence)||0,list(card.topics),list(card.components),
        list(card.models),list(card.measurements),card.imageUrl ?? null).run();
      return json({ ok: true, id }, 201);
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  }
};

function decodeCard(row: Record<string, unknown>) {
  const parse = (v: unknown) => { try { return JSON.parse(String(v ?? "[]")); } catch { return []; } };
  return {
    id: row.id, title: row.title, summary: row.summary, sourceUrl: row.source_url,
    sourceSite: row.source_site, sourceAuthor: row.source_author, sourceDate: row.source_date,
    originalText: row.original_text, engineeringNotes: row.engineering_notes,
    factCheck: row.fact_check, confidence: row.confidence, topics: parse(row.topics),
    components: parse(row.components), models: parse(row.models), measurements: parse(row.measurements),
    imageUrl: row.image_url, updatedAt: row.updated_at
  };
}
