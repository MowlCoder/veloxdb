import { ClockCounterClockwiseIcon, DatabaseIcon, PlayIcon, PlugIcon } from '@phosphor-icons/react'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import type { TableInfo } from '@/data/types'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables: TableInfo[]
  hasLastQuery: boolean
  onOpenConnection: () => void
  onRunLastQuery: () => void
  onSelectTable: (table: TableInfo) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  tables,
  hasLastQuery,
  onOpenConnection,
  onRunLastQuery,
  onSelectTable,
}: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Search commands and tables..." />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                onOpenChange(false)
                onOpenConnection()
              }}
            >
              <PlugIcon />
              Connection manager
              <CommandShortcut>Cmd+Shift+C</CommandShortcut>
            </CommandItem>

            <CommandItem
              disabled={!hasLastQuery}
              onSelect={() => {
                onOpenChange(false)
                onRunLastQuery()
              }}
            >
              <PlayIcon />
              Run last query
              <CommandShortcut>Cmd+Enter</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tables">
            {tables.map((table) => (
              <CommandItem
                key={`${table.schema}.${table.name}`}
                value={`${table.schema}.${table.name}`}
                onSelect={() => {
                  onOpenChange(false)
                  onSelectTable(table)
                }}
              >
                <DatabaseIcon />
                {table.schema}.{table.name}
                <CommandShortcut>
                  <ClockCounterClockwiseIcon />
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

