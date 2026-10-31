import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Edit3,
  ShieldCheck,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { useAuth } from '../../core/AuthContext';
import { API_URL } from '../../config/api.js';
import CogetherAvatarRenderer, { useAvatarManifest } from './CogetherAvatarRenderer';
import CogetherAvatarStudio from './CogetherAvatarStudio';
import CogetherMemberCard from './CogetherMemberCard';
import './AuthModal.css';

const DRAFT_STORAGE_KEY = 'cogether_signup_draft_v1';

const SIGNUP_STEPS = [
  { num: 1, key: 'email', label: 'Email' },
  { num: 2, key: 'verify', label: 'Verify' },
  { num: 3, key: 'details', label: 'Name' },
  { num: 4, key: 'username', label: 'Handle' },
  { num: 5, key: 'avatar', label: 'Avatar' },
  { num: 6, key: 'review', label: 'Review' },
  { num: 7, key: 'card', label: 'Member Card' }
];

export default function AuthModal({
  isOpen = true,
  onClose,
  onLoginSuccess,
  onSelectService,
  initialMode = 'signin'
}) {
  const {
    user,
    profile,
    requestOtp,
    verifyOtp,
    loginWithPassword,
    startGuestSession,
    verifyMfaLogin,
    requestPasswordReset,
    resetPassword,
    setPassword,
    updateProfile,
    checkUsername,
    fetchAuthProviders
  } = useAuth();

  // Secure Password & MFA states
  const [signInMethod, setSignInMethod] = useState('password'); // 'password' | 'otp'
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [view, setView] = useState('auth'); // 'auth' | 'forgot_password' | 'mfa_challenge'

  // Forgot Password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);

  // MFA Challenge states
  const [mfaTicket, setMfaTicket] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleExploreAsGuest = async () => {
    try {
      setLoading(true);
      setError('');
      if (!startGuestSession) {
        setError('Guest session service is currently unavailable.');
        return;
      }
      const res = await startGuestSession('Guest');
      if (res && res.success && res.token) {
        if (onLoginSuccess) onLoginSuccess(res);
        if (onClose) onClose();
        return;
      }
      setError(res?.error?.message || res?.message || 'Failed to start guest session.');
    } catch (err) {
      setError(err?.message || 'Failed to start guest session.');
    } finally {
      setLoading(false);
    }
  };


  // Signup Password states (Step 3)
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const { manifest } = useAvatarManifest();

  // Mode: 'signup' | 'signin' (Default: 'signin')
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'signin');

  // Step index (1..7 for signup, 1..2 for signin)
  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState('forward');

  // Form values preserved across all steps
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState(null);

  // Username availability states
  const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  //Configured social providers
  const [socialProviders, setSocialProviders] = useState({
    google: false,
    apple: false,
    telegram: false
  });

  // Async & feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef(null);
  const videoRef = useRef(null);

  // Initialize avatarConfig from manifest defaults when loaded
  useEffect(() => {
    if (manifest?.defaults && !avatarConfig) {
      setAvatarConfig({ ...manifest.defaults });
    }
  }, [manifest, avatarConfig]);

  // Query configured social providers on mount
  useEffect(() => {
    if (isOpen && fetchAuthProviders) {
      fetchAuthProviders().then((prov) => {
        if (prov) setSocialProviders(prov);
      });
    }
  }, [isOpen, fetchAuthProviders]);

  // Restore temporary signup draft from sessionStorage if present
  useEffect(() => {
    if (!isOpen) return;
    try {
      const rawDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.email) setEmail(draft.email);
        if (draft.firstName) setFirstName(draft.firstName);
        if (draft.lastName) setLastName(draft.lastName);
        if (draft.username) setUsername(draft.username);
        if (draft.avatarConfig) setAvatarConfig(draft.avatarConfig);
      }
    } catch (_e) {}
  }, [isOpen]);

  // Save draft to sessionStorage when fields change during signup
  useEffect(() => {
    if (!isOpen || step >= 7) return;
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          email,
          firstName,
          lastName,
          username,
          avatarConfig
        })
      );
    } catch (_e) {}
  }, [isOpen, step, email, firstName, lastName, username, avatarConfig]);

  // Reset modal transient state when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setInfo('');
      setOtp('');
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Live debounced username availability check on Step 4
  useEffect(() => {
    if (step !== 4) return;
    const clean = username.trim().replace(/^@+/, '');

    if (!clean) {
      setUsernameStatus('idle');
      setUsernameMessage('Enter 3–30 letters, numbers, or underscores.');
      setUsernameSuggestions([]);
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be at least 3 characters.');
      setUsernameSuggestions([]);
      return;
    }

    if (clean.length > 30) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username cannot exceed 30 characters.');
      setUsernameSuggestions([]);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Use only letters, numbers, and underscores (_).');
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    let active = true;
    const timer = setTimeout(async () => {
      const res = await checkUsername(clean, { suggest: true });
      if (!active) return;

      if (!res || !res.success) {
        setUsernameStatus('invalid');
        setUsernameMessage(res?.message || 'Unable to verify username right now.');
        return;
      }

      if (res.available) {
        setUsernameStatus('available');
        setUsernameMessage(`@${res.username} is available!`);
        setUsernameSuggestions(res.suggestions || []);
      } else {
        setUsernameStatus(res.error ? 'invalid' : 'taken');
        setUsernameMessage(res.message || `@${clean} is already taken.`);
        setUsernameSuggestions(res.suggestions || []);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [step, username, checkUsername]);

  if (!isOpen) return null;

  const navigateToStep = (targetStep) => {
    setError('');
    setInfo('');
    setSlideDir(targetStep >= step ? 'forward' : 'backward');
    setStep(targetStep);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setInfo('');
    setOtp('');
    setSlideDir('forward');
    setStep(1);
  };

  // Hold video on final frame
  const handleVideoEnded = (e) => {
    e.currentTarget.pause();
  };

  // ── STEP 1: REQUEST EMAIL OTP (PASSWORDLESS SIGN IN) ──
  const handleRequestOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const purpose = mode === 'signup' ? 'signup' : 'login';
    const result = await requestOtp(cleanEmail, purpose);
    setLoading(false);

    if (!result.success) {
      if (result.error === 'EMAIL_SERVICE_NOT_CONFIGURED') {
        setError('Email delivery is not configured on this environment.');
      } else {
        setError(result.message || 'Unable to send verification code. Please try again.');
      }
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
      return;
    }

    setResendCooldown(60);
    setOtp('');
    navigateToStep(2);
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 120);
  };

  // ── STEP 1: SIGN UP (EMAIL & PASSWORD VALIDATION + OTP REQUEST) ──
  const handleSignupStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword.length > 128) {
      setError('Password cannot exceed 128 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(signupPassword) || !/[0-9]/.test(signupPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(cleanEmail, 'signup');
    setLoading(false);

    if (!result.success) {
      if (result.error === 'EMAIL_SERVICE_NOT_CONFIGURED') {
        setError('Email delivery is not configured on this environment.');
      } else {
        setError(result.message || 'Unable to send verification code. Please try again.');
      }
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
      return;
    }

    setResendCooldown(60);
    setOtp('');
    navigateToStep(2);
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 120);
  };

  // ── STEP 2: VERIFY EMAIL OTP ──
  const executeVerifyOtp = async (codeToVerify) => {
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const purpose = mode === 'signup' ? 'signup' : 'login';
    const payload = {
      purpose,
      ...(mode === 'signup' && signupPassword ? { password: signupPassword } : {})
    };

    const result = await verifyOtp(cleanEmail, codeToVerify, payload);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Invalid or expired verification code.');
      return;
    }

    // Populate existing profile fields if returning user
    const prof = result.profile || {};
    if (prof.firstName || prof.first_name) setFirstName(prof.firstName || prof.first_name);
    if (prof.lastName || prof.last_name) setLastName(prof.lastName || prof.last_name);
    if (prof.username) setUsername(prof.username);
    if (prof.avatarConfig || prof.avatar_config) {
      setAvatarConfig(prof.avatarConfig || prof.avatar_config);
    }

    // Direct entry into CoGether without blocking on multi-step avatar journey
    if (onLoginSuccess) {
      onLoginSuccess(result);
    }
    onClose();
  };

  const handleVerifyFormSubmit = (e) => {
    e.preventDefault();
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    executeVerifyOtp(cleanOtp);
  };

  const handleOtpInputChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
    if (digits.length === 6 && !loading) {
      executeVerifyOtp(digits);
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const digits = String(pasted || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length > 0) {
      e.preventDefault();
      setOtp(digits);
      setError('');
      if (digits.length === 6 && !loading) {
        executeVerifyOtp(digits);
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setInfo('');
    setLoading(true);
    const purpose = mode === 'signup' ? 'signup' : 'login';
    const result = await requestOtp(email.trim().toLowerCase(), purpose);
    setLoading(false);

    if (result.success) {
      setResendCooldown(60);
      setInfo('A fresh 6-digit verification code has been sent.');
    } else {
      setError(result.message || 'Unable to resend verification code.');
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
    }
  };

  // ── EMAIL & ARGON2ID PASSWORD SIGN IN ──
  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!signInPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await loginWithPassword(cleanEmail, signInPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Invalid email or password.');
      return;
    }

    if (result.mfaRequired) {
      setMfaTicket(result.mfaTicket);
      setView('mfa_challenge');
      return;
    }

    if (result.otpRequired) {
      setResendCooldown(60);
      setOtp('');
      navigateToStep(2);
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 120);
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(result);
    }
    onClose();
  };

  // ── MFA CHALLENGE VERIFICATION ──
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = useRecoveryCode
      ? { recoveryCode: mfaRecoveryCode.trim() }
      : { code: mfaCode.trim() };

    const result = await verifyMfaLogin(mfaTicket, payload);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'MFA verification failed.');
      return;
    }

    if (onLoginSuccess) {
      onLoginSuccess(result);
    }
    onClose();
  };

  // ── FORGOT PASSWORD REQUEST ──
  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(cleanEmail);
    setLoading(false);

    setForgotStep(2);
    setInfo(result.message || 'If an account exists, a reset code was sent.');
  };

  // ── FORGOT PASSWORD RESET ──
  const handleForgotPasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanOtp = forgotOtp.replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit reset passcode.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword.length > 128) {
      setError('Password cannot exceed 128 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(forgotNewPassword) || !/[0-9]/.test(forgotNewPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(forgotEmail.trim().toLowerCase(), cleanOtp, forgotNewPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Password reset failed.');
      return;
    }

    setView('auth');
    setMode('signin');
    setSignInMethod('password');
    setEmail(forgotEmail.trim().toLowerCase());
    setSignInPassword('');
    setInfo('Password reset successfully! Please sign in with your new password.');
  };

  // ── STEP 3: PERSONAL DETAILS (FIRST & LAST NAME + PASSWORD CREATION) ──
  const liveDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst) {
      setError('Please enter your first name.');
      return;
    }
    if (!cleanLast) {
      setError('Please enter your last name.');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword.length > 128) {
      setError('Password cannot exceed 128 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(signupPassword) || !/[0-9]/.test(signupPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Securely hash with Argon2id and store on user record
    setLoading(true);
    const passRes = await setPassword(signupPassword);
    setLoading(false);

    if (!passRes.success) {
      setError(passRes.message || 'Failed to save password.');
      return;
    }

    // Suggest a clean default username if the user hasn't manually typed one yet
    if (!usernameTouched) {
      const candidate = `${cleanFirst}_${cleanLast}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 24);
      if (candidate.length >= 3) {
        setUsername(candidate);
      }
    }

    navigateToStep(4);
  };

  // ── STEP 4: UNIQUE USERNAME ──
  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    setError('');

    const clean = username.trim().replace(/^@+/, '');
    if (clean.length < 3 || clean.length > 30 || !/^[a-zA-Z0-9_]+$/.test(clean)) {
      setError('Please choose a valid username (3–30 letters, numbers, or underscores).');
      return;
    }
    if (usernameStatus === 'checking') {
      setError('Please wait while we verify username availability.');
      return;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setError(usernameMessage || 'That username is not available. Please choose another.');
      return;
    }

    navigateToStep(5);
  };

  // ── STEP 5: AVATAR STUDIO ──
  const handleAvatarContinue = () => {
    setError('');
    navigateToStep(6);
  };

  // ── STEP 6: PROFILE REVIEW & PERSISTENCE ──
  const handleFinalizeProfile = async () => {
    setError('');
    setLoading(true);

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const combinedDisplay = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim() || username.trim();
    const cleanHandle = username.trim().replace(/^@+/, '');
    const finalAvatarConfig = avatarConfig || manifest?.defaults || {};

    const res = await updateProfile({
      firstName: cleanFirst,
      lastName: cleanLast,
      displayName: combinedDisplay,
      username: cleanHandle,
      avatarConfig: finalAvatarConfig
    });

    setLoading(false);

    if (!res.success) {
      if (res.error === 'USERNAME_ALREADY_TAKEN') {
        setError('That username was just claimed by someone else. Please pick a new handle.');
      } else {
        setError(res.message || res.error || 'Failed to save your profile. Please try again.');
      }
      return;
    }

    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (_e) {}

    navigateToStep(7);
  };

  const hasConfiguredSocial =
    socialProviders.google || socialProviders.apple || socialProviders.telegram;

  const handleServiceSelect = (serviceId) => {
    if (onSelectService) {
      onSelectService(serviceId);
    }
    if (onClose) {
      onClose();
    }
  };

  // PART 4: When step === 7 (after profile & avatar are saved), transition out of the split
  // peach signup card into a unified pitch-black (#000000) reveal environment.
  if (step === 7) {
    return (
      <div
        className="flow-auth-overlay is-cinematic-blackout"
        role="dialog"
        aria-modal="true"
        aria-label="CoGether Member Card & Experience Launch"
        data-testid="cinematic-blackout-overlay"
      >
        <button
          type="button"
          className="flow-cinematic-close-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          <X size={18} />
        </button>

        <CogetherMemberCard
          mode="cinematic"
          user={user || { email, emailVerified: true }}
          profile={{
            ...profile,
            firstName: firstName.trim() || profile?.firstName,
            lastName: lastName.trim() || profile?.lastName,
            displayName: liveDisplayName || profile?.displayName,
            username: username.trim().replace(/^@+/, '') || profile?.username,
            avatarConfig: avatarConfig || profile?.avatarConfig
          }}
          avatarConfig={avatarConfig || profile?.avatarConfig}
          onSelectService={handleServiceSelect}
          onEnterCogether={onClose}
          onEditProfile={() => navigateToStep(3)}
        />
      </div>
    );
  }

  return (
    <div
      className="flow-auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="CoGether Authentication & Onboarding"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`flow-auth-card ${step >= 5 ? 'is-studio-wide' : ''}`}>
        {/* Close Button */}
        <button
          type="button"
          className="flow-modal-close-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* ── LEFT VISUAL PANEL (VIDEO) ── */}
        <div className="flow-auth-left-panel">
          <div className="flow-video-stage">
            <video
              ref={videoRef}
              className="flow-auth-video"
              src="/cogether_auth_video.mp4"
              poster="/cogether-exact-hero.png"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
            />

            <div className="flow-video-leaf-badge">
              <div className="leaf-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                </svg>
              </div>
              <div className="leaf-badge-content">
                <span className="badge-main">Stay focused.</span>
                <span className="badge-sub">Grow every day.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER CURVED CUTOUT & PAGINATION INDICATOR ── */}
        <div className="flow-center-seam-bridge" aria-hidden="true">
          <svg
            className="flow-center-curved-svg"
            viewBox="0 0 100 88"
            fill="none"
          >
            <path
              d="M 50,0 
                 C 50,16 12,24 12,44 
                 C 12,64 50,72 50,88 
                 C 50,72 88,64 88,44 
                 C 88,24 50,16 50,0 Z"
              fill="#000000"
            />
            <rect x="32" y="41.5" width="16" height="5" rx="2.5" fill="#ffffff" />
            <circle cx="56" cy="44" r="2.5" fill="rgba(255, 255, 255, 0.45)" />
            <circle cx="66" cy="44" r="2.5" fill="rgba(255, 255, 255, 0.25)" />
          </svg>
        </div>

        {/* ── RIGHT SIGNUP / SIGNIN / AVATAR STUDIO PANEL ── */}
        <div className="flow-auth-right-panel">
          {/* Top Navigation & Minimal Step Progress Bar */}
          <div className="flow-top-switch-row">
            {step > 1 && step < 7 ? (
              <button
                type="button"
                className="flow-back-step-btn"
                onClick={() => navigateToStep(step - 1)}
                data-testid="signup-back-btn"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <span />
            )}

            {mode === 'signup' && step <= 6 && (
              <div className="flow-step-progress-bar" aria-label={`Step ${step} of 6`} data-testid="signup-progress-bar">
                {SIGNUP_STEPS.slice(0, 6).map((s) => (
                  <span
                    key={s.num}
                    className={`flow-progress-pill ${s.num === step ? 'current' : s.num < step ? 'done' : ''}`}
                    title={`Step ${s.num}: ${s.label}`}
                  />
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="flow-mode-switch-text">
                {mode === 'signup' ? (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="flow-switch-action"
                      onClick={() => switchMode('signin')}
                    >
                      Log In
                    </button>
                  </span>
                ) : (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      className="flow-switch-action"
                      onClick={() => switchMode('signup')}
                    >
                      Sign Up
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Animated Step Stage */}
          <div
            key={`step-${mode}-${step}`}
            className={`flow-form-content flow-step-transition-${slideDir}`}
          >
            {/* ════════════════════════════════════════════════════════════════
                VIEW: FORGOT PASSWORD FLOW
               ════════════════════════════════════════════════════════════════ */}
            {view === 'forgot_password' && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">Reset Password</h1>
                  <p className="flow-subtitle">
                    {forgotStep === 1
                      ? 'Enter your account email to receive a password reset passcode'
                      : `Enter the 6-digit passcode sent to ${forgotEmail} and choose a new password`}
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {info && (
                  <div className="flow-alert flow-alert-info" role="status">
                    <CheckCircle2 size={15} />
                    <span>{info}</span>
                  </div>
                )}

                {forgotStep === 1 ? (
                  <form className="flow-interactive-form" onSubmit={handleForgotPasswordRequest}>
                    <div className="flow-field-wrapper">
                      <Mail className="flow-field-icon" size={18} />
                      <input
                        type="email"
                        className="flow-input-control"
                        placeholder="Email Address"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        disabled={loading}
                        data-testid="forgot-email-input"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flow-action-button"
                      disabled={loading || !forgotEmail.trim()}
                      data-testid="forgot-send-btn"
                    >
                      <span>{loading ? 'Sending Code...' : 'Send Reset Passcode'}</span>
                      <ArrowRight size={17} />
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="flow-text-link"
                        onClick={() => {
                          setView('auth');
                          setError('');
                          setInfo('');
                        }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="flow-interactive-form" onSubmit={handleForgotPasswordReset}>
                    <div className="flow-field-wrapper">
                      <Key className="flow-field-icon" size={18} />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="flow-input-control"
                        placeholder="6-Digit Reset Passcode"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        disabled={loading}
                        data-testid="forgot-otp-input"
                      />
                    </div>

                    <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                      <Lock className="flow-field-icon" size={18} />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        className="flow-input-control"
                        placeholder="New Password (min 8 chars)"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        maxLength={128}
                        required
                        disabled={loading}
                        data-testid="forgot-new-password-input"
                      />
                      <button
                        type="button"
                        className="flow-password-toggle-btn"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      >
                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                      <Lock className="flow-field-icon" size={18} />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        className="flow-input-control"
                        placeholder="Confirm New Password"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        maxLength={128}
                        required
                        disabled={loading}
                        data-testid="forgot-confirm-password-input"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flow-action-button"
                      disabled={loading || forgotOtp.length !== 6 || forgotNewPassword.length < 8}
                      data-testid="forgot-reset-submit-btn"
                    >
                      <span>{loading ? 'Resetting Password...' : 'Reset Password & Sign In'}</span>
                      <ArrowRight size={17} />
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="flow-text-link"
                        onClick={() => {
                          setView('auth');
                          setError('');
                          setInfo('');
                        }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW: MFA LOGIN CHALLENGE
               ════════════════════════════════════════════════════════════════ */}
            {view === 'mfa_challenge' && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">Two-Factor Authentication</h1>
                  <p className="flow-subtitle">
                    {useRecoveryCode
                      ? 'Enter one of your 8-character emergency recovery codes'
                      : 'Enter the 6-digit verification code from your authenticator app'}
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <form className="flow-interactive-form" onSubmit={handleMfaSubmit}>
                  {useRecoveryCode ? (
                    <div className="flow-field-wrapper">
                      <Key className="flow-field-icon" size={18} />
                      <input
                        type="text"
                        className="flow-input-control"
                        placeholder="XXXX-XXXX"
                        value={mfaRecoveryCode}
                        onChange={(e) => setMfaRecoveryCode(e.target.value.toUpperCase())}
                        required
                        disabled={loading}
                        autoFocus
                        data-testid="mfa-recovery-input"
                      />
                    </div>
                  ) : (
                    <div className="flow-otp-wrapper">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="flow-otp-input"
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        autoFocus
                        data-testid="mfa-code-input"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flow-action-button"
                    disabled={loading || (useRecoveryCode ? !mfaRecoveryCode.trim() : mfaCode.length !== 6)}
                    data-testid="mfa-submit-btn"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                    <ArrowRight size={17} />
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="flow-switch-method-btn"
                      onClick={() => {
                        setUseRecoveryCode(!useRecoveryCode);
                        setError('');
                      }}
                    >
                      {useRecoveryCode
                        ? 'Use 6-digit authenticator code instead'
                        : 'Use a single-use recovery code instead'}
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="flow-text-link"
                      onClick={() => {
                        setView('auth');
                        setMfaTicket(null);
                        setError('');
                      }}
                    >
                      Cancel & Back to Sign In
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 1: EMAIL ADDRESS & AUTHENTICATION
               ════════════════════════════════════════════════════════════════ */}
            {view === 'auth' && step === 1 && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">
                    {mode === 'signup' ? "Let's start with you." : 'Welcome Back'}
                  </h1>
                  <p className="flow-subtitle">
                    {mode === 'signup'
                      ? 'Create your account and craft your custom CoGether identity'
                      : 'Sign in to your flow and continue where you left off'}
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {info && (
                  <div className="flow-alert flow-alert-info" role="status">
                    <CheckCircle2 size={15} />
                    <span>{info}</span>
                  </div>
                )}

                {mode === 'signin' && signInMethod === 'password' ? (
                  <form className="flow-interactive-form" onSubmit={handlePasswordSignIn}>
                    <div className="flow-field-wrapper">
                      <Mail className="flow-field-icon" size={18} />
                      <input
                        type="email"
                        className="flow-input-control"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        disabled={loading}
                        data-testid="signin-email-input"
                      />
                    </div>

                    <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                      <Lock className="flow-field-icon" size={18} />
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        className="flow-input-control"
                        placeholder="Password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        disabled={loading}
                        data-testid="signin-password-input"
                      />
                      <button
                        type="button"
                        className="flow-password-toggle-btn"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="flow-text-link"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotStep(1);
                          setError('');
                          setInfo('');
                          setView('forgot_password');
                        }}
                        data-testid="forgot-password-link"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="flow-action-button"
                      disabled={loading || !email.trim() || !signInPassword}
                      data-testid="signin-submit-btn"
                    >
                      <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                      <ArrowRight size={17} />
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="flow-switch-method-btn"
                        onClick={() => {
                          setError('');
                          setInfo('');
                          setSignInMethod('otp');
                        }}
                        data-testid="toggle-otp-signin-btn"
                      >
                        Sign in with One-Time Passcode instead
                      </button>
                    </div>
                  </form>
                ) : mode === 'signin' ? (
                  <form className="flow-interactive-form" onSubmit={handleRequestOtpSubmit}>
                    <div className="flow-field-wrapper">
                      <Mail className="flow-field-icon" size={18} />
                      <input
                        type="email"
                        className="flow-input-control"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        disabled={loading}
                        data-testid="signin-otp-email-input"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flow-action-button"
                      disabled={loading || !email.trim()}
                      data-testid="signin-otp-continue-btn"
                    >
                      <span>
                        {loading
                          ? 'Sending Verification Code...'
                          : 'Send Login Passcode'}
                      </span>
                      <ArrowRight size={17} />
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="flow-switch-method-btn"
                        onClick={() => {
                          setError('');
                          setInfo('');
                          setSignInMethod('password');
                        }}
                        data-testid="toggle-password-signin-btn"
                      >
                        Sign in with password instead
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="flow-interactive-form" onSubmit={handleSignupStep1Submit}>
                    <div className="flow-field-wrapper">
                      <Mail className="flow-field-icon" size={18} />
                      <input
                        type="email"
                        className="flow-input-control"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        disabled={loading}
                        data-testid="signup-email-input"
                      />
                    </div>

                    <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                      <Lock className="flow-field-icon" size={18} />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        className="flow-input-control"
                        placeholder="Password (min. 8 characters)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        disabled={loading}
                        data-testid="signup-password-input"
                      />
                      <button
                        type="button"
                        className="flow-password-toggle-btn"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                      <Lock className="flow-field-icon" size={18} />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        className="flow-input-control"
                        placeholder="Confirm Password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        disabled={loading}
                        data-testid="signup-confirm-password-input"
                      />
                    </div>

                    <div className="flow-password-hints">
                      <span className={`hint-item ${signupPassword.length >= 8 ? 'valid' : ''}`}>
                        • At least 8 characters
                      </span>
                      <span className={`hint-item ${(/[a-zA-Z]/.test(signupPassword) && /[0-9]/.test(signupPassword)) ? 'valid' : ''}`}>
                        • Letter & number
                      </span>
                      <span className={`hint-item ${signupPassword && signupPassword === signupConfirmPassword ? 'valid' : ''}`}>
                        • Passwords match
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="flow-action-button"
                      disabled={loading || !email.trim() || signupPassword.length < 8 || signupPassword !== signupConfirmPassword}
                      data-testid="signup-email-continue-btn"
                    >
                      <span>
                        {loading ? 'Sending Verification Code...' : 'Continue'}
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  </form>
                )}

                {/* Only render social sign-in buttons when their backend integration is actually configured */}
                {hasConfiguredSocial && (
                  <>
                    <div className="flow-or-divider">
                      <span className="divider-line" />
                      <span className="divider-label">Or</span>
                      <span className="divider-line" />
                    </div>

                    <div className="flow-social-grid">
                      {socialProviders.google && (
                        <button
                          type="button"
                          className="flow-social-card"
                          onClick={() => {
                            window.location.href = `${API_URL}/api/v1/auth/google`;
                          }}
                        >
                          <span>Google</span>
                        </button>
                      )}
                    </div>
                  </>
                )}

                <div className="flow-guest-action-wrap" style={{ textAlign: 'center', marginTop: '14px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className="flow-explore-guest-btn"
                    onClick={handleExploreAsGuest}
                    disabled={loading}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Explore as Guest (5-minute session)
                  </button>
                </div>

                <p className="flow-legal-disclaimer">
                  By signing up, you agree to our{' '}
                  <a href="#terms" onClick={(e) => e.preventDefault()}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" onClick={(e) => e.preventDefault()}>
                    Privacy Policy
                  </a>
                </p>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: EMAIL VERIFICATION (6-DIGIT OTP)
               ════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">Check Your Inbox</h1>
                  <p className="flow-subtitle">
                    We sent a 6-digit verification code to{' '}
                    <span className="flow-highlight-email">{email}</span>
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {info && (
                  <div className="flow-alert flow-alert-info" role="status">
                    <CheckCircle2 size={15} />
                    <span>{info}</span>
                  </div>
                )}

                <form className="flow-interactive-form" onSubmit={handleVerifyFormSubmit}>
                  <div className="flow-otp-wrapper">
                    <input
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="flow-otp-input"
                      placeholder="000000"
                      value={otp}
                      onChange={handleOtpInputChange}
                      onPaste={handleOtpPaste}
                      disabled={loading}
                      aria-label="6-digit verification code"
                      data-testid="otp-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flow-action-button"
                    disabled={loading || otp.length !== 6}
                    data-testid="verify-otp-continue-btn"
                  >
                    <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
                    <ArrowRight size={17} />
                  </button>

                  <div className="flow-resend-container">
                    <button
                      type="button"
                      className="flow-resend-link"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleResendCode}
                      data-testid="resend-otp-btn"
                    >
                      <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
                      <span>
                        {resendCooldown > 0
                          ? `Resend available in ${resendCooldown}s`
                          : 'Resend verification code'}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: PERSONAL DETAILS & SECURE PASSWORD CREATION
               ════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">Your Details & Password</h1>
                  <p className="flow-subtitle">
                    Set your display name and choose a secure password for your CoGether account
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <form className="flow-interactive-form" onSubmit={handleDetailsSubmit}>
                  <div className="flow-name-row">
                    <div className="flow-field-wrapper">
                      <User className="flow-field-icon" size={18} />
                      <input
                        type="text"
                        className="flow-input-control"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        maxLength={50}
                        required
                        autoFocus
                        data-testid="first-name-input"
                      />
                    </div>

                    <div className="flow-field-wrapper">
                      <User className="flow-field-icon" size={18} />
                      <input
                        type="text"
                        className="flow-input-control"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        maxLength={50}
                        required
                        data-testid="last-name-input"
                      />
                    </div>
                  </div>

                  {/* Live Display-Name Preview */}
                  <div className="flow-live-name-preview" data-testid="display-name-preview">
                    <span className="preview-label">Display name preview</span>
                    <span className="preview-value">
                      {liveDisplayName || 'Your Full Name'}
                    </span>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="flow-field-wrapper" style={{ marginTop: '12px' }}>
                    <Lock className="flow-field-icon" size={18} />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      className="flow-input-control"
                      placeholder="Create Password (min. 8 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      maxLength={128}
                      required
                      data-testid="signup-password-input"
                    />
                    <button
                      type="button"
                      className="flow-password-toggle-btn"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="flow-field-wrapper" style={{ marginTop: '10px' }}>
                    <Lock className="flow-field-icon" size={18} />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      className="flow-input-control"
                      placeholder="Confirm Password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      maxLength={128}
                      required
                      data-testid="signup-confirm-password-input"
                    />
                  </div>

                  {/* Password requirement hints */}
                  <div className="flow-password-hints">
                    <span className={`hint-item ${signupPassword.length >= 8 ? 'valid' : ''}`}>
                      • At least 8 characters
                    </span>
                    <span className={`hint-item ${(/[a-zA-Z]/.test(signupPassword) && /[0-9]/.test(signupPassword)) ? 'valid' : ''}`}>
                      • Letter & number
                    </span>
                    <span className={`hint-item ${signupPassword && signupPassword === signupConfirmPassword ? 'valid' : ''}`}>
                      • Passwords match
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="flow-action-button"
                    disabled={loading || !firstName.trim() || !lastName.trim() || signupPassword.length < 8 || signupPassword !== signupConfirmPassword}
                    data-testid="details-continue-btn"
                  >
                    <span>{loading ? 'Saving Details...' : 'Continue'}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 4: UNIQUE USERNAME SELECTION
               ════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <>
                <div className="flow-header-block">
                  <h1 className="flow-title">Claim Your Handle</h1>
                  <p className="flow-subtitle">
                    Choose a unique @username so friends can find and invite you
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <form className="flow-interactive-form" onSubmit={handleUsernameSubmit}>
                  <div className="flow-field-wrapper flow-username-field">
                    <AtSign className="flow-field-icon" size={18} />
                    <input
                      type="text"
                      className={`flow-input-control status-${usernameStatus}`}
                      placeholder="username"
                      value={username}
                      onChange={(e) => {
                        setUsernameTouched(true);
                        setUsername(e.target.value.replace(/^@+/, '').replace(/\s+/g, ''));
                      }}
                      maxLength={30}
                      required
                      autoFocus
                      data-testid="username-input"
                    />
                  </div>

                  {/* Live Availability Feedback Banner */}
                  <div
                    className={`flow-username-feedback status-${usernameStatus}`}
                    data-testid="username-status"
                  >
                    {usernameStatus === 'checking' && <Loader2 size={14} className="spin-icon" />}
                    {usernameStatus === 'available' && <CheckCircle2 size={14} />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <AlertCircle size={14} />
                    )}
                    <span>{usernameMessage || 'Letters, numbers, and underscores (3–30 chars).'}</span>
                  </div>

                  {/* Alternative Suggestions */}
                  {usernameSuggestions.length > 0 && (
                    <div className="flow-username-suggestions" data-testid="username-suggestions">
                      <span className="suggestions-label">Available alternatives:</span>
                      <div className="suggestions-chips">
                        {usernameSuggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => {
                              setUsernameTouched(true);
                              setUsername(sug);
                            }}
                            data-testid={`username-suggestion-${sug}`}
                          >
                            @{sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flow-action-button"
                    disabled={
                      usernameStatus === 'checking' ||
                      usernameStatus === 'taken' ||
                      usernameStatus === 'invalid' ||
                      username.trim().length < 3
                    }
                    data-testid="username-continue-btn"
                  >
                    <span>Continue to Avatar Studio</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 5: INTERACTIVE SVG AVATAR STUDIO
               ════════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <>
                <div className="flow-header-block flow-header-compact">
                  <h1 className="flow-title">Avatar Studio</h1>
                  <p className="flow-subtitle">
                    Assemble your character from CoGether vector artwork
                  </p>
                </div>

                <CogetherAvatarStudio
                  value={avatarConfig}
                  onChange={setAvatarConfig}
                />

                <button
                  type="button"
                  className="flow-action-button flow-studio-continue-btn"
                  onClick={handleAvatarContinue}
                  data-testid="avatar-continue-btn"
                >
                  <span>Review Your Identity</span>
                  <ArrowRight size={17} />
                </button>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 6: PROFILE REVIEW
               ════════════════════════════════════════════════════════════════ */}
            {step === 6 && (
              <>
                <div className="flow-header-block flow-header-compact">
                  <h1 className="flow-title">Your identity, ready.</h1>
                  <p className="flow-subtitle">
                    Review your details before minting your CoGether digital member card
                  </p>
                </div>

                {error && (
                  <div className="flow-alert flow-alert-error" role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flow-review-card" data-testid="profile-review-card">
                  <div className="flow-review-avatar-col">
                    <CogetherAvatarRenderer
                      config={avatarConfig}
                      size={104}
                      animated={true}
                      showBackdrop={true}
                    />
                    <button
                      type="button"
                      className="flow-review-mini-edit"
                      onClick={() => navigateToStep(5)}
                      data-testid="review-edit-avatar-btn"
                    >
                      <Edit3 size={12} /> Edit Avatar
                    </button>
                  </div>

                  <div className="flow-review-info-col">
                    <div className="review-field-item">
                      <div className="review-field-meta">
                        <span className="review-label">FULL NAME</span>
                        <span className="review-val" data-testid="review-full-name">
                          {liveDisplayName}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="review-step-jump-btn"
                        onClick={() => navigateToStep(3)}
                        data-testid="review-edit-name-btn"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="review-field-item">
                      <div className="review-field-meta">
                        <span className="review-label">USERNAME</span>
                        <span className="review-val" data-testid="review-username">
                          @{username.trim().replace(/^@+/, '')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="review-step-jump-btn"
                        onClick={() => navigateToStep(4)}
                        data-testid="review-edit-username-btn"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="review-field-item">
                      <div className="review-field-meta">
                        <span className="review-label">EMAIL</span>
                        <span className="review-val review-email-row" data-testid="review-email">
                          {email || user?.email}
                          {user?.emailVerified && (
                            <span className="review-verified-pill">
                              <ShieldCheck size={12} /> Verified
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="flow-action-button"
                  onClick={handleFinalizeProfile}
                  disabled={loading}
                  data-testid="complete-signup-btn"
                >
                  <span>
                    {loading ? 'Saving Profile & Minting Card...' : 'Confirm & Reveal Member Card'}
                  </span>
                  <ArrowRight size={17} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
