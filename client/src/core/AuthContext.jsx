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

  // Restore authenticated session on mount
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('cogether_access_token');
    const storedRefreshToken = localStorage.getItem('cogether_refresh_token');

    if (storedToken) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUser({ id: data.id, email: data.primaryEmail, status: data.status });
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

  // Update Profile details (username, displayName, bio, avatar)
  const updateProfile = async (updates) => {
    if (!accessToken) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

  // Upload and persist avatar image
  const uploadAvatar = async (base64Image, mimeType = 'image/jpeg') => {
    if (!accessToken) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
    if (!accessToken) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
    if (!accessToken) return { success: false, error: 'UNAUTHORIZED' };
    try {
      const res = await fetch(`${API_BASE}/api/v1/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    authError,
    setAuthError,
    requestOtp,
    verifyOtp,
    loginWithGoogleToken,
    updateProfile,
    uploadAvatar,
    updatePreferences,
    createInvite,
    logout,
    restoreSession
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
