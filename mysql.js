export async function mysqlConnection() {
  const mysql = await import('mysql2');
  const connection = mysql.createConnection({
    host: '192.168.202.36',
    user: 'remote_user',
    password: '12345678',
  });
    connection.connect((err) => {
        if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
        }
        console.log('Connected to MySQL database');
    });
}