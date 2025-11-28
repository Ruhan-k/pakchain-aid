import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Lock, Mail, X, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';

interface UserAuthProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'signin' | 'signup' | 'verify-otp' | 'set-password';

export function UserAuth({ onClose, onSuccess }: UserAuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const { message } = error as { message?: unknown };
      return typeof message === 'string' ? message : '';
    }
    return '';
  };

  // Countdown timer for resend email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Check if email already exists
    try {
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        console.error('Error checking email:', checkError);
      }

      if (existingUsers) {
        setError('This email is already registered. Please sign in instead.');
        return;
      }

      // Supabase will handle duplicate email check during signup
      // If email exists, it will return an error which we'll catch
    } catch {
      // If admin API is not available, let Supabase handle the duplicate check during signup
    }

    setError(null);
    setLoading(true);

    try {
      // Send OTP code via email for signup
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
          shouldCreateUser: true, // This allows new users to sign up
        },
      });

      if (otpError) {
        console.error('OTP send error:', otpError);
        throw otpError;
      }

      setOtpSent(true);
      setMode('verify-otp');
      setResendCooldown(60); // Start 60 second cooldown
      setError(null);
    } catch (err: unknown) {
      console.error('Sign up error details:', err);
      let errorMessage = 'Failed to send verification code. ';

      const message = getErrorMessage(err);
      if (message.includes('already registered') || message.includes('User already registered') || message.includes('already exists')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (message.includes('email')) {
        errorMessage += 'Please check your email address and try again.';
      } else {
        errorMessage += message || 'Please check your Supabase email settings.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Verify OTP code
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);
        throw verifyError;
      }

      if (data.session && data.user) {
        console.log('OTP verified successfully. Session established for:', data.user.email);
        console.log('Session token:', data.session.access_token ? 'Present' : 'Missing');
        
        // Ensure session is stored
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) {
          console.error('Error storing session:', sessionError);
          throw new Error('Failed to establish session. Please try again.');
        }
        
        // OTP verified successfully - now show password setup screen
        setMode('set-password');
        setError(null);
      } else {
        throw new Error('Verification succeeded but no session was created');
      }
    } catch (err: unknown) {
      console.error('OTP verification error details:', err);
      let errorMessage = 'Invalid verification code. ';

      const message = getErrorMessage(err);
      if (message.includes('expired')) {
        errorMessage += 'The code has expired. Please request a new one.';
      } else if (message.includes('invalid')) {
        errorMessage += 'Please check the code and try again.';
      } else {
        errorMessage += message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // First, verify we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Session expired. Please verify your email again.');
      }

      if (!session) {
        console.error('No active session found');
        throw new Error('Session expired. Please verify your email again.');
      }

      console.log('Setting password for user:', session.user.email);

      // Set password for the authenticated user with timeout
      const updatePromise = supabase.auth.updateUser({
        password: password,
        data: {
            display_name: displayName || email.split('@')[0],
        },
      });

      // Add timeout (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. Please check your internet connection and try again.')), 30000);
      });

      type UpdateUserResult = Awaited<ReturnType<typeof supabase.auth.updateUser>>;
      const updateResult = await Promise.race<UpdateUserResult | never>([
        updatePromise,
        timeoutPromise,
      ]);

      if (!updateResult || typeof updateResult !== 'object') {
        throw new Error('Unexpected response while setting password.');
      }

      if (updateResult.error) {
        console.error('Password update error:', updateResult.error);
        
        // Provide more specific error messages
        const updateMessage = getErrorMessage(updateResult.error);
        if (updateMessage.includes('session')) {
          throw new Error('Session expired. Please verify your email again.');
        } else if (updateMessage.includes('password')) {
          throw new Error('Password update failed. Please try again.');
        } else {
          throw updateResult.error;
        }
      }

      console.log('Password set successfully');
      
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the session is still valid
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (!newSession) {
        throw new Error('Password was set but session was lost. Please sign in again.');
      }

      // User record will be created by auth state change handler in App.tsx
        onSuccess();
    } catch (err: unknown) {
      console.error('Password set error details:', err);
      const errorMessage = getErrorMessage(err) || 'Failed to set password. Please try again.';
      setError(errorMessage);
      
      // If session expired, offer to go back to OTP verification
      if (errorMessage.includes('Session expired') || errorMessage.includes('session')) {
        setTimeout(() => {
          setMode('verify-otp');
          setOtpCode('');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown} seconds before requesting another code.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
          shouldCreateUser: true,
        },
      });

      if (resendError) {
        console.error('Resend error:', resendError);
        throw resendError;
      }

      setResendCooldown(60); // Start 60 second cooldown
      setError(null);
      setOtpCode(''); // Clear OTP input
    } catch (err: unknown) {
      console.error('Resend error details:', err);
      let errorMessage = 'Failed to resend verification code. ';

      const message = getErrorMessage(err);
      if (message.includes('rate limit')) {
        errorMessage += 'Too many requests. Please wait a moment.';
      } else {
        errorMessage += message || 'Please check your email and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Try password sign-in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If password sign-in fails, offer OTP option
        throw signInError;
      }

      onSuccess();
    } catch (err: unknown) {
      // If password sign-in fails, offer to use OTP instead
      const message = getErrorMessage(err);
      if (message.includes('Invalid login credentials') || message.includes('Email not confirmed')) {
        setError('Password incorrect or account not verified. Would you like to sign in with a verification code instead?');
      } else {
        setError(message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithOTP = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown} seconds before requesting another email.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (linkError) {
        console.error('Email link error:', linkError);
        throw linkError;
      }

      setOtpSent(true);
      setMode('verify-otp');
      setPassword(''); // Clear password field
      setResendCooldown(60); // Start 60 second cooldown
      setError(null);
    } catch (err: unknown) {
      console.error('Email link error details:', err);
      setError(getErrorMessage(err) || 'Failed to send login link. Please check your email settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ zIndex: 200 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative z-10 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
          aria-label="Close"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-600 hover:text-gray-900" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {mode === 'verify-otp' ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : mode === 'set-password' ? (
              <Lock className="w-8 h-8 text-white" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'verify-otp' 
              ? 'Enter Verification Code' 
              : mode === 'set-password'
              ? 'Create Password'
              : mode === 'signin' 
              ? 'Sign In' 
              : 'Sign Up'}
          </h2>
          <p className="text-gray-600">
            {mode === 'verify-otp'
              ? 'We sent you a 6-digit code'
              : mode === 'set-password'
              ? 'Set a password for your account'
              : mode === 'signin'
              ? 'Welcome back to PakChain Aid'
              : 'Enter your email to get started'}
          </p>
        </div>

        {mode === 'verify-otp' ? (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Verification code sent!
                  </p>
              <p className="text-sm text-blue-800">
                    We've sent a 6-digit verification code to <strong>{email}</strong>. Please check your inbox and enter the code below.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    ⚠️ <strong>Security Warning:</strong> Never share this code with anyone. If you didn't request this code, please ignore this email.
              </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                  }}
                  required
                  maxLength={6}
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading || resendCooldown > 0}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive the code? Resend"}
              </button>

              <div>
              <button
                type="button"
                onClick={() => {
                    setMode('signup');
                    setOtpSent(false);
                  setOtpCode('');
                  setError(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                  Back to Sign Up
              </button>
              </div>
            </div>
          </form>
        ) : mode === 'set-password' ? (
          <form onSubmit={handleSetPassword} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Email verified! Now create a password for your account.
              </p>
            </div>

            <div>
              <label htmlFor="password-signup" className="block text-sm font-semibold text-gray-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password-signup"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirmPassword || !password || password.length < 6}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting Password...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={mode === 'signin' ? handleSignIn : (e) => { e.preventDefault(); }} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    {error.includes('Password incorrect') && mode === 'signin' && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleSignInWithOTP}
                          disabled={loading || !email}
                          className="text-sm text-blue-600 hover:text-blue-700 underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sign in with verification code instead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Your name"
                    disabled={loading || otpSent}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                  disabled={loading || otpSent}
                />
              </div>
            </div>

            {mode === 'signin' && (
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' ? (
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={loading || !email || otpSent}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading 
                  ? 'Sending...' 
                  : otpSent
                  ? 'Code Sent ✓'
                  : 'Send Verification Code'}
              </button>
            ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? 'Processing...' 
                  : 'Sign In'}
            </button>
            )}

            {mode === 'signin' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSignInWithOTP}
                  disabled={loading || !email}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sign in with verification code instead
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>

      </div>
    </div>
  );
}

