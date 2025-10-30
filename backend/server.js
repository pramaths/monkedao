import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './src/routes/index.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('Missing MONGODB_URI env var');
  process.exit(1);
}

mongoose.set('strictQuery', true);
mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((e) => {
    console.error('❌ MongoDB connection error:', e);
    process.exit(1);
  });

app.use('/api', routes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Backend listening on port ${port}`));


