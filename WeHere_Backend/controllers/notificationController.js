const { db } = require('../config/db');

/**
 * GET /api/notifications/test
 */
exports.test = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Notifications module is up and running!',
  });
};

/**
 * GET /api/notifications/ambulance-alerts/:userId
 * Returns ambulance alerts for this receiver (pending + already received)
 */
exports.getAmbulanceAlertNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[Notifications] getAmbulanceAlertNotifications for user:', userId);

    const [rows] = await db.query(
      `SELECT id, alert_sender, alert_sender_location, alert_receivers,
              received_status, alert_status, created_at, updated_at
       FROM sos_ambulance_alert
       WHERE alert_status = 1
       ORDER BY created_at DESC`
    );

    const notifications = [];

    for (const row of rows) {
      let receivers = row.alert_receivers;
      if (typeof receivers === 'string') {
        try {
          receivers = JSON.parse(receivers);
        } catch {
          continue;
        }
      }

      const me = receivers.find((r) => r.user_id == userId);
      if (!me) continue;

      // received_status
      let receivedStatus = row.received_status;
      if (typeof receivedStatus === 'string') {
        try {
          receivedStatus = JSON.parse(receivedStatus);
        } catch {
          receivedStatus = [];
        }
      }

      const myEntry = receivedStatus?.find((r) => r.user_id == userId);
      const myStatus = myEntry?.status ?? 0;
      const receivedAt = myEntry?.received_at || null;

      let senderLoc = row.alert_sender_location;
      if (typeof senderLoc === 'string') {
        try {
          senderLoc = JSON.parse(senderLoc);
        } catch {
          senderLoc = {};
        }
      }

      notifications.push({
        id: row.id,
        type: 'ambulance_alert',
        title: 'Ambulance Approaching',
        body: 'An ambulance is nearby. Please clear the road and give way immediately.',
        alert_sender: row.alert_sender,
        sender_location: senderLoc,
        my_distance_km: me.distance_km,
        my_received_status: myStatus,
        received_at: receivedAt,
        created_at: row.created_at,
        priority: 'high',
      });
    }

    console.log(`[Notifications] Found ${notifications.length} for user ${userId}`);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error('[Notifications] getAmbulanceAlertNotifications ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ambulance alert notifications',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/notifications/ambulance-alerts/:id/received
 * Body: { user_id }
 * Sets status = 1 + received_at timestamp for that user
 */
exports.markAmbulanceAlertReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    console.log('[Notifications] markAmbulanceAlertReceived → alert:', id, 'user:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

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
      try {
        receivedStatus = JSON.parse(receivedStatus);
      } catch {
        receivedStatus = [];
      }
    }
    if (!Array.isArray(receivedStatus)) receivedStatus = [];

    const now = new Date().toISOString();
    let found = false;

    receivedStatus = receivedStatus.map((item) => {
      if (item.user_id == user_id) {
        found = true;
        return {
          ...item,
          status: 1,
          received_at: now,
        };
      }
      return item;
    });

    if (!found) {
      receivedStatus.push({
        user_id: Number(user_id),
        status: 1,
        received_at: now,
      });
    }

    await db.query(
      `UPDATE sos_ambulance_alert
       SET received_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(receivedStatus), id]
    );

    console.log('[Notifications] Updated received_status:', receivedStatus);

    return res.status(200).json({
      success: true,
      message: 'Ambulance alert marked as received',
      data: {
        received_status: receivedStatus,
        received_at: now,
      },
    });
  } catch (error) {
    console.error('[Notifications] markAmbulanceAlertReceived ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update received status',
      error: error.message,
    });
  }
};

/**
 * GET /api/notifications/sos-broadcasts/:userId
 * Returns SOS broadcast notifications for nearby users
 */
exports.getSOSBroadcastNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[Notifications] getSOSBroadcastNotifications for user:', userId);

    // Get current user's details for display
    const [userRows] = await db.query(
      `SELECT id, username, full_name, current_latitude, current_longitude, current_location
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

    // Get ALL broadcasts (including stopped ones) for proper display
    // We'll filter on the frontend based on is_stopped
    const [broadcasts] = await db.query(
      `SELECT id, user_id, emergency_contacts, nearby_users, message, 
              is_stopped, latitude, longitude, users_received, created_at, updated_at
       FROM sos_message_broadcast
       ORDER BY created_at DESC`
    );

    const notifications = [];

    for (const broadcast of broadcasts) {
      // Skip if the broadcast is from the current user
      if (broadcast.user_id == userId) continue;

      // Parse nearby_users
      let nearbyUsers = broadcast.nearby_users;
      if (typeof nearbyUsers === 'string') {
        try {
          nearbyUsers = JSON.parse(nearbyUsers);
        } catch {
          continue;
        }
      }

      if (!Array.isArray(nearbyUsers) || nearbyUsers.length === 0) continue;

      // Check if current user is in nearby_users
      const isNearby = nearbyUsers.some((user) => user.user_id == userId);
      if (!isNearby) continue;

      // Get sender details from users table
      const [senderRows] = await db.query(
        `SELECT id, username, full_name, mobile_number, current_latitude, 
                current_longitude, current_location
         FROM users 
         WHERE id = ?`,
        [broadcast.user_id]
      );

      if (senderRows.length === 0) continue;

      const sender = senderRows[0];

      // Find the distance for this user from nearby_users
      const userDistance = nearbyUsers.find((u) => u.user_id == userId);
      const distanceInMeters = userDistance?.distance || 0;

      // Calculate distance in km
      const distanceInKm = (distanceInMeters / 1000).toFixed(2);

      // Parse users_received
      let usersReceived = broadcast.users_received;
      if (typeof usersReceived === 'string') {
        try {
          usersReceived = JSON.parse(usersReceived);
        } catch {
          usersReceived = [];
        }
      }
      if (!Array.isArray(usersReceived)) usersReceived = [];

      // Prepare notification data
      const notificationData = {
        id: broadcast.id,
        type: 'sos_broadcast',
        priority: 'urgent',
        title: '🚨 SOS Emergency Alert!',
        body: `${sender.full_name || sender.username || 'Someone'} needs immediate help!`,
        sender: {
          user_id: broadcast.user_id,
          username: sender.username,
          full_name: sender.full_name,
          mobile_number: sender.mobile_number,
          latitude: sender.current_latitude,
          longitude: sender.current_longitude,
          location: sender.current_location || 'Unknown location',
        },
        broadcast: {
          message: broadcast.message,
          latitude: broadcast.latitude,
          longitude: broadcast.longitude,
          created_at: broadcast.created_at,
        },
        distance_km: distanceInKm,
        distance_meters: distanceInMeters,
        is_stopped: broadcast.is_stopped,
        created_at: broadcast.created_at,
        emergency_contacts: broadcast.emergency_contacts,
        nearby_users: nearbyUsers,
        users_received: usersReceived,
      };

      notifications.push(notificationData);
    }

    console.log(`[Notifications] Found ${notifications.length} SOS broadcasts for user ${userId}`);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error('[Notifications] getSOSBroadcastNotifications ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS broadcast notifications',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/notifications/sos-broadcasts/:broadcastId/help
 * Body: { user_id }
 * Adds user to users_received array
 */
exports.markSOSBroadcastHelp = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const { user_id } = req.body;

    console.log('[Notifications] markSOSBroadcastHelp → broadcast:', broadcastId, 'user:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // Get current broadcast data
    const [rows] = await db.query(
      `SELECT id, is_stopped, users_received FROM sos_message_broadcast WHERE id = ?`,
      [broadcastId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    // Check if broadcast is stopped
    if (rows[0].is_stopped === 1) {
      return res.status(400).json({
        success: false,
        message: 'This broadcast has been stopped by the sender',
      });
    }

    // Parse existing users_received
    let usersReceived = rows[0].users_received;
    if (typeof usersReceived === 'string') {
      try {
        usersReceived = JSON.parse(usersReceived);
      } catch {
        usersReceived = [];
      }
    }
    if (!Array.isArray(usersReceived)) usersReceived = [];

    // Check if user already exists
    const userExists = usersReceived.some((u) => u.user_id == user_id);
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'You have already offered help for this broadcast',
      });
    }

    // Get user details
    const [userRows] = await db.query(
      `SELECT id, username, full_name, mobile_number FROM users WHERE id = ?`,
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userRows[0];

    // Add user to users_received
    usersReceived.push({
      user_id: Number(user_id),
      username: user.username,
      full_name: user.full_name,
      mobile_number: user.mobile_number,
      offered_help_at: new Date().toISOString()
    });

    // Update database
    await db.query(
      `UPDATE sos_message_broadcast 
       SET users_received = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify(usersReceived), broadcastId]
    );

    console.log('[Notifications] Updated users_received:', usersReceived);

    return res.status(200).json({
      success: true,
      message: 'Help offered successfully',
      data: {
        users_received: usersReceived,
        offered_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Notifications] markSOSBroadcastHelp ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark help',
      error: error.message,
    });
  }
};

/**
 * GET /api/notifications/sos-broadcasts/:broadcastId/helpers
 * Returns list of users who offered help
 */
exports.getSOSBroadcastHelpers = async (req, res) => {
  try {
    const { broadcastId } = req.params;

    const [rows] = await db.query(
      `SELECT users_received FROM sos_message_broadcast WHERE id = ?`,
      [broadcastId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    let usersReceived = rows[0].users_received;
    if (typeof usersReceived === 'string') {
      try {
        usersReceived = JSON.parse(usersReceived);
      } catch {
        usersReceived = [];
      }
    }
    if (!Array.isArray(usersReceived)) usersReceived = [];

    return res.status(200).json({
      success: true,
      count: usersReceived.length,
      data: usersReceived
    });
  } catch (error) {
    console.error('[Notifications] getSOSBroadcastHelpers ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch helpers',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/notifications/sos-broadcasts/:broadcastId/received
 * Body: { user_id }
 * Marks that a user has seen/received the SOS broadcast notification
 */
exports.markSOSBroadcastReceived = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const { user_id } = req.body;

    console.log('[Notifications] markSOSBroadcastReceived → broadcast:', broadcastId, 'user:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // Get the broadcast to check if it exists
    const [rows] = await db.query(
      `SELECT id, nearby_users FROM sos_message_broadcast WHERE id = ?`,
      [broadcastId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    // Return success - we don't need to store read status in DB
    // The frontend will manage the read status locally
    return res.status(200).json({
      success: true,
      message: 'Broadcast marked as received',
      data: {
        broadcast_id: broadcastId,
        user_id: user_id,
        received_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Notifications] markSOSBroadcastReceived ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark broadcast as received',
      error: error.message,
    });
  }
};



exports.getConnectionRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[Notifications] getConnectionRequests for user:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Fetch pending requests where the logged-in user is the profile_id (receiver)
    const [rows] = await db.query(
      `SELECT n.id AS network_id, n.user_id AS requester_id, n.created_at,
              u.username AS requester_username, u.full_name AS requester_full_name
       FROM networks n
       JOIN users u ON n.user_id = u.id
       WHERE n.profile_id = ? AND n.get_in_touch IS NULL
       ORDER BY n.created_at DESC`,
      [userId]
    );

    console.log(`[Notifications] Found ${rows.length} pending connection requests`);

    const requests = rows.map((row) => ({
      network_id: row.network_id,
      requester_id: row.requester_id,
      requester_name: row.requester_username || row.requester_full_name || 'Unknown User',
      created_at: row.created_at,
      type: 'connection_request',
      status: 'pending',
    }));

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('[Notifications] getConnectionRequests ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch connection requests',
      error: error.message,
    });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { networkId, action } = req.body;

    console.log('========================================');
    console.log('🔍 RESPOND TO REQUEST (NOTIFICATION)');
    console.log('📌 Network ID:', networkId);
    console.log('📌 Action:', action);
    console.log('========================================');

    if (!networkId || !action) {
      return res.status(400).json({
        success: false,
        message: 'networkId and action are required',
      });
    }

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({
        success: false,
        message: 'action must be "accept" or "decline"',
      });
    }

    const get_in_touch = action === 'accept' ? 1 : 0;

    const [result] = await db.query(
      `UPDATE networks SET get_in_touch = ?, updated_at = NOW() WHERE id = ?`,
      [get_in_touch, networkId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    console.log(`✅ Request ${action}ed successfully`);

    return res.status(200).json({
      success: true,
      message: `Request ${action}ed successfully`,
    });
  } catch (error) {
    console.error('❌ respondToRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};