import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const response = await axios.put(
      process.env.XIRSYS_URL!,
      {},
      {
        headers: {
          Authorization:
            'Basic ' + Buffer.from(process.env.XIRSYS_USERNAME + ':' + process.env.XIRSYS_PASSWORD).toString('base64'),
        },
      }
    );
    res.json(response.data.v);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ICE config' });
  }
});


module.exports = router;
