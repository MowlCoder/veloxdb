import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

type SqlEditorProps = {
  value: string
  isDark: boolean
  onChange: (value: string) => void
  onRun: () => void
}

export function SqlEditor({ value, isDark, onChange, onRun }: SqlEditorProps) {
  const handleMount = (instance: editor.IStandaloneCodeEditor) => {
    instance.addAction({
      id: 'veloxdb-run-query',
      label: 'Run query',
      keybindings: [2048 | 3, 256 | 3],
      run: () => {
        onRun()
      },
    })
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      theme={isDark ? 'vs-dark' : 'vs-light'}
      value={value}
      onMount={handleMount}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontFamily: 'JetBrains Mono Variable, monospace',
        fontSize: 13,
        padding: { top: 16, bottom: 16 },
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
      }}
    />
  )
}
