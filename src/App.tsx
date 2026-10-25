import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { AppProvider, useApp } from './context/AppContext';
import { buildAppTheme } from './theme/theme';
import type { UserRole } from './types/models';
import { AppLayout } from './components/AppLayout';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './views/DashboardView';
import { CalendarView } from './views/CalendarView';
import { PlayScorecardView } from './views/PlayScorecardView';
import { CoachPortalView } from './views/CoachPortalView';
import { AdminPortalView } from './views/AdminPortalView';
import { LeaderboardView } from './views/LeaderboardView';

const RoleRouteGuard: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { currentUser } = useApp();
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const ThemedAppShell: React.FC = () => {
  const { language, isAuthenticated, loading } = useApp();
  const theme = useMemo(() => buildAppTheme(language), [language]);

  // Live Firebase mode: nothing is shown until the user has signed in (Firestore requires auth).
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        {loading ? (
          <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <AuthModal open persistent onClose={() => undefined} />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/play" element={<PlayScorecardView />} />
            <Route
              path="/coach"
              element={
                <RoleRouteGuard allowedRoles={['coach', 'admin']}>
                  <CoachPortalView />
                </RoleRouteGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRouteGuard allowedRoles={['admin']}>
                  <AdminPortalView />
                </RoleRouteGuard>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardView />} />
            <Route
              path="/leaderboard-tv"
              element={
                <RoleRouteGuard allowedRoles={['coach', 'admin']}>
                  <LeaderboardView />
                </RoleRouteGuard>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ThemedAppShell />
    </AppProvider>
  );
};

export default App;
