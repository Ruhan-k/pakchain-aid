/**
 * Generic API Client for PakChain Aid
 * 
 * This client replaces Supabase and provides a clean interface
 * to communicate with your backend API (Azure App Service + Oracle).
 * 
 * All methods return the same structure as Supabase for compatibility
 * with existing components.
 */

// Get API URL from environment variable or use default
// For production, this should be set in Azure Static Web Apps configuration
const getApiBaseUrl = (): string => {
  // Check if VITE_API_URL is set (build-time variable)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in production (deployed on Azure)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Default to Azure backend URL if not set
    return 'https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net';
  }
  
  // Development fallback
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

// Types (matching Supabase structure for compatibility)
export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown>;
};

export type Session = {
  user: SessionUser;
  access_token?: string;
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal_amount: string;
  current_amount: string;
  image_url: string | null;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  is_featured: boolean;
  receiving_wallet_address: string | null;
  platform_fee_address: string | null;
  platform_fee_amount: string | null;
};

export type Donation = {
  id: string;
  campaign_id: string;
  donor_wallet: string;
  amount: string;
  transaction_hash: string;
  block_number: number | null;
  timestamp_on_chain: number | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
};

export type User = {
  id: string;
  wallet_address: string | null;
  display_name: string | null;
  total_donated: string;
  donation_count: number;
  first_donation_at: string | null;
  created_at: string;
  updated_at: string;
  is_blocked?: boolean;
  auth_user_id?: string | null;
  email?: string | null;
};

export type Analytics = {
  id: string;
  period: 'hourly' | 'daily' | 'weekly';
  total_eth: string;
  total_donations: number;
  unique_donors: number;
  top_campaign_id: string | null;
  timestamp_start: string;
  timestamp_end: string;
};

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  try {
    const session = localStorage.getItem('pakchain_session');
    if (!session) return null;
    const parsed = JSON.parse(session) as Session;
    return parsed.access_token || null;
  } catch {
    return null;
  }
}

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          code: errorData.code || String(response.status),
        },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('API request error:', error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

// Auth state change listeners
const authListeners = new Set<(event: string, session: Session | null) => void>();

function notifyAuth(event: string, session: Session | null) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  }
}

// Save session to localStorage
function saveSession(session: Session | null) {
  try {
    if (!session) {
      localStorage.removeItem('pakchain_session');
    } else {
      localStorage.setItem('pakchain_session', JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

// Load session from localStorage
function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem('pakchain_session');
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

// Supabase-compatible API interface
export const supabase = {
  auth: {
    async getSession() {
      const session = loadSession();
      return {
        data: { session },
        error: null,
      };
    },

    async signInWithPassword(params: { email: string; password: string }) {
      const result = await apiRequest<{ user: SessionUser; token: string }>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (result.error) {
        return {
          data: { session: null, user: null },
          error: result.error,
        };
      }

      const session: Session = {
        user: result.data!.user,
        access_token: result.data!.token,
      };

      saveSession(session);
      notifyAuth('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    },

    async signInWithOtp(params: { email: string; options?: Record<string, unknown> }) {
      const result = await apiRequest<{ message: string }>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: params.email, ...params.options }),
      });

      if (result.error) {
        return { data: {}, error: result.error };
      }

      return { data: {}, error: null };
    },

    async verifyOtp(params: { email: string; token: string; type: string }) {
      const result = await apiRequest<{ user: SessionUser; token: string }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (result.error) {
        return {
          data: { session: null, user: null },
          error: result.error,
        };
      }

      const session: Session = {
        user: result.data!.user,
        access_token: result.data!.token,
      };

      saveSession(session);
      notifyAuth('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    },

    async setSession(session: Session) {
      saveSession(session);
      notifyAuth('TOKEN_REFRESHED', session);
      return { data: { session }, error: null };
    },

    async updateUser(attrs: { password?: string; data?: Record<string, unknown> }) {
      const result = await apiRequest<{ user: SessionUser }>('/api/auth/update-user', {
        method: 'POST',
        body: JSON.stringify(attrs),
      });

      if (result.error) {
        return { data: { user: null }, error: result.error };
      }

      const current = loadSession();
      if (current && result.data) {
        const updated: Session = {
          ...current,
          user: result.data.user,
        };
        saveSession(updated);
        notifyAuth('USER_UPDATED', updated);
        return { data: { user: updated.user }, error: null };
      }

      return { data: { user: null }, error: { message: 'No active session' } };
    },

    async signOut() {
      const current = loadSession();
      await apiRequest('/api/auth/signout', {
        method: 'POST',
      });
      saveSession(null);
      notifyAuth('SIGNED_OUT', current);
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.add(callback);
      // Immediately emit current state
      callback('INITIAL_SESSION', loadSession());
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
        error: null,
      };
    },
  },

  // Database operations - converted to REST API calls
  from(table: string) {
    const baseEndpoint = `/api/${table}`;

    return {
      select(columns?: string) {
        const queryParams = columns ? `?select=${columns}` : '';
        let currentQuery = baseEndpoint + queryParams;

        const builder = {
          eq(column: string, value: unknown) {
            const separator = currentQuery.includes('?') ? '&' : '?';
            currentQuery += `${separator}${column}=${encodeURIComponent(String(value))}`;
            return this;
          },

          order(column: string, options?: { ascending?: boolean }) {
            const separator = currentQuery.includes('?') ? '&' : '?';
            const direction = options?.ascending === false ? 'desc' : 'asc';
            currentQuery += `${separator}order=${column}.${direction}`;
            return this;
          },

          limit(count: number) {
            const separator = currentQuery.includes('?') ? '&' : '?';
            currentQuery += `${separator}limit=${count}`;
            return this;
          },

          async maybeSingle() {
            const result = await apiRequest<any>(currentQuery);
            if (result.data && Array.isArray(result.data) && result.data.length > 0) {
              return { data: result.data[0], error: null };
            }
            return { data: null, error: null };
          },

          async single() {
            const result = await apiRequest<any>(currentQuery);
            if (result.error) {
              return { data: null, error: result.error };
            }
            if (Array.isArray(result.data) && result.data.length === 1) {
              return { data: result.data[0], error: null };
            }
            return { data: null, error: { message: 'Expected single result' } };
          },

          async then<T>(resolve: (value: { data: T[]; error: null }) => void) {
            const result = await apiRequest<T[]>(currentQuery);
            if (result.error) {
              // Return empty array on error to prevent crashes
              resolve({ data: [], error: null });
              return;
            }
            resolve({ data: Array.isArray(result.data) ? result.data : [], error: null });
          },
        };

        return builder;
      },

      insert(values: unknown) {
        return {
          select() {
            return apiRequest<any[]>(baseEndpoint, {
              method: 'POST',
              body: JSON.stringify(values),
            }).then((result) => {
              if (result.error) {
                return { data: [], error: result.error };
              }
              // Handle both array and single object responses
              if (Array.isArray(result.data)) {
                return { data: result.data, error: null };
              }
              // If single object, wrap in array
              return { data: result.data ? [result.data] : [], error: null };
            });
          },

          async then<T>(resolve: (value: { data: T | null; error: unknown }) => void) {
            const result = await apiRequest<T>(baseEndpoint, {
              method: 'POST',
              body: JSON.stringify(values),
            });
            resolve(result);
          },
        };
      },

      update(values: Partial<unknown>) {
        let currentQuery = baseEndpoint;

        const builder = {
          eq(column: string, value: unknown) {
            const separator = currentQuery.includes('?') ? '&' : '?';
            currentQuery += `${separator}${column}=${encodeURIComponent(String(value))}`;
            return this;
          },

          async then<T>(resolve: (value: { data: T | null; error: unknown }) => void) {
            const result = await apiRequest<T>(currentQuery, {
              method: 'PATCH',
              body: JSON.stringify(values),
            });
            resolve(result);
          },
        };

        return builder;
      },

      delete() {
        let currentQuery = baseEndpoint;

        const builder = {
          eq(column: string, value: unknown) {
            const separator = currentQuery.includes('?') ? '&' : '?';
            currentQuery += `${separator}${column}=${encodeURIComponent(String(value))}`;
            return this;
          },

          async then<T>(resolve: (value: { data: T | null; error: unknown }) => void) {
            const result = await apiRequest<T>(currentQuery, {
              method: 'DELETE',
            });
            resolve(result);
          },
        };

        return builder;
      },

      upsert(values: unknown, options?: { onConflict?: string }) {
        return {
          async then<T>(resolve: (value: { data: T | null; error: unknown }) => void) {
            const result = await apiRequest<T>(baseEndpoint + '/upsert', {
              method: 'POST',
              body: JSON.stringify({ data: values, onConflict: options?.onConflict }),
            });
            resolve(result);
          },
        };
      },
    };
  },

  // Realtime channel stub (can be implemented later with WebSockets)
  channel(name: string) {
    console.warn(`[API] Realtime channel "${name}" - WebSocket support not yet implemented`);
    const api = {
      on() {
        return api;
      },
      subscribe() {
        return {
          unsubscribe() {
            // no-op
          },
        };
      },
    };
    return api;
  },
};

