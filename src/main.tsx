/* ==========================================================================
   FORM — app root
   ========================================================================== */

import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'

import { App } from '@/App'
import { ThemeProvider, useTheme } from '@/components/layout/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppStoreProvider } from '@/store/AppStore'
import '@/index.css'

function MotionShell({ children }: { children: React.ReactNode }) {
  const { motion } = useTheme()
  return <MotionConfig reducedMotion={motion === 'reduce' ? 'always' : 'user'}>{children}</MotionConfig>
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found in index.html')

/**
 * `import.meta.env.BASE_URL` is Vite's `base`, so the router's basename and the
 * asset URLs can never disagree — including when the site is hosted under a
 * sub-path via `PUBLIC_BASE_PATH`. Without this, hosting at `example.com/form/`
 * makes every route 404 because React Router would still be matching `/app/...`
 * style paths against the full URL.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <AppStoreProvider>
        <ThemeProvider>
          <MotionShell>
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
              <App />
            </TooltipProvider>
          </MotionShell>
        </ThemeProvider>
      </AppStoreProvider>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)
