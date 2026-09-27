/* ==========================================================================
   FORM — app root
   ========================================================================== */

import { Analytics } from '@vercel/analytics/react'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

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
      {/*
        Vercel Web Analytics. Mounted once, inside the router, and it renders
        `null` — there is no markup, no styling and no state, so nothing about
        the UI changes.

        It needs no router context in v2 (no useContext, no useLocation): the
        component's only job is to inject `/_vercel/insights/script.js`, and
        that script tracks route changes itself by patching the history API. So
        no `route`/`path` props are passed — supplying them would switch
        auto-tracking off and require manual pageview calls instead.

        `inject()` is idempotent, so StrictMode's double-invoked effect in
        development does not add the script twice.
      */}
      <Analytics />

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
  </StrictMode>,
)
