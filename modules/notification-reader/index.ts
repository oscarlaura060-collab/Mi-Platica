export interface CapturedNotification {
  key: string;
  package: string;
  title: string;
  body: string;
  postedAt: number;
}

let pendingNotifications: CapturedNotification[] = [];
let detectionEnabled = true;

export const isSupported = true;

export function isEnabled(): boolean {
  return detectionEnabled;
}

export function setEnabled(enabled: boolean): void {
  detectionEnabled = enabled;
}

export function openSettings(): void {
  // Web settings trigger
}

export function getPending(): CapturedNotification[] {
  return [...pendingNotifications];
}

export function clearPending(): void {
  pendingNotifications = [];
}

/** Permite simular una notificación de banco colombiano en la web para pruebas */
export function simulateIncomingNotification(notif: {
  package: string;
  title: string;
  body: string;
}) {
  const item: CapturedNotification = {
    key: 'sim_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    package: notif.package,
    title: notif.title,
    body: notif.body,
    postedAt: Date.now(),
  };
  pendingNotifications.push(item);
  return item;
}
