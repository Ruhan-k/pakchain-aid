# PakChain Aid Backend API

Backend REST API for PakChain Aid, built with Express.js and Azure SQL Database.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your Azure SQL Database credentials:**
   ```env
   PORT=3000
   AZURE_SQL_SERVER=your-server.database.windows.net
   AZURE_SQL_DATABASE=your-database
   AZURE_SQL_USER=your-username
   AZURE_SQL_PASSWORD=your-password
   AZURE_SQL_ENCRYPT=true
   JWT_SECRET=your-secret-key
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

See `API_STRUCTURE.md` for complete API documentation.

## Health Check

- `GET /health` - Server health check
- `GET /api/test-db` - Test database connection

## Deployment

Deploy to Azure App Service. Set environment variables in Azure Portal → Configuration → Application settings.

