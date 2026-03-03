import { Button } from '@/components/ui/button';
import { SparklesCore } from '@/components/ui/sparkles';
import { useAuth } from '@/context/auth-context';
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
    <div className="relative flex h-screen w-full items-center justify-center bg-background p-4 text-center overflow-hidden">
      {/* Background Effect */}
      <SparklesCore
        id="tsparticlesfullpage"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={100}
        className="absolute inset-0 w-full h-full"
        particleColor="#070B47"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            AutomateKit
          </h1>

          <p className="max-w-2xl leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Streamline your workflow with powerful automation tools. Simple,
            efficient, and built for productivity.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => navigate('/login')}
          className="h-12 px-8 text-lg rounded-2xl"
        >
          Login to Continue
        </Button>
      </div>
    </div>
  );
};

export default Home;
