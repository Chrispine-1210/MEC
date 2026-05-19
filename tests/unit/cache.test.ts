import assert from "node:assert/strict";
import test from "node:test";
import { cacheDelete, cacheGet, cacheSet, cacheSetJson, cacheGetJson, getCacheMode } from "../../server/cache";

test("cache falls back to memory mode by default", () => {
  assert.equal(getCacheMode(), "memory");
});

test("cacheSet and cacheGet round-trip string values", async () => {
  const key = "test:string:key";
  await cacheSet(key, "hello-world", 60);
  const value = await cacheGet(key);
  assert.equal(value, "hello-world");
  await cacheDelete(key);
});

test("cacheSetJson and cacheGetJson round-trip object values", async () => {
  const key = "test:json:key";
  const payload = { ok: true, count: 2 };
  await cacheSetJson(key, payload, 60);
  const value = await cacheGetJson<typeof payload>(key);
  assert.deepEqual(value, payload);
  await cacheDelete(key);
});
