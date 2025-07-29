import express from 'express';
import path from 'path';
import cors from 'cors';
import { getStockData } from './services/stock1.js';
import { getAllAssets} from "./services/mockDB.js";
import { mysqlConnection } from './mysql.js'; // Import the
mysqlConnection();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());


// Access static files in public directory (HTML, CSS, JS files etc.)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const price = await getStockData(req.params.symbol);
    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});
app.get('/api/allAsset', async (req, res) => {
  try {
    const asset = await getAllAssets();
    res.json({asset})
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset data' });
  }
});
// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});



