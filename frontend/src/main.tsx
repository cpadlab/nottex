import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client'

import '@/styles.css'

import App from '@/app.tsx'
import '@/lib/i18n.ts'

import { TooltipProvider } from '@/components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <TooltipProvider>
                <App />
            </TooltipProvider>
        </BrowserRouter>
    </StrictMode>,
)
