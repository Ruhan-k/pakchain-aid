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
export { supabase } from './api';

type SessionUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown>;
};

type Session = {
  user: SessionUser;
};

type AuthStateChangeCallback = (event: string, session: Session | null) => void;

const SESSION_KEY = 'pakchain_mock_session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const authListeners = new Set<AuthStateChangeCallback>();

function notifyAuth(event: string, session: Session | null) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Auth listener error:', err);
    }
  }
}

export const supabase = {
  auth: {
    /**
     * Mimics supabase.auth.getSession()
     */
    async getSession() {
      const session = loadSession();
      return {
        data: { session },
        error: null,
      };
    },

    /**
     * Very simple email+password sign‑in stub.
     * Any non‑empty email/password is accepted.
     */
    async signInWithPassword(params: { email: string; password: string }) {
      if (!params.email || !params.password) {
        return {
          data: { session: null },
          error: { message: 'Missing credentials' },
        };
      }
      const session: Session = {
        user: {
          id: randomId(),
          email: params.email,
          user_metadata: {},
        },
      };
      saveSession(session);
      notifyAuth('SIGNED_IN', session);
      return { data: { session }, error: null };
    },

    /**
     * OTP flows are no‑ops that just "succeed" and create a session.
     * This keeps the UI flows working without real email infrastructure.
     */
    async signInWithOtp(params: { email: string; options?: Record<string, unknown> }) {
      if (!params.email) {
        return { data: {}, error: { message: 'Missing email' } };
      }
      // Pretend an email was sent successfully.
      // Real verification is handled by verifyOtp below.
      // eslint-disable-next-line no-console
      console.log('[MockSupabase] signInWithOtp called for', params.email, params.options);
      return { data: {}, error: null };
    },

    async verifyOtp(params: { email: string; token: string; type: string }) {
      if (!params.email || !params.token) {
        return { data: { session: null, user: null }, error: { message: 'Missing email or token' } };
      }
      // Accept any 6‑digit token
      if (params.token.length !== 6) {
        return { data: { session: null, user: null }, error: { message: 'Invalid token length' } };
      }
      const session: Session = {
        user: {
          id: randomId(),
          email: params.email,
          user_metadata: {},
        },
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
      const current = loadSession();
      if (!current) {
        return { data: { user: null }, error: { message: 'No active session' } };
      }
      const updated: Session = {
        user: {
          ...current.user,
          user_metadata: {
            ...(current.user.user_metadata || {}),
            ...(attrs.data || {}),
          },
        },
      };
      saveSession(updated);
      notifyAuth('USER_UPDATED', updated);
      return { data: { user: updated.user }, error: null };
    },

    async signOut() {
      const current = loadSession();
      saveSession(null);
      notifyAuth('SIGNED_OUT', current);
      return { error: null };
    },

    onAuthStateChange(callback: AuthStateChangeCallback) {
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

  /**
   * Very lightweight query builder stub.
   * All operations just return empty arrays / success objects.
   */
  from(table: string) {
    // eslint-disable-next-line no-console
    console.warn(`[MockSupabase] .from("${table}") used – returning empty data. Replace with real backend when ready.`);

    const builder = {
      select(_columns?: string) {
        return {
          eq() {
            return this;
          },
          order() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
          limit() {
            return this;
          },
          async single() {
            return { data: null, error: null };
          },
          async then(resolve: (value: unknown) => void) {
            // Allow simple `await supabase.from(...).select('*')` style
            resolve({ data: [], error: null });
          },
        };
      },
      insert(_values: unknown) {
        return {
          select() {
            return Promise.resolve({ data: [], error: null });
          },
          async then(resolve: (value: unknown) => void) {
            resolve({ data: null, error: null });
          },
        };
      },
      update(_values: unknown) {
        return {
          eq() {
            return this;
          },
          async then(resolve: (value: unknown) => void) {
            resolve({ data: null, error: null });
          },
        };
      },
      delete() {
        return {
          eq() {
            return this;
          },
          async then(resolve: (value: unknown) => void) {
            resolve({ data: null, error: null });
          },
        };
      },
    };

    return builder;
  },

  /**
   * Realtime channel stub – no‑ops used to satisfy existing code.
   */
  channel(name: string) {
    // eslint-disable-next-line no-console
    console.warn(`[MockSupabase] realtime channel "${name}" subscribed – no real updates will be received.`);
    const api = {
      on() {
        return api;
      },
      subscribe() {
        return {
          unsubscribe() {
            // no‑op
          },
        };
      },
    };
    return api;
  },
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
