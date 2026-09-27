import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { Hero } from '@/components/landing/Hero'
import {
  Features,
  FinalCta,
  Honesty,
  HowItWorks,
  StatStrip,
} from '@/components/landing/Sections'
import { Button } from '@/components/ui/button'
import { useActions, useProfile } from '@/store/AppStore'

export function LandingPage() {
  const active = useProfile()
  const { closeProfile } = useActions()
  const onboardingComplete = active?.onboardingComplete ?? false

  // Refresh the plan if a profile exists but the plan is missing.
  useEffect(() => {
    document.title = 'FORM — Fuel Your Transformation'
  }, [])

  return (
    <>
      <Hero />
      <StatStrip />
      <Features />
      <HowItWorks />
      <Honesty />
      <FinalCta />

      {onboardingComplete && (
        <div className="mx-auto w-full max-w-app px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-4 border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="display-face text-lg">You already have a plan</p>
              <p className="mt-1.5 text-sm text-muted">
                Jump straight in, or start over with a different profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
              <Button variant="ghost" onClick={closeProfile}>
                Switch profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
