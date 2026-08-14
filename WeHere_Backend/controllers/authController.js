const { db } = require('../config/db');

exports.test = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Auth module is up and running successfully!',
  });
};

exports.register = async (req, res) => {
  const { username, mobileNumber, password } = req.body;

  if (!username || !mobileNumber || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE mobile_number = ?', [mobileNumber]);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Mobile number already registered' });
    }

    const [result] = await db.query(
      'INSERT INTO users (username, mobile_number, password) VALUES (?, ?, ?)',
      [username, mobileNumber, password]
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { mobileNumber, password } = req.body;

  if (!mobileNumber || !password) {
    return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM users WHERE mobile_number = ? AND password = ?',
      [mobileNumber, password]
    );

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: results[0].id,
        username: results[0].username,
        mobileNumber: results[0].mobile_number,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Get user details (includes emergency_pin)
    const [userRows] = await db.query(
      `SELECT id, username, mobile_number, full_name, date_of_birth, language_known, gender,
              blood_group, about_me, role, address, city, state, pincode,
              current_location, current_latitude, current_longitude, emergency_pin
       FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Get expertise details (now includes preferred_language)
    const [expertiseRows] = await db.query(
      'SELECT * FROM user_expertise WHERE user_id = ?',
      [userId]
    );

    // 3. Get mentorship details
    const [mentorshipRows] = await db.query(
      'SELECT * FROM user_seeking_mentorship WHERE user_id = ?',
      [userId]
    );

    // 4. Get additional details
    const [additionalRows] = await db.query(
      'SELECT * FROM user_additional_details WHERE user_id = ?',
      [userId]
    );

    // 5. Get emergency contacts with status = 1 (active)
    const [emergencyContactsRows] = await db.query(
      `SELECT id, contact_name, contact_number, country_code, created_at, updated_at 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const profile = {
      id: userRows[0].id,
      username: userRows[0].username,
      mobile_number: userRows[0].mobile_number,
      full_name: userRows[0].full_name,
      date_of_birth: userRows[0].date_of_birth,
      language_known: userRows[0].language_known,
      gender: userRows[0].gender,
      blood_group: userRows[0].blood_group,
      about_me: userRows[0].about_me,
      role: userRows[0].role,
      address: userRows[0].address,
      city: userRows[0].city,
      state: userRows[0].state,
      pincode: userRows[0].pincode,
      current_location: userRows[0].current_location,
      current_latitude: userRows[0].current_latitude,
      current_longitude: userRows[0].current_longitude,
      emergency_pin: userRows[0].emergency_pin ?? null,

      expertise: expertiseRows && expertiseRows.length > 0 ? {
        domain: expertiseRows[0].domain,
        skills: expertiseRows[0].skills,
        occupation: expertiseRows[0].occupation,
        years_of_experience: expertiseRows[0].years_of_experience,
        highest_education_qualification: expertiseRows[0].highest_education_qualification,
        test_link: expertiseRows[0].test_link,
        preferred_language: expertiseRows[0].preferred_language || null,
      } : null,

      mentorship: mentorshipRows && mentorshipRows.length > 0 ? {
        title: mentorshipRows[0].title,
        description: mentorshipRows[0].description,
      } : null,

      additionalDetails: additionalRows && additionalRows.length > 0 ? {
        open_to_work: additionalRows[0].open_to_work,
        open_to_speak: additionalRows[0].open_to_speak,
        preferred_work: additionalRows[0].preferred_work,
        open_to_cross_border_collaboration: additionalRows[0].open_to_cross_border_collaboration,
      } : null,

      emergency_contacts: emergencyContactsRows || [],
    };

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const {
    fullName, dateOfBirth, languageKnown, gender, bloodGroup, aboutMe, role,
    address, city, state, pincode, currentLocation, currentLatitude, currentLongitude,
    domain, skills, occupation, yearsOfExperience, highestEducationQualification, testLink,
    preferredLanguage, // NEW
    mentorshipTitle, mentorshipDescription,
    openToWork, openToSpeak, preferredWork, openToCrossBorderCollaboration,
    emergency_contacts,
    emergencyPin,
  } = req.body;

  try {
    // 1. Update users table (includes emergency_pin when provided)
    if (emergencyPin !== undefined && emergencyPin !== null && emergencyPin !== '') {
      await db.query(
        `UPDATE users SET
          full_name = ?, date_of_birth = ?, language_known = ?, gender = ?, blood_group = ?,
          about_me = ?, role = ?, address = ?, city = ?, state = ?, pincode = ?,
          current_location = ?, current_latitude = ?, current_longitude = ?,
          emergency_pin = ?
         WHERE id = ?`,
        [
          fullName, dateOfBirth, languageKnown, gender, bloodGroup, aboutMe, role,
          address, city, state, pincode, currentLocation, currentLatitude, currentLongitude,
          emergencyPin, userId,
        ]
      );
    } else {
      await db.query(
        `UPDATE users SET
          full_name = ?, date_of_birth = ?, language_known = ?, gender = ?, blood_group = ?,
          about_me = ?, role = ?, address = ?, city = ?, state = ?, pincode = ?,
          current_location = ?, current_latitude = ?, current_longitude = ?
         WHERE id = ?`,
        [
          fullName, dateOfBirth, languageKnown, gender, bloodGroup, aboutMe, role,
          address, city, state, pincode, currentLocation, currentLatitude, currentLongitude,
          userId,
        ]
      );
    }

    // 2. Upsert user_expertise (now includes preferred_language)
    const [existingExpertise] = await db.query(
      'SELECT id FROM user_expertise WHERE user_id = ?',
      [userId]
    );
    if (existingExpertise.length > 0) {
      await db.query(
        `UPDATE user_expertise SET domain = ?, skills = ?, occupation = ?, years_of_experience = ?,
          highest_education_qualification = ?, test_link = ?, preferred_language = ? WHERE user_id = ?`,
        [domain, skills, occupation, yearsOfExperience, highestEducationQualification, testLink, preferredLanguage || null, userId]
      );
    } else {
      await db.query(
        `INSERT INTO user_expertise
          (user_id, domain, skills, occupation, years_of_experience, highest_education_qualification, test_link, preferred_language)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, domain, skills, occupation, yearsOfExperience, highestEducationQualification, testLink, preferredLanguage || null]
      );
    }

    // 3. Upsert user_seeking_mentorship
    const [existingMentorship] = await db.query(
      'SELECT id FROM user_seeking_mentorship WHERE user_id = ?',
      [userId]
    );
    if (existingMentorship.length > 0) {
      await db.query(
        'UPDATE user_seeking_mentorship SET title = ?, description = ? WHERE user_id = ?',
        [mentorshipTitle, mentorshipDescription, userId]
      );
    } else {
      await db.query(
        'INSERT INTO user_seeking_mentorship (user_id, title, description) VALUES (?, ?, ?)',
        [userId, mentorshipTitle, mentorshipDescription]
      );
    }

    // 4. Upsert user_additional_details
    const preferredWorkJson = preferredWork ? JSON.stringify(preferredWork) : null;
    const [existingAdditional] = await db.query(
      'SELECT id FROM user_additional_details WHERE user_id = ?',
      [userId]
    );
    if (existingAdditional.length > 0) {
      await db.query(
        `UPDATE user_additional_details SET open_to_work = ?, open_to_speak = ?, preferred_work = ?,
          open_to_cross_border_collaboration = ? WHERE user_id = ?`,
        [openToWork, openToSpeak, preferredWorkJson, openToCrossBorderCollaboration, userId]
      );
    } else {
      await db.query(
        `INSERT INTO user_additional_details
          (user_id, open_to_work, open_to_speak, preferred_work, open_to_cross_border_collaboration)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, openToWork, openToSpeak, preferredWorkJson, openToCrossBorderCollaboration]
      );
    }

    // 5. Handle emergency contacts (unchanged)
    if (emergency_contacts && Array.isArray(emergency_contacts)) {
      const [existingContacts] = await db.query(
        'SELECT id FROM sos_emergency_contact WHERE user_id = ? AND status = 1',
        [userId]
      );
      const existingIds = existingContacts.map((c) => c.id);
      const requestIds = emergency_contacts.filter((c) => c.id).map((c) => c.id);
      const idsToDelete = existingIds.filter((id) => !requestIds.includes(id));

      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(',');
        await db.query(
          `UPDATE sos_emergency_contact SET status = 0, updated_at = CURRENT_TIMESTAMP 
           WHERE id IN (${placeholders}) AND user_id = ?`,
          [...idsToDelete, userId]
        );
      }

      for (const contact of emergency_contacts) {
        const { id, contact_name, contact_number, country_code } = contact;
        if (id) {
          await db.query(
            `UPDATE sos_emergency_contact SET 
              contact_name = ?, contact_number = ?, country_code = ?, 
              status = 1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [contact_name, contact_number, country_code, id, userId]
          );
        } else {
          await db.query(
            `INSERT INTO sos_emergency_contact 
              (user_id, contact_name, contact_number, country_code, status) 
             VALUES (?, ?, ?, ?, 1)`,
            [userId, contact_name, contact_number, country_code]
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message,
    });
  }
};




exports.updateLocation = async (req, res) => {
  const { userId } = req.params;
  const { currentLocation, currentLatitude, currentLongitude } = req.body;

  if (!currentLatitude || !currentLongitude) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  try {
    await db.query(
      'UPDATE users SET current_location = ?, current_latitude = ?, current_longitude = ? WHERE id = ?',
      [currentLocation || null, currentLatitude, currentLongitude, userId]
    );

    return res.status(200).json({ success: true, message: 'Location updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
};