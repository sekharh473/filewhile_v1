import { useState, useEffect } from 'react';

const STORAGE_KEY = 'filewhile_ui_layout_splits';

/**
 * Persists ONLY panel size percentages (numbers) in localStorage.
 * Zero files, zero images, zero text notes ever touch client storage.
 */
export function useLocalStorageLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          leftWidthPercent: parsed.leftWidthPercent ?? 48,
          topFilesHeightPercent: parsed.topFilesHeightPercent ?? 50
        };
      }
    } catch {
      // fallback
    }
    return { leftWidthPercent: 48, topFilesHeightPercent: 50 };
  });

  const updateLeftWidth = (percent) => {
    const clamped = Math.min(80, Math.max(20, percent));
    setLayout((prev) => {
      const next = { ...prev, leftWidthPercent: clamped };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateTopFilesHeight = (percent) => {
    const clamped = Math.min(80, Math.max(20, percent));
    setLayout((prev) => {
      const next = { ...prev, topFilesHeightPercent: clamped };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return {
    leftWidthPercent: layout.leftWidthPercent,
    topFilesHeightPercent: layout.topFilesHeightPercent,
    updateLeftWidth,
    updateTopFilesHeight
  };
}
