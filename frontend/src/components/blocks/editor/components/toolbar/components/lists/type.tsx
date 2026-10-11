import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { ListIcon, ListOrderedIcon, ListTodoIcon, type LucideIcon } from 'lucide-react'
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

export const ListsTypeButtons = () => {

    const { t: translation } = useTranslation()
    const {
        isList,
        onList,
        isListTodo,
        onListTodo,
        isListOrdered,
        onListOrdered,
    } = useEditorContext()
    const mod = getModifierKey()

    const buttons: FormatButton[] = [
        { 
            icon: ListIcon, 
            label: "editor.toolbar.list",
            isActive: isList,
            shortcut: [mod, "Shift", "8"],
            onClick: onList,
        },
        { 
            icon: ListTodoIcon, 
            label: "editor.toolbar.listodo",
            isActive: isListTodo,
            shortcut: [mod, "Shift", "9"],
            onClick: onListTodo,
        },
        { 
            icon: ListOrderedIcon, 
            label: "editor.toolbar.listorder",
            isActive: isListOrdered,
            shortcut: [mod, "Shift", "7"],
            onClick: onListOrdered,
        },
    ]

    return (
        <ButtonGroup className='md:flex hidden'>
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
