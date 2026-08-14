// const path = require('path');
// const fs = require('fs');
// const multer = require('multer');
// const { db } = require('../config/db');

// // ────────────────────────────────────────────────
// //                 MULTER CONFIG
// // ────────────────────────────────────────────────
// const postsDir = path.join(__dirname, '../uploads/posts');

// if (!fs.existsSync(postsDir)) {
//   fs.mkdirSync(postsDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, postsDir);
//   },
//   filename: (req, file, cb) => {
//     const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `post-${unique}${ext}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowed =
//     /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm|mp3|wav|m4a|aac|pdf|doc|docx|txt|ppt|pptx|xls|xlsx/;
//   const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
//   if (
//     allowed.test(ext) ||
//     file.mimetype.startsWith('image/') ||
//     file.mimetype.startsWith('video/') ||
//     file.mimetype.startsWith('audio/')
//   ) {
//     cb(null, true);
//   } else {
//     cb(new Error('Unsupported file type'), false);
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
// });

// exports.uploadPostMedia = upload.single('media');

// const detectMediaType = (file) => {
//   if (!file) return 'none';
//   const mime = file.mimetype || '';
//   const ext = path.extname(file.originalname).toLowerCase();

//   if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext))
//     return 'image';
//   if (mime.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext))
//     return 'video';
//   if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac'].includes(ext))
//     return 'audio';
//   return 'document';
// };

// const parseTags = (tagsValue) => {
//   if (!tagsValue) return [];
//   try {
//     if (Array.isArray(tagsValue)) return tagsValue;
//     if (typeof tagsValue === 'string') {
//       const parsed = JSON.parse(tagsValue);
//       return Array.isArray(parsed) ? parsed : [String(tagsValue)];
//     }
//   } catch {
//     if (typeof tagsValue === 'string') {
//       return tagsValue
//         .split(',')
//         .map((t) => t.trim())
//         .filter(Boolean);
//     }
//   }
//   return [];
// };

// const formatPost = (row) => {
//   if (!row) return null;
//   return {
//     ...row,
//     tags: parseTags(row.tags),
//     author_name: row.author_name || `User ${row.user_id}`,
//     author_avatar: null,
//     author_role: row.context_type || null,
//   };
// };

// // ────────────────────────────────────────────────
// //                 CONTROLLERS
// // ────────────────────────────────────────────────

// exports.test = async (req, res) => {
//   return res.status(200).json({
//     success: true,
//     message: 'Home is running successfully!',
//   });
// };

// /**
//  * CREATE POST
//  * POST /api/home/posts
//  * user_id = the user who is creating the post
//  */
// exports.createPost = async (req, res) => {
//   try {
//     const {
//       title = null,
//       content = null,
//       context_type = 'Awareness',
//       tags = null,
//       country = null,
//       state = null,
//       is_nearby = 0,
//       user_id,
//     } = req.body;

//     if (!user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'user_id is required (the user who is posting)',
//       });
//     }

//     let tagsJson = null;
//     if (tags) {
//       try {
//         const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
//         tagsJson = Array.isArray(parsed) ? parsed : [String(tags)];
//       } catch {
//         tagsJson = String(tags)
//           .split(',')
//           .map((t) => t.trim())
//           .filter(Boolean);
//       }
//     }

//     let media_path = null;
//     let media_type = 'none';
//     let media_original_name = null;

//     if (req.file) {
//       media_path = `uploads/posts/${req.file.filename}`;
//       media_type = detectMediaType(req.file);
//       media_original_name = req.file.originalname;
//     }

//     const sql = `
//       INSERT INTO posts
//         (user_id, title, content, context_type, tags, media_path, media_type,
//          media_original_name, country, state, is_nearby)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const [result] = await db.query(sql, [
//       user_id,
//       title,
//       content,
//       context_type,
//       tagsJson ? JSON.stringify(tagsJson) : null,
//       media_path,
//       media_type,
//       media_original_name,
//       country || null,
//       state || null,
//       is_nearby === '1' || is_nearby === 1 || is_nearby === true ? 1 : 0,
//     ]);

//     const [rows] = await db.query(
//       `SELECT
//          p.*,
//          u.username AS author_name
//        FROM posts p
//        LEFT JOIN users u ON u.id = p.user_id
//        WHERE p.id = ? AND p.is_delete = 0`,
//       [result.insertId]
//     );

//     return res.status(201).json({
//       success: true,
//       message: 'Impact shared successfully',
//       data: formatPost(rows[0]) || { id: result.insertId },
//     });
//   } catch (err) {
//     console.error('[createPost]', err);
//     if (req.file && req.file.path) {
//       try {
//         fs.unlinkSync(req.file.path);
//       } catch (_) {}
//     }
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };

// /**
//  * GET ALL POSTS
//  * GET /api/home/posts
//  */
// exports.getPosts = async (req, res) => {
//   try {
//     const {
//       country,
//       state,
//       nearby,
//       context_type,
//       page = 1,
//       limit = 20,
//     } = req.query;

//     const pageNum = Math.max(1, parseInt(page, 10) || 1);
//     const lim = Math.min(50, parseInt(limit, 10) || 20);
//     const offset = (pageNum - 1) * lim;

//     const where = ['p.is_delete = 0'];
//     const params = [];

//     if (country && country !== 'All') {
//       where.push('p.country = ?');
//       params.push(country);
//     }
//     if (state && state !== 'All') {
//       where.push('p.state = ?');
//       params.push(state);
//     }
//     if (context_type) {
//       where.push('p.context_type = ?');
//       params.push(context_type);
//     }
//     if (nearby === '1' || nearby === 'true') {
//       where.push('p.is_nearby = 1');
//     }

//     const whereClause = `WHERE ${where.join(' AND ')}`;
//     const orderBy =
//       nearby === '1' || nearby === 'true'
//         ? 'ORDER BY p.is_nearby DESC, p.created_at DESC'
//         : 'ORDER BY p.created_at DESC';

//     const sql = `
//       SELECT
//         p.*,
//         u.username AS author_name
//       FROM posts p
//       LEFT JOIN users u ON u.id = p.user_id
//       ${whereClause}
//       ${orderBy}
//       LIMIT ? OFFSET ?
//     `;

//     params.push(lim, offset);

//     const [rows] = await db.query(sql, params);

//     const data = rows.map((row) => formatPost(row));

//     return res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (err) {
//     console.error('[getPosts]', err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };

// /**
//  * GET SINGLE POST
//  * GET /api/home/posts/:id
//  */
// exports.getPostById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(
//       `SELECT
//          p.*,
//          u.username AS author_name
//        FROM posts p
//        LEFT JOIN users u ON u.id = p.user_id
//        WHERE p.id = ? AND p.is_delete = 0`,
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         success: false,
//         message: 'Post not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: formatPost(rows[0]),
//     });
//   } catch (err) {
//     console.error('[getPostById]', err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };

// /**
//  * SOFT DELETE
//  * DELETE /api/home/posts/:id
//  * body: { user_id } → only the owner can delete
//  */
// exports.deletePost = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { user_id } = req.body;

//     if (!user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'user_id is required',
//       });
//     }

//     const [result] = await db.query(
//       `UPDATE posts
//        SET is_delete = 1
//        WHERE id = ? AND user_id = ? AND is_delete = 0`,
//       [id, user_id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Post not found or you are not the owner',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Post deleted',
//     });
//   } catch (err) {
//     console.error('[deletePost]', err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };

// /**
//  * APPRECIATE
//  * POST /api/home/posts/:id/appreciate
//  */
// exports.appreciatePost = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query(
//       `UPDATE posts
//        SET appreciations = appreciations + 1
//        WHERE id = ? AND is_delete = 0`,
//       [id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Post not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Appreciated',
//     });
//   } catch (err) {
//     console.error('[appreciatePost]', err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };




















const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../config/db');

// ────────────────────────────────────────────────
//                 MULTER CONFIG
// ────────────────────────────────────────────────
const postsDir = path.join(__dirname, '../uploads/posts');

if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed =
    /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm|mp3|wav|m4a|aac|pdf|doc|docx|txt|ppt|pptx|xls|xlsx/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (
    allowed.test(ext) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

exports.uploadPostMedia = upload.single('media');

const detectMediaType = (file) => {
  if (!file) return 'none';
  const mime = file.mimetype || '';
  const ext = path.extname(file.originalname).toLowerCase();

  if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext))
    return 'image';
  if (mime.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext))
    return 'video';
  if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac'].includes(ext))
    return 'audio';
  return 'document';
};

const parseTags = (tagsValue) => {
  if (!tagsValue) return [];
  try {
    if (Array.isArray(tagsValue)) return tagsValue;
    if (typeof tagsValue === 'string') {
      const parsed = JSON.parse(tagsValue);
      return Array.isArray(parsed) ? parsed : [String(tagsValue)];
    }
  } catch {
    if (typeof tagsValue === 'string') {
      return tagsValue
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatPost = (row) => {
  if (!row) return null;

  const likes = parseJsonArray(row.post_like);
  const comments = parseJsonArray(row.comments);
  const saves = parseJsonArray(row.post_save);

  return {
    ...row,
    tags: parseTags(row.tags),
    author_name: row.author_name || `User ${row.user_id}`,
    author_avatar: null,
    author_role: row.context_type || null,
    appreciations: likes.length,
    comments_count: comments.length,
    post_like: likes,
    post_save: saves,
    comments,
  };
};

// ensure a post_response row exists for a post
const ensureResponseRow = async (postId) => {
  const [rows] = await db.query(
    `SELECT id FROM post_response WHERE post_id = ? LIMIT 1`,
    [postId]
  );
  if (rows.length) return rows[0].id;

  const [result] = await db.query(
    `INSERT INTO post_response (post_id, post_like, comments, post_save) VALUES (?, ?, ?, ?)`,
    [postId, JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
  );
  return result.insertId;
};

// ────────────────────────────────────────────────
//                 CONTROLLERS
// ────────────────────────────────────────────────

exports.test = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Home is running successfully!',
  });
};

/**
 * CREATE POST
 * POST /api/home/posts
 */
exports.createPost = async (req, res) => {
  try {
    const {
      title = null,
      content = null,
      context_type = 'Awareness',
      tags = null,
      country = null,
      state = null,
      is_nearby = 0,
      user_id,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required (the user who is posting)',
      });
    }

    let tagsJson = null;
    if (tags) {
      try {
        const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
        tagsJson = Array.isArray(parsed) ? parsed : [String(tags)];
      } catch {
        tagsJson = String(tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    let media_path = null;
    let media_type = 'none';
    let media_original_name = null;

    if (req.file) {
      media_path = `uploads/posts/${req.file.filename}`;
      media_type = detectMediaType(req.file);
      media_original_name = req.file.originalname;
    }

    const sql = `
      INSERT INTO posts
        (user_id, title, content, context_type, tags, media_path, media_type,
         media_original_name, country, state, is_nearby)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      user_id,
      title,
      content,
      context_type,
      tagsJson ? JSON.stringify(tagsJson) : null,
      media_path,
      media_type,
      media_original_name,
      country || null,
      state || null,
      is_nearby === '1' || is_nearby === 1 || is_nearby === true ? 1 : 0,
    ]);

    // create empty response row
    await ensureResponseRow(result.insertId);

    const [rows] = await db.query(
      `SELECT
         p.*,
         u.username AS author_name,
         pr.post_like,
         pr.comments,
         pr.post_save
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN post_response pr ON pr.post_id = p.id
       WHERE p.id = ? AND p.is_delete = 0`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Impact shared successfully',
      data: formatPost(rows[0]) || { id: result.insertId },
    });
  } catch (err) {
    console.error('[createPost]', err);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET ALL POSTS
 * GET /api/home/posts
 */
exports.getPosts = async (req, res) => {
  try {
    const {
      country,
      state,
      nearby,
      context_type,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * lim;

    const where = ['p.is_delete = 0'];
    const params = [];

    if (country && country !== 'All') {
      where.push('p.country = ?');
      params.push(country);
    }
    if (state && state !== 'All') {
      where.push('p.state = ?');
      params.push(state);
    }
    if (context_type) {
      where.push('p.context_type = ?');
      params.push(context_type);
    }
    if (nearby === '1' || nearby === 'true') {
      where.push('p.is_nearby = 1');
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const orderBy =
      nearby === '1' || nearby === 'true'
        ? 'ORDER BY p.is_nearby DESC, p.created_at DESC'
        : 'ORDER BY p.created_at DESC';

    const sql = `
      SELECT
        p.*,
        u.username AS author_name,
        pr.post_like,
        pr.comments,
        pr.post_save
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN post_response pr ON pr.post_id = p.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    params.push(lim, offset);

    const [rows] = await db.query(sql, params);
    const data = rows.map((row) => formatPost(row));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[getPosts]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET SINGLE POST
 * GET /api/home/posts/:id
 */
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT
         p.*,
         u.username AS author_name,
         pr.post_like,
         pr.comments,
         pr.post_save
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN post_response pr ON pr.post_id = p.id
       WHERE p.id = ? AND p.is_delete = 0`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatPost(rows[0]),
    });
  } catch (err) {
    console.error('[getPostById]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * SOFT DELETE
 * DELETE /api/home/posts/:id
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const [result] = await db.query(
      `UPDATE posts
       SET is_delete = 1
       WHERE id = ? AND user_id = ? AND is_delete = 0`,
      [id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you are not the owner',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Post deleted',
    });
  } catch (err) {
    console.error('[deletePost]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * LIKE (toggle)
 * POST /api/home/posts/:id/like
 * body: { user_id }
 * Stores user_id inside post_like JSON array. Toggle if already liked.
 */
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // ensure post exists
    const [posts] = await db.query(
      `SELECT id FROM posts WHERE id = ? AND is_delete = 0`,
      [id]
    );
    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await ensureResponseRow(id);

    const [rows] = await db.query(
      `SELECT post_like FROM post_response WHERE post_id = ?`,
      [id]
    );

    let likes = parseJsonArray(rows[0]?.post_like);
    const uid = Number(user_id);
    const already = likes.some((x) => Number(x) === uid);

    if (already) {
      likes = likes.filter((x) => Number(x) !== uid);
    } else {
      likes.push(uid);
    }

    await db.query(
      `UPDATE post_response SET post_like = ? WHERE post_id = ?`,
      [JSON.stringify(likes), id]
    );

    // keep posts.appreciations in sync if column still used
    try {
      await db.query(
        `UPDATE posts SET appreciations = ? WHERE id = ?`,
        [likes.length, id]
      );
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: already ? 'Unliked' : 'Liked',
      liked: !already,
      count: likes.length,
      post_like: likes,
    });
  } catch (err) {
    console.error('[likePost]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * SAVE (toggle)
 * POST /api/home/posts/:id/save
 * body: { user_id }
 * Stores user_id inside post_save JSON array. Toggle if already saved.
 */
exports.savePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // ensure post exists
    const [posts] = await db.query(
      `SELECT id FROM posts WHERE id = ? AND is_delete = 0`,
      [id]
    );
    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await ensureResponseRow(id);

    const [rows] = await db.query(
      `SELECT post_save FROM post_response WHERE post_id = ?`,
      [id]
    );

    let saves = parseJsonArray(rows[0]?.post_save);
    const uid = Number(user_id);
    const already = saves.some((x) => Number(x) === uid);

    if (already) {
      saves = saves.filter((x) => Number(x) !== uid);
    } else {
      saves.push(uid);
    }

    await db.query(
      `UPDATE post_response SET post_save = ? WHERE post_id = ?`,
      [JSON.stringify(saves), id]
    );

    return res.status(200).json({
      success: true,
      message: already ? 'Unsaved' : 'Saved',
      saved: !already,
      count: saves.length,
      post_save: saves,
    });
  } catch (err) {
    console.error('[savePost]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * Legacy alias – keep old /appreciate route working
 */
exports.appreciatePost = exports.likePost;

/**
 * GET COMMENTS
 * GET /api/home/posts/:id/comments
 * Returns comments oldest → newest
 */
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT comments FROM post_response WHERE post_id = ?`,
      [id]
    );

    let comments = parseJsonArray(rows[0]?.comments);

    // oldest first
    comments = comments.sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
    );

    return res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (err) {
    console.error('[getComments]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * ADD COMMENT
 * POST /api/home/posts/:id/comments
 * body: { user_id, content }  // content = HTML string
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content, author_name } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const html = (content || '').trim();
    const plain = html.replace(/<(.|\n)*?>/g, '').trim();
    if (!plain) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
      });
    }

    const [posts] = await db.query(
      `SELECT id FROM posts WHERE id = ? AND is_delete = 0`,
      [id]
    );
    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await ensureResponseRow(id);

    // resolve author name if not sent
    let name = author_name || null;
    if (!name) {
      const [u] = await db.query(
        `SELECT username FROM users WHERE id = ? LIMIT 1`,
        [user_id]
      );
      name = u[0]?.username || `User ${user_id}`;
    }

    const [rows] = await db.query(
      `SELECT comments FROM post_response WHERE post_id = ?`,
      [id]
    );

    let comments = parseJsonArray(rows[0]?.comments);

    const newComment = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      user_id: Number(user_id),
      author_name: name,
      content_html: html,
      created_at: new Date().toISOString(),
    };

    comments.push(newComment);

    await db.query(
      `UPDATE post_response SET comments = ? WHERE post_id = ?`,
      [JSON.stringify(comments), id]
    );

    // sync posts.comments_count if column exists
    try {
      await db.query(
        `UPDATE posts SET comments_count = ? WHERE id = ?`,
        [comments.length, id]
      );
    } catch (_) {}

    // return oldest → newest
    const sorted = comments.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return res.status(201).json({
      success: true,
      message: 'Comment added',
      count: sorted.length,
      data: sorted,
      comment: newComment,
    });
  } catch (err) {
    console.error('[addComment]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};



exports.getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.context_type,
        p.tags,
        p.media_path,
        p.media_type,
        p.media_original_name,
        p.country,
        p.state,
        p.is_nearby,
        p.appreciations,
        p.comments_count,
        p.collaborations,
        p.created_at,
        p.updated_at,
        u.username AS author_name,
        u.city AS author_city,
        u.state AS author_state,
        u.role AS author_role
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND (p.is_delete = 0 OR p.is_delete IS NULL)
      ORDER BY p.created_at DESC
      `,
      [userId]
    );

    const posts = rows.map((row) => {
      let tags = [];
      try {
        tags = row.tags
          ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags)
          : [];
      } catch {
        tags = [];
      }
      return { ...row, tags };
    });

    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error('❌ getPostsByUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching user posts',
      error: error.message,
    });
  }
};