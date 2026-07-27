import assert from "node:assert/strict";
import test from "node:test";

import { isUsableDatabaseUrl, selectDatabaseUrl } from "../../server/database-url";

test("rejects missing, malformed, and non-PostgreSQL database URLs", () => {
  assert.equal(isUsableDatabaseUrl(undefined), false);
  assert.equal(isUsableDatabaseUrl(""), false);
  assert.equal(isUsableDatabaseUrl("not-a-url"), false);
  assert.equal(isUsableDatabaseUrl("https://database.example.com/db"), false);
});

test("rejects database URLs containing template values", () => {
  assert.equal(isUsableDatabaseUrl("postgresql://USER:PASSWORD@HOST:5432/DATABASE"), false);
  assert.equal(isUsableDatabaseUrl("postgresql://app:replace-with-secret@db.example.net/app"), false);
  assert.equal(isUsableDatabaseUrl("postgresql://app:secret@your_host/app"), false);
});

test("accepts a valid Neon PostgreSQL URL", () => {
  assert.equal(
    isUsableDatabaseUrl(
      "postgresql://neondb_owner:secret@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ),
    true,
  );
});

test("skips an invalid DATABASE_URL and selects a valid POSTGRES_URL fallback", () => {
  const result = selectDatabaseUrl([
    ["DATABASE_URL", "postgresql://USER:PASSWORD@HOST:5432/DATABASE"],
    [
      "POSTGRES_URL",
      "postgresql://neondb_owner:secret@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ],
  ]);

  assert.equal(result[0], "POSTGRES_URL");
});
