/**
 * Offline routing provider — the honest boundary when no Mapbox token is
 * configured. hasCredentials is always false and every call resolves to the
 * typed `missing_credentials` error: never fabricated routes, never fake
 * coordinates. Screens render the error code and the user waits for a token.
 */

import type {
  PlaceHit,
  RouteOption,
  RouteRequest,
  RoutingError,
  RoutingProvider,
  RoutingResult,
  SearchQuery,
} from '../types';

function unavailable(what: string): RoutingError {
  return {
    code: 'missing_credentials',
    status: null,
    message: `${what} unavailable: no Mapbox token configured (EXPO_PUBLIC_MAPBOX_TOKEN).`,
  };
}

async function offlineGeocode(_q: SearchQuery): Promise<RoutingResult<PlaceHit[]>> {
  return { ok: false, error: unavailable('geocode') };
}

async function offlineDirections(_req: RouteRequest): Promise<RoutingResult<RouteOption[]>> {
  return { ok: false, error: unavailable('directions') };
}

export const offlineProvider: RoutingProvider = {
  name: 'offline',
  hasCredentials: false,
  geocode: offlineGeocode,
  directions: offlineDirections,
};
