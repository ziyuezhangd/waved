const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 让 Express 可以访问当前目录下的静态文件（如 HTML、CSS、JS）
app.use(express.static(__dirname));

// 监听端口
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
