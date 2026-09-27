import * as React from 'react'

import { cn } from '@/lib/cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full resize-y border border-line bg-surface-inset px-4 py-3 text-base text-ink transition-colors',
        'placeholder:text-faint',
        'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
