import mysql from 'mysql2/promise';

// Create a connection pool instead of a single connection
// A pool is the standard way to manage connections in a web application
const pool = mysql.createPool({
  // this info set is Amos's MySQL server
  // host: '192.168.202.36',
  // user: 'remote_user',
  // password: '12345678',
  // this info set is for the local MySQL server on our VMs
  host: '127.0.0.1',
  user: 'root',
  password: 'n3u3da!',
  database: 'trading_journal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Log a message when a connection is acquired from the pool
pool.on('acquire', function (connection) {
  console.log('Connection %d acquired', connection.threadId);
});

// Log when a connection is released back to the pool
pool.on('release', function (connection) {
  console.log('Connection %d released', connection.threadId);
});

console.log('MySQL connection pool created for database: trading_journal');

// Export the pool to be used in other files
export { pool };
