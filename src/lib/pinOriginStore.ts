export interface ClickedPinOrigin {
  pinId: string;
  top: number;
  left: number;
  width: number;
  height: number;
  timestamp: number;
}

let lastClickedPinOrigin: ClickedPinOrigin | null = null;

export function getLastClickedPinOrigin(): ClickedPinOrigin | null {
  return lastClickedPinOrigin;
}

export function setLastClickedPinOrigin(origin: ClickedPinOrigin | null): void {
  lastClickedPinOrigin = origin;
}

export function clearLastClickedPinOrigin(): void {
  lastClickedPinOrigin = null;
}
