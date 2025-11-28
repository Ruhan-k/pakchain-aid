import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER!,
  database: process.env.AZURE_SQL_DATABASE!,
  user: process.env.AZURE_SQL_USER!,
  password: process.env.AZURE_SQL_PASSWORD!,
  options: {
    encrypt: process.env.AZURE_SQL_ENCRYPT === 'true',
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Connected to Azure SQL Database');
    } catch (error) {
      console.error('❌ Database connection error:', error);
      throw error;
    }
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query('SELECT 1 as test');
    return result.recordset.length > 0;
  } catch (error) {
    console.error('Database test failed:', error);
    return false;
  }
}

