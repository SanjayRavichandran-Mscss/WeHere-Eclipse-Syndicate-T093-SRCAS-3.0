const { db } = require('../config/db');




/**
 * GET /api/activities/test
 *
 * Simple test endpoint.
 */
exports.test = async (req, res) => {
  console.log(
    'Activities test route called'
  );

  return res.status(200).json({
    success: true,

    message:
      'Activities module is up and running!',
  });
};



/**
 * Safely parse JSON values coming from MySQL JSON columns.
 */
function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Remove HTML tags from post/comment content.
 */
function stripHtml(value) {
  if (!value) return '';

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GET /api/activities/:userId
 *
 * Returns:
 * - User's posts
 * - Likes
 * - Comments
 * - Recent comments
 * - Pending connection requests
 * - Accepted connection requests
 */
exports.getActivities = async (req, res) => {
  const { userId } = req.params;

  // --------------------------------------------------
  // Validate user ID
  // --------------------------------------------------
  if (!userId || Number.isNaN(Number(userId))) {
    return res.status(400).json({
      success: false,
      message: 'Valid userId is required',
    });
  }

  try {
    const uid = Number(userId);

    // ==================================================
    // 1. FETCH USER'S POSTS
    // ==================================================
    const [postRows] = await db.query(
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
        p.created_at,
        p.updated_at,

        u.username,
        u.full_name,
        u.current_location

      FROM posts p

      INNER JOIN users u
        ON u.id = p.user_id

      WHERE
        p.user_id = ?
        AND p.is_delete = 0

      ORDER BY p.created_at DESC
      `,
      [uid]
    );

    // ==================================================
    // 2. FETCH LIKE / COMMENT DATA
    // ==================================================
    const postIds = postRows.map((row) => Number(row.id));

    let responseRows = [];

    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');

      const [rows] = await db.query(
        `
        SELECT
          post_id,
          post_like,
          comments,
          post_save,
          created_at,
          updated_at

        FROM post_response

        WHERE post_id IN (${placeholders})
        `,
        postIds
      );

      responseRows = rows;
    }

    // Create lookup map:
    // post ID -> post_response row
    const responseByPost = new Map(
      responseRows.map((row) => [
        Number(row.post_id),
        row,
      ])
    );

    // ==================================================
    // 3. NORMALIZE POSTS
    // ==================================================
    const posts = postRows.map((row) => {
      const response = responseByPost.get(
        Number(row.id)
      );

      const likes = parseJson(
        response?.post_like,
        []
      );

      const comments = parseJson(
        response?.comments,
        []
      );

      const saves = parseJson(
        response?.post_save,
        []
      );

      // -------------------------------
      // Normalize comments
      // -------------------------------
      const normalizedComments =
        Array.isArray(comments)
          ? comments.map((comment) => ({
              ...comment,

              content: stripHtml(
                comment.content_html ||
                  comment.content ||
                  ''
              ),

              author_name:
                comment.author_name ||
                `User ${comment.user_id || ''}`.trim(),
            }))
          : [];

      return {
        id: row.id,
        user_id: row.user_id,

        username: row.username,
        full_name: row.full_name,

        title: row.title || '',

        content: row.content || '',

        text: stripHtml(
          row.content || row.title || ''
        ),

        context_type:
          row.context_type || 'General',

        tags: parseJson(row.tags, []),

        media_path: row.media_path,

        media_type:
          row.media_type || 'none',

        media_original_name:
          row.media_original_name,

        country: row.country,
        state: row.state,

        current_location:
          row.current_location,

        is_nearby:
          !!row.is_nearby,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,

        // Likes
        likes: Array.isArray(likes)
          ? likes
              .map(Number)
              .filter(Number.isFinite)
          : [],

        like_count:
          Array.isArray(likes)
            ? likes.length
            : 0,

        // Comments
        comments:
          normalizedComments,

        comment_count:
          normalizedComments.length,

        // Saves
        saves: Array.isArray(saves)
          ? saves
              .map(Number)
              .filter(Number.isFinite)
          : [],

        save_count:
          Array.isArray(saves)
            ? saves.length
            : 0,
      };
    });

    // ==================================================
    // 4. RECENT COMMENTS
    // ==================================================
    const recentComments = posts
      .flatMap((post) =>
        post.comments.map((comment) => ({
          ...comment,

          post_id: post.id,

          post_title:
            post.title || 'Untitled post',

          author_name:
            comment.author_name ||
            `User ${comment.user_id || ''}`.trim(),

          content: stripHtml(
            comment.content_html ||
              comment.content ||
              ''
          ),

          likes: Array.isArray(comment.likes)
            ? comment.likes.length
            : Number(comment.likes || 0),
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      )
      .slice(0, 20);

    // ==================================================
    // 5. FETCH CONNECTION REQUESTS
    // ==================================================
    //
    // networks table:
    //
    // get_in_touch = NULL
    //      -> Pending request
    //
    // get_in_touch = 1
    //      -> Accepted request
    //
    // get_in_touch = 0
    //      -> Declined request
    //
    // We intentionally return pending + accepted.
    // Declined requests are excluded.
    //
    const [requestRows] = await db.query(
      `
      SELECT
        n.id AS network_id,

        n.user_id AS requester_id,

        n.profile_id AS receiver_id,

        n.get_in_touch,

        n.created_at,

        n.updated_at,

        u.username AS requester_username,

        u.full_name AS requester_full_name,

        u.role AS requester_role,

        u.current_location AS requester_location

      FROM networks n

      INNER JOIN users u
        ON u.id = n.user_id

      WHERE
        n.profile_id = ?
        AND (
          n.get_in_touch IS NULL
          OR n.get_in_touch = 1
        )

      ORDER BY
        n.updated_at DESC,
        n.created_at DESC
      `,
      [uid]
    );

    // ==================================================
    // 6. NORMALIZE REQUEST
    // ==================================================
    const mapRequest = (row) => {
      const isAccepted =
        Number(row.get_in_touch) === 1;

      return {
        network_id:
          Number(row.network_id),

        requester_id:
          Number(row.requester_id),

        receiver_id:
          Number(row.receiver_id),

        // Prefer username, then full name
        requester_name:
          row.requester_username ||
          row.requester_full_name ||
          'Unknown User',

        requester_username:
          row.requester_username ||
          null,

        requester_full_name:
          row.requester_full_name ||
          null,

        requester_role:
          row.requester_role ||
          null,

        requester_location:
          row.requester_location ||
          null,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,

        status:
          isAccepted
            ? 'accepted'
            : 'pending',

        type:
          'connection_request',
      };
    };

    // ==================================================
    // 7. SEPARATE PENDING REQUESTS
    // ==================================================
    const requests = requestRows
      .filter(
        (row) =>
          row.get_in_touch === null ||
          row.get_in_touch === undefined
      )
      .map(mapRequest);

    // ==================================================
    // 8. SEPARATE ACCEPTED REQUESTS
    // ==================================================
    const acceptedRequests = requestRows
      .filter(
        (row) =>
          Number(row.get_in_touch) === 1
      )
      .map(mapRequest);

    // ==================================================
    // 9. FIND USERS WHO LIKED POSTS
    // ==================================================
    const allLikeIds = [
      ...new Set(
        posts.flatMap(
          (post) => post.likes
        )
      ),
    ];

    let likeUsers = new Map();

    if (allLikeIds.length > 0) {
      const placeholders =
        allLikeIds
          .map(() => '?')
          .join(',');

      const [likeUserRows] =
        await db.query(
          `
          SELECT
            id,
            username,
            full_name

          FROM users

          WHERE id IN (${placeholders})
          `,
          allLikeIds
        );

      likeUsers = new Map(
        likeUserRows.map((user) => [
          Number(user.id),
          {
            id: Number(user.id),

            name:
              user.username ||
              user.full_name ||
              `User ${user.id}`,
          },
        ])
      );
    }

    // ==================================================
    // 10. ATTACH LIKE USERS TO POSTS
    // ==================================================
    posts.forEach((post) => {
      post.like_users =
        post.likes
          .map((id) =>
            likeUsers.get(id)
          )
          .filter(Boolean);
    });

    // ==================================================
    // 11. CALCULATE TOTALS
    // ==================================================
    const totalLikes =
      posts.reduce(
        (sum, post) =>
          sum + post.like_count,
        0
      );

    const totalComments =
      posts.reduce(
        (sum, post) =>
          sum + post.comment_count,
        0
      );

    // ==================================================
    // 12. SEND RESPONSE
    // ==================================================
    return res.status(200).json({
      success: true,

      data: {
        // ---------------------------------------------
        // Statistics
        // ---------------------------------------------
        stats: {
          posts:
            posts.length,

          likes:
            totalLikes,

          comments:
            totalComments,

          // ONLY pending requests
          requests:
            requests.length,

          // Accepted requests separately
          acceptedRequests:
            acceptedRequests.length,
        },

        // ---------------------------------------------
        // Activity data
        // ---------------------------------------------
        posts,

        recentComments,

        // Pending requests
        requests,

        // Accepted requests
        acceptedRequests,
      },
    });

  } catch (error) {
    console.error(
      '[Activities] getActivities error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to fetch activities',

      error:
        error.message,
    });
  }
};



