import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ImageIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorContext } from '@/contexts/editor-context'

export interface FormatButton {
    icon: LucideIcon
    label: string
    onClick: () => void
}

export const MediaButtons = () => {

    const { t: translation } = useTranslation()
    const { onImage } = useEditorContext()

    const buttons: FormatButton[] = [
        { 
            icon: ImageIcon, 
            label: "editor.toolbar.image",
            onClick: () => onImage(),
        },
    ]

    return (
        <ButtonGroup className='md:flex hidden'>
            {buttons.map((item, index) => {
                const IconComponent = item.icon
                return (
                    <Tooltip key={index}>
                        
                        <TooltipTrigger
                            render={<Button size="icon-sm" variant="outline" onClick={item.onClick} />}>
                            <IconComponent />
                        </TooltipTrigger>
                        
                        <TooltipContent>
                            <p>{translation(item.label)}</p>
                        </TooltipContent>
                        
                    </Tooltip>
                )
            })}
        </ButtonGroup>
    )
}