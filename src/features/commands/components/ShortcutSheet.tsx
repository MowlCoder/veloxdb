import {
  CommandIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ShortcutEntry = { key: string; description: string }

const shortcuts: Record<string, ShortcutEntry[]> = {
  Global: [
    { key: 'Cmd/Ctrl + /', description: 'Show this cheat sheet' },
    { key: 'Cmd/Ctrl + P', description: 'Open command palette' },
    { key: 'Cmd/Ctrl + Shift + C', description: 'New connection' },
    { key: 'Cmd/Ctrl + Z', description: 'Undo' },
    { key: 'Cmd/Ctrl + Shift + Z', description: 'Redo' },
  ],
  'Query Editor': [
    { key: 'Cmd/Ctrl + Enter', description: 'Run query' },
    { key: 'Cmd/Ctrl + Shift + F', description: 'Format SQL' },
    { key: 'Tab', description: 'Indent' },
    { key: 'Shift + Tab', description: 'Outdent' },
  ],
  Diagram: [
    { key: 'Click + drag table', description: 'Move table' },
    { key: 'Hover + drag edge handle', description: 'Create FK relationship' },
    { key: 'Scroll', description: 'Pan canvas' },
    { key: 'Cmd/Ctrl + Scroll', description: 'Zoom' },
    { key: 'Space + drag', description: 'Pan override' },
    { key: 'Shift + Click', description: 'Multi-select tables' },
    { key: 'Escape', description: 'Clear selection' },
    { key: '+ / -', description: 'Zoom in / out' },
    { key: '0', description: 'Reset zoom' },
  ],
  Results: [
    { key: '↑ ↓ ← →', description: 'Navigate cells' },
    { key: 'Space', description: 'Toggle row selection' },
    { key: 'Cmd/Ctrl + C', description: 'Copy selected rows' },
  ],
}

const modKey = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'

export function ShortcutSheet() {
  const [open, setOpen] = useState(false)

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const cmd = e.metaKey || e.ctrlKey
    if (cmd && e.key === '/') {
      e.preventDefault()
      setOpen((v) => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg border-border p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CommandIcon className="size-4 text-muted-foreground" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Available shortcuts across all panels. Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">{modKey}</kbd> + <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">/</kbd> to toggle.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-auto px-5 py-4 space-y-4">
          {Object.entries(shortcuts).map(([section, entries]) => (
            <div key={section}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {section}
              </h3>
              <div className="space-y-1.5">
                {entries.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 transition hover:bg-accent/40"
                  >
                    <span className="text-xs text-foreground/90">{entry.description}</span>
                    <kbd
                      className={cn(
                        'shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground',
                      )}
                    >
                      {entry.key.replace('Cmd/Ctrl', modKey)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
