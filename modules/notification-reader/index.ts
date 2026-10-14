import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export interface CapturedNotification {
  key: string;
  package: string;
  title: string;
  body: string;
  postedAt: number;
}

interface NativeModule {
  isEnabled(): boolean;
  openSettings(): void;
  getPending(): string;
  clearPending(): void;
}

// requireOptional: si el modulo nativo no esta (iOS, o un build viejo), la
// app sigue funcionando sin la deteccion automatica en vez de reventar.
const native = requireOptionalNativeModule<NativeModule>('NotificationReader');

export const isSupported = Platform.OS === 'android' && native !== null;

export function isEnabled(): boolean {
  if (!native) return false;
  try {
    return native.isEnabled();
  } catch {
    return false;
  }
}

export function openSettings(): void {
  native?.openSettings();
}

export function getPending(): CapturedNotification[] {
  if (!native) return [];
  try {
    const raw = native.getPending();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CapturedNotification[]) : [];
  } catch {
    return [];
  }
}

export function clearPending(): void {
  native?.clearPending();
}
