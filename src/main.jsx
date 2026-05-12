import React from 'react'
import { createRoot } from 'react-dom/client'
import CollaborativeMarkdownWorkspace from './CollaborativeMarkdownWorkspace'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CollaborativeMarkdownWorkspace />
  </React.StrictMode>,
)
