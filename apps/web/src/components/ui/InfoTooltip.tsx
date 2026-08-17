'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type InfoTooltipSide = 'top' | 'bottom' | 'left' | 'right';

export type InfoTooltipProps = {
  /** Tooltip body — plain text or custom markup. */
  content: ReactNode;
  /** Preferred placement relative to the info icon. */
  side?: InfoTooltipSide;
  /** Accessible name for the trigger button. */
  ariaLabel?: string;
  className?: string;
  /** Icon size in px (default 14). */
  iconSize?: 14 | 16;
};

/**
 * Compact info icon that reveals a styled tooltip on hover, focus, or tap.
 * Built on the shared Radix / shadcn Tooltip primitives.
 */
export default function InfoTooltip({
  content,
  side = 'top',
  ariaLabel = 'More information',
  className,
  iconSize = 14,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={180} skipDelayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-expanded={open}
            onClick={(e) => {
              // Toggle for touch / click; hover / focus still driven by Radix.
              e.preventDefault();
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className={cn(
              'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl',
              'text-slate-400 transition-colors duration-150',
              'hover:bg-slate-100 hover:text-slate-600',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]/35 focus-visible:ring-offset-1',
              'active:bg-slate-100/80',
              className
            )}
          >
            <Info
              size={iconSize}
              strokeWidth={2}
              className="pointer-events-none"
              aria-hidden
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={6}
          className="max-w-[260px] text-left text-xs font-medium leading-relaxed"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
