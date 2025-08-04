import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import RiderDashboard from './components/Rider/RiderDashboard';
import DriverDashboard from './components/Driver/DriverDashboard';
import LandingPage from './pages/LandingPage';

type AuthMode = 'login' | 'register';
type UserType = 'rider' | 'driver';

function AuthWrapper() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [userType, setUserType] = useState<UserType>('rider');
  const [showAuth, setShowAuth] = useState(false);

  const { isAuthenticated, isDriver, isRider } = useAuth();

  if (isAuthenticated) {
    return (
      <LocationProvider>
        <Routes>
          <Route 
            path="/" 
            element={
              isDriver ? (
                <Navigate to="/driver" replace />
              ) : (
                <Navigate to="/rider" replace />
              )
            } 
          />
          <Route 
            path="/rider" 
            element={isRider ? <RiderDashboard /> : <Navigate to="/driver" replace />} 
          />
          <Route 
            path="/driver" 
            element={isDriver ? <DriverDashboard /> : <Navigate to="/rider" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LocationProvider>
    );
  }

  if (showAuth) {
    return (
      <>
        {authMode === 'login' ? (
          <LoginForm
            userType={userType}
            onSuccess={() => setShowAuth(false)}
            onSwitchToRegister={() => setAuthMode('register')}
          />
        ) : (
          <RegisterForm
            userType={userType}
            onSuccess={() => setShowAuth(false)}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </>
    );
  }

  return (
    <LandingPage
      onRiderSignup={() => {
        setUserType('rider');
        setAuthMode('register');
        setShowAuth(true);
      }}
      onDriverSignup={() => {
        setUserType('driver');
        setAuthMode('register');
        setShowAuth(true);
      }}
    />
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