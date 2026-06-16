import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import HomeRoute from './routes/Home'
import CategoryRoute from './routes/CategoryRoute'
import { applyTheme, storedTheme } from './lib/theme'
import './index.css'

// Apply the remembered theme before first paint to avoid a flash; App then
// reconciles it against the canonical value in config.json.
applyTheme(storedTheme())

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: ':category', element: <CategoryRoute /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
