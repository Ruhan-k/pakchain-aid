/**
 * IMPORTANT: This file is now a re-export of the generic API client.
 * 
 * All Supabase-specific code has been moved to src/lib/api.ts
 * which provides a Supabase-compatible interface that calls
 * your backend REST API (Azure App Service + Oracle).
 * 
 * This file exists for backward compatibility - all imports
 * from './lib/supabase' will continue to work.
 */

export * from './api';
