const { db } = require('../config/db');

// Haversine – distance in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.test = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Ambulance Alert module is up and running successfully!',
  });
};

/**
 * POST /create
 * Creates alert + fills received_status with all nearby user_ids (status: 0)
 */
exports.createAlert = async (req, res) => {
  try {
    const {
      sender_id,
      latitude,
      longitude,
      location_name = 'Current Location',
      radius_km = 2.5,
    } = req.body;

    console.log('[AmbulanceAlert] createAlert body:', req.body);

    if (!sender_id || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'sender_id, latitude and longitude are required',
      });
    }

    // 1. Get all users who have location (except sender)
    const [users] = await db.query(
      `SELECT id, full_name, mobile_number, current_latitude, current_longitude, current_location, role
       FROM users
       WHERE id != ?
         AND current_latitude IS NOT NULL
         AND current_longitude IS NOT NULL`,
      [sender_id]
    );

    // 2. Filter nearby users
    const nearbyReceivers = [];
    const receivedStatusList = []; // ← new column data

    for (const user of users) {
      const dist = getDistanceKm(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(user.current_latitude),
        parseFloat(user.current_longitude)
      );

      if (dist <= radius_km) {
        nearbyReceivers.push({
          user_id: user.id,
          full_name: user.full_name,
          mobile_number: user.mobile_number,
          role: user.role,
          latitude: parseFloat(user.current_latitude),
          longitude: parseFloat(user.current_longitude),
          location_name: user.current_location || 'Nearby',
          distance_km: Number(dist.toFixed(2)),
        });

        // Default status = 0 (not yet received/acknowledged)
        receivedStatusList.push({
          user_id: user.id,
          status: 0,
        });
      }
    }

    console.log(`[AmbulanceAlert] Nearby: ${nearbyReceivers.length}`);

    const senderLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location_name,
    };

    // 3. Insert including received_status
    const [result] = await db.query(
      `INSERT INTO sos_ambulance_alert
       (alert_sender, alert_sender_location, alert_receivers, received_status, alert_status)
       VALUES (?, ?, ?, ?, 1)`,
      [
        sender_id,
        JSON.stringify(senderLocation),
        JSON.stringify(nearbyReceivers),
        JSON.stringify(receivedStatusList),
      ]
    );

    console.log('[AmbulanceAlert] Inserted alert id:', result.insertId);

    return res.status(201).json({
      success: true,
      message: `Alert created. Notified ${nearbyReceivers.length} nearby users.`,
      data: {
        alert_id: result.insertId,
        receivers_count: nearbyReceivers.length,
        receivers: nearbyReceivers,
        received_status: receivedStatusList,
      },
    });
  } catch (error) {
    console.error('[AmbulanceAlert] createAlert ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create ambulance alert',
      error: error.message,
    });
  }
};

/**
 * PATCH /:id/received
 * Body: { user_id: number }
 * Sets status = 1 for that user inside received_status JSON
 */
exports.markReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    console.log('[AmbulanceAlert] markReceived → alert:', id, 'user:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // 1. Get current received_status
    const [rows] = await db.query(
      `SELECT received_status FROM sos_ambulance_alert WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    let receivedStatus = rows[0].received_status;
    if (typeof receivedStatus === 'string') {
      receivedStatus = JSON.parse(receivedStatus);
    }
    if (!Array.isArray(receivedStatus)) {
      receivedStatus = [];
    }

    // 2. Update the matching user_id → status = 1
    let found = false;
    receivedStatus = receivedStatus.map((item) => {
      if (item.user_id == user_id) {
        found = true;
        return { ...item, status: 1 };
      }
      return item;
    });

    // If user was not in the list (edge case), add them
    if (!found) {
      receivedStatus.push({ user_id: Number(user_id), status: 1 });
    }

    // 3. Save back
    await db.query(
      `UPDATE sos_ambulance_alert
       SET received_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(receivedStatus), id]
    );

    console.log('[AmbulanceAlert] Updated received_status:', receivedStatus);

    return res.status(200).json({
      success: true,
      message: 'Marked as received',
      data: { received_status: receivedStatus },
    });
  } catch (error) {
    console.error('[AmbulanceAlert] markReceived ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update received status',
      error: error.message,
    });
  }
};

/**
 * Keep your existing clearAlert / getActiveAlertsForUser / getMySentAlerts
 * (they can stay the same)
 */
exports.clearAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE sos_ambulance_alert SET alert_status = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return res.status(200).json({ success: true, message: 'Alert cleared successfully' });
  } catch (error) {
    console.error('[AmbulanceAlert] clearAlert ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear alert',
      error: error.message,
    });
  }
};

exports.getActiveAlertsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.query(
      `SELECT id, alert_sender, alert_sender_location, alert_receivers, received_status, alert_status, created_at
       FROM sos_ambulance_alert
       WHERE alert_status = 1
       ORDER BY created_at DESC`
    );

    const myAlerts = [];
    for (const row of rows) {
      let receivers = row.alert_receivers;
      if (typeof receivers === 'string') receivers = JSON.parse(receivers);

      const me = receivers.find((r) => r.user_id == userId);
      if (me) {
        let senderLoc = row.alert_sender_location;
        if (typeof senderLoc === 'string') senderLoc = JSON.parse(senderLoc);

        let receivedStatus = row.received_status;
        if (typeof receivedStatus === 'string') {
          try { receivedStatus = JSON.parse(receivedStatus); } catch { receivedStatus = []; }
        }

        myAlerts.push({
          alert_id: row.id,
          alert_sender: row.alert_sender,
          sender_location: senderLoc,
          my_distance_km: me.distance_km,
          my_received_status: receivedStatus?.find((r) => r.user_id == userId)?.status ?? 0,
          created_at: row.created_at,
        });
      }
    }

    return res.status(200).json({ success: true, count: myAlerts.length, data: myAlerts });
  } catch (error) {
    console.error('[AmbulanceAlert] getActiveAlertsForUser ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message,
    });
  }
};

exports.getMySentAlerts = async (req, res) => {
  try {
    const { senderId } = req.params;

    const [rows] = await db.query(
      `SELECT id, alert_sender_location, alert_receivers, received_status,
              alert_status, created_at, updated_at
       FROM sos_ambulance_alert
       WHERE alert_sender = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [senderId]
    );

    const data = rows.map((row) => {
      let receivers = row.alert_receivers;
      let receivedStatus = row.received_status;
      let senderLoc = row.alert_sender_location;

      if (typeof receivers === 'string') {
        try { receivers = JSON.parse(receivers); } catch { receivers = []; }
      }
      if (typeof receivedStatus === 'string') {
        try { receivedStatus = JSON.parse(receivedStatus); } catch { receivedStatus = []; }
      }
      if (typeof senderLoc === 'string') {
        try { senderLoc = JSON.parse(senderLoc); } catch { senderLoc = {}; }
      }

      const receivedCount = Array.isArray(receivedStatus)
        ? receivedStatus.filter((r) => r.status === 1).length
        : 0;

      return {
        id: row.id,
        alert_sender_location: senderLoc,
        alert_receivers: receivers,
        received_status: receivedStatus,
        receivers_count: Array.isArray(receivers) ? receivers.length : 0,
        received_count: receivedCount,
        alert_status: row.alert_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('[AmbulanceAlert] getMySentAlerts ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sent alerts',
      error: error.message,
    });
  }
};