// Get API URL from environment variable or use default
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://pakchain-aid-api-b9g0dycsaafegfft.centralus-01.azurewebsites.net';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

export interface Admin {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  last_login: string | null;
}

// Password hashing using SHA-256 (matches backend)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function adminLogin(username: string, password: string): Promise<Admin | null> {
  try {
    // Hash the password
    const passwordHash = await hashPassword(password);

    // Fetch admin from Azure API
    const response = await fetch(`${API_BASE_URL}/api/admins?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 500) {
        console.error('❌ Error fetching admin from server');
        console.error('💡 Make sure the admins table exists in Azure SQL Database');
        console.error('💡 Run: backend/sql/create_admins_table.sql');
        return null;
      }
      console.error('❌ Failed to fetch admin:', response.statusText);
      return null;
    }

    const result = await response.json();
    const admins = result.data || [];

    if (admins.length === 0) {
      console.error('❌ Admin not found');
      console.error('💡 Username searched:', username);
      console.error('');
      console.error('🔧 TO FIX:');
      console.error('1. Run backend/sql/create_default_admin.sql in Azure SQL Database');
      console.error('2. Make sure the admin user exists');
      return null;
    }

    const admin = admins[0];

    if (admin.is_active === false) {
      console.error('❌ Admin account is inactive');
      console.error('💡 Run: UPDATE admins SET is_active = 1 WHERE username = \'' + username + '\';');
      return null;
    }

    // Verify password
    const dbHash = (admin.password_hash || '').toLowerCase().trim();
    const genHash = passwordHash.toLowerCase().trim();
    const isValid = genHash === dbHash;
    
    if (!isValid) {
      console.error('❌ Invalid password!');
      console.error('💡 Make sure you entered the correct password');
      console.error('💡 Default password is: admin123');
      return null;
    }

    // Update last login
    try {
      await fetch(`${API_BASE_URL}/api/admins?id=${admin.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last_login: new Date().toISOString(),
        }),
      });
    } catch (updateError) {
      // Non-critical error, continue anyway
      console.warn('Could not update last login:', updateError);
    }

    // Return admin without password hash
    const { password_hash: _passwordHash, ...adminWithoutPassword } = admin;
    void _passwordHash;
    return adminWithoutPassword as Admin;
  } catch (error) {
    console.error('Admin login error:', error);
    return null;
  }
}

export async function getAdminById(adminId: string): Promise<Admin | null> {
  try {
    // For now, we'll get admin by fetching from session
    // In the future, we can add a GET /api/admins/:id endpoint
    const session = getAdminSession();
    if (session && session.id === adminId) {
      return session;
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
}

export function setAdminSession(admin: Admin) {
  localStorage.setItem('admin_session', JSON.stringify(admin));
}

export function getAdminSession(): Admin | null {
  try {
    const session = localStorage.getItem('admin_session');
    if (!session) return null;
    return JSON.parse(session) as Admin;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  localStorage.removeItem('admin_session');
}

