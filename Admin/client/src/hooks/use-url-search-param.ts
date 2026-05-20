export function getInitialUrlSearchParam(name = "search") {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

