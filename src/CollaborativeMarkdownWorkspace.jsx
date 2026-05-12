import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

const ui = {
  shell: {
    height: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: 64,
    padding: '0 18px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  split: {
    height: '75%',
    padding: 16,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    minHeight: 0,
  },
  panel: {
    minHeight: 0,
    overflow: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
    position: 'relative',
  },
  panelTitle: {
    position: 'sticky',
    top: 0,
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
    zIndex: 2,
  },
}

function renderPreview(text) {
  return text.split('\n').map((line, idx) => {
    if (/^###\s+/.test(line)) return <h3 key={idx}>{line.replace(/^###\s+/, '')}</h3>
    if (/^##\s+/.test(line)) return <h2 key={idx}>{line.replace(/^##\s+/, '')}</h2>
    if (/^#\s+/.test(line)) return <h1 key={idx}>{line.replace(/^#\s+/, '')}</h1>
    if (/^\*\s+/.test(line)) return <li key={idx} style={{ marginLeft: 18 }}>{line.replace(/^\*\s+/, '')}</li>

    const pieces = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={idx} style={{ margin: '8px 0', color: '#334155' }}>
        {pieces.map((p, i) =>
          /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>,
        )}
      </p>
    )
  })
}

export default function CollaborativeMarkdownWorkspace() {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [status, setStatus] = useState('Syncing')
  const [rawText, setRawText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [handleTop, setHandleTop] = useState(92)
  const [activeNodePos, setActiveNodePos] = useState(null)
  const [blockBgPositions, setBlockBgPositions] = useState([])

  const editorPaneRef = useRef(null)

  const editor = useEditor({
    extensions: [StarterKit.configure({ history: false }), Collaboration.configure({ document: ydoc })],
    content: '# Notion-style Free Drag Handle\n\nHover around blocks and click the six dots menu.',
    editorProps: {
      attributes: {
        style:
          'padding: 22px 18px 24px 62px; min-height: 100%; outline: none; line-height: 1.7; font-size: 15px; color: #0f172a;',
      },
      handleDOMEvents: {
        mousemove: (_, event) => {
          const root = editorPaneRef.current
          if (!root) return false
          const target = event.target
          if (!(target instanceof HTMLElement)) return false
          const block = target.closest('p, h1, h2, h3, li, blockquote, pre')
          if (!block) return false

          const paneRect = root.getBoundingClientRect()
          const blockRect = block.getBoundingClientRect()
          const nextTop = blockRect.top - paneRect.top + root.scrollTop
          setHandleTop(nextTop)
          return false
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      setStatus('Syncing')
      setRawText(ed.getText())
      requestAnimationFrame(() => setStatus('Offline'))
    },
    onCreate: ({ editor: ed }) => setRawText(ed.getText()),
  })

  useEffect(() => {
    if (!editor) return

    const refreshPosition = () => {
      const { state, view } = editor
      const { from } = state.selection
      const resolved = state.doc.resolve(from)
      const depth = resolved.depth > 0 ? 1 : 0
      const pos = depth > 0 ? resolved.before(depth) : 0
      setActiveNodePos(pos)

      try {
        const coords = view.coordsAtPos(from)
        const pane = editorPaneRef.current
        if (!pane) return
        const paneRect = pane.getBoundingClientRect()
        const top = coords.top - paneRect.top + pane.scrollTop
        setHandleTop(top)
      } catch {
        // ignore invalid positions during initialization
      }
    }

    refreshPosition()
    editor.on('selectionUpdate', refreshPosition)
    editor.on('transaction', refreshPosition)

    return () => {
      editor.off('selectionUpdate', refreshPosition)
      editor.off('transaction', refreshPosition)
    }
  }, [editor])

  useEffect(() => {
    return () => ydoc.destroy()
  }, [ydoc])

  const applyBlockColor = () => {
    if (!editor || activeNodePos == null) return
    setBlockBgPositions((prev) => (prev.includes(activeNodePos) ? prev : [...prev, activeNodePos]))
    setMenuOpen(false)
  }

  const nodes = editor?.state.doc.content.content ?? []
  let rollingPos = 0

  return (
    <div style={ui.shell}>
      <header style={ui.header}>
        <div style={{ fontWeight: 650 }}>Collaborative Markdown Workspace</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 999, padding: '5px 10px', background: '#f8fafc' }}>
            {status}
          </div>
          <div style={{ display: 'flex' }}>
            {['AS', 'JR', 'PL'].map((u, i) => (
              <span key={u} style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: i ? -8 : 0, background: ['#bfdbfe', '#ddd6fe', '#fecdd3'][i], border: '2px solid #fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{u}</span>
            ))}
          </div>
        </div>
      </header>

      <section style={ui.split}>
        <div style={ui.panel}>
          <div style={ui.panelTitle}>EDITOR</div>
          <div ref={editorPaneRef} style={{ height: 'calc(100% - 38px)', overflow: 'auto', position: 'relative' }}>
            {nodes.length > 0 && (
              <div style={{ position: 'absolute', left: 16, top: 18, width: 28, zIndex: 1 }}>
                {nodes.map((node) => {
                  const pos = rollingPos
                  rollingPos += node.nodeSize
                  const bg = blockBgPositions.includes(pos) ? '#fef9c3' : 'transparent'
                  return <div key={pos} style={{ height: 35, borderRadius: 6, background: bg, marginBottom: 4, transition: 'background 160ms ease' }} />
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                position: 'absolute',
                left: 16,
                top: handleTop,
                transform: 'translateY(-2px)',
                width: 26,
                height: 26,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 140ms ease',
                boxShadow: menuOpen ? '0 6px 24px rgba(15, 23, 42, 0.15)' : '0 2px 6px rgba(15, 23, 42, 0.08)',
              }}
            >
              ⋮⋮
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  top: handleTop + 30,
                  width: 220,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 16px 30px rgba(2, 6, 23, 0.12)',
                  padding: 8,
                  zIndex: 10,
                }}
              >
                {[
                  { label: 'Delete Block', action: () => editor?.commands.deleteNode('paragraph') },
                  { label: 'Turn Into H1', action: () => editor?.commands.toggleHeading({ level: 1 }) },
                  { label: 'Turn Into Bullet List', action: () => editor?.commands.toggleBulletList() },
                  { label: 'Change Color', action: applyBlockColor },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action()
                      setMenuOpen(false)
                      editor?.commands.focus()
                    }}
                    style={{ width: '100%', textAlign: 'left', border: 0, background: '#fff', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <EditorContent editor={editor} />
          </div>
        </div>

        <div style={ui.panel}>
          <div style={ui.panelTitle}>LIVE PREVIEW</div>
          <div style={{ padding: 18 }}>{renderPreview(rawText)}</div>
        </div>
      </section>

      <section style={{ height: '25%', margin: '0 16px 16px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', padding: 16, overflow: 'auto' }}>
        {!rawText.trim() ? (
          <div>
            <h3 style={{ margin: '0 0 8px' }}>Smart Toolbox · Quick Start</h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#475569' }}>
              <li><code>#</code> for headings</li>
              <li><code>*</code> for bullet lists</li>
              <li><code>**bold**</code> for emphasis</li>
            </ul>
          </div>
        ) : /(^|\n)#{1,6}\s+/.test(rawText) || /(^|\n)\*\s+/.test(rawText) ? (
          <div>
            <h3 style={{ margin: '0 0 8px' }}>Smart Toolbox · Structure Tips</h3>
            <p style={{ margin: 0, color: '#475569' }}>
              Great structure detected. Keep headings short and list items action-oriented for better readability.
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 8px' }}>Smart Toolbox · Writing Insights</h3>
            <p style={{ margin: 0, color: '#475569' }}>Words: {rawText.split(/\s+/).filter(Boolean).length} · Characters: {rawText.length}</p>
          </div>
        )}
      </section>
    </div>
  )
}
