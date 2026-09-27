/* ==========================================================================
   FORM — theme + motion preference
   ---------------------------------------------------------------------------
   Applies the theme class and the motion attribute to <html>. Motion is
   tri-state:
     auto   → follow prefers-reduced-motion
     reduce → force off, regardless of the OS
     full   → force on, regardless of the OS
   `MotionConfig` in main.tsx reads the resolved value.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useActions, useProfile } from '@/store/AppStore'
import type { MotionPref, ThemePref } from '@/types'

type Resolved = {
  theme: 'dark' | 'light'
  motion: 'reduce' | 'full'
  systemPrefersDark: boolean
  systemPrefersReducedMotion: boolean
}

const Ctx = createContext<Resolved>({
  theme: 'dark',
  motion: 'full',
  systemPrefersDark: true,
  systemPrefersReducedMotion: false,
})

function systemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function systemReduced(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveTheme(pref: ThemePref): 'dark' | 'light' {
  if (pref === 'system') return systemDark() ? 'dark' : 'light'
  return pref
}

export function resolveMotion(pref: MotionPref): 'reduce' | 'full' {
  if (pref === 'reduce') return 'reduce'
  if (pref === 'full') return 'full'
  return systemReduced() ? 'reduce' : 'full'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const profile = useProfile()?.profile
  const { setProfile } = useActions()
  // Used so the "no profile" gate still gets the motion preference applied.

  const [sysDark, setSysDark] = useState(systemDark)
  const [sysReduced, setSysReduced] = useState(systemReduced)

  // Track OS changes so `system` stays correct without a reload.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onDark = (e: MediaQueryListEvent) => setSysDark(e.matches)
    const onMotion = (e: MediaQueryListEvent) => setSysReduced(e.matches)

    darkQuery.addEventListener('change', onDark)
    motionQuery.addEventListener('change', onMotion)
    return () => {
      darkQuery.removeEventListener('change', onDark)
      motionQuery.removeEventListener('change', onMotion)
    }
  }, [])

  const pref: ThemePref = profile?.theme ?? 'dark'
  const motionPref: MotionPref = profile?.motion ?? 'auto'

  const theme = useMemo(() => {
    if (pref === 'system') return sysDark ? 'dark' : 'light'
    return pref
  }, [pref, sysDark])

  const motion = useMemo(() => {
    if (motionPref === 'reduce') return 'reduce' as const
    if (motionPref === 'full') return 'full' as const
    return sysReduced ? ('reduce' as const) : ('full' as const)
  }, [motionPref, sysReduced])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    // Keeps the browser chrome (address bar) in step with the theme.
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])

  const setTheme = useCallback(
    (next: ThemePref) => {
      if (!profile) return
      setProfile({ theme: next })
    },
    [profile, setProfile],
  )

  const setMotion = useCallback(
    (next: MotionPref) => {
      if (!profile) return
      setProfile({ motion: next })
    },
    [profile, setProfile],
  )

  const value = useMemo<Resolved>(
    () => ({
      theme,
      motion,
      systemPrefersDark: sysDark,
      systemPrefersReducedMotion: sysReduced,
    }),
    [theme, motion, sysDark, sysReduced],
  )

  return (
    <Ctx.Provider value={value}>
      <ThemeControlsContext.Provider value={{ setTheme, setMotion }}>
        {children}
      </ThemeControlsContext.Provider>
    </Ctx.Provider>
  )
}

const ThemeControlsContext = createContext<{
  setTheme: (t: ThemePref) => void
  setMotion: (m: MotionPref) => void
}>({ setTheme: () => {}, setMotion: () => {} })

export function useTheme(): Resolved {
  return useContext(Ctx)
}

export function useThemeControls() {
  return useContext(ThemeControlsContext)
}
