import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { AppProviders } from '@/app/AppProviders'
import { router } from '@/app/router'

import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Das Root-Element der Anwendung wurde nicht gefunden.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
