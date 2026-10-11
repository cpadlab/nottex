import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { SubscriptIcon, SuperscriptIcon, type LucideIcon } from 'lucide-react'
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

export const ScriptStyleButtons = () => {

    const { t: translation } = useTranslation()
    const {
        isSuperscript,
        onSuperscript,
        isSubscript,
        onSubscript,
    } = useEditorContext()

    const mod = getModifierKey()

    const buttons: FormatButton[] = [
        { 
            icon: SuperscriptIcon, 
            label: "editor.toolbar.superscript",
            isActive: isSuperscript,
            shortcut: [mod, "."],
            onClick: onSuperscript,
        },
        { 
            icon: SubscriptIcon, 
            label: "editor.toolbar.subscript",
            isActive: isSubscript,
            shortcut: [mod, ","],
            onClick: onSubscript,
        },
    ]

    return (
        <ButtonGroup className='md:flex hidden'>
            {buttons.map((item, index) => (
                <Tooltip key={index}>
                    
                    <TooltipTrigger
                        render={<Button size="icon-sm" variant={item.isActive ? "secondary" : "outline"} aria-pressed={item.isActive} data-active={item.isActive} onClick={item.onClick}/>}>
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
