/** Hands a scanned barcode from the camera screen back to the screen that opened it. */
import { create } from 'zustand';

interface ScanState {
  code: string | null;
  target: string | null;
  put: (code: string) => void;
  take: (target: string) => string | null;
  open: (target: string) => void;
}

export const useScan = create<ScanState>((set, get) => ({
  code: null,
  target: null,
  put: (code) => set({ code }),
  open: (target) => set({ target, code: null }),
  take: (target) => {
    const { code, target: t } = get();
    if (!code || t !== target) return null;
    set({ code: null });
    return code;
  },
}));
