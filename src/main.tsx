import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { handleRedirect } from './spotify/auth'

// Finish the Spotify sign-in redirect before rendering, so the app sees the token.
handleRedirect()
  .catch((e) => alert(e.message))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
