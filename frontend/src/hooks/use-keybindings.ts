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
    detectCurrentFormat,
    handleSelectionChange,
    onChange,
    editorRef,
    isInternalUpdate,
}: UseKeybindingsOptions) => {
    
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey

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

                if (e.shiftKey) {
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
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
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

