import { Button } from '@/components/ui/button';
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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            AutomateKit
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Streamline your workflow with powerful automation tools. 
            Simple, efficient, and built for productivity.
          </p>
        </div>
        
        <Button 
          size="lg" 
          onClick={() => navigate('/login')}
          className="h-12 px-8 text-lg"
        >
          Login to Continue
        </Button>
      </div>

      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:bg-black dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] opacity-20" />
    </div>
  );
};

export default Home;
