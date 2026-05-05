import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { CaretDownIcon, CaretRightIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { cn } from '@/lib/utils'

export type TreeDataItem = {
  id: string
  name: ReactNode
  children?: TreeDataItem[]
  disabled?: boolean
  className?: string
  icon?: React.ComponentType<{ className?: string }>
  openIcon?: React.ComponentType<{ className?: string }>
  selectedIcon?: React.ComponentType<{ className?: string }>
  actions?: ReactNode
  onClick?: () => void
  onDoubleClick?: () => void
  data?: unknown
}

export type TreeRenderItemParams = {
  item: TreeDataItem
  level: number
  isExpanded: boolean
  isSelected: boolean
  isFocused: boolean
  hasChildren: boolean
  isLoading: boolean
  toggle: () => void
  select: () => void
}

type TreeViewProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem
  initialSelectedItemId?: string
  initialFocusedItemId?: string
  initialExpandedIds?: string[]
  onSelectChange?: (item: TreeDataItem | undefined) => void
  onExpand?: (item: TreeDataItem) => Promise<TreeDataItem[]> | TreeDataItem[]
  onExpandedChange?: (ids: string[]) => void
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode
  expandAll?: boolean
  virtualized?: boolean
  estimateRowHeight?: number
  expandedIds?: string[]
}

type FlatNode = {
  id: string
  item: TreeDataItem
  level: number
  isExpanded: boolean
  hasChildren: boolean
  isLoading: boolean
  parentId: string | null
}

function collectAllIds(items: TreeDataItem[]): string[] {
  const ids: string[] = []
  for (const item of items) {
    ids.push(item.id)
    if (item.children?.length) {
      ids.push(...collectAllIds(item.children))
    }
  }
  return ids
}

function flattenTree(
  items: TreeDataItem[],
  expanded: Set<string>,
  resolvedChildren: Map<string, TreeDataItem[]>,
  loadingIds: Set<string>,
  parentId: string | null = null,
  level = 0,
): FlatNode[] {
  const result: FlatNode[] = []
  for (const item of items) {
    const children = resolvedChildren.get(item.id) ?? item.children
    const hasChildren = (children !== undefined && children !== null) && children.length > 0
      || (item.children === undefined && !resolvedChildren.has(item.id))
    const isExpanded = expanded.has(item.id)
    const isLoading = loadingIds.has(item.id)

    result.push({
      id: item.id,
      item,
      level,
      isExpanded,
      hasChildren,
      isLoading,
      parentId,
    })

    if (isExpanded && children && children.length > 0) {
      result.push(...flattenTree(children, expanded, resolvedChildren, loadingIds, item.id, level + 1))
    }
  }
  return result
}

export function TreeView({
  data,
  initialSelectedItemId,
  initialFocusedItemId,
  initialExpandedIds,
  onSelectChange,
  onExpand,
  onExpandedChange,
  renderItem,
  expandAll = false,
  virtualized = false,
  estimateRowHeight = 32,
  expandedIds,
  className,
  ...props
}: TreeViewProps) {
  const items = useMemo(() => (Array.isArray(data) ? data : [data]), [data])

  const isControlled = expandedIds !== undefined

  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() => {
    if (isControlled) return new Set(expandedIds)
    if (initialExpandedIds) return new Set(initialExpandedIds)
    return new Set(expandAll ? collectAllIds(items) : [])
  })

  const currentExpanded = isControlled ? new Set(expandedIds) : internalExpanded

  const setExpanded = useCallback(
    (update: (prev: Set<string>) => Set<string>) => {
      const next = update(currentExpanded)
      onExpandedChange?.([...next])
      if (!isControlled) {
        setInternalExpanded(next)
      }
    },
    [currentExpanded, isControlled, onExpandedChange],
  )

  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedItemId)
  const [focusedId, setFocusedId] = useState<string | undefined>(
    initialFocusedItemId ?? initialSelectedItemId ?? items[0]?.id,
  )
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [errorIds, setErrorIds] = useState<Map<string, string>>(new Map())
  const [resolvedChildren, setResolvedChildren] = useState<Map<string, TreeDataItem[]>>(new Map())

  const containerRef = useRef<HTMLDivElement>(null)

  const flatNodes = useMemo(
    () => flattenTree(items, currentExpanded, resolvedChildren, loadingIds),
    [items, currentExpanded, resolvedChildren, loadingIds],
  )

  const focusedIndex = useMemo(
    () => flatNodes.findIndex((n) => n.id === focusedId),
    [flatNodes, focusedId],
  )

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
    enabled: virtualized && flatNodes.length > 50,
  })

  const handleToggle = useCallback(
    async (id: string) => {
      const item = flatNodes.find((n) => n.id === id)?.item
      if (!item) return

      const isCurrentlyExpanded = currentExpanded.has(id)

      if (isCurrentlyExpanded) {
        setExpanded((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }

      setExpanded((prev) => new Set(prev).add(id))

      const children = resolvedChildren.get(id) ?? item.children
      if (children !== undefined && children !== null) return

      if (onExpand) {
        setLoadingIds((prev) => new Set(prev).add(id))
        setErrorIds((prev) => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        try {
          const result = await onExpand(item)
          setResolvedChildren((prev) => {
            const next = new Map(prev)
            next.set(id, result)
            return next
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load'
          setErrorIds((prev) => {
            const next = new Map(prev)
            next.set(id, message)
            return next
          })
        } finally {
          setLoadingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    },
    [currentExpanded, flatNodes, onExpand, resolvedChildren, setExpanded],
  )

  const handleSelect = useCallback(
    (item: TreeDataItem) => {
      setSelectedId(item.id)
      setFocusedId(item.id)
      onSelectChange?.(item)
      item.onClick?.()
    },
    [onSelectChange],
  )

  const focusById = useCallback(
    (id: string) => {
      setFocusedId(id)
      if (virtualized && flatNodes.length > 50) {
        const idx = flatNodes.findIndex((n) => n.id === id)
        if (idx !== -1) {
          virtualizer.scrollToIndex(idx, { align: 'auto' })
        }
      }
    },
    [flatNodes, virtualized, virtualizer],
  )

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const currentIdx = focusedIndex
      if (currentIdx < 0) return

      const current = flatNodes[currentIdx]

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault()
          const prev = currentIdx - 1
          if (prev >= 0) focusById(flatNodes[prev].id)
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const next = currentIdx + 1
          if (next < flatNodes.length) focusById(flatNodes[next].id)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (current?.isExpanded && current.hasChildren) {
            const child = flatNodes.find(
              (n, i) => i > currentIdx && n.parentId === current.id,
            )
            if (child) focusById(child.id)
          } else if (!current?.isExpanded && current?.hasChildren) {
            void handleToggle(current.id)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (current?.isExpanded) {
            void handleToggle(current.id)
          } else if (current?.parentId) {
            focusById(current.parentId)
          }
          break
        }
        case ' ':
        case 'Enter': {
          e.preventDefault()
          if (current) {
            if (current.hasChildren) {
              void handleToggle(current.id)
            } else {
              handleSelect(current.item)
            }
          }
          break
        }
      }
    },
    [focusedIndex, flatNodes, focusById, handleToggle, handleSelect],
  )

  const renderNodeContent = useCallback(
    (flatNode: FlatNode) => {
      const { item, level, isExpanded, hasChildren, isLoading } = flatNode
      const isSelected = selectedId === item.id
      const isFocused = focusedId === item.id

      if (renderItem) {
        return renderItem({
          item,
          level,
          isExpanded,
          isSelected,
          isFocused,
          hasChildren,
          isLoading,
          toggle: () => { void handleToggle(item.id) },
          select: () => handleSelect(item),
        })
      }

      return (
        <button
          type="button"
          data-tree-node-id={item.id}
          className={cn(
            'flex h-8 w-full items-center gap-1 px-2 text-left text-xs transition hover:bg-accent hover:text-accent-foreground',
            isSelected && 'bg-accent text-accent-foreground',
            isFocused && !isSelected && 'ring-1 ring-inset ring-ring',
            item.className,
          )}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          disabled={item.disabled}
          onClick={() => {
            handleSelect(item)
            if (hasChildren) { void handleToggle(item.id) }
          }}
          onDoubleClick={() => item.onDoubleClick?.()}
        >
          <span className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
            {isLoading ? (
              <SpinnerGapIcon className="size-3.5 animate-spin" />
            ) : hasChildren ? (
              isExpanded ? <CaretDownIcon className="size-3.5" /> : <CaretRightIcon className="size-3.5" />
            ) : null}
          </span>
          <span className="truncate">{item.name}</span>
          {item.actions ? <span className="ml-auto">{item.actions}</span> : null}
        </button>
      )
    },
    [selectedId, focusedId, renderItem, handleSelect, handleToggle],
  )

  if (virtualized && flatNodes.length > 50) {
    return (
      <div
        ref={containerRef}
        className={cn('w-full overflow-auto', className)}
        tabIndex={0}
        role="tree"
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const flatNode = flatNodes[virtualRow.index]
            if (!flatNode) return null
            const loadError = errorIds.get(flatNode.id)
            return (
              <div
                key={flatNode.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderNodeContent(flatNode)}
                {loadError ? (
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-destructive"
                    style={{ paddingLeft: `${8 + (flatNode.level + 1) * 14}px` }}
                  >
                    <span className="truncate">{loadError}</span>
                    <button
                      type="button"
                      className="shrink-0 underline hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); void handleToggle(flatNode.id) }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('w-full', className)}
      tabIndex={0}
      role="tree"
      onKeyDown={handleKeyDown}
      {...props}
    >
      {flatNodes.map((flatNode) => {
        const loadError = errorIds.get(flatNode.id)
        return (
          <div key={flatNode.id}>
            {renderNodeContent(flatNode)}
            {loadError ? (
              <div
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-destructive"
                style={{ paddingLeft: `${8 + (flatNode.level + 1) * 14}px` }}
              >
                <span className="truncate">{loadError}</span>
                <button
                  type="button"
                  className="shrink-0 underline hover:text-foreground"
                  onClick={() => { void handleToggle(flatNode.id) }}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
