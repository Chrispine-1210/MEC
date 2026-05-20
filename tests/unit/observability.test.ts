import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeMetricPath,
  recordAppError,
  recordHttpRequest,
  renderPrometheusMetrics,
} from "../../server/observability";

test("normalizeMetricPath redacts identifiers from URLs", () => {
  assert.equal(
    normalizeMetricPath("/api/admin/users/123e4567e89b12d3a456426614174000?search=abc"),
    "/api/admin/users/:token",
  );
  assert.equal(normalizeMetricPath("/api/applications/42"), "/api/applications/:id");
});

test("renderPrometheusMetrics includes request and error metrics", () => {
  recordHttpRequest("GET", "/api/health", 200, 12);
  recordHttpRequest("POST", "/auth/login", 401, 45);
  recordAppError(500);

  const metrics = renderPrometheusMetrics();
  assert.match(metrics, /app_http_requests_total\{method="GET",path="\/api\/health",status="200"\} 1/);
  assert.match(metrics, /app_http_requests_total\{method="POST",path="\/auth\/login",status="401"\} 1/);
  assert.match(metrics, /app_http_errors_total\{status="500"\} 1/);
});
