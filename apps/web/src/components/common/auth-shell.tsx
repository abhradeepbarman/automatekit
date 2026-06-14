import Logo from '@/components/common/logo';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthShellProps {
  tagline?: string;
  children: ReactNode;
}

export default function AuthShell({ tagline, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background layers */}
      <div className="bg-line-grid mask-fade-b pointer-events-none absolute inset-0 opacity-60" />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-foreground/[0.06] blur-3xl"
        style={{ animation: 'float-slow 10s ease-in-out infinite' }}
      />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 space-y-7 duration-700">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <Logo markClassName="size-10 rounded-xl" wordmarkClassName="text-2xl" />
          </Link>
          {tagline && (
            <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
