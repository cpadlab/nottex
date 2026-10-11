import * as React from 'react'

import { codeToHtml } from 'shiki'
import type { BundledLanguage } from 'shiki'
import { cn } from 'cn'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckIcon, CopyIcon, Trash2Icon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export type CodeBlockFile = {
  filename: string
  code: string
  language?: BundledLanguage
  panelClassName?: string
  paneStyle?: React.CSSProperties
  highlightLines?: number[]
  highlightClassName?: string
  showLineNumbers?: boolean
}

export type CodeBlockProps = Omit<React.ComponentProps<'div'>, 'onChange'> & {
  code?: string
  language?: BundledLanguage
  filename?: string
  files?: CodeBlockFile[]
  panelClassName?: string
  paneStyle?: React.CSSProperties
  highlightLines?: number[]
  highlightClassName?: string
  showLineNumbers?: boolean
  editable?: boolean
  onChange?: (code: string) => void
  onDelete?: () => void
}

// Internal Helpers
function splitShikiLines(html: string): string[] {
  const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)

  if (!match) return [html]

  // Split on newlines; last element after trailing newline may be empty
  const lines = match[1].split('\n')

  if (lines[lines.length - 1] === '') lines.pop()

  return lines
}

async function highlight(code: string, lang: BundledLanguage = 'tsx'): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' }
    })
  } catch {
    // Fallback: wrap in plain-text pre/code so the UI never breaks
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `<pre><code>${escaped}</code></pre>`
  }
}

// Copy Button

function CodeBlockCopyButton({ code, className, ...props }: React.ComponentProps<'button'> & { code: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    if (typeof navigator === 'undefined') return

    const write = (text: string) => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)

      return text
    }

    if (navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
      navigator.clipboard
        .writeText(code)
        .then(() => write(code))
        .catch(() => {
          // Clipboard API rejected — use execCommand fallback silently
          fallbackCopy(code)
          write(code)
        })
    } else {
      fallbackCopy(code)
      write(code)
    }
  }, [code])

  return (
    <button
      data-slot='code-block-copy'
      aria-label={copied ? 'Copied' : 'Copy code'}
      onClick={handleCopy}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md p-1.5 transition-colors',
        className
      )}
      {...props}
    >
      {copied ? (
        <CheckIcon className='size-3.5' />
      ) : (
        <CopyIcon className='size-3.5' />
      )}
    </button>
  )
}

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')

  el.value = text
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px'
  document.body.appendChild(el)
  el.focus()
  el.select()

  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(el)
  }
}

// Single

type CodeBlockPaneProps = {
  code: string
  language?: BundledLanguage
  showCopy?: boolean
  className?: string
  style?: React.CSSProperties
  highlightLines?: number[]
  highlightClassName?: string
  showLineNumbers?: boolean
}

function CodeBlockPane({
  code,
  language = 'tsx',
  showCopy = true,
  className,
  style,
  highlightLines,
  highlightClassName = 'bg-amber-600/40 dark:bg-amber-400/40',
  showLineNumbers = false
}: CodeBlockPaneProps) {
  const [html, setHtml] = React.useState<string>('')

  React.useEffect(() => {
    let cancelled = false

    highlight(code, language).then(result => {
      if (!cancelled) setHtml(result)
    })

    return () => {
      cancelled = true
    }
  }, [code, language])

  const hasHighlights = highlightLines && highlightLines.length > 0
  const useLineView = hasHighlights || showLineNumbers

  // Pre-compute Shiki's background so we can match the container
  const lines = React.useMemo(() => (html ? splitShikiLines(html) : []), [html])

  return (
    <div data-slot='code-block-pane' className={cn('', className)} style={style}>
      <ScrollArea className='max-h-43.75 *:data-[slot=scroll-area-viewport]:h-auto! *:data-[slot=scroll-area-viewport]:max-h-43.75'>
        {showCopy && <CodeBlockCopyButton code={code} className='absolute top-2 right-2 z-10' />}
        {html ? (
          useLineView ? (
            <>
              <pre className='shiki bg-transparent! p-0 font-mono text-sm leading-relaxed'>
                <code className='block w-max min-w-full'>
                  {lines.map((line, i) => {
                    const lineNumber = i + 1
                    const isHighlighted = highlightLines?.includes(lineNumber) ?? false

                    return (
                      <div
                        key={i}
                        className={cn('flex items-stretch px-4 py-[0.5px]', isHighlighted && highlightClassName)}
                      >
                        {showLineNumbers && (
                          <span className='text-muted-foreground/50 mr-4 w-4 shrink-0 text-right font-mono text-xs leading-relaxed select-none'>
                            {lineNumber}
                          </span>
                        )}
                        {/* Line tokens are trusted Shiki HTML output */}
                        <span className='flex-1' dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                      </div>
                    )
                  })}
                </code>
              </pre>
              <ScrollBar orientation='horizontal' />
            </>
          ) : (
            <>
              <div
                className={cn(
                  '[&>pre]:p-4 [&>pre]:text-sm [&>pre]:leading-relaxed',
                  '[&>pre]:bg-transparent! [&>pre]:font-mono [&>pre]:whitespace-pre'
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <ScrollBar orientation='horizontal' />
            </>
          )
        ) : (
          <pre className='p-4 font-mono text-sm leading-relaxed opacity-0'>{code}</pre>
        )}
      </ScrollArea>
    </div>
  )
}

// Editable Pane

type CodeBlockEditablePaneProps = {
  code: string
  showLineNumbers?: boolean
  onChange?: (code: string) => void
  className?: string
  style?: React.CSSProperties
}

function CodeBlockEditablePane({
  code,
  showLineNumbers = false,
  onChange,
  className,
  style,
}: CodeBlockEditablePaneProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`
    }
  }, [code])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const val = target.value
      const newVal = val.substring(0, start) + '  ' + val.substring(end)
      onChange?.(newVal)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  const lines = code.split('\n')
  const lineCount = Math.max(1, lines.length)

  return (
    <div
      data-slot='code-block-pane'
      className={cn('flex items-stretch font-mono text-sm leading-6 p-0 overflow-hidden', className)}
      style={style}
    >
      {showLineNumbers && (
        <div className='text-muted-foreground/50 py-3 pl-3 pr-2 select-none text-right font-mono text-xs leading-6 shrink-0 flex flex-col border-r border-border/40 min-w-8'>
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i} className='leading-6'>{i + 1}</span>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="// Escribe tu código aquí..."
        spellCheck={false}
        className='flex-1 min-h-[90px] py-3 px-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none resize-none font-mono text-sm leading-6 whitespace-pre overflow-x-auto'
      />
    </div>
  )
}

function CodeBlock({
  code,
  language = 'tsx',
  filename,
  files,
  className,
  panelClassName,
  paneStyle,
  highlightLines,
  highlightClassName,
  showLineNumbers,
  editable,
  onChange,
  onDelete,
  ...props
}: CodeBlockProps) {
  // Normalise to a files array so the rest of the component is uniform
  const normalizedFiles: CodeBlockFile[] = React.useMemo(() => {
    if (files && files.length > 0) return files

    if (code !== undefined) {
      return [
        {
          filename: filename ? filename : 'Código',
          code,
          language,
          panelClassName,
          paneStyle,
          highlightLines,
          highlightClassName,
          showLineNumbers
        }
      ]
    }

    return []
  }, [files, code, language, filename, panelClassName, paneStyle, highlightLines, highlightClassName, showLineNumbers])

  const isMulti = normalizedFiles.length > 1
  const [selectedTab, setSelectedTab] = React.useState<string | null>(null)

  const activeTab = (selectedTab && normalizedFiles.some(f => f.filename === selectedTab))
    ? selectedTab
    : (normalizedFiles[0]?.filename ?? '')

  const activeFile = normalizedFiles.find(f => f.filename === activeTab) ?? normalizedFiles[0]

  if (normalizedFiles.length === 0) return null

  return (
    <div
      data-slot='code-block'
      className={cn('bg-muted/50 border-border overflow-hidden rounded-xl border text-sm', className)}
      {...props}
    >
      {/* Header */}
      <div
        data-slot='code-block-header'
        className='border-border flex items-center justify-between gap-2 border-b'
      >
        {isMulti ? (
          <Tabs value={activeTab} onValueChange={setSelectedTab} className='flex-1'>
            <TabsList variant='line' className='group-data-horizontal/tabs:h-auto'>
              {normalizedFiles.map(file => (
                <TabsTrigger
                  key={file.filename}
                  value={file.filename}
                  className='h-auto px-3 py-2 text-xs font-medium'
                >
                  {file.filename}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span
            data-slot='code-block-filename'
            className='text-muted-foreground px-3 py-2 text-xs font-medium'
          >
            {normalizedFiles[0].filename}
          </span>
        )}

        <div className='flex items-center gap-1 mr-1 shrink-0'>
          {onDelete && (
            <button
              data-slot='code-block-delete'
              aria-label='Eliminar bloque de código'
              onClick={onDelete}
              className='text-muted-foreground hover:text-destructive inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer'
              title='Eliminar bloque de código'
            >
              <Trash2Icon className='size-3.5' />
            </button>
          )}
          {activeFile && <CodeBlockCopyButton code={activeFile.code} />}
        </div>
      </div>

      {/* Code pane */}
      {editable ? (
        <CodeBlockEditablePane
          code={activeFile?.code ?? ''}
          showLineNumbers={showLineNumbers}
          onChange={onChange}
          className={activeFile?.panelClassName}
          style={activeFile?.paneStyle}
        />
      ) : activeFile && (
        <CodeBlockPane
          key={activeFile.filename}
          code={activeFile.code}
          language={activeFile.language}
          showCopy={false}
          className={activeFile.panelClassName}
          style={activeFile.paneStyle}
          highlightLines={activeFile.highlightLines}
          highlightClassName={activeFile.highlightClassName}
          showLineNumbers={activeFile.showLineNumbers}
        />
      )}
    </div>
  )
}

export { CodeBlock, CodeBlockPane, CodeBlockCopyButton }
