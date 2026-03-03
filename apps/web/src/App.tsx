import { Route, Routes } from 'react-router-dom';
import Home from './pages/home';
import AuthLayout from './layout/auth-layout';
import Register from './pages/auth/register';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot-password';
import ResetPassword from './pages/auth/reset-password';
import ProtectedLayout from './layout/protected-layout';
import Dashboard from './pages/dashboard';
import Workflow from './pages/workflow';
import OAuthCallback from './pages/auth/oauth-callback';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/" element={<AuthLayout />}>
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
      </Route>
      <Route path="/" element={<ProtectedLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="workflow/:id" element={<Workflow />} />
      </Route>
      <Route path="/auth/:app/callback" element={<OAuthCallback />} />
    </Routes>
  );
};

export default App;
