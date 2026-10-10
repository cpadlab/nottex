import { useCallback, useState } from "react"

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
    textFormatting?: TextFormat
    textAlign?: TextAlignment
}

export interface UseEditorOptions extends EditorActiveState {
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
}

export const useEditor = (options?: UseEditorOptions) => {
    
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
        textFormatting: "normal",
        textAlign: "align_left",
    })

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

    const onSetTextFormatting = useCallback((format: TextFormat) => {
        setState((prev) => ({ ...prev, textFormatting: format }))
        options?.onSetTextFormatting?.(format)
    }, [options])

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
        options?.onSetTextColor?.(color)
    }, [options])

    const onPaintRoller = useCallback((color?: string) => {
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
    }
}
