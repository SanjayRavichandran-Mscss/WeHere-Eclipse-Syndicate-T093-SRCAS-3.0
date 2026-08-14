const { db } = require('../config/db');

/**
 * Test route
 */
exports.test = async (req, res) => {
  console.log('✅ Networks test route called');
  return res.status(200).json({
    success: true,
    message: 'Networks module is up and running!',
  });
};

/**
 * GET /api/networks/professionals
 * Headers: user-id (current logged in user)
 * Query: ?category=Doctor&search=priya
 */
exports.getProfessionals = async (req, res) => {
  try {
    const { user_id } = req.params;

    console.log('========================================');
    console.log('🔍 GET PROFESSIONALS CALLED');
    console.log('📌 User ID:', user_id);
    console.log('========================================');

    if (!user_id) {
      console.log('❌ Error: user_id is required');
      return res.status(400).json({
        success: false,
        message: 'user_id is required as URL parameter',
      });
    }

    let query = `
      SELECT 
        u.id,
        u.username,
        u.mobile_number,
        u.password,
        u.created_at,
        u.full_name,
        u.date_of_birth,
        u.language_known,
        u.gender,
        u.blood_group,
        u.about_me,
        u.role,
        u.address,
        u.city,
        u.state,
        u.pincode,
        u.current_location,
        u.current_latitude,
        u.current_longitude,
        u.emergency_pin,
        MAX(ue.domain) AS domain,
        MAX(ue.skills) AS skills,
        MAX(ue.occupation) AS occupation,
        MAX(ue.years_of_experience) AS years_of_experience,
        MAX(ue.highest_education_qualification) AS highest_education_qualification,
        MAX(ue.test_link) AS test_link,
        MAX(uad.open_to_work) AS open_to_work,
        MAX(uad.open_to_speak) AS open_to_speak,
        MAX(uad.preferred_work) AS preferred_work,
        MAX(uad.open_to_cross_border_collaboration) AS open_to_cross_border_collaboration,
        MAX(usm.title) AS mentorship_title,
        MAX(usm.description) AS mentorship_description
      FROM users u
      LEFT JOIN user_expertise ue ON u.id = ue.user_id
      LEFT JOIN user_additional_details uad ON u.id = uad.user_id
      LEFT JOIN user_seeking_mentorship usm ON u.id = usm.user_id
      WHERE u.id != ?
      GROUP BY 
        u.id, u.username, u.mobile_number, u.password, u.created_at,
        u.full_name, u.date_of_birth, u.language_known, u.gender,
        u.blood_group, u.about_me, u.role, u.address, u.city, u.state,
        u.pincode, u.current_location, u.current_latitude, u.current_longitude,
        u.emergency_pin
      ORDER BY u.username ASC
    `;

    const params = [user_id];
    const [rows] = await db.query(query, params);

    console.log(`✅ Found ${rows.length} professionals (excluding current user)`);

    // Format response with safe JSON parsing
    const professionals = rows.map((row) => {
      let location = 'India';
      if (row.city && row.state) {
        location = `${row.city}, ${row.state}`;
      } else if (row.city) {
        location = row.city;
      } else if (row.state) {
        location = row.state;
      } else if (row.current_location) {
        location = row.current_location;
      }

      // Safely parse preferred_work (JSON column)
      let preferredWork = null;
      if (row.preferred_work) {
        try {
          preferredWork = JSON.parse(row.preferred_work);
        } catch (e) {
          console.warn(`⚠️ Failed to parse preferred_work for user ${row.id}:`, row.preferred_work);
          preferredWork = null;
        }
      }

      return {
        id: row.id,
        username: row.username,
        mobile_number: row.mobile_number,
        password: row.password,
        created_at: row.created_at,
        full_name: row.full_name,
        date_of_birth: row.date_of_birth,
        language_known: row.language_known,
        gender: row.gender,
        blood_group: row.blood_group,
        about_me: row.about_me,
        role: row.role,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        current_location: row.current_location,
        current_latitude: row.current_latitude,
        current_longitude: row.current_longitude,
        emergency_pin: row.emergency_pin,
        location: location,
        expertise: row.domain || row.occupation || row.skills || 'General',
        assessmentStars: 8,
        feedbackStars: 7,
        isVerified: true,
        isOnline: Math.random() > 0.45,
        domain: row.domain,
        skills: row.skills,
        occupation: row.occupation,
        years_of_experience: row.years_of_experience,
        highest_education_qualification: row.highest_education_qualification,
        test_link: row.test_link,
        open_to_work: !!row.open_to_work,
        open_to_speak: !!row.open_to_speak,
        preferred_work: preferredWork,
        open_to_cross_border_collaboration: !!row.open_to_cross_border_collaboration,
        mentorship_title: row.mentorship_title,
        mentorship_description: row.mentorship_description,
      };
    });

    console.log(`📤 Sending ${professionals.length} professionals to frontend`);
    console.log('========================================');

    return res.status(200).json({
      success: true,
      count: professionals.length,
      users: professionals,
    });
  } catch (error) {
    console.error('❌ getProfessionals error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching professionals',
      error: error.message,
    });
  }
};

/**
 * GET /api/networks/profile/:profileId
 */
exports.getSingleProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    console.log('========================================');
    console.log('🔍 GET SINGLE PROFILE CALLED');
    console.log('📌 Profile ID:', profileId);
    console.log('========================================');

    const [rows] = await db.query(
      `
      SELECT 
        u.id,
        u.username,
        u.role,
        u.about_me,
        u.city,
        u.state,
        u.current_location,
        u.blood_group,
        u.language_known,
        u.gender,
        ue.domain,
        ue.skills,
        ue.occupation,
        ue.years_of_experience,
        ue.highest_education_qualification,
        uad.open_to_work,
        uad.open_to_speak,
        uad.open_to_cross_border_collaboration,
        usm.title AS mentorship_title,
        usm.description AS mentorship_description
      FROM users u
      LEFT JOIN user_expertise ue ON u.id = ue.user_id
      LEFT JOIN user_additional_details uad ON u.id = uad.user_id
      LEFT JOIN user_seeking_mentorship usm ON u.id = usm.user_id
      WHERE u.id = ?
      `,
      [profileId]
    );

    console.log(`✅ Found ${rows.length} rows for profile ID ${profileId}`);

    if (rows.length === 0) {
      console.log(`❌ Profile not found for ID: ${profileId}`);
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const user = rows[0];
    console.log('📊 Profile data:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  City: ${user.city}`);
    console.log(`  State: ${user.state}`);
    console.log(`  Skills: ${user.skills}`);
    console.log(`  Domain: ${user.domain}`);
    console.log(`  Occupation: ${user.occupation}`);
    console.log(`  Open to Work: ${user.open_to_work}`);
    console.log(`  Open to Speak: ${user.open_to_speak}`);

    // Build location string
    let location = 'India';
    if (user.city && user.state) {
      location = `${user.city}, ${user.state}`;
    } else if (user.city) {
      location = user.city;
    } else if (user.state) {
      location = user.state;
    } else if (user.current_location) {
      location = user.current_location;
    }

    const responseData = {
      id: user.id.toString(),
      name: user.username,  // Using username instead of full_name
      role: user.role,
      bio: user.about_me,
      location: location,
      expertise: user.domain || user.occupation,
      skills: user.skills,
      experience: user.years_of_experience,
      education: user.highest_education_qualification,
      openToWork: !!user.open_to_work,
      openToSpeak: !!user.open_to_speak,
      openToCrossBorder: !!user.open_to_cross_border_collaboration,
      mentorshipTitle: user.mentorship_title,
      mentorshipDescription: user.mentorship_description,
      bloodGroup: user.blood_group,
      language: user.language_known,
      gender: user.gender,
    };

    console.log('📤 Sending response data:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('========================================');

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ getSingleProfile error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// routes/networks.js (or wherever you placed it)

exports.getInTouchStatus = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.query.userId;
    const { profileId } = req.params;

    console.log('========================================');
    console.log('🔍 GET IN TOUCH STATUS CALLED');
    console.log('📌 User ID:', userId);
    console.log('📌 Profile ID:', profileId);
    console.log('========================================');

    if (!userId) {
      console.log('❌ Error: user-id required');
      return res.status(400).json({ success: false, message: 'user-id required' });
    }

    const [rows] = await db.query(
      `
      SELECT id, get_in_touch, created_at,
             TIMESTAMPDIFF(DAY, created_at, NOW()) AS days_passed
      FROM networks
      WHERE user_id = ? AND profile_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, profileId]
    );

    if (rows.length === 0) {
      console.log('ℹ️ No network record found');
      console.log('📤 Response: status = none');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        status: 'none',
        isActive: false,
        daysLeft: 0,
      });
    }

    const record = rows[0];
    console.log(`📊 Found record: ID=${record.id}, get_in_touch=${record.get_in_touch}, days_passed=${record.days_passed}`);

    let status = 'none';
    let isActive = false;
    let daysLeft = 0;

    if (record.get_in_touch === null) {
      status = 'pending';
    } else if (record.get_in_touch === 1) {
      const daysPassed = record.days_passed || 0;
      if (daysPassed < 7) {
        status = 'active';
        isActive = true;
        daysLeft = 7 - daysPassed;
      } else {
        // Auto-expire: set to 0 and treat as declined
        await db.query(
          `UPDATE networks SET get_in_touch = 0, updated_at = NOW() WHERE id = ?`,
          [record.id]
        );
        status = 'declined';
        isActive = false;
        daysLeft = 0;
      }
    } else if (record.get_in_touch === 0) {
      status = 'declined';
    }

    console.log(`📊 status: ${status}, isActive: ${isActive}, daysLeft: ${daysLeft}`);
    console.log('========================================');

    return res.status(200).json({
      success: true,
      status,
      isActive,
      daysLeft,
      networkId: record.id,
    });
  } catch (error) {
    console.error('❌ getInTouchStatus error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.createGetInTouch = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId;
    const { profileId } = req.body;

    console.log('========================================');
    console.log('🔍 CREATE GET IN TOUCH CALLED');
    console.log('📌 User ID:', userId);
    console.log('📌 Profile ID:', profileId);
    console.log('========================================');

    if (!userId || !profileId) {
      console.log('❌ Error: userId and profileId required');
      return res.status(400).json({
        success: false,
        message: 'userId and profileId required',
      });
    }

    if (String(userId) === String(profileId)) {
      console.log('❌ Error: Cannot Get in Touch with yourself');
      return res.status(400).json({
        success: false,
        message: 'Cannot Get in Touch with yourself',
      });
    }

    // Check for existing record
    const [existing] = await db.query(
      `SELECT id, get_in_touch, created_at 
       FROM networks 
       WHERE user_id = ? AND profile_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, profileId]
    );

    if (existing.length > 0) {
      const record = existing[0];
      // If active and not expired, block
      if (record.get_in_touch === 1) {
        const daysPassed = Math.floor(
          (Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysPassed < 7) {
          console.log('ℹ️ Get in Touch already active');
          return res.status(200).json({
            success: true,
            message: 'Get in Touch is already active',
            daysLeft: 7 - daysPassed,
          });
        } else {
          // Auto-expire (should already be handled by status, but just in case)
          await db.query(
            `UPDATE networks SET get_in_touch = 0, updated_at = NOW() WHERE id = ?`,
            [record.id]
          );
        }
      }

      // If pending (NULL) or declined (0), update the existing row
      // This resets it to pending and updates created_at
      console.log('📝 Updating existing record to pending...');
      const [updateResult] = await db.query(
        `UPDATE networks SET get_in_touch = NULL, created_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [record.id]
      );
      console.log(`✅ Updated record ID: ${record.id}`);
      return res.status(200).json({
        success: true,
        message: 'Get in Touch request sent!',
        networkId: record.id,
      });
    }

    // No existing record – create new
    console.log('📝 Creating new Get in Touch request (pending)...');
    const [result] = await db.query(
      `INSERT INTO networks (user_id, profile_id, get_in_touch) VALUES (?, ?, NULL)`,
      [userId, profileId]
    );

    console.log(`✅ Created record with ID: ${result.insertId}`);
    console.log('📤 Response: Request sent, waiting for acceptance');
    console.log('========================================');

    return res.status(201).json({
      success: true,
      message: 'Get in Touch request sent!',
      networkId: result.insertId,
    });
  } catch (error) {
    console.error('❌ createGetInTouch error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};





/**
 * POST /api/networks/feedback
 */
exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId;
    const { profileId, feedback, feedback_star } = req.body;

    console.log('========================================');
    console.log('🔍 SUBMIT FEEDBACK CALLED');
    console.log('📌 User ID:', userId);
    console.log('📌 Profile ID:', profileId);
    console.log('📌 Feedback:', feedback);
    console.log('📌 Feedback Star:', feedback_star);
    console.log('========================================');

    if (!userId || !profileId || !feedback) {
      console.log('❌ Error: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const [status] = await db.query(
      `SELECT id, get_in_touch, created_at
       FROM networks
       WHERE user_id = ? AND profile_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, profileId]
    );

    if (status.length === 0 || status[0].get_in_touch !== 1) {
      console.log('❌ Error: Get in Touch is not active');
      return res.status(403).json({
        success: false,
        message: 'You can only give feedback when Get in Touch is active',
      });
    }

    const daysPassed = Math.floor(
      (Date.now() - new Date(status[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`📊 Days passed since activation: ${daysPassed}`);

    if (daysPassed >= 7) {
      console.log('⏰ Get in Touch has expired, updating...');
      await db.query(`UPDATE networks SET get_in_touch = 0 WHERE id = ?`, [status[0].id]);
      return res.status(403).json({
        success: false,
        message: 'Get in Touch has expired',
      });
    }

    console.log('📝 Updating feedback...');
    await db.query(
      `UPDATE networks 
       SET feedback = ?, feedback_star = ?, updated_at = NOW()
       WHERE id = ?`,
      [feedback, feedback_star || null, status[0].id]
    );

    console.log('✅ Feedback submitted successfully');
    console.log('========================================');

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('❌ submitFeedback error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * GET /api/networks/feedbacks/:profileId
 */
exports.getFeedbacks = async (req, res) => {
  try {
    const { profileId } = req.params;

    console.log('========================================');
    console.log('🔍 GET FEEDBACKS CALLED');
    console.log('📌 Profile ID:', profileId);
    console.log('========================================');

    const [rows] = await db.query(
      `
      SELECT 
        n.feedback,
        n.feedback_star,
        n.created_at,
        u.username AS reviewer_name
      FROM networks n
      JOIN users u ON n.user_id = u.id
      WHERE n.profile_id = ? AND n.feedback IS NOT NULL AND n.feedback != ''
      ORDER BY n.created_at DESC
      `,
      [profileId]
    );

    console.log(`✅ Found ${rows.length} feedbacks`);

    if (rows.length > 0) {
      console.log('📊 Sample feedback:');
      console.log(`  Reviewer: ${rows[0].reviewer_name}`);
      console.log(`  Feedback: ${rows[0].feedback}`);
      console.log(`  Stars: ${rows[0].feedback_star}`);
    }

    const feedbacks = rows.map((row) => ({
      reviewer: row.reviewer_name,
      feedback: row.feedback,
      stars: row.feedback_star || 0,
      createdAt: row.created_at,
      formalSentence: `${row.reviewer_name} shared their experience: "${row.feedback}"`,
    }));

    console.log(`📤 Sending ${feedbacks.length} feedbacks`);
    console.log('========================================');

    return res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    console.error('❌ getFeedbacks error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};