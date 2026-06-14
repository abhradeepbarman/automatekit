import Logo from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import authService from '@/services/auth.service';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            to="/dashboard"
            className="transition-opacity hover:opacity-80"
          >
            <Logo />
          </Link>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden items-center gap-2.5 rounded-full border border-border/70 bg-card py-1 pl-1 pr-3 shadow-xs sm:flex">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </span>
                <span className="text-sm font-medium text-foreground/90">
                  {user.name}
                </span>
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
              <span className="hidden sm:inline">
                {isPending ? 'Logging out...' : 'Logout'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
