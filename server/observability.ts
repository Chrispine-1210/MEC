type RequestCounterKey = `${string}|${string}|${number}`;
type RequestDurationKey = `${string}|${string}`;

const requestCounter = new Map<RequestCounterKey, number>();
const requestDuration = new Map<RequestDurationKey, { count: number; sumMs: number; maxMs: number }>();
const errorCounter = new Map<number, number>();
const processStartedAt = Date.now();

const escapeLabel = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');

const clamp = (value: number, minimum: number) => (value < minimum ? minimum : value);

export const normalizeMetricPath = (path: string) =>
  path
    .split("?")[0]
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{8,}(?=\/|$)/gi, "/:token")
    .replace(/\/+/g, "/");

export const recordHttpRequest = (method: string, path: string, statusCode: number, durationMs: number) => {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizeMetricPath(path);
  const normalizedStatus = clamp(Number(statusCode), 100);
  const safeDuration = clamp(Number(durationMs), 0);

  const countKey: RequestCounterKey = `${normalizedMethod}|${normalizedPath}|${normalizedStatus}`;
  requestCounter.set(countKey, (requestCounter.get(countKey) ?? 0) + 1);

  const durationKey: RequestDurationKey = `${normalizedMethod}|${normalizedPath}`;
  const current = requestDuration.get(durationKey) ?? { count: 0, sumMs: 0, maxMs: 0 };
  current.count += 1;
  current.sumMs += safeDuration;
  if (safeDuration > current.maxMs) {
    current.maxMs = safeDuration;
  }
  requestDuration.set(durationKey, current);
};

export const recordAppError = (statusCode: number) => {
  const normalizedStatus = clamp(Number(statusCode), 500);
  errorCounter.set(normalizedStatus, (errorCounter.get(normalizedStatus) ?? 0) + 1);
};

export const renderPrometheusMetrics = () => {
  const lines: string[] = [];
  const uptimeSeconds = Math.max(0, (Date.now() - processStartedAt) / 1000);

  lines.push("# HELP app_uptime_seconds Application uptime in seconds.");
  lines.push("# TYPE app_uptime_seconds gauge");
  lines.push(`app_uptime_seconds ${uptimeSeconds.toFixed(3)}`);

  lines.push("# HELP app_http_requests_total Total HTTP requests processed.");
  lines.push("# TYPE app_http_requests_total counter");
  for (const [key, count] of [...requestCounter.entries()].sort()) {
    const [method, path, status] = key.split("|");
    lines.push(
      `app_http_requests_total{method="${escapeLabel(method)}",path="${escapeLabel(path)}",status="${escapeLabel(status)}"} ${count}`,
    );
  }

  lines.push("# HELP app_http_request_duration_ms_count Total number of request duration samples.");
  lines.push("# TYPE app_http_request_duration_ms_count counter");
  lines.push("# HELP app_http_request_duration_ms_sum Total sum of request durations in milliseconds.");
  lines.push("# TYPE app_http_request_duration_ms_sum counter");
  lines.push("# HELP app_http_request_duration_ms_max Max observed request duration in milliseconds.");
  lines.push("# TYPE app_http_request_duration_ms_max gauge");
  for (const [key, stats] of [...requestDuration.entries()].sort()) {
    const [method, path] = key.split("|");
    const labels = `method="${escapeLabel(method)}",path="${escapeLabel(path)}"`;
    lines.push(`app_http_request_duration_ms_count{${labels}} ${stats.count}`);
    lines.push(`app_http_request_duration_ms_sum{${labels}} ${stats.sumMs.toFixed(3)}`);
    lines.push(`app_http_request_duration_ms_max{${labels}} ${stats.maxMs.toFixed(3)}`);
  }

  lines.push("# HELP app_http_errors_total Total errors returned by status code.");
  lines.push("# TYPE app_http_errors_total counter");
  for (const [status, count] of [...errorCounter.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`app_http_errors_total{status="${status}"} ${count}`);
  }

  return `${lines.join("\n")}\n`;
};
