import React, { useEffect, useRef } from 'react';

/**
 * Reusable Google AdSense placeholder & live ad slot.
 * Designed to seamlessly blend with the monochrome dark/light themes
 * while respecting Google AdSense policies (clear advertisement labeling).
 */
export function AdSlot({
  slotId = '',
  client = '',
  format = 'auto',
  responsive = true,
  className = '',
  label = 'Advertisement'
}) {
  const adRef = useRef(null);

  useEffect(() => {
    // If Google AdSense script is present on window and a real slotId is provided, push the ad
    if (slotId && typeof window !== 'undefined' && window.adsbygoogle && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('AdSense push error:', err);
      }
    }
  }, [slotId]);

  return (
    <aside className={`ad-slot-wrapper ${className}`} aria-label={label}>
      <div className="ad-slot-badge">{label}</div>
      <div className="ad-slot-content" ref={adRef}>
        {slotId ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={client || 'ca-pub-XXXXXXXXXXXXXXXX'}
            data-ad-slot={slotId}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
          />
        ) : (
          <div className="ad-placeholder-frame">
            <span className="ad-placeholder-text">Google Ads Space (Reserved)</span>
          </div>
        )}
      </div>
    </aside>
  );
}
