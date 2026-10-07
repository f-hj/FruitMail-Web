import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminDmarc from './AdminDmarc'
import AdminDmarcReport from './AdminDmarcReport'
import App from './App'
import Callback from './Callback'
import MailLayout from './MailLayout'
import Settings from './Settings'
import WriteMail from './WriteMail'

// Carbon uses a semibold weight in a few places (header name, headings), so
// the bold face of Atkinson Hyperlegible is loaded as well
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import './carbon.scss'
import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new/inbox" replace />} />
        <Route path="/oauthCallback" element={<Callback />} />
        <Route element={<App />}>
          <Route path="/writeMail" element={<WriteMail />} />
          <Route path="/writeMail/:inReplyTo" element={<WriteMail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/dmarc" element={<AdminDmarc />} />
          <Route path="/admin/dmarc/reports/:id" element={<AdminDmarcReport />} />
          <Route path="/:type/:folder" element={<MailLayout />} />
          <Route path="/:type/:folder/:id" element={<MailLayout />} />
          <Route path="*" element={<Navigate to="/new/inbox" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
