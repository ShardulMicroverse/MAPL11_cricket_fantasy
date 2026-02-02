import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import TeamBuilderPage from './pages/TeamBuilderPage'
import PredictionsPage from './pages/PredictionsPage'
import MyTeamPage from './pages/MyTeamPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

// Permanent Team Pages
import TeamJoinPage from './pages/TeamJoinPage'
import TeamsPage from './pages/TeamsPage'
import TeamLeaderboardPage from './pages/TeamLeaderboardPage'
import TeamDetailPage from './pages/TeamDetailPage'

// Components
import BottomNav from './components/common/BottomNav'
import Header from './components/common/Header'
import Loading from './components/common/Loading'

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const pageTransition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.25
}

// Animated page wrapper
function AnimatedRoute({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AnimatedRoute>{children}</AnimatedRoute>
}

function App() {
  const { loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Loading fullScreen message="Loading MAPL11" />
      </motion.div>
    )
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <AnimatedRoute>
                  <LoginPage />
                </AnimatedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AnimatedRoute>
                  <RegisterPage />
                </AnimatedRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <MatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:matchId"
              element={
                <ProtectedRoute>
                  <MatchDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:matchId/team-builder"
              element={
                <ProtectedRoute>
                  <TeamBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:matchId/predictions"
              element={
                <ProtectedRoute>
                  <PredictionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:matchId/my-team"
              element={
                <ProtectedRoute>
                  <MyTeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard/:matchId"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Permanent Team Routes */}
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <TeamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/join"
              element={
                <ProtectedRoute>
                  <TeamJoinPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/leaderboard"
              element={
                <ProtectedRoute>
                  <TeamLeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/:teamId"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-team"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}

export default App
