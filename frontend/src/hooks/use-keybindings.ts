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

            if (e.key === ' ' || e.key === 'Spacebar') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && selection.isCollapsed && editorRef?.current) {
                    const anchorNode = selection.anchorNode
                    const offset = selection.anchorOffset

                    if (anchorNode && anchorNode.nodeType === Node.TEXT_NODE) {
                        const text = anchorNode.textContent || ''
                        const textBefore = text.slice(0, offset)

                        const mdMatch = textBefore.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+)\)$/)
                        if (mdMatch) {
                            e.preventDefault()
                            const fullMatch = mdMatch[0]
                            const title = mdMatch[1]
                            const rawUrl = mdMatch[2]
                            const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl
                            const matchStart = offset - fullMatch.length

                            const beforeText = text.slice(0, matchStart)
                            const afterText = text.slice(offset)

                            const a = document.createElement('a')
                            a.href = href
                            a.target = '_blank'
                            a.rel = 'noopener noreferrer'
                            a.textContent = title.length > 100 ? title.slice(0, 100) + '...' : title

                            const space = document.createTextNode('\u00A0')

                            const parent = anchorNode.parentNode
                            if (parent) {
                                const beforeNode = document.createTextNode(beforeText)
                                const afterNode = document.createTextNode(afterText)

                                parent.insertBefore(beforeNode, anchorNode)
                                parent.insertBefore(a, anchorNode)
                                parent.insertBefore(space, anchorNode)
                                parent.insertBefore(afterNode, anchorNode)
                                parent.removeChild(anchorNode)

                                const range = document.createRange()
                                range.setStartAfter(space)
                                range.collapse(true)
                                selection.removeAllRanges()
                                selection.addRange(range)

                                if (onChange && editorRef.current) {
                                    if (isInternalUpdate) isInternalUpdate.current = true
                                    onChange(editorRef.current.innerHTML)
                                }
                                handleSelectionChange?.()
                                return
                            }
                        }

                        const urlMatch = textBefore.match(/(?:^|\s)(https?:\/\/[^\s]+|www\.[^\s]+)$/i)
                        if (urlMatch) {
                            const rawUrl = urlMatch[1]
                            const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl

                            let isInsideA = false
                            let p: Node | null = anchorNode
                            while (p && p !== editorRef.current) {
                                if (p.nodeType === Node.ELEMENT_NODE && (p as HTMLElement).tagName.toLowerCase() === 'a') {
                                    isInsideA = true
                                    break
                                }
                                p = p.parentNode
                            }

                            if (!isInsideA) {
                                e.preventDefault()
                                const matchStart = offset - rawUrl.length
                                const beforeText = text.slice(0, matchStart)
                                const afterText = text.slice(offset)

                                const a = document.createElement('a')
                                a.href = href
                                a.target = '_blank'
                                a.rel = 'noopener noreferrer'
                                a.textContent = rawUrl.length > 100 ? rawUrl.slice(0, 100) + '...' : rawUrl

                                const space = document.createTextNode('\u00A0')

                                const parent = anchorNode.parentNode
                                if (parent) {
                                    const beforeNode = document.createTextNode(beforeText)
                                    const afterNode = document.createTextNode(afterText)

                                    parent.insertBefore(beforeNode, anchorNode)
                                    parent.insertBefore(a, anchorNode)
                                    parent.insertBefore(space, anchorNode)
                                    parent.insertBefore(afterNode, anchorNode)
                                    parent.removeChild(anchorNode)

                                    const range = document.createRange()
                                    range.setStartAfter(space)
                                    range.collapse(true)
                                    selection.removeAllRanges()
                                    selection.addRange(range)

                                    if (onChange && editorRef.current) {
                                        if (isInternalUpdate) isInternalUpdate.current = true
                                        onChange(editorRef.current.innerHTML)
                                    }
                                    handleSelectionChange?.()
                                    return
                                }
                            }
                        }
                    }
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && editorRef?.current) {
                    let node: Node | null = selection.anchorNode
                    let todoLi: HTMLElement | null = null
                    let blockquote: HTMLElement | null = null
                    let currentBlockInQuote: HTMLElement | null = null

                    while (node && node !== editorRef.current) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node as HTMLElement
                            if (el.getAttribute('data-type') === 'todo-item') {
                                todoLi = el
                                break
                            }
                            if (el.tagName.toLowerCase() === 'blockquote') {
                                blockquote = el
                                break
                            }
                            currentBlockInQuote = el
                        }
                        node = node.parentNode
                    }

                    if (blockquote) {
                        const isCurrentEmpty = currentBlockInQuote
                            ? (currentBlockInQuote.textContent?.trim() === '' || currentBlockInQuote.innerHTML === '<br>')
                            : (blockquote.textContent?.trim() === '' || blockquote.innerHTML === '<br>')

                        if (isCurrentEmpty) {
                            e.preventDefault()
                            if (currentBlockInQuote && currentBlockInQuote !== blockquote) {
                                currentBlockInQuote.remove()
                            }

                            const p = document.createElement('p')
                            p.innerHTML = '<br>'

                            const remainingText = blockquote.textContent?.trim() || ''
                            if (remainingText === '' || blockquote.innerHTML === '<br>' || (blockquote.children.length === 0 && !blockquote.textContent)) {
                                blockquote.replaceWith(p)
                            } else {
                                blockquote.after(p)
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
                    let blockquote: HTMLElement | null = null
                    let currentBlockInQuote: HTMLElement | null = null

                    while (node && node !== editorRef.current) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node as HTMLElement
                            if (el.getAttribute('data-type') === 'todo-item') {
                                todoLi = el
                                break
                            }
                            if (el.tagName.toLowerCase() === 'blockquote') {
                                blockquote = el
                                break
                            }
                            currentBlockInQuote = el
                        }
                        node = node.parentNode
                    }

                    if (blockquote) {
                        const isQuoteEmpty = blockquote.textContent?.trim() === '' || blockquote.innerHTML === '<br>'
                        const range = selection.getRangeAt(0)
                        const isAtStart = range.collapsed && range.startOffset === 0 && (
                            selection.anchorNode === blockquote ||
                            selection.anchorNode === blockquote.firstChild ||
                            (currentBlockInQuote && currentBlockInQuote === blockquote.firstElementChild && (selection.anchorNode === currentBlockInQuote || selection.anchorNode === currentBlockInQuote.firstChild))
                        )

                        if (isQuoteEmpty || isAtStart) {
                            e.preventDefault()
                            const p = document.createElement('p')
                            p.innerHTML = isQuoteEmpty ? '<br>' : (blockquote.innerHTML || '<br>')
                            blockquote.replaceWith(p)
                            const newRange = document.createRange()
                            newRange.selectNodeContents(p)
                            newRange.collapse(true)
                            selection.removeAllRanges()
                            selection.addRange(newRange)

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

            if (e.key === 'ArrowDown') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0 && editorRef?.current) {
                    let node: Node | null = selection.anchorNode
                    let blockquote: HTMLElement | null = null
                    while (node && node !== editorRef.current) {
                        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === 'blockquote') {
                            blockquote = node as HTMLElement
                            break
                        }
                        node = node.parentNode
                    }

                    if (blockquote && !blockquote.nextElementSibling) {
                        const range = selection.getRangeAt(0)
                        if (range.collapsed) {
                            const p = document.createElement('p')
                            p.innerHTML = '<br>'
                            blockquote.after(p)
                            const newRange = document.createRange()
                            newRange.selectNodeContents(p)
                            newRange.collapse(false)
                            selection.removeAllRanges()
                            selection.addRange(newRange)

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

