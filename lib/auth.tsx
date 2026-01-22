/**
 * Authentication Context Provider
 *
 * SECURITY: Implements input validation and rate limiting for all auth operations.
 * - Email validation (RFC 5322 format)
 * - Password complexity requirements
 * - Username sanitization
 * - Rate limiting to prevent brute force attacks
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  sanitizeString,
} from './validation';
import {
  rateLimiter,
  getRateLimitKey,
  isRateLimitError,
} from './rateLimiter';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign up a new user
   * SECURITY: Validates all inputs and applies rate limiting
   */
  const signUp = async (email: string, password: string, username: string) => {
    // SECURITY: Validate all inputs before sending to server
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { error: new Error(emailValidation.errors[0]) };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { error: new Error(passwordValidation.errors[0]) };
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return { error: new Error(usernameValidation.errors[0]) };
    }

    // SECURITY: Rate limit signup attempts by IP (approximated by email domain)
    const rateLimitKey = getRateLimitKey('auth:signUp', emailValidation.sanitizedValue);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'auth:signUp');

    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many signup attempts. Please try again later.') };
    }

    // Use sanitized values
    const sanitizedEmail = emailValidation.sanitizedValue!;
    const sanitizedUsername = usernameValidation.sanitizedValue!;

    const { error: signUpError } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: passwordValidation.sanitizedValue,
    });

    if (signUpError) {
      return { error: signUpError };
    }

    // Update the profile with username after signup
    // The trigger will create the profile, we just need to update the username
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: sanitizedUsername })
        .eq('id', newUser.id);

      if (profileError) {
        return { error: profileError };
      }
    }

    // Clear rate limit on successful signup
    rateLimiter.clear(rateLimitKey);

    return { error: null };
  };

  /**
   * Sign in an existing user
   * SECURITY: Validates inputs and applies strict rate limiting to prevent brute force
   */
  const signIn = async (email: string, password: string) => {
    // SECURITY: Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { error: new Error(emailValidation.errors[0]) };
    }

    // SECURITY: Basic password check (don't reveal complexity requirements on login)
    if (!password || typeof password !== 'string') {
      return { error: new Error('Password is required') };
    }

    // SECURITY: Rate limit login attempts to prevent brute force attacks
    // Rate limit by email to prevent account enumeration attacks
    const rateLimitKey = getRateLimitKey('auth:signIn', emailValidation.sanitizedValue);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'auth:signIn');

    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many login attempts. Please try again later.') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailValidation.sanitizedValue!,
      password,
    });

    // Clear rate limit on successful login
    if (!error) {
      rateLimiter.clear(rateLimitKey);
    }

    return { error };
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    // Clear all rate limits on logout
    rateLimiter.clearAll();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
