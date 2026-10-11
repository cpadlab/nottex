import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { BoldIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import { getModifierKey } from '@/hooks/use-keybindings'

export interface FormatButton {
    icon: LucideIcon
    label: string
    isActive: boolean
    shortcut: string[]
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

    const mod = getModifierKey()

    const buttons: FormatButton[] = [
        { 
            icon: BoldIcon, 
            label: "editor.toolbar.bold",
            isActive: isBold,
            shortcut: [mod, "B"],
            onClick: onBold,
        },
        { 
            icon: ItalicIcon, 
            label: "editor.toolbar.italic",
            isActive: isItalic,
            shortcut: [mod, "I"],
            onClick: onItalic,
        },
        { 
            icon: UnderlineIcon, 
            label: "editor.toolbar.underline",
            isActive: isUnderline,
            shortcut: [mod, "U"],
            onClick: onUnderline,
        },
        { 
            icon: StrikethroughIcon, 
            label: "editor.toolbar.strikethrough",
            isActive: isStrikethrough,
            shortcut: [mod, "Shift", "S"],
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
                    
                    <TooltipContent className="flex items-center">
                        <span>{translation(item.label)}</span>
                        <KbdGroup>
                            {item.shortcut.map((key) => (
                                <Kbd key={key}>{key}</Kbd>
                            ))}
                        </KbdGroup>
                    </TooltipContent>
                    
                </Tooltip>
            ))}
        </ButtonGroup>
    )
}

