import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Divider,
  Chip,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export const AuthModal: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Persistent mode = full login gate: cannot be dismissed. */
  persistent?: boolean;
}> = ({ open, onClose, persistent = false }) => {
  const { t } = useTranslation();
  const {
    users,
    groups,
    isLiveFirebase,
    authBusy,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    resetPassword,
  } = useApp();

  const [tab, setTab] = useState<'signin' | 'register'>('signin');

  // Sign-In state (demo credentials are only pre-filled in local sandbox mode)
  const [email, setEmail] = useState(isLiveFirebase ? '' : 'onni.virtanen@juniori.fi');
  const [password, setPassword] = useState(isLiveFirebase ? '' : 'club36demo');

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGroupId, setRegGroupId] = useState('');

  const selectedGroupId = regGroupId || groups[0]?.id || '';

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await signInWithEmail(email, password);
    if (ok) onClose();
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    const ok = await registerWithEmail({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      groupId: selectedGroupId,
    });
    if (ok) {
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    const ok = await signInWithGoogle();
    if (ok) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={
        persistent
          ? (_event, reason) => {
              if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
              onClose();
            }
          : onClose
      }
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {t('auth.title')}
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}
        >
          {t('auth.subtitle')}
        </Typography>

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="fullWidth"
          sx={{ mt: 1.5 }}
        >
          <Tab
            value="signin"
            label={t('auth.tabSignIn')}
            sx={{ fontWeight: 700, fontSize: '0.82rem' }}
          />
          <Tab
            value="register"
            label={t('auth.tabRegister')}
            sx={{ fontWeight: 700, fontSize: '0.82rem' }}
          />
        </Tabs>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {!isLiveFirebase && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
                border: '1px solid var(--mui-palette-divider)',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
              >
                {t('auth.sandboxNotice')}
              </Typography>
              {tab === 'signin' && (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {users.slice(0, 5).map((u) => (
                    <Chip
                      key={u.id}
                      size="small"
                      label={`${u.name.split(' ')[0]} (${u.role})`}
                      onClick={() => setEmail(u.email || u.name)}
                      sx={{ fontSize: '0.68rem', cursor: 'pointer' }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {tab === 'signin' ? (
            <Box component="form" onSubmit={handleEmailSignIn}>
              <Stack spacing={1.75}>
                <TextField
                  label={t('auth.emailLabel')}
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label={t('auth.passwordLabel')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={authBusy}
                  startIcon={<LoginIcon />}
                >
                  {t('auth.signInEmailBtn')}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  disabled={authBusy}
                  onClick={() => void resetPassword(email)}
                  sx={{ alignSelf: 'center', color: 'text.secondary' }}
                >
                  {t('auth.forgotPassword')}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleEmailRegister}>
              <Stack spacing={1.75}>
                <TextField
                  label={t('auth.nameLabel')}
                  placeholder={t('auth.namePlaceholder')}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label={t('auth.emailLabel')}
                  type="email"
                  placeholder="pelaaja@juniori.fi"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label={t('auth.passwordLabel')}
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  slotProps={{ htmlInput: { minLength: 6 } }}
                />
                <FormControl fullWidth size="small" disabled={groups.length === 0}>
                  <InputLabel>{t('auth.groupSelectLabel')}</InputLabel>
                  <Select
                    label={t('auth.groupSelectLabel')}
                    value={selectedGroupId}
                    onChange={(e) => setRegGroupId(e.target.value)}
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={authBusy}
                  startIcon={<PersonAddIcon />}
                >
                  {t('auth.registerSubmitBtn')}
                </Button>
              </Stack>
            </Box>
          )}

          <Divider>{t('auth.or')}</Divider>

          <Button
            variant="outlined"
            fullWidth
            disabled={authBusy}
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
          >
            {t('auth.signInGoogleBtn')}
          </Button>
        </Stack>
      </DialogContent>
      {!persistent && (
        <DialogActions>
          <Button onClick={onClose}>{t('auth.closeBtn')}</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
