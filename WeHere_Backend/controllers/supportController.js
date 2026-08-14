// controllers/supportController.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'san@123',
  database: process.env.DB_NAME || 'wehere',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── existing functions (keep them) ─────────────────────────────────────
const getNearbyResources = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radius) || 5;
  const excludeUserId = req.query.userId
    ? parseInt(req.query.userId, 10)
    : null;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({
      success: false,
      message: 'lat and lng query params are required',
    });
  }

  try {
    const sql = `
      SELECT
        id,
        username,
        full_name,
        mobile_number,
        role,
        blood_group,
        current_location,

        CAST(current_latitude AS DECIMAL(10,6)) AS latitude,
        CAST(current_longitude AS DECIMAL(10,6)) AS longitude,

        (
          6371 * ACOS(
            COS(RADIANS(?)) *
            COS(RADIANS(
              CAST(current_latitude AS DECIMAL(10,6))
            )) *
            COS(
              RADIANS(
                CAST(current_longitude AS DECIMAL(10,6))
              ) - RADIANS(?)
            ) +
            SIN(RADIANS(?)) *
            SIN(
              RADIANS(
                CAST(current_latitude AS DECIMAL(10,6))
              )
            )
          )
        ) AS distanceKm

      FROM users

      WHERE current_latitude IS NOT NULL
        AND current_longitude IS NOT NULL
        AND current_latitude <> ''
        AND current_longitude <> ''

        ${excludeUserId ? 'AND id <> ?' : ''}

      HAVING distanceKm <= ?

      ORDER BY distanceKm ASC
    `;

    const params = excludeUserId
      ? [lat, lng, lat, excludeUserId, radiusKm]
      : [lat, lng, lat, radiusKm];

    const [rows] = await pool.query(sql, params);

    const data = rows.map(row => {
      const roleText = (row.role || '').toLowerCase();

      const isVolunteer = roleText.includes('volunteer');

      return {
        id: row.id,

        type: isVolunteer
          ? 'Volunteer'
          : 'User',

        name: row.full_name || row.username,

        latitude: row.latitude,
        longitude: row.longitude,

        address: row.current_location,

        phone: row.mobile_number,

        bloodGroup: row.blood_group || undefined,

        available: isVolunteer
          ? 'Available'
          : undefined,

        distanceKm: Number(row.distanceKm),
      };
    });

    return res.json({
      success: true,
      data,
    });

  } catch (err) {
    console.error(
      '[resources/nearby] SQL error:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: err.message,
    });
  }
};

const getPlaceDetails = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.placeId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Not found',
      });
    }

    const row = rows[0];

    return res.json({
      success: true,

      data: {
        phone: row.mobile_number,
        available: 'Available',
      },
    });

  } catch (err) {
    console.error(
      '[resources/place-details] SQL error:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Database query failed',
    });
  }
};

const getNearbyUsers = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  console.log('[getNearbyUsers] Request received for userId:', userId);

  if (isNaN(userId)) {
    console.log('[getNearbyUsers] Invalid userId:', req.params.userId);
    return res.status(400).json({
      success: false,
      message: 'Invalid userId parameter',
    });
  }

  try {
    console.log('[getNearbyUsers] Fetching users except userId:', userId);

    const sql = `
      SELECT 
        id,
        username,
        full_name,
        mobile_number,
        blood_group,
        gender,
        current_location,
        current_latitude,
        current_longitude,
        role
      FROM users
      WHERE id != ?
        AND current_latitude IS NOT NULL
        AND current_longitude IS NOT NULL
        AND current_latitude <> ''
        AND current_longitude <> ''
      ORDER BY username ASC
    `;

    const [rows] = await pool.query(sql, [userId]);

    console.log('[getNearbyUsers] Raw rows from database:', rows.length);

    // Transform the data for consistent response format
    const data = rows.map(row => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      mobileNumber: row.mobile_number,
      bloodGroup: row.blood_group || null,
      gender: row.gender || null,
      location: row.current_location,
      latitude: row.current_latitude ? parseFloat(row.current_latitude) : null,
      longitude: row.current_longitude ? parseFloat(row.current_longitude) : null,
      role: row.role || 'user'
    }));

    // Log the transformed data
    console.log('[getNearbyUsers] Transformed data:', JSON.stringify(data, null, 2));
    console.log('[getNearbyUsers] Total users found:', data.length);

    // Log each user's details
    data.forEach((user, index) => {
      console.log(`[getNearbyUsers] User ${index + 1}:`, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        bloodGroup: user.bloodGroup,
        gender: user.gender,
        location: user.location,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role
      });
    });

    return res.json({
      success: true,
      count: data.length,
      data: data,
    });

  } catch (err) {
    console.error('[getNearbyUsers] SQL error:', err);
    console.error('[getNearbyUsers] Error stack:', err.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: err.message,
    });
  }
};

const createSupportRequest = async (req, res) => {
  const { user_id, volunteer_id, message } = req.body;

  if (!user_id || !volunteer_id) {
    return res.status(400).json({
      success: false,
      message: 'user_id and volunteer_id are required',
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO support 
         (user_id, volunteer_id, message, request_status, volunteer_response, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, NOW(), NOW())`,
      [
        parseInt(user_id, 10),
        parseInt(volunteer_id, 10),
        message && message.trim() ? message.trim() : null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Support request sent successfully',
      data: {
        id: result.insertId,
        user_id: parseInt(user_id, 10),
        volunteer_id: parseInt(volunteer_id, 10),
        message: message && message.trim() ? message.trim() : null,
        request_status: null,
        volunteer_response: null,
      },
    });
  } catch (err) {
    console.error('[createSupportRequest] SQL error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create support request',
      error: err.message,
    });
  }
};


const getSupportRequestsForVolunteer = async (req, res) => {
  const volunteerId = parseInt(req.params.volunteerId, 10);

  if (isNaN(volunteerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid volunteerId',
    });
  }

  try {
    const sql = `
      SELECT 
        s.id,
        s.user_id,
        s.volunteer_id,
        s.message,
        s.request_status,
        s.volunteer_response,
        s.created_at,
        s.updated_at,
        u.username,
        u.full_name,
        u.mobile_number,
        u.current_location,
        u.current_latitude,
        u.current_longitude,
        u.blood_group,
        u.gender
      FROM support s
      JOIN users u ON u.id = s.user_id
      WHERE s.volunteer_id = ?
      ORDER BY s.created_at DESC
    `;

    const [rows] = await pool.query(sql, [volunteerId]);

    const data = rows.map(row => ({
      id: row.id,
      type: 'support_request',
      user_id: row.user_id,
      volunteer_id: row.volunteer_id,
      message: row.message,
      request_status: row.request_status,          // null = pending
      volunteer_response: row.volunteer_response,  // null | 'will_help' | 'cant_help'
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: {
        user_id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        mobile_number: row.mobile_number,
        location: row.current_location,
        latitude: row.current_latitude,
        longitude: row.current_longitude,
        blood_group: row.blood_group,
        gender: row.gender,
      },
    }));

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[getSupportRequestsForVolunteer] SQL error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: err.message,
    });
  }
};


const respondToSupportRequest = async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const { volunteer_response, message } = req.body;  // Now accepting message

  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request id',
    });
  }

  // Validate that volunteer_response is provided
  if (!volunteer_response || !['will_help', 'cant_help'].includes(volunteer_response)) {
    return res.status(400).json({
      success: false,
      message: "volunteer_response must be 'will_help' or 'cant_help'",
    });
  }

  // Convert to integer for request_status column
  const statusValue = volunteer_response === 'will_help' ? 1 : 0;
  
  // Use the message provided by the volunteer, or null if not provided
  const responseMessage = message && message.trim() ? message.trim() : null;

  try {
    const [result] = await pool.query(
      `UPDATE support 
       SET volunteer_response = ?, 
           request_status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        responseMessage,      // Store the volunteer's message in volunteer_response
        statusValue,          // integer: 1 or 0
        requestId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found',
      });
    }

    return res.json({
      success: true,
      message: 'Response recorded successfully',
      data: {
        id: requestId,
        volunteer_response: responseMessage,  // Return the stored message
        request_status: statusValue,           // 1 or 0
      },
    });
  } catch (err) {
    console.error('[respondToSupportRequest] SQL error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update response',
      error: err.message,
    });
  }
};

module.exports = {
  getNearbyResources,
  getPlaceDetails,
  getNearbyUsers,
  createSupportRequest,
  getSupportRequestsForVolunteer,
  respondToSupportRequest,
};