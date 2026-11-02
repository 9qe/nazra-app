import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export type LocPermission = 'undetermined' | 'granted' | 'denied' | 'error';

export interface Fix {
  lat: number;
  lng: number;
  /** km/h, null when GPS speed unavailable. */
  speedKph: number | null;
  headingDeg: number | null;
  accuracyM: number | null;
  timestamp: number;
}

/**
 * Foreground (while-in-use) location stream. One watcher, one permission
 * surface — background 'always' is deliberately NOT requested here; iOS
 * background location needs native mode config that ships in a later build.
 */
export function useLocationStream() {
  const [permission, setPermission] = useState<LocPermission>('undetermined');
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchingRef = useRef(false);

  const startWatch = async () => {
    if (watchingRef.current) return;
    watchingRef.current = true;
    try {
      const sub = await Location.watchPositionAsync(
        // navigation-grade but not battery-killer; 8 m or 1 s cadence
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 8,
          timeInterval: 1000,
        },
        (pos) => {
          const c = pos.coords;
          // GPS speed can be -1/0 while stationary — anything non-positive is "unknown"
          const speedKph = c.speed != null && c.speed > 0.2 ? c.speed * 3.6 : null;
          const headingDeg = c.heading != null && c.heading >= 0 ? c.heading : null;
          setFix({
            lat: c.latitude,
            lng: c.longitude,
            speedKph,
            headingDeg,
            accuracyM: c.accuracy ?? null,
            timestamp: pos.timestamp,
          });
        },
      );
      // holder keeps the subscription alive for the component lifetime
      activeSubHolder.value = sub;
    } catch (e) {
      watchingRef.current = false;
      setError(String(e));
    }
  };

  const request = async (): Promise<LocPermission> => {
    try {
      if (!(await Location.getForegroundPermissionsAsync()).granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        if (!req.granted) {
          setPermission('denied');
          return 'denied';
        }
      }
      setPermission('granted');
      await startWatch();
      return 'granted';
    } catch (e) {
      setPermission('error');
      setError(String(e));
      return 'error';
    }
  };

  // auto-start when permission already granted (e.g. reload after onboarding)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const st = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      if (st.granted) {
        setPermission('granted');
        await startWatch();
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      activeSubHolder.value?.remove();
      activeSubHolder.value = null;
      watchingRef.current = false;
    };
  }, []);

  return { permission, fix, error, request };
}

const activeSubHolder: { value: Location.LocationSubscription | null } = { value: null };

/** One-shot position assist for screens that don't stream (list/reports). */
export async function getOneFix(): Promise<Fix | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const c = pos.coords;
    return {
      lat: c.latitude,
      lng: c.longitude,
      speedKph: c.speed != null && c.speed > 0.2 ? c.speed * 3.6 : null,
      headingDeg: c.heading != null && c.heading >= 0 ? c.heading : null,
      accuracyM: c.accuracy ?? null,
      timestamp: pos.timestamp,
    };
  } catch {
    return null;
  }
}
