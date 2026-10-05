import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import App from './App'
import Callback from './Callback'
import MailLayout from './MailLayout'
import WriteMail from './WriteMail'

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
          <Route path="/:type/:folder" element={<MailLayout />} />
          <Route path="/:type/:folder/:id" element={<MailLayout />} />
          <Route path="*" element={<Navigate to="/new/inbox" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
