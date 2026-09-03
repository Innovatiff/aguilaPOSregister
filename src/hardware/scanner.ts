/**
 * Keyboard-wedge scanner support.
 *
 * USB barcode scanners act as keyboards: they "type" the code very fast and finish with Enter.
 * We hold keystrokes for a few milliseconds; a fast burst ending in Enter is a scan, everything
 * else is replayed to the register as normal typing (so a physical keyboard/keypad still works).
 */
export type ScanHandler = (code: string) => void;
export type TypedHandler = (key: string) => void; // single character, 'Enter', 'Backspace', 'Escape'

const scanListeners = new Set<ScanHandler>();
const typedListeners = new Set<TypedHandler>();
let buffer: { key: string; at: number }[] = [];
let flushTimer: number | null = null;
let attached = false;
const MAX_GAP_MS = 60;
const HOLD_MS = 90;

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  if ((el as HTMLElement).dataset?.scanTarget === 'true') return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

function replayAsTyped() {
  const keys = buffer;
  buffer = [];
  for (const k of keys) for (const l of typedListeners) l(k.key);
}

function isBurst(): boolean {
  if (buffer.length < 3) return false;
  for (let i = 1; i < buffer.length; i++) if (buffer[i].at - buffer[i - 1].at > MAX_GAP_MS) return false;
  return buffer.every((k) => /^[0-9A-Za-z-]$/.test(k.key));
}

function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTypingTarget(document.activeElement)) return;
  const now = performance.now();
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (isBurst()) {
      const code = buffer.map((k) => k.key).join('');
      buffer = [];
      for (const l of scanListeners) l(code);
    } else {
      replayAsTyped();
      for (const l of typedListeners) l('Enter');
    }
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Escape') {
    replayAsTyped();
    for (const l of typedListeners) l(e.key);
    return;
  }
  if (e.key.length === 1) {
    if (buffer.length && now - buffer[buffer.length - 1].at > MAX_GAP_MS) replayAsTyped();
    buffer.push({ key: e.key, at: now });
    if (/^[0-9.]$/.test(e.key)) e.preventDefault();
    flushTimer = window.setTimeout(replayAsTyped, HOLD_MS);
  }
}

function attach() {
  if (!attached && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown, true);
    attached = true;
  }
}

export function onScan(handler: ScanHandler): () => void {
  scanListeners.add(handler);
  attach();
  return () => scanListeners.delete(handler);
}

export function onTyped(handler: TypedHandler): () => void {
  typedListeners.add(handler);
  attach();
  return () => typedListeners.delete(handler);
}

/** Demo helper: behaves exactly like a physical scan. */
export function simulateScan(code: string) {
  for (const l of scanListeners) l(code.trim());
}
