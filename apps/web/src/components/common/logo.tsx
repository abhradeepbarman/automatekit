import { cn } from '@/lib/utils';
import { Workflow } from 'lucide-react';

interface LogoProps {
  /** Render only the icon mark, without the wordmark. */
  iconOnly?: boolean;
  className?: string;
  /** Tailwind size classes for the square mark, e.g. "size-9". */
  markClassName?: string;
  /** Tailwind text classes for the wordmark. */
  wordmarkClassName?: string;
}

export default function Logo({
  iconOnly = false,
  className,
  markClassName,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative grid place-items-center rounded-[0.6rem] bg-primary text-primary-foreground shadow-sm size-8',
          'after:absolute after:inset-0 after:rounded-[0.6rem] after:bg-gradient-to-br after:from-white/15 after:to-transparent',
          markClassName,
        )}
      >
        <Workflow className="relative size-[55%]" strokeWidth={2.25} />
      </span>
      {!iconOnly && (
        <span
          className={cn(
            'font-display text-lg font-bold tracking-tight',
            wordmarkClassName,
          )}
        >
          AutomateKit
        </span>
      )}
    </span>
  );
}
