-- Create the generated_apps table
CREATE TABLE IF NOT EXISTS generated_apps (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  public_url TEXT NOT NULL,
  status TEXT NOT NULL,
  dependencies JSONB NOT NULL DEFAULT '[]',
  error TEXT
);

-- Add indexes for faster lookup
CREATE INDEX IF NOT EXISTS generated_apps_public_url_idx ON generated_apps (public_url);
CREATE INDEX IF NOT EXISTS generated_apps_status_idx ON generated_apps (status);
CREATE INDEX IF NOT EXISTS generated_apps_created_at_idx ON generated_apps (created_at DESC);
