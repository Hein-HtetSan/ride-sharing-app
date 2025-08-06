import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import RiderDashboard from './components/Rider/RiderDashboard';
import DriverDashboard from './components/Driver/DriverDashboard';
import LandingPage from './pages/LandingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function AuthWrapper() {
  const { isAuthenticated, isDriver, isRider } = useAuth();

  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={isAuthenticated ? (
        isDriver ? <Navigate to="/driver" replace /> : <Navigate to="/rider" replace />
      ) : <LandingPage />} />
      
      {/* Auth routes */}
      <Route path="/login/rider" element={!isAuthenticated ? <LoginForm userType="RIDER" /> : <Navigate to="/rider" replace />} />
      <Route path="/login/driver" element={!isAuthenticated ? <LoginForm userType="DRIVER" /> : <Navigate to="/driver" replace />} />
      <Route path="/register/rider" element={!isAuthenticated ? <RegisterForm userType="RIDER" /> : <Navigate to="/rider" replace />} />
      <Route path="/register/driver" element={!isAuthenticated ? <RegisterForm userType="DRIVER" /> : <Navigate to="/driver" replace />} />
      
      {/* Protected dashboard routes */}
      <Route path="/rider" element={
        <ProtectedRoute>
          <LocationProvider>
            {isRider ? <RiderDashboard /> : <Navigate to="/driver" replace />}
          </LocationProvider>
        </ProtectedRoute>
      } />
      <Route path="/driver" element={
        <ProtectedRoute>
          <LocationProvider>
            {isDriver ? <DriverDashboard /> : <Navigate to="/rider" replace />}
          </LocationProvider>
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AuthWrapper />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;