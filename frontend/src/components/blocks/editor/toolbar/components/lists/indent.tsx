import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ListIndentDecreaseIcon, ListIndentIncreaseIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface FormatButton {
    icon: LucideIcon
    label: string
    onClick: () => void
}

export const ListsIndentButtons = () => {

    const { t: translation } = useTranslation()
    const { onListIndentDecrease, onListIndentIncrease } = useEditorContext()

    const buttons: FormatButton[] = [
        { 
            icon: ListIndentDecreaseIcon, 
            label: "editor.toolbar.indentdecrease",
            onClick: onListIndentDecrease,
        },
        { 
            icon: ListIndentIncreaseIcon, 
            label: "editor.toolbar.indentincrease",
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
                    
                    <TooltipContent>
                        <p>{translation(item.label)}</p>
                    </TooltipContent>
                    
                </Tooltip>
            ))}
        </ButtonGroup>
    )
}
