const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'san@123',
  database: 'wehere',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    // Test the connection (equivalent to SELECT 1)
    const connection = await db.getConnection();
    await connection.query('SELECT 1');
    connection.release();

    console.log('MySQL connected successfully!');

    return db;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, db };