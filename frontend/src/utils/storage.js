const RECENT_ROOMS_KEY = 'filewhile_recent_rooms';
const LAYOUT_SPLITS_KEY = 'filewhile_layout_splits';

const DEFAULT_SPLITS = {
  hRatio: 0.48, // 48% left (texts), 52% right (files/images)
  vRatio: 0.50  // 50% top (files), 50% bottom (images)
};

/**
 * Retrieve recent rooms visited by this user
 */
export function getRecentRooms() {
  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to load recent rooms', err);
    return [];
  }
}

/**
 * Add or bump a room in the recent rooms list
 */
export function addRecentRoom(roomId) {
  if (!roomId) return;
  const normalized = roomId.trim().toLowerCase();
  try {
    const current = getRecentRooms();
    const updated = [
      { roomId: normalized, visitedAt: Date.now() },
      ...current.filter(r => r.roomId !== normalized)
    ].slice(0, 10); // Keep last 10
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save recent room', err);
  }
}

/**
 * Remove a room from history
 */
export function removeRecentRoom(roomId) {
  try {
    const current = getRecentRooms();
    const updated = current.filter(r => r.roomId !== roomId.toLowerCase());
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to remove recent room', err);
    return [];
  }
}

/**
 * Get saved panel split percentages
 */
export function getSavedLayoutSplits() {
  try {
    const raw = localStorage.getItem(LAYOUT_SPLITS_KEY);
    if (!raw) return DEFAULT_SPLITS;
    const parsed = JSON.parse(raw);
    return {
      hRatio: typeof parsed.hRatio === 'number' ? Math.max(0.2, Math.min(0.8, parsed.hRatio)) : DEFAULT_SPLITS.hRatio,
      vRatio: typeof parsed.vRatio === 'number' ? Math.max(0.2, Math.min(0.8, parsed.vRatio)) : DEFAULT_SPLITS.vRatio
    };
  } catch {
    return DEFAULT_SPLITS;
  }
}

/**
 * Save panel split percentages
 */
export function saveLayoutSplits(splits) {
  try {
    localStorage.setItem(LAYOUT_SPLITS_KEY, JSON.stringify(splits));
  } catch (err) {
    console.error('Failed to save layout splits', err);
  }
}
