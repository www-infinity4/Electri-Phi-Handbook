CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  source_site TEXT,
  source_author TEXT,
  source_date TEXT,
  original_text TEXT NOT NULL,
  engineering_notes TEXT,
  fact_check TEXT NOT NULL DEFAULT 'unverified',
  confidence REAL NOT NULL DEFAULT 0,
  topics TEXT NOT NULL DEFAULT '[]',
  components TEXT NOT NULL DEFAULT '[]',
  models TEXT NOT NULL DEFAULT '[]',
  measurements TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  id UNINDEXED, title, summary, original_text, engineering_notes,
  topics, components, models, content=''
);

CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid,id,title,summary,original_text,engineering_notes,topics,components,models)
  VALUES(new.rowid,new.id,new.title,new.summary,new.original_text,new.engineering_notes,new.topics,new.components,new.models);
END;

CREATE INDEX IF NOT EXISTS cards_source_site_idx ON cards(source_site);
CREATE INDEX IF NOT EXISTS cards_updated_idx ON cards(updated_at DESC);
