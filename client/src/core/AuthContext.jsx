import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api.js';

const AuthContext = createContext(null);

const API_BASE = API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [entitlement, setEntitlement] = useState({ tier: 'free' });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('cogether_access_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [guestRemainingSeconds, setGuestRemainingSeconds] = useState(null);
  const [isGuestExpired, setIsGuestExpired] = useState(false);

  // Restore authenticated session on mount
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('cogether_access_token');
    const storedRefreshToken = localStorage.getItem('cogether_refresh_token');

    if (!storedToken && !storedRefreshToken) {
      setIsLoading(false);
      return;
    }

    if (storedToken) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          const isGuestUser = Boolean(data.isGuest);
          const guestExp = data.guestExpiresAt || null;

          if (isGuestUser && guestExp) {
            const remaining = Math.max(0, Math.floor((new Date(guestExp).getTime() - Date.now()) / 1000));
            if (remaining <= 0) {
              setIsGuestExpired(true);
              localStorage.removeItem('cogether_access_token');
              localStorage.removeItem('cogether_refresh_token');
              setAccessToken(null);
              setUser(null);
              setProfile(null);
              setIsLoading(false);
              return;
            }
            setGuestRemainingSeconds(remaining);
          }

          setUser({
            id: data.id,
            email: data.primaryEmail,
            status: data.status,
            mfaEnabled: Boolean(data.mfaEnabled),
            emailVerified: Boolean(data.emailVerified),
            createdAt: data.createdAt || null,
            isGuest: isGuestUser,
            guestExpiresAt: guestExp,
            displayName: data.profile?.displayName || (isGuestUser ? 'Guest' : null)
          });
          setProfile(data.profile);
          setPreferences(data.preferences);
          setEntitlement(data.entitlement || { tier: 'free' });
          setAccessToken(storedToken);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    }

    // Attempt refresh token rotation via cookie AND/OR stored refresh token body
    try {
      const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('cogether_access_token', refreshData.accessToken);
        if (refreshData.refreshToken) {
          localStorage.setItem('cogether_refresh_token', refreshData.refreshToken);
        }
        setAccessToken(refreshData.accessToken);
        setUser(refreshData.user);
        setProfile(refreshData.profile);
        setPreferences(refreshData.preferences);
        setEntitlement({ tier: 'free' });
      } else if (refreshRes.status === 401 || refreshRes.status === 400 || refreshRes.status === 404) {
        // Session invalid or expired on server
        localStorage.removeItem('cogether_access_token');
        localStorage.removeItem('cogether_refresh_token');
        setAccessToken(null);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.warn('Session refresh network error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Server-authoritative 5-minute guest countdown
  useEffect(() => {
    if (!user?.isGuest || !user?.guestExpiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const expiresAt = new Date(user.guestExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setGuestRemainingSeconds(diff);

      if (diff <= 0) {
        setIsGuestExpired(true);
        localStorage.removeItem('cogether_access_token');
        localStorage.removeItem('cogether_refresh_token');
        setAccessToken(null);
        setUser(null);
        setProfile(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Start 5-minute Guest Exploration Session
  const startGuestSession = async (displayName = 'Guest') => {
    setAuthError(null);
    setIsGuestExpired(false);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setAuthError(data.error?.message || 'Failed to start guest session');
        return { success: false, ...data };
      }

      localStorage.setItem('cogether_access_token', data.token);
      localStorage.removeItem('cogether_refresh_token');
      setAccessToken(data.token);
      setUser({
        id: data.user.id,
        displayName: data.user.displayName,
        isGuest: true,
        guestExpiresAt: data.expiresAt,
        durationSeconds: data.durationSeconds || 300
      });
      setProfile({
        username: data.user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest',
        displayName: data.user.displayName,
        avatarConfig: null
      });
      setPreferences({
        primaryInterest: 'all',
        interests: [],
        timezone: 'UTC',
        language: 'en'
      });
      setEntitlement({ tier: 'free' });
      setGuestRemainingSeconds(data.durationSeconds || 300);
      return { success: true, ...data };
    } catch (err) {
      setAuthError('Network error starting guest session');
      return { success: false, error: 'NETWORK_ERROR' };
    }
  };

  // 5-minute Guest countdown timer and expiration enforcement
  useEffect(() => {
    if (!user?.isGuest || !user?.guestExpiresAt) {
      return;
    }

    const interval = setInterval(() => {
      const expiresAt = new Date(user.guestExpiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setGuestRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsGuestExpired(true);
        localStorage.removeItem('cogether_access_token');
        localStorage.removeItem('cogether_refresh_token');
        setAccessToken(null);
        setUser(null);
        setProfile(null);
        setAuthError('Guest session expired. Please sign up or log in to continue.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.isGuest, user?.guestExpiresAt]);

  // Direct registration with Email, Password (Argon2id), Handle & Profile Setup
  const registerWithPassword = async ({
    email,
    password,
    username,
    displayName,
    firstName,
    lastName,
    avatarUrl,
    avatarConfig,
    preferences: regPreferences
  }) => {
    setAuthError(null);
    try {
      const preferencesToSave = regPreferences || preferences || {
        primaryInterest: 'all',
        interests: [],
        timezone: 'UTC',
        language: 'en'
      };

      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          username,
          displayName,
          firstName,
          lastName,
          avatarUrl,
          avatarConfig,
          preferences: preferencesToSave
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || data.error || 'Registration failed');
        return { success: false, ...data };
      }

      localStorage.setItem('cogether_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setEntitlement(data.entitlement || { tier: 'free' });
      setIsGuestExpired(false);
      setGuestRemainingSeconds(null);

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Network error during registration';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Request passwordless 6-digit OTP
  const requestOtp = async (email, purpose = 'signup') => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/email/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || data.error || 'Failed to request verification passcode');
        return { success: false, ...data };
      }

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Network error connecting to identity service';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Verify OTP and mint real session
  const verifyOtp = async (email, otp, userDetails = {}) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/email/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp, ...userDetails })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || data.error || 'Invalid verification passcode');
        return { success: false, ...data };
      }

      localStorage.setItem('cogether_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setEntitlement(data.entitlement || { tier: 'free' });

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Network error verifying passcode';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Email & Password Login
  const loginWithPassword = async (email, password) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Invalid email or password');
        return { success: false, ...data };
      }

      if (data.mfaRequired) {
        return { success: true, mfaRequired: true, mfaTicket: data.mfaTicket };
      }

      if (data.otpRequired) {
        return { success: true, otpRequired: true, email: data.email, expiresInSeconds: data.expiresInSeconds };
      }

      localStorage.setItem('cogether_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setEntitlement(data.entitlement || { tier: 'free' });

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Network error during login';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Verify MFA Login Challenge (TOTP code or recovery code)
  const verifyMfaLogin = async (mfaTicket, { code, recoveryCode }) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mfaTicket, code, recoveryCode })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'MFA verification failed');
        return { success: false, ...data };
      }

      localStorage.setItem('cogether_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setEntitlement(data.entitlement || { tier: 'free' });

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Network error verifying MFA code';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Request password reset passcode
  const requestPasswordReset = async (email) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: 'NETWORK_ERROR', message: 'Network error requesting password reset' };
    }
  };

  // Reset password with verified OTP
  const resetPassword = async (email, otp, newPassword) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Failed to reset password');
        return { success: false, ...data };
      }
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: 'NETWORK_ERROR', message: 'Network error resetting password' };
    }
  };

  // Set or update password for authenticated user
  const setPassword = async (newPassword, currentPassword = null) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/set`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword, currentPassword })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: 'SET_PASSWORD_FAILED', message: err.message };
    }
  };

  // MFA Management APIs
  const getMfaStatus = async () => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { enabled: false };
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return await res.json();
    } catch (e) {
      return { enabled: false };
    }
  };

  const enrollMfa = async () => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'ENROLL_FAILED', message: err.message };
    }
  };

  const confirmMfa = async (code) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'CONFIRM_FAILED', message: err.message };
    }
  };

  const disableMfa = async (passwordOrCode) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: passwordOrCode, code: passwordOrCode })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'DISABLE_FAILED', message: err.message };
    }
  };

  // Verify Google OAuth token
  const loginWithGoogleToken = async (idToken) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || data.error || 'Google authentication failed');
        return { success: false, ...data };
      }

      localStorage.setItem('cogether_access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('cogether_refresh_token', data.refreshToken);
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      setEntitlement(data.entitlement || { tier: 'free' });

      return { success: true, ...data };
    } catch (err) {
      const msg = 'Failed to authenticate with Google';
      setAuthError(msg);
      return { success: false, error: 'NETWORK_ERROR', message: msg };
    }
  };

  // Update Profile details (username, displayName, firstName, lastName, bio, avatarConfig)
  const updateProfile = async (updates) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error, message: data.message };
      }

      setProfile(data.profile);
      return { success: true, profile: data.profile };
    } catch (err) {
      return { success: false, error: 'UPDATE_FAILED', message: err.message };
    }
  };

  // Check username availability & get suggestions
  const checkUsername = async (rawUsername, { suggest = false } = {}) => {
    try {
      const token = accessToken || localStorage.getItem('cogether_access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const params = new URLSearchParams({ username: rawUsername });
      if (suggest) params.set('suggest', 'true');
      const res = await fetch(`${API_BASE}/api/v1/auth/check-username?${params.toString()}`, {
        headers
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, available: false, error: 'NETWORK_ERROR', message: 'Unable to check availability.' };
    }
  };

  // Query configured social auth providers
  const fetchAuthProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/providers`);
      if (!res.ok) return { google: false, apple: false, telegram: false };
      const data = await res.json();
      return data.providers || { google: false, apple: false, telegram: false };
    } catch (_err) {
      return { google: false, apple: false, telegram: false };
    }
  }, []);

  // Upload and persist avatar image
  const uploadAvatar = async (base64Image, mimeType = 'image/jpeg') => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image, mimeType })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error, message: data.message };
      }

      setProfile(data.profile);
      return { success: true, avatarUrl: data.avatarUrl, profile: data.profile };
    } catch (err) {
      return { success: false, error: 'UPLOAD_FAILED', message: err.message };
    }
  };

  // Update Preferences (interests, timezone, language)
  const updatePreferences = async (updates) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error };
      }

      setPreferences(data.preferences);
      return { success: true, preferences: data.preferences };
    } catch (err) {
      return { success: false, error: 'UPDATE_FAILED', message: err.message };
    }
  };

  // Create an opaque invite link
  const createInvite = async ({ resourceType = 'platform', resourceId = null, maxUses = 10, expiresInDays = 7 } = {}) => {
    const token = accessToken || localStorage.getItem('cogether_access_token');
    if (!token) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resourceType, resourceId, maxUses, expiresInDays })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: 'INVITE_CREATE_FAILED', message: err.message };
    }
  };

  // Log out of session
  const logout = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const refreshToken = localStorage.getItem('cogether_refresh_token');
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ refreshToken })
      });
    } catch (e) {}

    localStorage.removeItem('cogether_access_token');
    localStorage.removeItem('cogether_refresh_token');
    setAccessToken(null);
    setUser(null);
    setProfile(null);
    setPreferences(null);
  };

  const value = {
    user,
    profile,
    preferences,
    entitlement,
    accessToken,
    getAccessToken: () => accessToken || localStorage.getItem('cogether_access_token') || null,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    authError,
    setAuthError,
    requestOtp,
    verifyOtp,
    loginWithPassword,
    verifyMfaLogin,
    requestPasswordReset,
    resetPassword,
    setPassword,
    getMfaStatus,
    enrollMfa,
    confirmMfa,
    disableMfa,
    loginWithGoogleToken,
    updateProfile,
    checkUsername,
    fetchAuthProviders,
    uploadAvatar,
    updatePreferences,
    createInvite,
    logout,
    restoreSession,
    startGuestSession,
    registerWithPassword,
    isGuest: Boolean(user?.isGuest),
    isGuestExpired,
    guestRemainingSeconds,
    guestExpiresAt: user?.guestExpiresAt || null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
