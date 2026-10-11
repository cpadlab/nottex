import { useCallback, type KeyboardEvent, type RefObject, type MutableRefObject } from 'react'
import type { TextFormat } from './use-editor'

export interface UseKeybindingsOptions {
    onBold?: () => void
    onItalic?: () => void
    onUnderline?: () => void
    onStrikethrough?: () => void
    onSuperscript?: () => void
    onSubscript?: () => void
    onAlignLeft?: () => void
    onAlignCenter?: () => void
    onAlignRight?: () => void
    onAlignJustify?: () => void
    onList?: () => void
    onListOrdered?: () => void
    onListTodo?: () => void
    onListIndentIncrease?: () => void
    onListIndentDecrease?: () => void
    onCodeXml?: () => void
    onQuote?: () => void
    detectCurrentFormat?: () => TextFormat
    handleSelectionChange?: () => void
    onChange?: (html: string) => void
    editorRef?: RefObject<HTMLDivElement | null>
    isInternalUpdate?: MutableRefObject<boolean>
}

export function getModifierKey(): string {
    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    return isMac ? '⌘' : 'Ctrl'
}

export const useKeybindings = ({
    onBold,
    onItalic,
    onUnderline,
    onStrikethrough,
    onSuperscript,
    onSubscript,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onAlignJustify,
    onList,
    onListOrdered,
    onListTodo,
    onListIndentIncrease,
    onListIndentDecrease,
    onCodeXml,
    onQuote,
    detectCurrentFormat,
    handleSelectionChange,
    onChange,
    editorRef,
    isInternalUpdate,
}: UseKeybindingsOptions) => {
    
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey

            if (e.key === 'Tab') {
                e.preventDefault()
                if (e.shiftKey) {
                    onListIndentDecrease?.()
                } else {
                    onListIndentIncrease?.()
                }
                return
            }

            if (isCtrlOrMeta) {
                const key = e.key.toLowerCase()

                if (key === 'b') {
                    e.preventDefault()
                    onBold?.()
                    return
                }

                if (key === 'i') {
                    e.preventDefault()
                    onItalic?.()
                    return
                }

                if (key === 'u') {
                    e.preventDefault()
                    onUnderline?.()
                    return
                }

                if ((key === 's' || key === 'x') && e.shiftKey) {
                    e.preventDefault()
                    onStrikethrough?.()
                    return
                }

                if ((e.key === '.' || e.code === 'Period') && !e.shiftKey) {
                    e.preventDefault()
                    onSuperscript?.()
                    return
                }

                if ((e.key === ',' || e.code === 'Comma') && !e.shiftKey) {
                    e.preventDefault()
                    onSubscript?.()
                    return
                }

                if (e.key === '[') {
                    e.preventDefault()
                    onListIndentDecrease?.()
                    return
                }

                if (e.key === ']') {
                    e.preventDefault()
                    onListIndentIncrease?.()
                    return
                }

                if ((e.shiftKey || e.altKey) && (key === 'c' || e.code === 'KeyC')) {
                    e.preventDefault()
                    onCodeXml?.()
                    return
                }

                if (e.shiftKey) {
                    if (key === 'q' || e.code === 'KeyQ') {
                        e.preventDefault()
                        onQuote?.()
                        return
                    }
                    if (key === 'l' || e.code === 'KeyL') {
                        e.preventDefault()
                        onAlignLeft?.()
                        return
                    }
                    if (key === 'e' || e.code === 'KeyE') {
                        e.preventDefault()
                        onAlignCenter?.()
                        return
                    }
                    if (key === 'r' || e.code === 'KeyR') {
                        e.preventDefault()
                        onAlignRight?.()
                        return
                    }
                    if (key === 'j' || e.code === 'KeyJ') {
                        e.preventDefault()
                        onAlignJustify?.()
                        return
                    }
                    if (key === '8' || e.code === 'Digit8') {
                        e.preventDefault()
                        onList?.()
                        return
                    }
                    if (key === '7' || e.code === 'Digit7') {
                        e.preventDefault()
                        onListOrdered?.()
                        return
                    }
                    if (key === '9' || e.code === 'Digit9') {
                        e.preventDefault()
                        onListTodo?.()
                        return
                    }
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && editorRef?.current) {
                    let node: Node | null = selection.anchorNode
                    let todoLi: HTMLElement | null = null
                    while (node && node !== editorRef.current) {
                        if (
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node as HTMLElement).getAttribute('data-type') === 'todo-item'
                        ) {
                            todoLi = node as HTMLElement
                            break
                        }
                        node = node.parentNode
                    }

                    if (todoLi) {
                        e.preventDefault()
                        const contentSpan = todoLi.querySelector('span[data-todo-content]')
                        const text = contentSpan ? contentSpan.textContent?.trim() || '' : todoLi.textContent?.trim() || ''

                        if (text === '') {
                            const p = document.createElement('p')
                            p.innerHTML = '<br>'
                            const todoList = todoLi.closest('ul[data-type=todo-list]')
                            if (todoList && todoList.children.length === 1) {
                                todoList.replaceWith(p)
                            } else {
                                todoLi.replaceWith(p)
                            }
                            const range = document.createRange()
                            range.selectNodeContents(p)
                            range.collapse(false)
                            selection.removeAllRanges()
                            selection.addRange(range)
                        } else {
                            const newLi = document.createElement('li')
                            newLi.setAttribute('data-type', 'todo-item')
                            newLi.setAttribute('data-checked', 'false')
                            const indent = todoLi.getAttribute('data-indent')
                            if (indent) {
                                newLi.setAttribute('data-indent', indent)
                            }
                            newLi.className = 'flex items-start gap-2.5 my-1.5'
                            newLi.innerHTML =
                                '<span data-todo-checkbox contenteditable="false" class="inline-flex items-center justify-center size-5 shrink-0 select-none pointer-events-auto"></span><span data-todo-content class="flex-1 outline-none min-w-0"><br></span>'

                            todoLi.after(newLi)

                            const newContentSpan = newLi.querySelector('span[data-todo-content]')
                            if (newContentSpan) {
                                const range = document.createRange()
                                range.selectNodeContents(newContentSpan)
                                range.collapse(false)
                                selection.removeAllRanges()
                                selection.addRange(range)
                            }
                        }

                        if (onChange && editorRef.current) {
                            if (isInternalUpdate) {
                                isInternalUpdate.current = true
                            }
                            onChange(editorRef.current.innerHTML)
                        }
                        handleSelectionChange?.()
                        return
                    }
                }

                const detected = detectCurrentFormat?.()
                if (detected && detected.startsWith('heading_')) {
                    setTimeout(() => {
                        document.execCommand('formatBlock', false, 'p')
                        handleSelectionChange?.()
                        if (editorRef?.current && onChange) {
                            if (isInternalUpdate) {
                                isInternalUpdate.current = true
                            }
                            onChange(editorRef.current.innerHTML)
                        }
                    }, 0)
                }
            }

            if (e.key === 'Backspace') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && editorRef?.current) {
                    let node: Node | null = selection.anchorNode
                    let todoLi: HTMLElement | null = null
                    while (node && node !== editorRef.current) {
                        if (
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node as HTMLElement).getAttribute('data-type') === 'todo-item'
                        ) {
                            todoLi = node as HTMLElement
                            break
                        }
                        node = node.parentNode
                    }

                    if (todoLi) {
                        const contentSpan = todoLi.querySelector('span[data-todo-content]')
                        const text = contentSpan ? contentSpan.textContent?.trim() || '' : todoLi.textContent?.trim() || ''
                        if (text === '') {
                            e.preventDefault()
                            const p = document.createElement('p')
                            p.innerHTML = '<br>'
                            const todoList = todoLi.closest('ul[data-type=todo-list]')
                            if (todoList && todoList.children.length === 1) {
                                todoList.replaceWith(p)
                            } else {
                                todoLi.replaceWith(p)
                            }
                            const range = document.createRange()
                            range.selectNodeContents(p)
                            range.collapse(false)
                            selection.removeAllRanges()
                            selection.addRange(range)

                            if (onChange && editorRef.current) {
                                if (isInternalUpdate) {
                                    isInternalUpdate.current = true
                                }
                                onChange(editorRef.current.innerHTML)
                            }
                            handleSelectionChange?.()
                            return
                        }
                    }
                }
            }
        },
        [
            onBold,
            onItalic,
            onUnderline,
            onStrikethrough,
            onSuperscript,
            onSubscript,
            onAlignLeft,
            onAlignCenter,
            onAlignRight,
            onAlignJustify,
            onList,
            onListOrdered,
            onListTodo,
            onListIndentIncrease,
            onListIndentDecrease,
            onCodeXml,
            onQuote,
            detectCurrentFormat,
            handleSelectionChange,
            onChange,
            editorRef,
            isInternalUpdate,
        ]
    )

    return {
        handleKeyDown,
    }
}

