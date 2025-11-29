import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbPool, testConnection } from './db';
import { authRoutes } from './routes/auth';
import { campaignsRoutes } from './routes/campaigns';
import { donationsRoutes } from './routes/donations';
import { usersRoutes } from './routes/users';
import { adminsRoutes } from './routes/admins';
import { contactRoutes } from './routes/contact';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://gray-ground-0184ebd1e.3.azurestaticapps.net',
  'https://*.azurestaticapps.net', // Allow all Azure Static Web Apps
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('⚠️ Request with no origin - allowing');
      return callback(null, true);
    }
    
    console.log(`🌐 CORS check for origin: ${origin}`);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Handle wildcard domains
        const pattern = allowed.replace('*.', '');
        const matches = origin.includes(pattern);
        if (matches) console.log(`✅ Origin matched wildcard pattern: ${pattern}`);
        return matches;
      }
      const matches = origin === allowed;
      if (matches) console.log(`✅ Origin matched: ${allowed}`);
      return matches;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        console.log(`⚠️ Origin not in list but allowing (dev mode): ${origin}`);
        callback(null, true);
      } else {
        // In production, log the blocked origin for debugging
        console.warn(`❌ CORS blocked origin: ${origin}`);
        console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection endpoint
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const connected = await testConnection();
    res.json({ connected });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/contact', contactRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    message: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  
  // Test database connection on startup
  try {
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connection verified');
    } else {
      console.warn('⚠️  Database connection test failed');
    }
  } catch (error) {
    console.error('❌ Database connection error on startup:', error);
  }
});

export default app;

