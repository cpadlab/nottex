import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BaselineIcon, PaintRollerIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface FormatButton {
    icon: LucideIcon
    label: string
    isActive: boolean
    onClick: () => void
}

export const ColorStyleButtons = () => {

    const { t: translation } = useTranslation()
    const {
        isBaseline,
        onBaseline,
        isPaintRoller,
        onPaintRoller,
    } = useEditorContext()

    const buttons: FormatButton[] = [
        { 
            icon: BaselineIcon, 
            label: "editor.toolbar.baseline",
            isActive: isBaseline,
            onClick: () => onBaseline(),
        },
        { 
            icon: PaintRollerIcon, 
            label: "editor.toolbar.paintroller",
            isActive: isPaintRoller,
            onClick: () => onPaintRoller(),
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
