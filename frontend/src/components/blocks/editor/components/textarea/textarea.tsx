import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import { TodoCheckboxItem } from './components/todo-checkbox-item'
import { CodeBlockItem } from './components/code-block-item'
import { ImageBlockItem } from './components/image-block-item'
import { DropzoneOverlay } from './components/dropzone-overlay'

export interface EditorTextareaProps extends ComponentProps<'div'> {
    placeholder?: string
}

export const EditorTextarea = ({ className, placeholder, ...props }: EditorTextareaProps) => {
    
    const { t: translation } = useTranslation()
    const defaultPlaceholder = translation('editor.placeholder')
    const { editorRef, handleInput, handleKeyDown, handleSelectionChange, insertImage } = useEditorContext()
    const [checkboxContainers, setCheckboxContainers] = useState<HTMLElement[]>([])
    const [codeBlockContainers, setCodeBlockContainers] = useState<HTMLElement[]>([])
    const [imageContainers, setImageContainers] = useState<HTMLElement[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const dragCounter = useRef(0)

    const syncCheckboxContainers = useCallback(() => {
        if (!editorRef.current) return
        const containers = Array.from(
            editorRef.current.querySelectorAll<HTMLElement>("span[data-todo-checkbox]")
        )
        containers.forEach((c, idx) => {
            if (!c.dataset.id) {
                c.dataset.id = `todo-cb-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
            }
        })
        setCheckboxContainers((prev) => {
            if (
                prev.length === containers.length &&
                prev.every((c, i) => c === containers[i])
            ) {
                return prev
            }
            return containers
        })
    }, [editorRef])

    const syncCodeBlockContainers = useCallback(() => {
        if (!editorRef.current) return
        const containers = Array.from(
            editorRef.current.querySelectorAll<HTMLElement>("div[data-type=code-block]")
        )
        containers.forEach((c, idx) => {
            if (!c.dataset.id) {
                c.dataset.id = `code-blk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
            }
        })
        setCodeBlockContainers((prev) => {
            if (
                prev.length === containers.length &&
                prev.every((c, i) => c === containers[i])
            ) {
                return prev
            }
            return containers
        })
    }, [editorRef])

    const syncImageContainers = useCallback(() => {
        if (!editorRef.current) return
        const containers = Array.from(
            editorRef.current.querySelectorAll<HTMLElement>("div[data-type=image-block]")
        )
        containers.forEach((c, idx) => {
            if (!c.dataset.id) {
                c.dataset.id = `img-blk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
            }
        })
        setImageContainers((prev) => {
            if (
                prev.length === containers.length &&
                prev.every((c, i) => c === containers[i])
            ) {
                return prev
            }
            return containers
        })
    }, [editorRef])

    const syncLinks = useCallback(() => {
        if (!editorRef.current) return
        const links = editorRef.current.querySelectorAll<HTMLAnchorElement>('a')
        links.forEach((a) => {
            if (a.target !== '_blank') {
                a.target = '_blank'
            }
            if (a.rel !== 'noopener noreferrer') {
                a.rel = 'noopener noreferrer'
            }
            const text = a.textContent || ''
            if (text.length > 103 && !text.endsWith('...')) {
                a.textContent = text.slice(0, 100) + '...'
            }
        })
    }, [editorRef])

    useEffect(() => {
        syncCheckboxContainers()
        syncCodeBlockContainers()
        syncImageContainers()
        syncLinks()
        const editor = editorRef.current
        if (!editor) return

        const observer = new MutationObserver(() => {
            syncCheckboxContainers()
            syncCodeBlockContainers()
            syncImageContainers()
            syncLinks()
        })

        observer.observe(editor, {
            childList: true,
            subtree: true,
        })

        return () => {
            observer.disconnect()
        }
    }, [syncCheckboxContainers, syncCodeBlockContainers, syncImageContainers, syncLinks, editorRef])

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLDivElement>) => {
            const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
                f.type.startsWith('image/')
            )
            if (imageFiles.length > 0) {
                e.preventDefault()
                imageFiles.forEach((file) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            insertImage(reader.result)
                        }
                    }
                    reader.readAsDataURL(file)
                })
                return
            }

            const clipboardText = e.clipboardData.getData('text/plain').trim()
            const urlPattern = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i

            if (urlPattern.test(clipboardText)) {
                e.preventDefault()
                const href = clipboardText.startsWith('www.')
                    ? `https://${clipboardText}`
                    : clipboardText
                const selection = window.getSelection()
                const selectedText = selection?.toString().trim() || ''

                const a = document.createElement('a')
                a.href = href
                a.target = '_blank'
                a.rel = 'noopener noreferrer'

                const rawText = selectedText.length > 0 ? selectedText : clipboardText
                a.textContent = rawText.length > 100 ? rawText.slice(0, 100) + '...' : rawText

                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0)
                    range.deleteContents()
                    range.insertNode(a)

                    const space = document.createTextNode('\u00A0')
                    a.after(space)

                    const newRange = document.createRange()
                    newRange.setStartAfter(space)
                    newRange.collapse(true)
                    selection.removeAllRanges()
                    selection.addRange(newRange)
                }

                handleInput()
                return
            }
        },
        [handleInput, insertImage]
    )

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current++
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true)
        }
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current <= 0) {
            dragCounter.current = 0
            setIsDragging(false)
        }
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            e.stopPropagation()
            dragCounter.current = 0
            setIsDragging(false)

            const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith('image/')
            )
            if (files.length > 0) {
                files.forEach((file) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            insertImage(reader.result)
                        }
                    }
                    reader.readAsDataURL(file)
                })
            }
        },
        [insertImage]
    )

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement
            const anchor = target.closest('a')
            if (anchor && anchor.href) {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    window.open(anchor.href, '_blank', 'noopener,noreferrer')
                    return
                }
            }

            if (e.target === editorRef.current && editorRef.current) {
                const lastChild = editorRef.current.lastElementChild
                if (
                    lastChild &&
                    (lastChild.tagName.toLowerCase() === 'blockquote' ||
                        lastChild.getAttribute('data-type') === 'code-block' ||
                        lastChild.getAttribute('data-type') === 'image-block')
                ) {
                    const p = document.createElement('p')
                    p.innerHTML = '<br>'
                    editorRef.current.appendChild(p)
                    const range = document.createRange()
                    range.selectNodeContents(p)
                    range.collapse(false)
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(range)
                    handleInput()
                }
            }
            handleSelectionChange()
        },
        [editorRef, handleInput, handleSelectionChange]
    )

    return (
        <div className="relative flex flex-col flex-1 min-h-0 w-full" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        
            <DropzoneOverlay isVisible={isDragging} />

            <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder ?? defaultPlaceholder} onInput={handleInput} onKeyDown={handleKeyDown} onKeyUp={handleSelectionChange} onMouseUp={handleSelectionChange} onClick={handleClick} onPaste={handlePaste}
                className={cn(
                    "w-full scroll-fade flex-1 min-w-full min-h-0 overflow-y-auto outline-none resize-none scrollbar-none",
                    "[&_p]:text-base [&_p]:leading-relaxed [&_p]:my-1.5",
                    "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:my-3",
                    "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:my-2.5",
                    "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-normal [&_h3]:my-2",
                    "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through [&_sup]:text-xs [&_sub]:text-xs",
                    "[&_ul:not([data-type=todo-list])]:list-disc [&_ul:not([data-type=todo-list])]:pl-6 [&_ul:not([data-type=todo-list])]:my-2",
                    "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
                    "[&_li]:my-1",
                    "[&_ul[data-type=todo-list]]:list-none [&_ul[data-type=todo-list]]:pl-0 [&_ul[data-type=todo-list]]:my-2",
                    "[&_ul[data-type=todo-list]_ul]:pl-6",
                    "[&_li[data-type=todo-item]]:flex [&_li[data-type=todo-item]]:items-start [&_li[data-type=todo-item]]:gap-2.5 [&_li[data-type=todo-item]]:my-1.5",
                    "[&_li[data-type=todo-item]_span[data-todo-checkbox]]:inline-flex [&_li[data-type=todo-item]_span[data-todo-checkbox]]:items-center [&_li[data-type=todo-item]_span[data-todo-checkbox]]:justify-center [&_li[data-type=todo-item]_span[data-todo-checkbox]]:size-5 [&_li[data-type=todo-item]_span[data-todo-checkbox]]:shrink-0 [&_li[data-type=todo-item]_span[data-todo-checkbox]]:mt-[3px]",
                    "[&_li[data-type=todo-item]_span[data-todo-content]]:flex-1 [&_li[data-type=todo-item]_span[data-todo-content]]:min-w-0 [&_li[data-type=todo-item]_span[data-todo-content]]:leading-relaxed",
                    "[&_li[data-type=todo-item][data-checked=true]]:text-muted-foreground",
                    "[&_li[data-type=todo-item][data-checked=true]_span[data-todo-content]]:line-through",
                    "[&_li[data-indent='1']]:ml-6",
                    "[&_li[data-indent='2']]:ml-12",
                    "[&_li[data-indent='3']]:ml-18",
                    "[&_li[data-indent='4']]:ml-24",
                    "[&_li[data-indent='5']]:ml-30",
                    "[&_li[data-indent='6']]:ml-36",
                    "[&_li[data-indent='7']]:ml-42",
                    "[&_li[data-indent='8']]:ml-48",
                    "[&_div[data-type=code-block]]:my-3 [&_div[data-type=code-block]]:select-none [&_div[data-type=code-block]]:cursor-default",
                    "[&_div[data-type=image-block]]:my-3 [&_div[data-type=image-block]]:select-none [&_div[data-type=image-block]]:cursor-default",
                    "[&_blockquote]:border-l-4 [&_blockquote]:border-l-primary [&_blockquote]:bg-muted [&_blockquote]:text-muted-foreground [&_blockquote]:pl-4 [&_blockquote]:pr-3 [&_blockquote]:py-2.5 [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg [&_blockquote]:italic",
                    "[&_a]:text-blue-500 [&_a]:hover:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:dark:hover:text-blue-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-pointer [&_a]:inline-flex [&_a]:items-center [&_a]:max-w-[100ch] [&_a]:truncate [&_a]:align-baseline",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
                    className
                )}
                {...props}
            />

            {checkboxContainers.map((container) => {
                const id = container.dataset.id || "todo-cb"
                return createPortal(
                    <TodoCheckboxItem container={container} />,
                    container,
                    id
                )
            })}

            {codeBlockContainers.map((container) => {
                const id = container.dataset.id || "code-blk"
                return createPortal(
                    <CodeBlockItem container={container} />,
                    container,
                    id
                )
            })}

            {imageContainers.map((container) => {
                const id = container.dataset.id || "img-blk"
                return createPortal(
                    <ImageBlockItem container={container} />,
                    container,
                    id
                )
            })}

        </div>
    )
}



