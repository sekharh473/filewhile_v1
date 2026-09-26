import { deleteRoomFiles, deleteFile } from './storage.js';

export const MAX_ROOM_SIZE_BYTES = 65 * 1024 * 1024; // 65 Megabytes
export const ROOM_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 Hours

// In-memory active rooms registry
const rooms = new Map();

/**
 * Get an existing room or initialize a fresh one
 */
export function getOrCreateRoom(roomId) {
  const normalizedId = roomId.trim().toLowerCase();
  
  if (!rooms.has(normalizedId)) {
    const now = Date.now();
    rooms.set(normalizedId, {
      roomId: normalizedId,
      createdAt: now,
      expiresAt: now + ROOM_EXPIRY_MS,
      activeUsers: 0,
      text: '',
      files: [],
      images: []
    });
  }

  const room = rooms.get(normalizedId);
  // Check if expired (only if no active users and time has passed)
  if (room.activeUsers === 0 && room.expiresAt !== null && Date.now() > room.expiresAt) {
    purgeRoom(normalizedId);
    return getOrCreateRoom(normalizedId);
  }

  return room;
}

export function markRoomActive(roomId) {
  const room = getOrCreateRoom(roomId);
  room.activeUsers += 1;
  room.expiresAt = null; // Never expires while active
}

export function markRoomInactive(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.activeUsers = Math.max(0, room.activeUsers - 1);
    if (room.activeUsers === 0) {
      room.expiresAt = Date.now() + ROOM_EXPIRY_MS;
    }
  }
}

/**
 * Calculate total size consumed by a room in bytes (files + images + text)
 */
export function calculateRoomSize(room) {
  const textSize = Buffer.byteLength(room.text || '', 'utf8');
  const filesSize = room.files.reduce((acc, f) => acc + (f.size || 0), 0);
  const imagesSize = room.images.reduce((acc, img) => acc + (img.size || 0), 0);
  return textSize + filesSize + imagesSize;
}

/**
 * Check if incoming payload can fit within the 65MB limit
 */
export function canFit(room, incomingBytes = 0) {
  const currentBytes = calculateRoomSize(room);
  const projectedBytes = currentBytes + incomingBytes;
  return {
    allowed: projectedBytes <= MAX_ROOM_SIZE_BYTES,
    currentBytes,
    remainingBytes: Math.max(0, MAX_ROOM_SIZE_BYTES - currentBytes),
    maxBytes: MAX_ROOM_SIZE_BYTES
  };
}

/**
 * Update text content in a room with size check
 */
export function updateRoomText(roomId, newText) {
  const room = getOrCreateRoom(roomId);
  const currentTextSize = Buffer.byteLength(room.text || '', 'utf8');
  const newTextSize = Buffer.byteLength(newText || '', 'utf8');
  const sizeDiff = newTextSize - currentTextSize;

  if (sizeDiff > 0) {
    const check = canFit(room, sizeDiff);
    if (!check.allowed) {
      throw new Error(`Text exceeds room 65MB limit. Free space: ${(check.remainingBytes / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  room.text = newText;
  return {
    text: room.text,
    currentBytes: calculateRoomSize(room),
    maxBytes: MAX_ROOM_SIZE_BYTES
  };
}

/**
 * Add a file or image metadata to a room
 */
export function addFileToRoom(roomId, fileMeta, isImage = false) {
  const room = getOrCreateRoom(roomId);
  if (isImage) {
    room.images.unshift(fileMeta);
  } else {
    room.files.unshift(fileMeta);
  }
}

/**
 * Remove a file or image from a room
 */
export async function removeFileFromRoom(roomId, fileId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  let removedItem = null;
  const fileIndex = room.files.findIndex(f => f.id === fileId);
  if (fileIndex !== -1) {
    removedItem = room.files.splice(fileIndex, 1)[0];
  } else {
    const imgIndex = room.images.findIndex(img => img.id === fileId);
    if (imgIndex !== -1) {
      removedItem = room.images.splice(imgIndex, 1)[0];
    }
  }

  if (removedItem) {
    await deleteFile(roomId, removedItem.storageKey);
  }

  return removedItem;
}

/**
 * Purge an expired room and remove all its storage objects
 */
export async function purgeRoom(roomId, ioInstance = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  console.log(`[RoomManager] Purging room "${roomId}" (expired or deleted)`);
  const allStorageKeys = [
    ...room.files.map(f => f.storageKey),
    ...room.images.map(img => img.storageKey)
  ];

  await deleteRoomFiles(roomId, allStorageKeys);
  rooms.delete(roomId);

  if (ioInstance) {
    ioInstance.to(roomId).emit('room:expired', { roomId, message: 'This temporary room has expired after 6 hours of inactivity.' });
  }
}

/**
 * Periodic background task to sweep expired rooms
 */
export function startExpirySweeper(ioInstance) {
  // Check every 15 seconds
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      if (room.activeUsers === 0 && room.expiresAt !== null && now >= room.expiresAt) {
        purgeRoom(roomId, ioInstance);
      }
    }
  }, 15 * 1000);
}

/**
 * Retrieve public summary of room status
 */
export function getRoomData(roomId) {
  const room = getOrCreateRoom(roomId);
  const currentBytes = calculateRoomSize(room);
  return {
    roomId: room.roomId,
    createdAt: room.createdAt,
    text: room.text,
    files: room.files,
    images: room.images,
    totalBytes: currentBytes,
    maxBytes: MAX_ROOM_SIZE_BYTES,
    percentUsed: Number(((currentBytes / MAX_ROOM_SIZE_BYTES) * 100).toFixed(1))
  };
}
