import { useState } from 'react';
import { Wallet, Menu, X, Settings, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

interface NavigationProps {
  walletAddress: string | null;
  onConnectWallet: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onAdminLogin?: () => void;
  onUserAuth?: () => void;
  user?: SupabaseAuthUser | null;
}

export function Navigation({
  walletAddress,
  onConnectWallet,
  onNavigate,
  currentPage,
  onAdminLogin,
  onUserAuth,
  user,
}: NavigationProps) {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        alert('Failed to sign out. Please try again.');
        return;
      }
      // Reload page to clear all state
    window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
      alert('Failed to sign out. Please try again.');
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'about', label: 'About Us' },
  ];

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm" style={{ zIndex: 50 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">₽</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              PakChain Aid
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {onAdminLogin && (
              <button
                onClick={onAdminLogin}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Admin Login"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Admin</span>
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">
                  {user.email?.split('@')[0] || 'User'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : onUserAuth ? (
              <button
                onClick={onUserAuth}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Sign in / Sign up"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Sign In</span>
              </button>
            ) : null}
            {walletAddress ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-teal-50 rounded-full border border-blue-100">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900">
                  {truncateAddress(walletAddress)}
                </span>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={!user}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
                  user
                    ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!user ? 'Please sign in first to connect your wallet' : 'Connect Wallet'}
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <div className="flex flex-col gap-3 pt-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {onAdminLogin && (
                <button
                  onClick={() => {
                    onAdminLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="mx-4 flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin Login</span>
                </button>
              )}
              {user ? (
                <div className="mx-4 flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : onUserAuth ? (
                <button
                  onClick={() => {
                    onUserAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="mx-4 flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign In</span>
                </button>
              ) : null}
              {walletAddress ? (
                <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-100 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {truncateAddress(walletAddress)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onConnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  disabled={!user}
                  className={`mx-4 flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
                    user
                      ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!user ? 'Please sign in first to connect your wallet' : 'Connect Wallet'}
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
