# Electri Phi Handbook

A Cloudflare-powered electronic-topic handbook. It converts sourced forum posts, manuals, restoration notes, and search discoveries into searchable **green engineering cards**.

## What it does

- accepts already-discovered and parsed source records
- keeps the original author, quotation, URL, date, and evidence separate from AI-added notes
- catalogs devices, components, symptoms, measurements, procedures, and related topics
- searches the handbook by terms such as `solar radio`, `capacitors`, `selenium rectifier`, or a model number
- returns compact cards that Electri Phi, Lab Phi, or Code Phi can use

Cloudflare is the catalog and API layer—not a bot that bypasses a source site's protections.

## Card flow

`search result or user discovery → parser → fact-check/enrichment → D1 card → handbook search → Code Phi creation`

## Starter API

| Route | Purpose |
|---|---|
| `GET /health` | Worker and D1 check |
| `GET /api/search?q=...` | Search cards, topics, models, and components |
| `GET /api/cards/:id` | Read one sourced card |
| `POST /api/cards` | Feed a parsed card into D1 |
| `GET /` | Small handbook search interface |

Every write requires `Authorization: Bearer <INGEST_TOKEN>`.

## Setup

1. Create a D1 database: `npx wrangler d1 create electri-phi-handbook`
2. Put its ID in `wrangler.toml`.
3. Apply the schema: `npx wrangler d1 migrations apply electri-phi-handbook --remote`
4. Add the ingest secret: `npx wrangler secret put INGEST_TOKEN`
5. Deploy: `npm install && npm run deploy`

## Parsed card shape

```json
{
  "title": "Hoffman Trans-Solar RP-706",
  "summary": "Documented restoration and solar-panel repair notes.",
  "sourceUrl": "https://example.com/thread",
  "sourceSite": "Antique Radio Forums",
  "sourceAuthor": "forum member",
  "sourceDate": "1959-01-01",
  "originalText": "The sourced observation or short quotation.",
  "engineeringNotes": "Clearly labeled interpretation added by the parser or AI.",
  "factCheck": "verified, disputed, or unverified",
  "confidence": 0.82,
  "topics": ["solar radio", "transistor radio", "restoration"],
  "components": ["photovoltaic panel"],
  "models": ["RP-706"],
  "measurements": [],
  "imageUrl": null
}
```

## Design rule

Never blur source material with generated interpretation. The UI and stored record keep **Original observation**, **Engineering interpretation**, and **Fact check** distinct, with a working link back to the source.
