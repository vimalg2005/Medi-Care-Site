import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClerkKeyConfigured ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
        <App isClerkEnabled={true} />
      </ClerkProvider>
    ) : (
      <App isClerkEnabled={false} />
    )}
  </StrictMode>,
)
