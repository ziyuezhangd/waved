bra
export async function mysqlConnection() {
  try {
    // 动态导入mysql2
    const mysql = await import('mysql2/promise'); // 使用promise版本
    
    // 创建连接
    const connection = await mysql.createConnection({
      host: '192.168.202.36',
      user: 'remote_user', // 替换为你的远程用户名
      password: '12345678'
    });

    console.log('Connected to MySQL database');
    return connection; // 返回连接对象以便后续使用
    
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
    throw err; // 抛出错误以便调用者处理
  }
}