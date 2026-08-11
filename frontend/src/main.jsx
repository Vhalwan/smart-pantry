import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { rehydratePendingRemovals } from './api/pendingIngredientRemovals'

// Flush/reschedule any delayed ingredient DELETEs persisted across reload.
rehydratePendingRemovals()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
