import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface LocationSeed {
  lat: number;
  lng: number;
  timestamp: number;
}

/**
 * Foreground-only seed fix for the scaffold. Background improvements
 * (task-manager polling, geofences) hang off the security pod later.
 */
export function useLocationSeed(): LocationSeed | null {
  const [seed, setSeed] = useState<LocationSeed | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED || cancelled) return;
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!cancelled) {
        setSeed({ lat: fix.coords.latitude, lng: fix.coords.longitude, timestamp: fix.timestamp });
      }
    })().catch(() => {
      // Permission declined or provider off: screens fall back to Amman default.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return seed;
}
