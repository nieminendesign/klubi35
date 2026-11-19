import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LockReset as LockResetIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';

type ActionStep = 'verifying' | 'form' | 'success' | 'invalid';

export const AuthActionView: React.FC = () => {
  const { t } = useTranslation();

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode') || '';

  const [step, setStep] = useState<ActionStep>('verifying');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (mode !== 'resetPassword' || !oobCode) {
      setStep('invalid');
      return;
    }

    authService
      .verifyPasswordResetCode(oobCode)
      .then((email) => {
        if (cancelled) return;
        setVerifiedEmail(email);
        setStep('form');
      })
      .catch((err) => {
        console.warn('Invalid or expired password action code:', err);
        if (!cancelled) setStep('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg(t('auth.errWeakPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('authAction.errMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await authService.confirmPasswordReset(oobCode, newPassword);
      setStep('success');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/weak-password') {
        setErrorMsg(t('auth.errWeakPassword'));
      } else if (
        code === 'auth/expired-action-code' ||
        code === 'auth/invalid-action-code'
      ) {
        setErrorMsg(t('authAction.errExpired'));
      } else {
        setErrorMsg(t('auth.errGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = async () => {
    try {
      if (auth?.currentUser) {
        await authService.signOut();
      }
    } catch (err) {
      console.warn('Could not sign out previous session before login redirect:', err);
    }
    const target = verifiedEmail
      ? `/?passwordSet=1&email=${encodeURIComponent(verifiedEmail)}`
      : '/?passwordSet=1';
    window.location.assign(target);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 460, width: '100%' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2.5}>
            {/* Brand Header matching AppLayout */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.25,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.contrastText',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  fontFamily: '"Outfit", sans-serif',
                  letterSpacing: '-0.03em',
                  flexShrink: 0,
                }}
              >
                35
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {t('app.title')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {t('app.subtitle')}
                </Typography>
              </Box>
            </Stack>

            {step === 'verifying' && (
              <Stack spacing={1.5} sx={{ alignItems: 'center', py: 3 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('authAction.verifying')}
                </Typography>
              </Stack>
            )}

            {step === 'form' && (
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <LockResetIcon color="primary" />
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {t('authAction.title')}
                    </Typography>
                  </Stack>

                  <Alert severity="info" icon={false}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      {t('authAction.whyPasswordBox', { email: verifiedEmail })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {t('authAction.parentTip')}
                    </Typography>
                  </Alert>

                  {errorMsg && <Alert severity="warning">{errorMsg}</Alert>}

                  <TextField
                    type="password"
                    label={t('authAction.newPasswordLabel')}
                    helperText={t('authAction.passwordRuleHint')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    slotProps={{ htmlInput: { minLength: 6 } }}
                  />

                  <TextField
                    type="password"
                    label={t('authAction.confirmPasswordLabel')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    slotProps={{ htmlInput: { minLength: 6 } }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={submitting}
                    sx={{ fontWeight: 700 }}
                  >
                    {submitting ? t('authAction.savingBtn') : t('authAction.submitBtn')}
                  </Button>
                </Stack>
              </Box>
            )}

            {step === 'success' && (
              <Stack spacing={2} sx={{ textAlign: 'center', py: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 52, color: 'primary.main', mx: 'auto' }} />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {t('authAction.successTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('authAction.successDesc', { email: verifiedEmail })}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<LoginIcon />}
                  onClick={() => void handleGoToLogin()}
                  sx={{ fontWeight: 700 }}
                >
                  {t('authAction.goToLoginBtn')}
                </Button>
              </Stack>
            )}

            {step === 'invalid' && (
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {t('authAction.invalidLinkTitle')}
                </Typography>
                <Alert severity="warning">{t('authAction.invalidLinkDesc')}</Alert>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<LoginIcon />}
                  onClick={() => window.location.assign('/')}
                  sx={{ fontWeight: 700 }}
                >
                  {t('authAction.goToLoginBtn')}
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
