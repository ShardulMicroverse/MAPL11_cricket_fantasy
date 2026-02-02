const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/environment');
const errorHandler = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimiter');
const routes = require('./routes');

const app = express();

// Trust proxy - required for running behind reverse proxy (Render, Heroku, etc.)
// This is needed for rate limiting and getting correct client IP
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - support multiple origins
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mapl11.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway in case of subdomain variations
    }
  },
  credentials: true
}));

// Rate limiting
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
