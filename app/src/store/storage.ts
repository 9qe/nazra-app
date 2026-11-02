import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Single storage adapter for every persisted store: native → AsyncStorage
 * (this is the real key-value store on device), web → AsyncStorage's own
 * localStorage fallback. One adapter, no split-brain keys.
 */
export const asyncStorageAdapter: StateStorage = {
  getItem: async (name) => {
    try {
      return (await AsyncStorage.getItem(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // store full/private mode: state lives in memory only, non-fatal.
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
