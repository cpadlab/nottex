import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BoldIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface FormatButton {
    icon: LucideIcon
    label: string
    isActive: boolean
    onClick: () => void
}

export const RichTextButtons = () => {
    
    const { t: translation } = useTranslation()
    const {
        isBold,
        onBold,
        isItalic,
        onItalic,
        isUnderline,
        onUnderline,
        isStrikethrough,
        onStrikethrough,
    } = useEditorContext()

    const buttons: FormatButton[] = [
        { 
            icon: BoldIcon, 
            label: "editor.toolbar.bold",
            isActive: isBold,
            onClick: onBold,
        },
        { 
            icon: ItalicIcon, 
            label: "editor.toolbar.italic",
            isActive: isItalic,
            onClick: onItalic,
        },
        { 
            icon: UnderlineIcon, 
            label: "editor.toolbar.underline",
            isActive: isUnderline,
            onClick: onUnderline,
        },
        { 
            icon: StrikethroughIcon, 
            label: "editor.toolbar.strikethrough",
            isActive: isStrikethrough,
            onClick: onStrikethrough,
        },
    ]

    return (
        <ButtonGroup>
            {buttons.map((item, index) => (
                <Tooltip key={index}>
                    
                    <TooltipTrigger render={<Button size="icon-sm" variant={item.isActive ? "secondary" : "outline"} aria-pressed={item.isActive} data-active={item.isActive} onClick={item.onClick} />}>
                        <item.icon />
                    </TooltipTrigger>
                    
                    <TooltipContent>
                        <p>{translation(item.label)}</p>
                    </TooltipContent>
                    
                </Tooltip>
            ))}
        </ButtonGroup>
    )
}
