import { Link } from 'react-router-dom'

import { Eyebrow, PageShell, PageTitle, PageLead } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <PageShell width="narrow">
      <div className="text-center">
        <Eyebrow>404</Eyebrow>
        <PageTitle className="mt-4">That page is not here.</PageTitle>
        <PageLead className="mx-auto mt-4">
          The link may be out of date, or the address may have a typo in it.
        </PageLead>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/">Back to the start</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
