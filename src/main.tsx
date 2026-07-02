import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// default to light; restore saved preference
const saved = localStorage.getItem('sb-theme')
const root = document.documentElement
root.classList.remove('dark', 'light')
root.classList.add(saved === 'dark' ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
