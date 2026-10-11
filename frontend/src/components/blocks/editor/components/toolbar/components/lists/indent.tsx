import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { ListIndentDecreaseIcon, ListIndentIncreaseIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'
import { getModifierKey } from '@/hooks/use-keybindings'

export interface FormatButton {
    icon: LucideIcon
    label: string
    shortcut: string[]
    onClick: () => void
}

export const ListsIndentButtons = () => {

    const { t: translation } = useTranslation()
    const { onListIndentDecrease, onListIndentIncrease } = useEditorContext()
    const mod = getModifierKey()

    const buttons: FormatButton[] = [
        { 
            icon: ListIndentDecreaseIcon, 
            label: "editor.toolbar.indentdecrease",
            shortcut: [mod, "["],
            onClick: onListIndentDecrease,
        },
        { 
            icon: ListIndentIncreaseIcon, 
            label: "editor.toolbar.indentincrease",
            shortcut: [mod, "]"],
            onClick: onListIndentIncrease,
        },
    ]

    return (
        <ButtonGroup className='md:flex hidden'>
            {buttons.map((item, index) => (
                <Tooltip key={index}>
                    
                    <TooltipTrigger render={<Button size="icon-sm" variant="outline" onClick={item.onClick} />}>
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
