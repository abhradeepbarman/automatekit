import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import authService from '@/services/auth.service';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, removeUserCredentials } = useAuth();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      toast.success('Logged out successfully', {
        description: 'See you soon!',
      });
      removeUserCredentials();
    },
    onError: (error: any) => {
      console.error('Logout failed:', error);
      toast.error('Logout failed', {
        description:
          error?.response?.data?.message ||
          'Something went wrong. Please try again.',
      });
    },
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-6xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary">
              AutomateKit
            </h1>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.name}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isPending}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
