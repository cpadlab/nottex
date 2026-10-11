import { useCallback, useEffect, useRef, useState } from "react"
import { useKeybindings } from "./use-keybindings"

export type TextFormat = "normal" | "heading_1" | "heading_2" | "heading_3"
export type TextAlignment = "align_left" | "align_center" | "align_right" | "align_justify"
export type ListType = "list" | "listodo" | "listorder"

export interface EditorActiveState {
    isBold?: boolean
    isItalic?: boolean
    isUnderline?: boolean
    isStrikethrough?: boolean
    isSuperscript?: boolean
    isSubscript?: boolean
    isQuote?: boolean
    isCodeXml?: boolean
    isList?: boolean
    isListTodo?: boolean
    isListOrdered?: boolean
    isLink?: boolean
    isBaseline?: boolean
    isPaintRoller?: boolean
    isCompact?: boolean
    textFormatting?: TextFormat
    textAlign?: TextAlignment
}

export interface UseEditorOptions extends EditorActiveState {
    value?: string
    onChange?: (value: string) => void
    onSetTextFormatting?: (format: TextFormat) => void
    onIndentDecrease?: () => void
    onIndentIncrease?: () => void
    onToggleBulletList?: () => void
    onToggleTodoList?: () => void
    onToggleOrderedList?: () => void
    onAlignLeft?: () => void
    onAlignCenter?: () => void
    onAlignRight?: () => void
    onAlignJustify?: () => void
    onSetTextAlign?: (alignment: TextAlignment) => void
    onToggleQuote?: () => void
    onToggleCodeXml?: () => void
    onSetTextColor?: (color?: string) => void
    onSetHighlight?: (color?: string) => void
    onInsertLink?: (url?: string) => void
    onInsertImage?: (src?: string) => void
    onInsertVideo?: (src?: string) => void
    onToggleBold?: () => void
    onToggleItalic?: () => void
    onToggleUnderline?: () => void
    onToggleStrikethrough?: () => void
    onToggleSuperscript?: () => void
    onToggleSubscript?: () => void
    onToggleCompact?: () => void
}

const formatToTag: Record<TextFormat, string> = {
    normal: "p",
    heading_1: "h1",
    heading_2: "h2",
    heading_3: "h3",
}

const ALIGN_COMMAND_MAP: Record<TextAlignment, string> = {
    align_left: "justifyLeft",
    align_center: "justifyCenter",
    align_right: "justifyRight",
    align_justify: "justifyFull",
}

export const useEditor = (options?: UseEditorOptions) => {
    
    const editorRef = useRef<HTMLDivElement>(null)
    const isInternalUpdate = useRef(false)

    const [state, setState] = useState<Required<EditorActiveState>>({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        isSuperscript: false,
        isSubscript: false,
        isQuote: false,
        isCodeXml: false,
        isList: false,
        isListTodo: false,
        isListOrdered: false,
        isLink: false,
        isBaseline: false,
        isPaintRoller: false,
        isCompact: false,
        textFormatting: "normal",
        textAlign: "align_left",
    })

    const detectCurrentFormat = useCallback((): TextFormat => {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0 || !editorRef.current) return "normal"

        let node: Node | null = selection.anchorNode
        while (node && node !== editorRef.current) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = (node as HTMLElement).tagName.toLowerCase()
                if (tagName === "h1") return "heading_1"
                if (tagName === "h2") return "heading_2"
                if (tagName === "h3") return "heading_3"
                if (tagName === "p") return "normal"
            }
            node = node.parentNode
        }
        return "normal"
    }, [])

    const handleSelectionChange = useCallback(() => {
        if (!editorRef.current) return
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        if (editorRef.current.contains(selection.anchorNode)) {
            const detected = detectCurrentFormat()
            const isBoldState = document.queryCommandState("bold")
            const isItalicState = document.queryCommandState("italic")
            const isUnderlineState = document.queryCommandState("underline")
            const isStrikethroughState = document.queryCommandState("strikeThrough")
            const isSuperscriptState = document.queryCommandState("superscript")
            const isSubscriptState = document.queryCommandState("subscript")

            let detectedAlign: TextAlignment = "align_left"
            if (document.queryCommandState("justifyCenter")) {
                detectedAlign = "align_center"
            } else if (document.queryCommandState("justifyRight")) {
                detectedAlign = "align_right"
            } else if (document.queryCommandState("justifyFull")) {
                detectedAlign = "align_justify"
            } else if (document.queryCommandState("justifyLeft")) {
                detectedAlign = "align_left"
            }

            setState((prev) => {
                if (
                    prev.textFormatting === detected &&
                    prev.isBold === isBoldState &&
                    prev.isItalic === isItalicState &&
                    prev.isUnderline === isUnderlineState &&
                    prev.isStrikethrough === isStrikethroughState &&
                    prev.isSuperscript === isSuperscriptState &&
                    prev.isSubscript === isSubscriptState &&
                    prev.textAlign === detectedAlign
                ) {
                    return prev
                }
                return {
                    ...prev,
                    textFormatting: detected,
                    isBold: isBoldState,
                    isItalic: isItalicState,
                    isUnderline: isUnderlineState,
                    isStrikethrough: isStrikethroughState,
                    isSuperscript: isSuperscriptState,
                    isSubscript: isSubscriptState,
                    textAlign: detectedAlign,
                }
            })
        }
    }, [detectCurrentFormat])

    const onSetTextFormatting = useCallback((format: TextFormat) => {
        setState((prev) => ({ ...prev, textFormatting: format }))
        options?.onSetTextFormatting?.(format)

        const editor = editorRef.current
        if (!editor) return

        if (document.activeElement !== editor) {
            editor.focus()
        }

        const tag = formatToTag[format]
        document.execCommand("formatBlock", false, tag)

        if (options?.onChange) {
            isInternalUpdate.current = true
            options.onChange(editor.innerHTML)
        }
    }, [options])

    useEffect(() => {
        if (!editorRef.current) return
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false
            return
        }
        if (options?.value !== undefined && editorRef.current.innerHTML !== options.value) {
            editorRef.current.innerHTML = options.value || "<p><br></p>"
        }
    }, [options?.value])

    useEffect(() => {
        document.addEventListener("selectionchange", handleSelectionChange)
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange)
        }
    }, [handleSelectionChange])

    const cleanupNestedScripts = useCallback((container: HTMLElement) => {
        let nested = container.querySelector("sup sup, sub sub, sup sub, sub sup")
        if (!nested) return

        const selection = window.getSelection()
        let savedRange: Range | null = null
        if (selection && selection.rangeCount > 0 && container.contains(selection.anchorNode)) {
            try {
                savedRange = selection.getRangeAt(0).cloneRange()
            } catch {
                savedRange = null
            }
        }

        while (nested) {
            nested.replaceWith(...Array.from(nested.childNodes))
            nested = container.querySelector("sup sup, sub sub, sup sub, sub sup")
        }

        if (savedRange && selection) {
            try {
                selection.removeAllRanges()
                selection.addRange(savedRange)
            } catch {
            }
        }
    }, [])

    const handleInput = useCallback(() => {
        if (!editorRef.current) return
        cleanupNestedScripts(editorRef.current)
        const html = editorRef.current.innerHTML
        isInternalUpdate.current = true
        options?.onChange?.(html)
        handleSelectionChange()
    }, [options, handleSelectionChange, cleanupNestedScripts])

    const executeInlineCommand = useCallback((command: string) => {
        const editor = editorRef.current
        if (!editor) return

        if (document.activeElement !== editor) {
            editor.focus()
        }

        document.execCommand(command, false)

        if (options?.onChange) {
            isInternalUpdate.current = true
            options.onChange(editor.innerHTML)
        }

        handleSelectionChange()
    }, [options, handleSelectionChange])

    const onBold = useCallback(() => {
        executeInlineCommand("bold")
        options?.onToggleBold?.()
    }, [executeInlineCommand, options])

    const onItalic = useCallback(() => {
        executeInlineCommand("italic")
        options?.onToggleItalic?.()
    }, [executeInlineCommand, options])

    const onUnderline = useCallback(() => {
        executeInlineCommand("underline")
        options?.onToggleUnderline?.()
    }, [executeInlineCommand, options])

    const onStrikethrough = useCallback(() => {
        executeInlineCommand("strikeThrough")
        options?.onToggleStrikethrough?.()
    }, [executeInlineCommand, options])

    const onSuperscript = useCallback(() => {
        const editor = editorRef.current
        if (!editor) return

        if (document.activeElement !== editor) {
            editor.focus()
        }

        // Disable subscript first to prevent nesting sup inside sub
        if (document.queryCommandState("subscript")) {
            document.execCommand("subscript", false)
        }

        document.execCommand("superscript", false)
        cleanupNestedScripts(editor)

        if (options?.onChange) {
            isInternalUpdate.current = true
            options.onChange(editor.innerHTML)
        }

        handleSelectionChange()
        options?.onToggleSuperscript?.()
    }, [options, handleSelectionChange, cleanupNestedScripts])

    const onSubscript = useCallback(() => {
        const editor = editorRef.current
        if (!editor) return

        if (document.activeElement !== editor) {
            editor.focus()
        }

        if (document.queryCommandState("superscript")) {
            document.execCommand("superscript", false)
        }

        document.execCommand("subscript", false)
        cleanupNestedScripts(editor)

        if (options?.onChange) {
            isInternalUpdate.current = true
            options.onChange(editor.innerHTML)
        }

        handleSelectionChange()
        options?.onToggleSubscript?.()
    }, [options, handleSelectionChange, cleanupNestedScripts])

    const onSetTextAlign = useCallback((alignment: TextAlignment) => {
        setState((prev) => ({ ...prev, textAlign: alignment }))
        options?.onSetTextAlign?.(alignment)

        const editor = editorRef.current
        if (!editor) return

        if (document.activeElement !== editor) {
            editor.focus()
        }

        const command = ALIGN_COMMAND_MAP[alignment]
        document.execCommand(command, false)

        if (options?.onChange) {
            isInternalUpdate.current = true
            options.onChange(editor.innerHTML)
        }

        handleSelectionChange()
    }, [options, handleSelectionChange])

    const onAlignLeft = useCallback(() => {
        onSetTextAlign("align_left")
        options?.onAlignLeft?.()
    }, [onSetTextAlign, options])

    const onAlignCenter = useCallback(() => {
        onSetTextAlign("align_center")
        options?.onAlignCenter?.()
    }, [onSetTextAlign, options])

    const onAlignRight = useCallback(() => {
        onSetTextAlign("align_right")
        options?.onAlignRight?.()
    }, [onSetTextAlign, options])

    const onAlignJustify = useCallback(() => {
        onSetTextAlign("align_justify")
        options?.onAlignJustify?.()
    }, [onSetTextAlign, options])

    const { handleKeyDown } = useKeybindings({
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
        onChange: options?.onChange,
        editorRef,
        isInternalUpdate,
    })

    const isCompact = options?.isCompact ?? state.isCompact

    const onToggleCompact = useCallback(() => {
        setState((prev) => ({ ...prev, isCompact: !prev.isCompact }))
        options?.onToggleCompact?.()
    }, [options])

    const isBold = options?.isBold ?? state.isBold
    const isItalic = options?.isItalic ?? state.isItalic
    const isUnderline = options?.isUnderline ?? state.isUnderline
    const isStrikethrough = options?.isStrikethrough ?? state.isStrikethrough
    const isSuperscript = options?.isSuperscript ?? state.isSuperscript
    const isSubscript = options?.isSubscript ?? state.isSubscript
    const isQuote = options?.isQuote ?? state.isQuote
    const isCodeXml = options?.isCodeXml ?? state.isCodeXml
    const isList = options?.isList ?? state.isList
    const isListTodo = options?.isListTodo ?? state.isListTodo
    const isListOrdered = options?.isListOrdered ?? state.isListOrdered
    const isLink = options?.isLink ?? state.isLink
    const isBaseline = options?.isBaseline ?? state.isBaseline
    const isPaintRoller = options?.isPaintRoller ?? state.isPaintRoller
    const textFormatting = options?.textFormatting ?? state.textFormatting
    const textAlign = options?.textAlign ?? state.textAlign

    const isNormal = textFormatting === "normal"
    const isHeading1 = textFormatting === "heading_1"
    const isHeading2 = textFormatting === "heading_2"
    const isHeading3 = textFormatting === "heading_3"

    const isAlignLeft = textAlign === "align_left"
    const isAlignCenter = textAlign === "align_center"
    const isAlignRight = textAlign === "align_right"
    const isAlignJustify = textAlign === "align_justify"

    const onSetNormal = useCallback(() => {
        onSetTextFormatting("normal")
    }, [onSetTextFormatting])

    const onSetHeading1 = useCallback(() => {
        onSetTextFormatting("heading_1")
    }, [onSetTextFormatting])

    const onSetHeading2 = useCallback(() => {
        onSetTextFormatting("heading_2")
    }, [onSetTextFormatting])

    const onSetHeading3 = useCallback(() => {
        onSetTextFormatting("heading_3")
    }, [onSetTextFormatting])

    const onListIndentDecrease = useCallback(() => {
        options?.onIndentDecrease?.()
    }, [options])

    const onListIndentIncrease = useCallback(() => {
        options?.onIndentIncrease?.()
    }, [options])

    const onList = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isList: !prev.isList,
            isListTodo: false,
            isListOrdered: false,
        }))
        options?.onToggleBulletList?.()
    }, [options])

    const onListTodo = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isListTodo: !prev.isListTodo,
            isList: false,
            isListOrdered: false,
        }))
        options?.onToggleTodoList?.()
    }, [options])

    const onListOrdered = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isListOrdered: !prev.isListOrdered,
            isList: false,
            isListTodo: false,
        }))
        options?.onToggleOrderedList?.()
    }, [options])


    const onQuote = useCallback(() => {
        setState((prev) => ({ ...prev, isQuote: !prev.isQuote }))
        options?.onToggleQuote?.()
    }, [options])

    const onCodeXml = useCallback(() => {
        setState((prev) => ({ ...prev, isCodeXml: !prev.isCodeXml }))
        options?.onToggleCodeXml?.()
    }, [options])

    const onBaseline = useCallback((color?: string) => {
        setState((prev) => ({ ...prev, isBaseline: !prev.isBaseline }))
        options?.onSetTextColor?.(color)
    }, [options])

    const onPaintRoller = useCallback((color?: string) => {
        setState((prev) => ({ ...prev, isPaintRoller: !prev.isPaintRoller }))
        options?.onSetHighlight?.(color)
    }, [options])

    const onLink = useCallback((url?: string) => {
        setState((prev) => ({ ...prev, isLink: !prev.isLink }))
        options?.onInsertLink?.(url)
    }, [options])

    const onImage = useCallback((src?: string) => {
        options?.onInsertImage?.(src)
    }, [options])

    const onVideo = useCallback((src?: string) => {
        options?.onInsertVideo?.(src)
    }, [options])


    return {
        editorRef,
        handleInput,
        handleKeyDown,
        handleSelectionChange,
        isBold,
        isItalic,
        isUnderline,
        isStrikethrough,
        isSuperscript,
        isSubscript,
        isQuote,
        isCodeXml,
        isList,
        isListTodo,
        isListOrdered,
        isLink,
        isBaseline,
        isPaintRoller,
        isCompact,
        isNormal,
        isHeading1,
        isHeading2,
        isHeading3,
        isAlignLeft,
        isAlignCenter,
        isAlignRight,
        isAlignJustify,
        textFormatting,
        textAlign,
        onSetTextFormatting,
        onSetNormal,
        onSetHeading1,
        onSetHeading2,
        onSetHeading3,
        onListIndentDecrease,
        onListIndentIncrease,
        onList,
        onListTodo,
        onListOrdered,
        onAlignLeft,
        onAlignCenter,
        onAlignRight,
        onAlignJustify,
        onSetTextAlign,
        onQuote,
        onCodeXml,
        onBaseline,
        onPaintRoller,
        onLink,
        onImage,
        onVideo,
        onBold,
        onItalic,
        onUnderline,
        onStrikethrough,
        onSuperscript,
        onSubscript,
        onToggleCompact,
    }
}
