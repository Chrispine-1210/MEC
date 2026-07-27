import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductionIdentity,
  assertTestDatabaseIsolation,
  isTestIdentity,
  normalizeRole,
  normalizeUsername,
} from "../../server/user-governance";

test("canonical usernames are lowercase and contain no visual prefix or spaces", () => {
  assert.equal(normalizeUsername("@@ATOR AGENCY"), "ator_agency");
});

test("production rejects test identities and reserved usernames", () => {
  assert.throws(() => assertProductionIdentity("training_viewer@example.test", "training_viewer", "production"));
  assert.throws(() => assertProductionIdentity("real@example.com", "e2e_student", "production"));
  assert.equal(isTestIdentity("real@example.com", "ator_agency"), false);
});

test("legacy roles migrate to supported roles", () => {
  assert.equal(normalizeRole("Legacy Admin"), "admin");
  assert.equal(normalizeRole("legacy_editor"), "editor");
  assert.equal(normalizeRole("unknown"), "user");
});

test("test database cannot equal the production database", () => {
  const production = "postgresql://prod:secret@db.example.com:5432/mec";
  assert.throws(() => assertTestDatabaseIsolation(undefined, production));
  assert.throws(() => assertTestDatabaseIsolation("postgresql://test:other@db.example.com:5432/mec", production));
  assert.doesNotThrow(() => assertTestDatabaseIsolation("postgresql://test:other@db.example.com:5432/mec_test", production));
});
