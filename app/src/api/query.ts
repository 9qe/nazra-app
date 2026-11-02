import { QueryClient, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getRadarsNear, getAllRadars, type RadarsNearResult } from './geoApi';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Offline-first: serve cache immediately, refetch quietly behind it.
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  },
});

export const QUERY_KEYS = {
  radarsNear: (lat: number, lng: number, radiusKm: number) =>
    ['radars-near', lat.toFixed(4), lng.toFixed(4), radiusKm] as const,
  radarsAll: ['radars-all'] as const,
} as const;

/** Amman default center for previews before any fix is acquired. */
export const DEFAULT_CENTER = { lat: 31.9539, lng: 35.9106 } as const;

export function useRadarsNear(
  lat: number | null,
  lng: number | null,
  radiusKm = 25,
): UseQueryResult<RadarsNearResult, Error> {
  const hasFix = lat !== null && lng !== null;
  return useQuery({
    queryKey: hasFix ? QUERY_KEYS.radarsNear(lat, lng, radiusKm) : (['radars-near', 'default'] as const),
    queryFn: () =>
      hasFix ? getRadarsNear(lat, lng, radiusKm) : getRadarsNear(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, radiusKm),
  });
}

export function useAllRadars() {
  return useQuery({ queryKey: QUERY_KEYS.radarsAll, queryFn: () => getAllRadars() });
}
