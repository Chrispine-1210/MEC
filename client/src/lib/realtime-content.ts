export const PUBLIC_CONTENT_REFRESH_MS = 15000;

export const publicContentQueryOptions = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
  refetchInterval: PUBLIC_CONTENT_REFRESH_MS,
  refetchIntervalInBackground: false,
};
