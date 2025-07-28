import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Access static files in public directory (HTML, CSS, JS files etc.)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});



