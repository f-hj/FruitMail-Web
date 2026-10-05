import { InlineLoading } from '@carbon/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { setToken } from './api'

/**
 * Landing page of the OAuth implicit flow. The authorization server redirects
 * back to `/oauthCallback#access_token=...&token_type=Bearer`; the token is
 * stored and the user is sent to their inbox.
 */
export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = params.get('access_token')
    if (token) {
      setToken(token)
    }
    navigate('/', { replace: true })
  }, [navigate])

  return (
    <div className="callback">
      <InlineLoading description="Signing you in…" />
    </div>
  )
}
