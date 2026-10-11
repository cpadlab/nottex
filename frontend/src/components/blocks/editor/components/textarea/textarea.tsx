import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import { TodoCheckboxItem } from './components/todo-checkbox-item'

export interface EditorTextareaProps extends ComponentProps<'div'> {
    placeholder?: string
}

export const EditorTextarea = ({ className, placeholder, ...props }: EditorTextareaProps) => {
    
    const { t: translation } = useTranslation()
    const defaultPlaceholder = translation('editor.placeholder')
    const { editorRef, handleInput, handleKeyDown, handleSelectionChange } = useEditorContext()
    const [checkboxContainers, setCheckboxContainers] = useState<HTMLElement[]>([])

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

    useEffect(() => {
        syncCheckboxContainers()
        const editor = editorRef.current
        if (!editor) return

        const observer = new MutationObserver(() => {
            syncCheckboxContainers()
        })

        observer.observe(editor, {
            childList: true,
            subtree: true,
        })

        return () => {
            observer.disconnect()
        }
    }, [syncCheckboxContainers, editorRef])

    return (
        <>
        
            <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder ?? defaultPlaceholder} onInput={handleInput} onKeyDown={handleKeyDown} onKeyUp={handleSelectionChange} onMouseUp={handleSelectionChange}
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

        </>
    )
}



