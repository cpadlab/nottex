import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface EditorTextareaProps extends ComponentProps<'div'> {
    placeholder?: string
}

export const EditorTextarea = ({ className, placeholder, ...props }: EditorTextareaProps) => {
    
    const { t: translation } = useTranslation()
    const defaultPlaceholder = translation('editor.placeholder')
    const { editorRef, handleInput, handleKeyDown, handleSelectionChange } = useEditorContext()

    return (
        <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder ?? defaultPlaceholder} onInput={handleInput} onKeyDown={handleKeyDown} onKeyUp={handleSelectionChange} onMouseUp={handleSelectionChange}
            className={cn(
                "w-full scroll-fade flex-1 min-w-full min-h-0 overflow-y-auto outline-none resize-none scrollbar-none",
                "[&_p]:text-base [&_p]:leading-relaxed [&_p]:my-1.5",
                "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:my-3",
                "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:my-2.5",
                "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-normal [&_h3]:my-2",
                "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through [&_sup]:text-xs [&_sub]:text-xs",
                "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
                className
            )} {...props}
        />
    )
}



