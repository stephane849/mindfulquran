'use client';

import { useEffect } from 'react';

// BottomSheetMMD: instant (no animation), 3px top divider, drag-handle bar,
// invisible backdrop — e-ink has no use for dimming
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] mx-auto max-w-[var(--content-w)]">
      <button aria-label="Close" className="absolute inset-0 w-full" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-paper border-t-[3px] border-ink max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-end px-4 pt-3 pb-1 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-base font-bold border-2 border-ink rounded-lg px-3 py-1"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
