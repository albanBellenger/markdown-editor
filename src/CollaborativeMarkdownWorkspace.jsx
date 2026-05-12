import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

const ACTION_RESPONSES = {
  'Continue Writing':
    'Furthermore, optimizing layout workflows requires clean separation of state between editor canvas instances and reactive widget wrappers...',
  'Summarize Selection':
    'In summary, this document maps out a clean frontend collaborative architecture using Tiptap and Yjs.',
  'Improve Grammar':
    'This section has been refined for grammar, clarity, and readability while preserving the original meaning.',
  'Change Tone to Professional':
    'This passage has been revised to deliver a professional, concise, and stakeholder-friendly tone.',
}

export default function CollaborativeMarkdownWorkspace() {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const editorPaneRef = useRef(null)
  const streamTimerRef = useRef(null)

  const [status, setStatus] = useState('Offline')
  const [rawText, setRawText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [handleTop, setHandleTop] = useState(92)
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  const [aiPos, setAiPos] = useState({ top: 0, left: 0 })
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit.configure({ history: false }), Collaboration.configure({ document: ydoc })],
    content: '# AI-assisted Collaborative Workspace

Select text to trigger the AI menu or press Ctrl/Cmd + K.',
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
          setHandleTop(blockRect.top - paneRect.top + root.scrollTop)
          return false
        },
      },
    },
    onCreate: ({ editor: ed }) => setRawText(ed.getText()),
    onUpdate: ({ editor: ed }) => {
      setRawText(ed.getText())
      setStatus('Syncing')
      requestAnimationFrame(() => setStatus('Offline'))
    },
  })

  const stopGenerating = () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current)
    streamTimerRef.current = null
    setIsGenerating(false)
  }

  const streamIntoEditor = (text) => {
    if (!editor) return
    stopGenerating()
    setIsGenerating(true)

    const words = text.split(' ')
    let index = 0
    streamTimerRef.current = setInterval(() => {
      if (!editor) return
      if (index >= words.length) {
        stopGenerating()
        return
      }
      editor.commands.insertContent(`${index === 0 ? '' : ' '}${words[index]}`)
      index += 1
    }, 50)
  }

  const updateAiPosition = () => {
    if (!editor || !editorPaneRef.current) return
    const { from, to } = editor.state.selection
    if (from === to) {
      setAiMenuOpen(false)
      return
    }
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    const paneRect = editorPaneRef.current.getBoundingClientRect()
    const top = Math.max(10, end.bottom - paneRect.top + editorPaneRef.current.scrollTop + 8)
    const left = Math.max(16, (start.left + end.right) / 2 - paneRect.left - 140)
    setAiPos({ top, left })
    setAiMenuOpen(true)
  }

  useEffect(() => {
    if (!editor) return
    const onSelection = () => updateAiPosition()
    editor.on('selectionUpdate', onSelection)

    const onKeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const { from, to } = editor.state.selection
        if (from === to) {
          const c = editor.view.coordsAtPos(from)
          const paneRect = editorPaneRef.current?.getBoundingClientRect()
          if (!paneRect || !editorPaneRef.current) return
          setAiPos({ top: c.bottom - paneRect.top + editorPaneRef.current.scrollTop + 8, left: c.left - paneRect.left - 80 })
          setAiMenuOpen((v) => !v)
        } else {
          updateAiPosition()
        }
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => {
      editor.off('selectionUpdate', onSelection)
      window.removeEventListener('keydown', onKeydown)
    }
  }, [editor])

  useEffect(() => () => {
    stopGenerating()
    ydoc.destroy()
  }, [ydoc])

  const runAction = (action) => {
    if (!editor) return
    const text = ACTION_RESPONSES[action] || `AI Suggestion: ${customPrompt || 'Refined output generated locally.'}`
    streamIntoEditor(text)
  }

  return (
    <div style={{ height: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 64, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
        <div style={{ fontWeight: 650 }}>Collaborative Markdown Workspace</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 999, padding: '5px 10px' }}>{status}</span>
          <div style={{ display: 'flex' }}>{['AS', 'JR', 'PL'].map((u, i) => <span key={u} style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: i ? -8 : 0, background: ['#bfdbfe', '#ddd6fe', '#fecdd3'][i], border: '2px solid #fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{u}</span>)}</div>
        </div>
      </header>

      <section style={{ height: '75%', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 0 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', position: 'relative', overflow: 'auto' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#64748b' }}>EDITOR</div>
          <div ref={editorPaneRef} style={{ height: 'calc(100% - 38px)', overflow: 'auto', position: 'relative' }}>
            <button type="button" onClick={() => setMenuOpen((v) => !v)} style={{ position: 'absolute', left: 16, top: handleTop, width: 26, height: 26, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', zIndex: 3 }}>⋮⋮</button>
            {menuOpen && <div style={{ position: 'absolute', top: handleTop + 30, left: 16, width: 180, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 20px rgba(2, 6, 23, 0.12)', padding: 8, zIndex: 4 }}>
              {['Delete Block', 'Turn Into H1', 'Turn Into Bullet List'].map((i) => <button key={i} onClick={() => { if (i === 'Delete Block') editor?.commands.deleteNode('paragraph'); if (i === 'Turn Into H1') editor?.commands.toggleHeading({ level: 1 }); if (i === 'Turn Into Bullet List') editor?.commands.toggleBulletList(); setMenuOpen(false) }} style={{ width: '100%', border: 0, background: '#fff', padding: 8, textAlign: 'left', borderRadius: 8 }}>{i}</button>)}
            </div>}

            {aiMenuOpen && (
              <div style={{ position: 'absolute', top: aiPos.top, left: aiPos.left, width: 280, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: 10, zIndex: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#4f46e5', fontWeight: 600 }}>
                  <span>✦</span><span>AI Assistant</span>
                  {isGenerating && <button onClick={stopGenerating} style={{ marginLeft: 'auto', border: '1px solid #cbd5e1', borderRadius: 999, padding: '2px 8px', fontSize: 11, background: '#fff' }}>◉ Stop Generating</button>}
                </div>
                {Object.keys(ACTION_RESPONSES).map((action) => (
                  <button key={action} onClick={() => runAction(action)} style={{ width: '100%', textAlign: 'left', border: '1px solid #eef2ff', background: '#f8faff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, cursor: 'pointer' }}>
                    {action}
                  </button>
                ))}
                <input value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Make this a list..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', marginTop: 4 }} />
                <button onClick={() => runAction('custom')} style={{ width: '100%', marginTop: 8, border: 0, background: '#4f46e5', color: '#fff', borderRadius: 8, padding: '8px 10px' }}>Run Custom Prompt</button>
              </div>
            )}

            <EditorContent editor={editor} />
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', overflow: 'auto' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#64748b' }}>LIVE PREVIEW</div>
          <div style={{ padding: 18, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rawText || 'Start typing...'}</div>
        </div>
      </section>

      <section style={{ height: '25%', margin: '0 16px 16px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', padding: 16 }}>
        {!rawText.trim()
          ? 'Smart Toolbox: Use # for headings, * for lists, and select text to open AI menu.'
          : /(^|\n)#{1,6}\s+/.test(rawText) || /(^|\n)\*\s+/.test(rawText)
            ? 'Smart Toolbox: Nice structure. Keep headings concise and list items action-oriented.'
            : `Smart Toolbox: ${rawText.split(/\s+/).filter(Boolean).length} words · ${rawText.length} characters`}
      </section>
    </div>
  )
}
