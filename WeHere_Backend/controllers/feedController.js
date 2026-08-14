const { db } = require('../config/db');
const { uploadToIPFS } = require('../config/pinata');

const CATEGORIES = ['news', 'opportunity', 'event', 'professional'];

// POST /api/feed/posts  (multipart/form-data: content, category, userId, username, country, state, file?)
exports.createPost = async (req, res) => {
  const { userId, username, category, content, country, state } = req.body;
  const file = req.file; // optional image

  if (!userId || !category || !content || !country || !state) {
    return res.status(400).json({
      success: false,
      message: 'userId, category, content, country, and state are required',
    });
  }

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: `category must be one of: ${CATEGORIES.join(', ')}` });
  }

  try {
    let mediaUrl = null;
    if (file) {
      // Reuses the same IPFS pipeline already built for SOS clips
      const { gatewayUrl } = await uploadToIPFS(file.buffer, file.originalname || `post_${Date.now()}`);
      mediaUrl = gatewayUrl;
    }

    const [result] = await db.query(
      `INSERT INTO community_posts (user_id, username, category, content, media_url, country, state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username || 'Anonymous', category, content, mediaUrl, country, state]
    );

    const post = {
      id: result.insertId,
      userId: Number(userId),
      username: username || 'Anonymous',
      category,
      content,
      mediaUrl,
      country,
      state,
      createdAt: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) io.emit('new-community-post', post);

    return res.status(201).json({ success: true, message: 'Post created', post });
  } catch (err) {
    console.error('Feed post creation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create post', error: err.message });
  }
};

// GET /api/feed/posts?country=X&state=Y&category=Z (category optional)
exports.getPosts = async (req, res) => {
  const { country, state, category } = req.query;

  if (!country || !state) {
    return res.status(400).json({ success: false, message: 'country and state query params are required' });
  }

  try {
    const params = [country, state];
    let query = `
      SELECT id, user_id AS userId, username, category, content, media_url AS mediaUrl,
             country, state, created_at AS createdAt
      FROM community_posts
      WHERE country = ? AND state = ?`;

    if (category && CATEGORIES.includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await db.query(query, params);
    return res.status(200).json({ success: true, posts: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
};
