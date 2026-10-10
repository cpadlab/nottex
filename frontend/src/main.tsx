import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles.css'
import App from '@/app.tsx'

import '@/lib/i18n.ts'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
