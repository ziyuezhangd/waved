export async function mysqlConnection() {
  const mysql = await import('mysql2');
  const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'n3u3da!',
  });
    connection.connect((err) => {
        if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
        }
        console.log('Connected to MySQL database');
    });
}