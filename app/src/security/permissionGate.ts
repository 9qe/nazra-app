import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Network from 'expo-network';
import { Platform, Linking, Alert } from 'react-native';

/**
 * Security pod: every OS permission the app needs, in one gate.
 * Native modules used here (expo-location, expo-notifications, expo-network)
 * are linked in the workspace; `npx expo prebuild` bakes them into the
 * dev client — Info.plist/.gradle keep their request strings in sync.
 */

export interface PermissionSnapshot {
  locationForeground: 'granted' | 'denied' | 'undetermined';
  locationBackground: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
  networkState: 'granted' | 'denied' | 'undetermined';
}

export async function requestAllPermissions(): Promise<PermissionSnapshot> {
  const locationForeground = await requestLocationForeground();
  // Background must come AFTER foreground grant on Android 10+; request returns
  // denied when foreground is missing — don't double-prompt.
  const locationBackground =
    locationForeground === 'granted' ? await requestLocationBackground() : ('undetermined' as const);
  const notifications = await requestNotifications();
  const networkState = await checkNetworkState();
  return { locationForeground, locationBackground, notifications, networkState };
}

export async function requestLocationForeground(): Promise<PermissionSnapshot['locationForeground']> {
  const { status: existing } = await Location.getForegroundPermissionsAsync();
  if (existing === Location.PermissionStatus.GRANTED) return 'granted';
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return 'denied';
  return 'granted';
}

export async function requestLocationBackground(): Promise<PermissionSnapshot['locationBackground']> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
}

async function requestNotifications(): Promise<PermissionSnapshot['notifications']> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  try {
    const req = await Notifications.requestPermissionsAsync();
    return req.granted ? 'granted' : 'denied';
  } catch {
    // Notifications unavailable (some Android builds / web) — soft-degrade.
    return 'undetermined';
  }
}

async function checkNetworkState(): Promise<PermissionSnapshot['networkState']> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state ? 'granted' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/** Sends the user to the OS app-settings page for a second-chance grant. */
export function openSystemSettings(): void {
  void Linking.openSettings().catch(() => Alert.alert('Could not open settings'));
}

/**
 * Background task / geofence hooks are registered here once polling research lands.
 * TODO(research): wire expo-task-manager defineTask for background-fetch polling &
 * geofence triggers using this module as the single registration point.
 */
export const SECURITY_POD_STUBS = { backgroundFetch: null, geofence: null } as const;

export const notificationBehavior = {
  // Stub channel config — replaced when alert UX lands.
  shouldShowBanner: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
} as const;

export const platformNotes = {
  ios: { plistKeys: ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription'] },
  android: { gradlePermissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION'] },
} as const;

export const currentPlatform: typeof Platform.OS = Platform.OS;
