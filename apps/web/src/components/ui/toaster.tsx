import { CircleAlert, Check, Info, LoaderCircle, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Badge = ({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) => (
  <span
    className={`grid size-5 shrink-0 place-items-center rounded-full ${className}`}
  >
    {children}
  </span>
);

const Toaster = (props: ToasterProps) => (
  <Sonner
    position="bottom-right"
    gap={10}
    offset={20}
    icons={{
      success: (
        <Badge className="bg-emerald-500/15 text-emerald-400">
          <Check className="size-3" strokeWidth={3} />
        </Badge>
      ),
      error: (
        <Badge className="bg-red-500/15 text-red-400">
          <X className="size-3" strokeWidth={3} />
        </Badge>
      ),
      warning: (
        <Badge className="bg-amber-500/15 text-amber-400">
          <CircleAlert className="size-3" strokeWidth={2.5} />
        </Badge>
      ),
      info: (
        <Badge className="bg-sky-500/15 text-sky-400">
          <Info className="size-3" strokeWidth={2.5} />
        </Badge>
      ),
      loading: (
        <Badge className="bg-white/10 text-white/80">
          <LoaderCircle className="size-3 animate-spin" strokeWidth={2.5} />
        </Badge>
      ),
    }}
    style={
      {
        '--normal-bg': 'oklch(0.16 0 0 / 0.92)',
        '--normal-text': 'oklch(0.985 0 0)',
        '--normal-border': 'oklch(1 0 0 / 0.08)',
        '--border-radius': '0.875rem',
        '--width': '356px',
      } as CSSProperties
    }
    toastOptions={{
      classNames: {
        toast:
          'items-start! gap-3! px-4! py-3.5! backdrop-blur-md! shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)]!',
        icon: 'mt-px! m-0! size-5!',
        title: 'text-[13px]! font-medium! leading-5! tracking-tight!',
        description: 'mt-0.5! text-xs! leading-4! text-white/65!',
        closeButton:
          'bg-neutral-900! border-white/10! text-white/60! hover:text-white!',
      },
    }}
    {...props}
  />
);

export { Toaster };
