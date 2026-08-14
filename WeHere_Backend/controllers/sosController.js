const { db } = require('../config/db');
const { uploadToIPFS } = require('../config/pinata');

// ═══════════════════════════════════════════════════════════════
//                         SOS CLIPS
// ═══════════════════════════════════════════════════════════════

// POST /api/sos/upload
exports.uploadClip = async (req, res) => {
  const { userId, username, latitude, longitude } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No video file received' });
  }
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  try {
    const { cid, gatewayUrl } = await uploadToIPFS(
      file.buffer,
      file.originalname || `sos_${Date.now()}.mp4`
    );

    const [result] = await db.query(
      `INSERT INTO sos_clips (user_id, username, cid, gateway_url, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username || null, cid, gatewayUrl, latitude || null, longitude || null]
    );

    const clip = {
      id: result.insertId,
      userId: Number(userId),
      username: username || 'Anonymous',
      cid,
      gatewayUrl,
      latitude: latitude || null,
      longitude: longitude || null,
      createdAt: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) io.emit('new-sos-clip', clip);

    return res.status(201).json({
      success: true,
      message: 'Clip uploaded to IPFS',
      clip,
    });
  } catch (err) {
    console.error('SOS upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: err.message,
    });
  }
};

// GET /api/sos/clips
exports.getClips = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, user_id AS userId, username, cid, gateway_url AS gatewayUrl,
              latitude, longitude, created_at AS createdAt
       FROM sos_clips
       ORDER BY created_at DESC
       LIMIT 50`
    );
    return res.status(200).json({ success: true, clips: rows });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//              LOCATION SYNC (called every 5 seconds)
// ═══════════════════════════════════════════════════════════════

/**
 * Sync users.current_latitude / current_longitude
 * into all ACTIVE sos_message_broadcast rows (is_stopped = 0)
 */
exports.syncAllActiveBroadcastLocations = async () => {
  try {
    const [activeUsers] = await db.query(
      `SELECT DISTINCT user_id
       FROM sos_message_broadcast
       WHERE is_stopped = 0`
    );

    if (!activeUsers.length) {
      return { success: true, updated: 0 };
    }

    let totalUpdated = 0;

    for (const row of activeUsers) {
      const userId = row.user_id;

      const [userRows] = await db.query(
        `SELECT current_latitude, current_longitude
         FROM users
         WHERE id = ?`,
        [userId]
      );

      if (!userRows.length) continue;

      const lat = userRows[0].current_latitude ?? null;
      const lng = userRows[0].current_longitude ?? null;

      const [result] = await db.query(
        `UPDATE sos_message_broadcast
         SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND is_stopped = 0`,
        [lat, lng, userId]
      );

      totalUpdated += result.affectedRows;
    }

    if (totalUpdated > 0) {
      console.log(`[Broadcast Sync] Updated ${totalUpdated} active broadcast(s)`);
    }

    return { success: true, updated: totalUpdated };
  } catch (err) {
    console.error('[Broadcast Sync] Error:', err.message);
    return { success: false, error: err.message };
  }
};

// ═══════════════════════════════════════════════════════════════
//                   MESSAGE BROADCAST
// ═══════════════════════════════════════════════════════════════

// POST /api/sos/broadcast
// POST /api/sos/broadcast
exports.createBroadcast = async (req, res) => {
  const {
    userId,
    emergency_contacts,
    nearby_users = null,
    message = null,
    latitude = null,
    longitude = null,
  } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId is required',
    });
  }

  if (
    !emergency_contacts ||
    !Array.isArray(emergency_contacts) ||
    emergency_contacts.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'At least one emergency contact is required',
    });
  }

  try {
    // Fetch latest location from users table
    const [userRows] = await db.query(
      `SELECT current_latitude, current_longitude
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prefer DB location; fall back to body only if DB is null
    const lat =
      userRows[0].current_latitude != null
        ? userRows[0].current_latitude
        : latitude ?? null;

    const lng =
      userRows[0].current_longitude != null
        ? userRows[0].current_longitude
        : longitude ?? null;

    // Calculate nearby users within 2km radius
    let nearbyUsersData = null;
    
    if (lat && lng) {
      // Haversine formula to find users within 2km
      // 2km in degrees (approximate - 1 degree ≈ 111.32 km)
      // 2/111.32 ≈ 0.01796 degrees
      const radiusInDegrees = 2 / 111.32;
      
      const [nearbyUsers] = await db.query(
        `SELECT id, username, mobile_number,
                (6371 * acos(
                  cos(radians(?)) * cos(radians(CAST(current_latitude AS DECIMAL(10,8)))) *
                  cos(radians(CAST(current_longitude AS DECIMAL(11,8))) - radians(?)) +
                  sin(radians(?)) * sin(radians(CAST(current_latitude AS DECIMAL(10,8))))
                )) AS distance
         FROM users
         WHERE id != ?
           AND current_latitude IS NOT NULL
           AND current_longitude IS NOT NULL
         HAVING distance <= 2
         ORDER BY distance ASC`,
        [parseFloat(lat), parseFloat(lng), parseFloat(lat), userId]
      );

      if (nearbyUsers && nearbyUsers.length > 0) {
        nearbyUsersData = nearbyUsers.map(user => ({
          user_id: user.id,
          username: user.username,
          mobile_number: user.mobile_number,
          distance: Math.round(user.distance * 1000) // Convert to meters
        }));
      }
    }

    // If nearby_users was passed in request, use it; otherwise use calculated data
    const finalNearbyUsers = nearby_users || nearbyUsersData;

    const [result] = await db.query(
      `INSERT INTO sos_message_broadcast
        (user_id, emergency_contacts, nearby_users, message, latitude, longitude, is_stopped)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        userId,
        JSON.stringify(emergency_contacts),
        finalNearbyUsers ? JSON.stringify(finalNearbyUsers) : null,
        message || null,
        lat,
        lng,
      ]
    );

    const broadcast = {
      id: result.insertId,
      userId: Number(userId),
      emergency_contacts,
      nearby_users: finalNearbyUsers || null,
      message: message || null,
      is_stopped: 0,
      latitude: lat,
      longitude: lng,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('new-sos-message-broadcast', broadcast);
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency message broadcast created successfully',
      broadcast,
    });
  } catch (err) {
    console.error('Create broadcast error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create broadcast',
      error: err.message,
    });
  }
};

// PATCH /api/sos/broadcast/:id/stop
// Body: { userId, emergencyPin }
exports.stopBroadcast = async (req, res) => {
  const { id } = req.params;
  const { userId, emergencyPin } = req.body;

  if (!id || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Broadcast id and userId are required',
    });
  }

  if (!emergencyPin) {
    return res.status(400).json({
      success: false,
      message: 'Emergency PIN is required to stop the broadcast',
    });
  }

  try {
    // Verify Emergency PIN
    const [userRows] = await db.query(
      'SELECT emergency_pin FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const storedPin = userRows[0].emergency_pin;

    if (storedPin === null || storedPin === undefined || storedPin === '') {
      return res.status(400).json({
        success: false,
        message: 'No Emergency PIN set. Please set it in Profile first.',
      });
    }

    if (String(storedPin) !== String(emergencyPin).trim()) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Emergency PIN',
      });
    }

    // Stop the broadcast
    const [result] = await db.query(
      `UPDATE sos_message_broadcast
       SET is_stopped = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND is_stopped = 0`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active broadcast not found or already stopped',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('sos-message-broadcast-stopped', {
        id: Number(id),
        userId: Number(userId),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Broadcast stopped successfully',
    });
  } catch (err) {
    console.error('Stop broadcast error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop broadcast',
      error: err.message,
    });
  }
};

// GET /api/sos/broadcast/user/:userId
exports.getUserBroadcasts = async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT id, user_id AS userId, emergency_contacts, nearby_users,
              message, is_stopped, latitude, longitude,
              created_at AS createdAt, updated_at AS updatedAt
       FROM sos_message_broadcast
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const broadcasts = rows.map((row) => ({
      ...row,
      emergency_contacts:
        typeof row.emergency_contacts === 'string'
          ? JSON.parse(row.emergency_contacts)
          : row.emergency_contacts,
      nearby_users:
        typeof row.nearby_users === 'string'
          ? JSON.parse(row.nearby_users)
          : row.nearby_users,
    }));

    return res.status(200).json({
      success: true,
      broadcasts,
    });
  } catch (err) {
    console.error('Get user broadcasts error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcasts',
      error: err.message,
    });
  }
};