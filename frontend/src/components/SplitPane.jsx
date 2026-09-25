import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getSavedLayoutSplits, saveLayoutSplits } from '../utils/storage';

export function SplitPane({
  textPane,
  filesPane,
  imagesPane,
  maximizedPane,
  onToggleMaximize
}) {
  const [splits, setSplits] = useState(getSavedLayoutSplits);
  const containerRef = useRef(null);
  const rightColRef = useRef(null);
  const isDraggingH = useRef(false);
  const isDraggingV = useRef(false);

  // Save changes to localStorage on unmount or change
  useEffect(() => {
    saveLayoutSplits(splits);
  }, [splits]);

  // Horizontal Dragging (Left Texts vs Right Files/Images)
  const handleHMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingH.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingH.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const offset = clientX - rect.left;
      const newRatio = Math.max(0.2, Math.min(0.8, offset / rect.width));
      setSplits(prev => ({ ...prev, hRatio: newRatio }));
    };

    const onMouseUp = () => {
      isDraggingH.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  }, []);

  // Vertical Dragging (Top Files vs Bottom Images)
  const handleVMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingV.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingV.current || !rightColRef.current) return;
      const rect = rightColRef.current.getBoundingClientRect();
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const offset = clientY - rect.top;
      const newRatio = Math.max(0.2, Math.min(0.8, offset / rect.height));
      setSplits(prev => ({ ...prev, vRatio: newRatio }));
    };

    const onMouseUp = () => {
      isDraggingV.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  }, []);

  // Reset to default balanced ratio
  const handleResetSplits = () => {
    const balanced = { hRatio: 0.48, vRatio: 0.50 };
    setSplits(balanced);
    saveLayoutSplits(balanced);
  };

  // If a pane is maximized, render only that pane full width/height
  if (maximizedPane === 'text') {
    return (
      <div className="split-workspace is-maximized">
        <div className="split-pane-full">{textPane}</div>
      </div>
    );
  }
  if (maximizedPane === 'files') {
    return (
      <div className="split-workspace is-maximized">
        <div className="split-pane-full">{filesPane}</div>
      </div>
    );
  }
  if (maximizedPane === 'images') {
    return (
      <div className="split-workspace is-maximized">
        <div className="split-pane-full">{imagesPane}</div>
      </div>
    );
  }

  const leftWidthPercent = (splits.hRatio * 100).toFixed(2);
  const rightWidthPercent = ((1 - splits.hRatio) * 100).toFixed(2);
  const topHeightPercent = (splits.vRatio * 100).toFixed(2);
  const bottomHeightPercent = ((1 - splits.vRatio) * 100).toFixed(2);

  return (
    <div className="split-workspace" ref={containerRef}>
      {/* Box 1: Left Pane (Texts) */}
      <div
        className="split-pane-left"
        style={{ flexBasis: `${leftWidthPercent}%`, maxWidth: `${leftWidthPercent}%` }}
      >
        {textPane}
      </div>

      {/* Horizontal Split Gutter */}
      <div
        className="split-gutter-h"
        onMouseDown={handleHMouseDown}
        onTouchStart={handleHMouseDown}
        title="Drag left/right to resize columns"
      >
        <div className="gutter-handle-dots-h" />
      </div>

      {/* Right Column (Files & Images) */}
      <div
        className="split-column-right"
        ref={rightColRef}
        style={{ flexBasis: `${rightWidthPercent}%`, maxWidth: `${rightWidthPercent}%` }}
      >
        {/* Box 2: Top Right (Files) */}
        <div
          className="split-pane-top"
          style={{ flexBasis: `${topHeightPercent}%`, maxHeight: `${topHeightPercent}%` }}
        >
          {filesPane}
        </div>

        {/* Vertical Split Gutter */}
        <div
          className="split-gutter-v"
          onMouseDown={handleVMouseDown}
          onTouchStart={handleVMouseDown}
          title="Drag up/down to resize Files and Images"
        >
          <div className="gutter-handle-dots-v" />
        </div>

        {/* Box 3: Bottom Right (Images) */}
        <div
          className="split-pane-bottom"
          style={{ flexBasis: `${bottomHeightPercent}%`, maxHeight: `${bottomHeightPercent}%` }}
        >
          {imagesPane}
        </div>
      </div>
    </div>
  );
}
