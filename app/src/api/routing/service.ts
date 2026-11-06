/**
 * Routing seam resolver. The credential check is lazy at call time —
 * `hasCredentials` is a getter, so a token appearing via env reload or an
 * app.json rebuild is picked up on the next resolve, with no module-init
 * order coupling and no token ever logged or cached here.
 */

import type { RoutingProvider } from './types';
import { mapboxProvider } from './providers/mapbox';
import { offlineProvider } from './providers/offline';

/** Live provider: Mapbox when credentials exist, else the offline boundary. */
export function resolveRoutingProvider(): RoutingProvider {
  return mapboxProvider.hasCredentials ? mapboxProvider : offlineProvider;
}

/** Tiny branch signal for screens — true iff live Mapbox routing exists. */
export function routingProviderState(): { available: boolean } {
  const available = mapboxProvider.hasCredentials;
  return { available };
}
