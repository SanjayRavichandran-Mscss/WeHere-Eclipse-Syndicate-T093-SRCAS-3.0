// controllers/supportcontroller.js

const mysql = require('mysql2/promise');

// ── DB connection pool ────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wehere',
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * GET /api/resources/nearby?lat=..&lng=..&radius=5
 *
 * Pulls every row from `users` that has a lat/lng set, computes distance
 * with the haversine formula in SQL, and returns only rows within `radius`
 * km.
 */
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


/**
 * GET /api/resources/place-details/:placeId
 *
 * Gets additional details for a backend user/resource.
 */
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


module.exports = {
  getNearbyResources,
  getPlaceDetails,
};