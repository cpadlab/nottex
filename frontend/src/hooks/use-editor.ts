import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"

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
            setState((prev) => {
                if (prev.textFormatting === detected) return prev
                return { ...prev, textFormatting: detected }
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

    const handleInput = useCallback(() => {
        if (!editorRef.current) return
        const html = editorRef.current.innerHTML
        isInternalUpdate.current = true
        options?.onChange?.(html)
        handleSelectionChange()
    }, [options, handleSelectionChange])

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            const detected = detectCurrentFormat()
            if (detected.startsWith("heading_")) {
                setTimeout(() => {
                    document.execCommand("formatBlock", false, "p")
                    handleSelectionChange()
                    if (editorRef.current && options?.onChange) {
                        isInternalUpdate.current = true
                        options.onChange(editorRef.current.innerHTML)
                    }
                }, 0)
            }
        }
    }, [detectCurrentFormat, handleSelectionChange, options])

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

    const onAlignLeft = useCallback(() => {
        setState((prev) => ({ ...prev, textAlign: "align_left" }))
        options?.onAlignLeft?.()
        options?.onSetTextAlign?.("align_left")
    }, [options])

    const onAlignCenter = useCallback(() => {
        setState((prev) => ({ ...prev, textAlign: "align_center" }))
        options?.onAlignCenter?.()
        options?.onSetTextAlign?.("align_center")
    }, [options])

    const onAlignRight = useCallback(() => {
        setState((prev) => ({ ...prev, textAlign: "align_right" }))
        options?.onAlignRight?.()
        options?.onSetTextAlign?.("align_right")
    }, [options])

    const onAlignJustify = useCallback(() => {
        setState((prev) => ({ ...prev, textAlign: "align_justify" }))
        options?.onAlignJustify?.()
        options?.onSetTextAlign?.("align_justify")
    }, [options])

    const onSetTextAlign = useCallback((alignment: TextAlignment) => {
        setState((prev) => ({ ...prev, textAlign: alignment }))
        options?.onSetTextAlign?.(alignment)
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

    const onBold = useCallback(() => {
        setState((prev) => ({ ...prev, isBold: !prev.isBold }))
        options?.onToggleBold?.()
    }, [options])

    const onItalic = useCallback(() => {
        setState((prev) => ({ ...prev, isItalic: !prev.isItalic }))
        options?.onToggleItalic?.()
    }, [options])

    const onUnderline = useCallback(() => {
        setState((prev) => ({ ...prev, isUnderline: !prev.isUnderline }))
        options?.onToggleUnderline?.()
    }, [options])

    const onStrikethrough = useCallback(() => {
        setState((prev) => ({ ...prev, isStrikethrough: !prev.isStrikethrough }))
        options?.onToggleStrikethrough?.()
    }, [options])

    const onSuperscript = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isSuperscript: !prev.isSuperscript,
            isSubscript: false,
        }))
        options?.onToggleSuperscript?.()
    }, [options])

    const onSubscript = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isSubscript: !prev.isSubscript,
            isSuperscript: false,
        }))
        options?.onToggleSubscript?.()
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
