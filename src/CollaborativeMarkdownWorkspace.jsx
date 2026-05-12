import React, { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

const styles = {
  appShell: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f1f5f9',
    color: '#0f172a',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    height: 64,
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 2px rgba(2, 6, 23, 0.04)',
  },
  title: {
    fontSize: 18,
    fontWeight: 650,
    letterSpacing: '-0.02em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  statusBadge: (connected) => ({
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    padding: '6px 10px',
    background: connected ? '#dcfce7' : '#fef2f2',
    color: connected ? '#166534' : '#991b1b',
    border: `1px solid ${connected ? '#86efac' : '#fecaca'}`,
  }),
  avatars: { display: 'flex', alignItems: 'center' },
  avatar: (idx) => ({
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #ffffff',
    marginLeft: idx === 0 ? 0 : -8,
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    background: ['#bfdbfe', '#c7d2fe', '#fecdd3'][idx % 3],
  }),
  topPane: {
    height: '75%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    padding: 16,
    minHeight: 0,
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    boxShadow: '0 1px 3px rgba(2, 6, 23, 0.05)',
    minHeight: 0,
    overflow: 'auto',
  },
  panelHeader: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    position: 'sticky',
    top: 0,
    background: '#fff',
    zIndex: 1,
  },
  editorWrapper: { padding: 18, lineHeight: 1.6 },
  previewWrapper: { padding: 18, lineHeight: 1.7 },
  bottomPane: {
    height: '25%',
    borderTop: '1px solid #e2e8f0',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    margin: '0 16px 16px',
    borderRadius: 14,
    overflow: 'auto',
    padding: 16,
  },
}

function parseMarkdownLine(line, i) {
  const safe = line.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!safe.trim()) return <div key={i} style={{ height: 8 }} />

  if (safe.startsWith('# ')) return <h1 key={i}>{inlineFormat(safe.slice(2))}</h1>
  if (safe.startsWith('## ')) return <h2 key={i}>{inlineFormat(safe.slice(3))}</h2>
  if (safe.startsWith('### ')) return <h3 key={i}>{inlineFormat(safe.slice(4))}</h3>

  if (safe.startsWith('* ')) {
    return (
      <ul key={i} style={{ paddingLeft: 22, margin: '8px 0' }}>
        <li>{inlineFormat(safe.slice(2))}</li>
      </ul>
    )
  }

  return <p key={i}>{inlineFormat(safe)}</p>
}

function inlineFormat(text) {
  const parts = []
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g)
  boldSplit.forEach((chunk, idx) => {
    if (/^\*\*[^*]+\*\*$/.test(chunk)) {
      parts.push(<strong key={`b-${idx}`}>{chunk.slice(2, -2)}</strong>)
    } else {
      parts.push(<React.Fragment key={`t-${idx}`}>{chunk}</React.Fragment>)
    }
  })
  return parts
}

function WidgetPane({ text }) {
  const trimmed = text.trim()
  const hasHeader = /(^|\n)#{1,6}\s+/.test(text)
  const hasAssets = /!\[[^\]]*\]\([^\)]+\)|\[[^\]]+\]\([^\)]+\)/.test(text)

  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
  const chars = text.length
  const readMinutes = Math.max(1, Math.ceil(words / 200))

  if (!trimmed) {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px' }}>Getting Started</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#334155' }}>
          <li><code># Heading</code> for section titles</li>
          <li><code>**bold**</code> for emphasis</li>
          <li><code>* item</code> for bullet lists</li>
          <li><code>[text](url)</code> and <code>![alt](img)</code> for references</li>
        </ul>
      </div>
    )
  }

  if (hasAssets) {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px' }}>Asset &amp; Reference Manager</h3>
        <p style={{ marginTop: 0, color: '#475569' }}>
          External links or images detected. Review and organize references before publishing.
        </p>
        <div style={{ fontSize: 14, color: '#0f172a' }}>
          <div>• Link/Image blocks found in current draft.</div>
          <div>• Consider validating URLs and alt text quality.</div>
        </div>
      </div>
    )
  }

  if (hasHeader) {
    const toc = text
      .split('\n')
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => line.replace(/^#{1,6}\s+/, '').trim())

    return (
      <div>
        <h3 style={{ margin: '0 0 8px' }}>Structure Checklist</h3>
        <p style={{ marginTop: 0, color: '#475569' }}>Live outline of your headings:</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {toc.map((item, idx) => (
            <li key={`${item}-${idx}`} style={{ marginBottom: 4 }}>
              ☐ {item}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 10px' }}>Document Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <MetricCard label="Words" value={words} />
        <MetricCard label="Characters" value={chars} />
        <MetricCard label="Read Time" value={`${readMinutes} min`} />
      </div>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 650 }}>{value}</div>
    </div>
  )
}

export default function CollaborativeMarkdownWorkspace() {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const ytext = useMemo(() => ydoc.getText('monodoc'), [ydoc])

  const [rawText, setRawText] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    const updateText = () => setRawText(ytext.toString())
    updateText()
    ytext.observe(updateText)
    return () => ytext.unobserve(updateText)
  }, [ytext])

  useEffect(() => {
    const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', 'collab-markdown-editor-demo', ydoc, {
      connect: true,
    })

    const updateStatus = ({ status }) => setConnectionStatus(status)
    provider.on('status', updateStatus)

    return () => {
      provider.off('status', updateStatus)
      provider.destroy()
    }
  }, [ydoc])

  const editor = useEditor({
    extensions: [StarterKit.configure({ history: false }), Collaboration.configure({ document: ydoc })],
    editorProps: {
      attributes: {
        style:
          'min-height: 100%; outline: none; font-size: 15px; color: #0f172a;',
      },
    },
    content:
      '# Collaborative Markdown\n\nStart typing with your team in real-time.\n\n* Add bullets\n* Add headings\n* Add **emphasis**',
  })

  return (
    <div style={styles.appShell}>
      <header style={styles.header}>
        <div style={styles.title}>Collaborative Markdown Workspace</div>
        <div style={styles.headerRight}>
          <span style={styles.statusBadge(connectionStatus === 'connected')}>
            {connectionStatus === 'connected' ? 'Connected' : 'Offline / Reconnecting'}
          </span>
          <div style={styles.avatars}>
            {['AB', 'JS', 'MK'].map((initials, idx) => (
              <span key={initials} style={styles.avatar(idx)}>{initials}</span>
            ))}
          </div>
        </div>
      </header>

      <section style={styles.topPane}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>Editor</div>
          <div style={styles.editorWrapper}>
            <EditorContent editor={editor} />
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>Live Preview</div>
          <div style={styles.previewWrapper}>
            {rawText.split('\n').map((line, idx) => parseMarkdownLine(line, idx))}
          </div>
        </div>
      </section>

      <section style={styles.bottomPane}>
        <WidgetPane text={rawText} />
      </section>
    </div>
  )
}
