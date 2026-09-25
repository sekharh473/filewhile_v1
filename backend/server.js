import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import archiver from 'archiver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getOrCreateRoom,
  getRoomData,
  updateRoomText,
  addFileToRoom,
  removeFileFromRoom,
  canFit,
  calculateRoomSize,
  startExpirySweeper,
  MAX_ROOM_SIZE_BYTES
} from './roomManager.js';
import { saveFile, getFileStream, isCloudStorageEnabled, getStorageProviderName } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

// Multer memory storage configured with 65MB max limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ROOM_SIZE_BYTES // Max 65MB for any single file
  }
});

// Start the 22-minute room expiration sweeper (with 20-min visible timer)
startExpirySweeper(io);

/**
 * Validate Room Name format and safety
 */
function validateRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return { valid: false, error: 'A room name is required.' };
  }
  const trimmed = roomId.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 64) {
    return { valid: false, error: 'Room name must be between 2 and 64 characters.' };
  }
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Room names can only contain letters, numbers, hyphens, and underscores.' };
  }
  return { valid: true, roomId: trimmed };
}

// Health & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cloudStorage: getStorageProviderName(),
    maxRoomSizeBytes: MAX_ROOM_SIZE_BYTES,
    roomExpiryMinutes: 20,
    actualExpiryMinutes: 22
  });
});

// Get Room State
app.get('/api/room/:roomId', (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const data = getRoomData(check.roomId);
    res.json(data);
  } catch (err) {
    console.error('[Get Room error]', err);
    res.status(500).json({ error: 'Failed to retrieve room details. Please refresh the page.' });
  }
});

// Update Text directly via REST (fallback or initial sync)
app.post('/api/room/:roomId/text', (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const { text } = req.body;
    const result = updateRoomText(check.roomId, text || '');

    // Broadcast update to all sockets in room except sender
    io.to(check.roomId).emit('room:text-updated', { text: result.text, totalBytes: result.currentBytes });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to update shared notes.' });
  }
});

// Upload Files or Images with detailed error interceptor
app.post('/api/room/:roomId/upload', (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File size exceeds the 65 MB limit. Please compress or choose a smaller file.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Unexpected upload field. Please upload via the file dropzone.'
          });
        }
      }
      return res.status(400).json({
        error: err.message || 'File upload failed to process.'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const roomId = check.roomId;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'Please select at least one file or screenshot to upload.' });
    }

    const room = getOrCreateRoom(roomId);
    const totalIncomingBytes = files.reduce((acc, f) => acc + f.size, 0);

    // Validate 65 MB hard ceiling
    const fitCheck = canFit(room, totalIncomingBytes);
    if (!fitCheck.allowed) {
      const freeMb = (fitCheck.remainingBytes / (1024 * 1024)).toFixed(1);
      const incomingMb = (totalIncomingBytes / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        error: `Upload size (${incomingMb} MB) exceeds room limit. Only ${freeMb} MB remaining out of 65 MB. Please delete older files to free space.`
      });
    }

    const uploadedResults = [];

    for (const file of files) {
      const isImage = file.mimetype.startsWith('image/');
      const savedInfo = await saveFile(roomId, file);

      const fileRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        filename: savedInfo.filename,
        size: savedInfo.size,
        mimetype: savedInfo.mimetype,
        storageKey: savedInfo.storageKey,
        uploadedAt: savedInfo.uploadedAt,
        isImage
      };

      addFileToRoom(roomId, fileRecord, isImage);
      uploadedResults.push(fileRecord);
    }

    const updatedRoomData = getRoomData(roomId);

    // Notify all clients in the room
    io.to(roomId).emit('room:files-updated', {
      files: updatedRoomData.files,
      images: updatedRoomData.images,
      totalBytes: updatedRoomData.totalBytes,
      percentUsed: updatedRoomData.percentUsed
    });

    res.json({
      success: true,
      uploaded: uploadedResults,
      room: updatedRoomData
    });
  } catch (err) {
    console.error('[Upload error]', err);
    res.status(500).json({
      error: err.message || 'File upload failed. Please try again.'
    });
  }
});

// Download a single file or image
app.get('/api/room/:roomId/download/:fileId', async (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const { fileId } = req.params;
    const room = getOrCreateRoom(check.roomId);
    const target = [...room.files, ...room.images].find(f => f.id === fileId);

    if (!target) {
      return res.status(404).json({
        error: 'This file is no longer available. It may have expired (20-minute limit) or been deleted.'
      });
    }

    const { stream, contentType, contentLength } = await getFileStream(check.roomId, target.storageKey);

    res.setHeader('Content-Type', contentType || target.mimetype || 'application/octet-stream');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    // Inline for images if preview query is set, otherwise attachment
    const dispositionType = req.query.view === 'inline' && target.isImage ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(target.filename)}"`);

    stream.pipe(res);
  } catch (err) {
    console.error('[Download error]', err);
    res.status(500).json({
      error: 'Unable to stream file right now. Please refresh and try again.'
    });
  }
});

// Download all files and images as a ZIP archive
app.get('/api/room/:roomId/download-zip', async (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const roomId = check.roomId;
    const room = getOrCreateRoom(roomId);
    const allItems = [...room.files, ...room.images];

    if (allItems.length === 0) {
      return res.status(400).json({
        error: 'There are no files in this room to bundle into a ZIP archive.'
      });
    }

    const archive = archiver('zip', { zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="filewhile-${roomId}-all.zip"`);

    archive.pipe(res);

    for (const item of allItems) {
      try {
        const { stream } = await getFileStream(roomId, item.storageKey);
        archive.append(stream, { name: item.filename });
      } catch (err) {
        console.error(`[Zip] Failed to append ${item.filename}:`, err.message);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('[Zip download error]', err);
    res.status(500).json({
      error: 'Failed to generate ZIP archive. Please download files individually.'
    });
  }
});

// Delete a file or image
app.delete('/api/room/:roomId/file/:fileId', async (req, res) => {
  try {
    const check = validateRoomId(req.params.roomId);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const { fileId } = req.params;
    const removed = await removeFileFromRoom(check.roomId, fileId);

    if (!removed) {
      return res.status(404).json({
        error: 'File not found or already deleted.'
      });
    }

    const updatedRoomData = getRoomData(check.roomId);

    // Notify peers in room
    io.to(check.roomId).emit('room:files-updated', {
      files: updatedRoomData.files,
      images: updatedRoomData.images,
      totalBytes: updatedRoomData.totalBytes,
      percentUsed: updatedRoomData.percentUsed
    });

    res.json({ success: true, removed });
  } catch (err) {
    console.error('[Delete error]', err);
    res.status(500).json({ error: 'Failed to delete file. Please try again.' });
  }
});

// Socket.io Real-Time Coordination
io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('room:join', ({ roomId }) => {
    if (!roomId) return;
    const check = validateRoomId(roomId);
    if (!check.valid) {
      socket.emit('room:error', { message: check.error });
      return;
    }

    const normalizedId = check.roomId;
    socket.join(normalizedId);
    currentRoom = normalizedId;

    const count = io.sockets.adapter.rooms.get(normalizedId)?.size || 1;
    io.to(normalizedId).emit('room:peers-count', { count });
    console.log(`[Socket] Client joined room: "${normalizedId}" (${count} connected)`);
  });

  // Real-time collaborative typing
  socket.on('room:text-change', ({ roomId, text }) => {
    if (!roomId) return;
    try {
      const result = updateRoomText(roomId, text);
      // Broadcast text change to everyone else in this room
      socket.to(roomId.toLowerCase()).emit('room:text-updated', {
        text: result.text,
        totalBytes: result.currentBytes
      });
    } catch (err) {
      socket.emit('room:error', { message: err.message || 'Cannot update notes - capacity exceeded.' });
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const count = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
      io.to(currentRoom).emit('room:peers-count', { count });
      console.log(`[Socket] Client left room: "${currentRoom}" (${count} remaining)`);
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred. Please try again.'
  });
});

server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`  Filewhile API server running on port ${PORT}`);
  console.log(`  Max Room Limit: 65 MB | Expiry: 20 Min (22 Min Purge)`);
  console.log(`  Storage: ${getStorageProviderName()}`);
  console.log(`===========================================`);
});
