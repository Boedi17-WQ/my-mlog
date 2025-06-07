import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/user.route.js';
import authRoutes from './routes/auth.route.js';
import postRoutes from './routes/post.route.js';
import commentRoutes from './routes/comment.route.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Setup __dirname untuk ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env dari folder root proyek
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Koneksi ke MongoDB
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log('MongoDB is connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/post', postRoutes);
app.use('/api/comment', commentRoutes);

// Static Files (Vite / React / Client)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve index.html untuk route lainnya (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'dist', 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
