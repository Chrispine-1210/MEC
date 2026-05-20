export type SearchableFieldValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | SearchableFieldValue[]
  | Record<string, unknown>;

const MAX_QUERY_LENGTH = 120;

export const normalizeSearchQuery = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase();

export const getSearchTokens = (value: unknown) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return [];

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
};

export const stringifySearchValue = (value: SearchableFieldValue): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => stringifySearchValue(item)).join(" ");

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => stringifySearchValue(item as SearchableFieldValue))
      .join(" ");
  }

  return String(value);
};

export const buildSearchHaystack = (values: SearchableFieldValue[]) =>
  normalizeSearchQuery(values.map((value) => stringifySearchValue(value)).join(" "));

export const matchesSearchTokens = (haystack: string, tokens: string[]) =>
  tokens.length === 0 || tokens.every((token) => haystack.includes(token));

export const scoreSearchHit = (haystack: string, query: string, tokens: string[]) => {
  if (!query) return 0;

  let score = haystack.includes(query) ? query.length * 4 : 0;
  for (const token of tokens) {
    const index = haystack.indexOf(token);
    if (index === -1) continue;
    score += Math.max(4, 40 - index);
  }

  return score;
};

export const searchAndRank = <T>(
  items: T[],
  query: unknown,
  getFields: (item: T) => SearchableFieldValue[],
) => {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = getSearchTokens(normalizedQuery);

  if (!normalizedQuery) {
    return items;
  }

  return items
    .map((item, index) => {
      const haystack = buildSearchHaystack(getFields(item));
      return {
        item,
        index,
        score: matchesSearchTokens(haystack, tokens)
          ? scoreSearchHit(haystack, normalizedQuery, tokens)
          : -1,
      };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.item);
};

export const parsePagination = (pageValue: unknown, limitValue: unknown, maxLimit = 100) => {
  const page = Number(pageValue ?? 1);
  const limit = Number(limitValue ?? 50);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), maxLimit) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};
