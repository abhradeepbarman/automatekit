import Logo from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ArrowRight, Clock, Webhook, Zap } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 text-center">
      {/* Background layers */}
      <div className="bg-line-grid mask-fade-b pointer-events-none absolute inset-0 opacity-70" />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-foreground/5 blur-3xl"
        style={{ animation: 'float-slow 9s ease-in-out infinite' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-[12%] h-72 w-72 rounded-full bg-foreground/[0.04] blur-3xl"
        style={{ animation: 'float-slow 11s ease-in-out infinite 1s' }}
      />

      {/* Content */}
      <div className="relative z-10 flex max-w-3xl flex-col items-center">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Logo
            iconOnly
            markClassName="size-14 rounded-2xl"
          />
        </div>

        <div className="mt-8 inline-flex animate-in fade-in slide-in-from-bottom-3 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs duration-700 [animation-delay:80ms]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
            <span className="relative inline-flex size-1.5 rounded-full bg-foreground" />
          </span>
          Automation, simplified
        </div>

        <h1 className="mt-6 animate-in fade-in slide-in-from-bottom-4 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight duration-700 [animation-delay:120ms] sm:text-6xl md:text-7xl">
          Build workflows that
          <br className="hidden sm:block" /> run themselves
        </h1>

        <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 text-pretty text-base leading-relaxed text-muted-foreground duration-700 [animation-delay:200ms] sm:text-lg">
          Connect your apps, trigger on any event, and let AutomateKit handle
          the busywork. Simple, reliable, and built for momentum.
        </p>

        <div className="mt-10 flex animate-in fade-in slide-in-from-bottom-4 flex-col items-center gap-3 duration-700 [animation-delay:280ms] sm:flex-row">
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="group h-12 gap-2 rounded-xl px-7 text-base shadow-lg shadow-foreground/10"
          >
            Get started free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/login')}
            className="h-12 rounded-xl px-7 text-base"
          >
            Sign in
          </Button>
        </div>

        <div className="mt-14 flex animate-in fade-in flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-muted-foreground duration-1000 [animation-delay:400ms]">
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4" /> No-code builder
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-2">
            <Webhook className="size-4" /> Webhook triggers
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4" /> Scheduled runs
          </span>
        </div>
      </div>
    </div>
  );
};

export default Home;
