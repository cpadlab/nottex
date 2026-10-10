import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ListIcon, ListOrderedIcon, ListTodoIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface FormatButton {
    icon: LucideIcon
    label: string
    isActive: boolean
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

    const buttons: FormatButton[] = [
        { 
            icon: ListIcon, 
            label: "editor.toolbar.list",
            isActive: isList,
            onClick: onList,
        },
        { 
            icon: ListTodoIcon, 
            label: "editor.toolbar.listodo",
            isActive: isListTodo,
            onClick: onListTodo,
        },
        { 
            icon: ListOrderedIcon, 
            label: "editor.toolbar.listorder",
            isActive: isListOrdered,
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
                    
                    <TooltipContent>
                        <p>{translation(item.label)}</p>
                    </TooltipContent>
                    
                </Tooltip>
            ))}
        </ButtonGroup>
    )
}
