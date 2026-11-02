import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local-first report storage. NO server claims: reports live in AsyncStorage
 * on this device only until a sync pipeline exists for real.
 */
export const REPORTS_KEY = 'nazra-reports-v1';

export type ReportType = 'light' | 'fixed' | 'avg' | 'locality' | 'bump' | 'other';

export interface LocalReport {
  id: string;
  type: ReportType;
  note: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  createdAt: string;
}

const MAX_REPORTS = 200;

export async function loadReports(): Promise<LocalReport[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // fail closed on corrupt rows instead of crashing the screen
    return parsed.filter(isLocalReport);
  } catch {
    return [];
  }
}

export async function addReport(entry: LocalReport): Promise<LocalReport[]> {
  const next = [entry, ...(await loadReports())].slice(0, MAX_REPORTS);
  await saveAll(next);
  return next;
}

export async function clearReports(): Promise<LocalReport[]> {
  await saveAll([]);
  return [];
}

async function saveAll(reports: LocalReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {
    // storage failure keeps reports in memory for this session only
  }
}

function isLocalReport(v: unknown): v is LocalReport {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.type === 'string' && typeof r.createdAt === 'string';
}

export function newReportId(): string {
  return `rep_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}
