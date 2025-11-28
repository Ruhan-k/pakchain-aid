import { supabase } from './supabase';
import { withRetry } from './retry';

export interface Admin {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  last_login: string | null;
}

// Simple password hashing (for production, use a proper library like bcrypt)
// This is a basic implementation - in production, use proper password hashing
async function hashPassword(password: string): Promise<string> {
  // Using Web Crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function adminLogin(username: string, password: string): Promise<Admin | null> {
  try {
    // Fetch admin by username with retry (use maybeSingle to avoid errors if table doesn't exist)
    const { data: admin, error } = await withRetry(
      async () =>
        supabase
      .from('admins')
      .select('*')
      .eq('username', username)
          .maybeSingle(),
      2,
      1000,
    );

    if (error) {
      console.error('❌ Error fetching admin:', error);
      console.error('💡 Error code:', error.code);
      console.error('💡 Error message:', error.message);
      console.error('');
      
      // Check if it's a 404 or table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.error('🚨 THE ADMINS TABLE DOES NOT EXIST!');
        console.error('');
        console.error('🔧 IMMEDIATE FIX:');
        console.error('1. Go to Supabase Dashboard → SQL Editor');
        console.error('2. Open file: CREATE_ADMIN_TABLE_AND_USER.sql');
        console.error('3. Follow the instructions in that file');
        console.error('4. It will create the table AND the admin user');
      } else {
        console.error('💡 Make sure the admins table exists. Run CREATE_ADMIN_TABLE_AND_USER.sql');
      }
      return null;
    }

    if (!admin) {
      console.error('❌ Admin not found');
      console.error('💡 Username searched:', username);
      console.error('');
      console.error('🔧 TO FIX:');
      console.error('1. Run CREATE_ADMIN_TABLE_AND_USER.sql in Supabase');
      console.error('2. Make sure to generate hash first');
      return null;
    }

    if (admin.is_active === false) {
      console.error('❌ Admin account is inactive');
      console.error('💡 Run: UPDATE admins SET is_active = true WHERE username = \'' + username + '\';');
      return null;
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    const dbHash = (admin.password_hash || '').toLowerCase().trim();
    const genHash = passwordHash.toLowerCase().trim();
    const isValid = genHash === dbHash;
    
    if (!isValid) {
      console.error('❌ Password mismatch!');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Database hash:', dbHash);
      console.error('Generated hash:', genHash);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      console.error('🔧 TO FIX:');
      console.error('1. Open browser console (F12)');
      console.error('2. Run: GENERATE_HASH_NOW.js code');
      console.error('3. Copy the generated hash');
      console.error('4. Run this SQL in Supabase:');
      console.error(`   UPDATE admins SET password_hash = 'YOUR_HASH_HERE' WHERE username = '${username}';`);
      console.error('');
      return null;
    }

    // Update last login
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

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
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, email, full_name, is_active, last_login')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data as Admin;
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

