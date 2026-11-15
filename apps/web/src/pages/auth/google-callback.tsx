import { useAuth } from '@/context/auth-context';
import authService from '@/services/auth.service';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const GoogleCallback = () => {
  const { setUserCredentials } = useAuth();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const user = await authService.refresh();
        setUserCredentials(user);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Google sign-in failed:', error);
        toast.error("Couldn't sign in with Google", {
          description: 'Please try signing in again.',
        });
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, setUserCredentials]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default GoogleCallback;
