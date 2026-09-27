import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/cn'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-bg-sunken/85 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          /*
            The panel is a fixed frame; this inner region is the only thing that
            scrolls, and the close button is a sibling of it so it never
            scrolls away.

            An earlier version clipped the panel without any scroll region at
            all. A tall form — the PIN fields plus the disclosure — then pushed
            its own submit button and validation message past the bottom edge
            of the frame, where `overflow-hidden` made them genuinely
            unreachable. That was the "set a PIN and there is no way to carry
            on" bug.

            `dvh` rather than `vh`: on iOS the on-screen keyboard does not
            shrink `vh`, so a text field low in a tall dialog ends up behind the
            keyboard with no way to scroll it clear. The dynamic viewport unit
            follows the keyboard, so the panel gives way and the scrolling
            region can bring the focused field into view.
          */
          'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-line bg-surface shadow-2xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        <div
          data-slot="dialog-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {children}
        </div>
        {showClose && (
          <DialogPrimitive.Close
            className="press absolute top-4 right-4 z-30 flex size-9 items-center justify-center text-muted hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'sticky top-0 z-20 flex flex-col gap-2 border-b border-line bg-surface p-6 pr-16',
        className,
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('display-face text-2xl tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-relaxed text-muted', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
