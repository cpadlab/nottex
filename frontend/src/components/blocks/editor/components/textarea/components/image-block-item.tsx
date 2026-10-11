import { useState, useCallback, useEffect } from 'react'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon, Maximize2Icon, Settings2Icon, StretchHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

export type ImageLayout = 'fit' | 'fill'
export type ImageAlign = 'left' | 'center' | 'right' | 'justify'

export interface ImageBlockItemProps {
    container: HTMLElement
}

export const ImageBlockItem = ({ container }: ImageBlockItemProps) => {
    
    const { t: translation } = useTranslation()

    const [src] = useState(
        () =>
            container.getAttribute('data-src') ??
            container.querySelector('img[data-raw-img]')?.getAttribute('src') ??
            ''
    )

    const [layout, setLayout] = useState<ImageLayout>(
        () => (container.getAttribute('data-layout') as ImageLayout) || 'fit'
    )

    const [align, setAlign] = useState<ImageAlign>(
        () => (container.getAttribute('data-align') as ImageAlign) || 'center'
    )

    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (container.getAttribute('contenteditable') !== 'false') {
            container.setAttribute('contenteditable', 'false')
        }
    }, [container])

    const handleLayoutChange = useCallback(
        (newLayout: ImageLayout) => {
            setLayout(newLayout)
            container.setAttribute('data-layout', newLayout)
            const editor = container.closest(
                '[contenteditable=true]'
            ) as HTMLElement | null
            if (editor) {
                editor.dispatchEvent(new Event('input', { bubbles: true }))
            }
        },
        [container]
    )

    const handleAlignChange = useCallback(
        (newAlign: ImageAlign) => {
            setAlign(newAlign)
            container.setAttribute('data-align', newAlign)
            const editor = container.closest(
                '[contenteditable=true]'
            ) as HTMLElement | null
            if (editor) {
                editor.dispatchEvent(new Event('input', { bubbles: true }))
            }
        },
        [container]
    )

    const handleDelete = useCallback(() => {
        const editor = container.closest(
            '[contenteditable=true]'
        ) as HTMLElement | null
        container.remove()
        if (editor) {
            editor.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }, [container])

    const alignClass = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        justify: 'justify-center w-full',
    }[align]

    const imageWrapperClass = cn(
        'group relative inline-block max-w-full transition-all',
        (layout === 'fill' || align === 'justify') && 'w-full'
    )

    const imageClass = cn(
        'rounded-xl border border-border shadow-xs transition-all duration-200 select-none pointer-events-auto',
        layout === 'fill' || align === 'justify'
            ? 'w-full h-auto max-h-[700px] object-cover'
            : 'max-w-full max-h-[520px] w-auto h-auto object-contain',
        isOpen && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
    )

    return (
        <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={cn('my-4 flex w-full select-none', alignClass)}>
            
            <div className={imageWrapperClass}>
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    
                    <div className="relative">
                        <img src={src} alt="" className={imageClass} onClick={() => setIsOpen(true)} />
                        <div className="absolute right-2.5 top-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PopoverTrigger
                                render={
                                    <Button size="icon-xs" variant="secondary" className="size-7 rounded-lg shadow-md bg-background/80 backdrop-blur-xs hover:bg-background" onClick={() => setIsOpen((prev) => !prev)} >
                                        <Settings2Icon className="size-3.5" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    <PopoverContent side="top" align="center" sideOffset={8} className="w-72 p-4 gap-4 rounded-xl shadow-xl border bg-popover">
                        
                        <PopoverHeader className="pb-2 border-b">
                            <PopoverTitle className="text-xs font-semibold text-muted-foreground uppercase">
                                {translation('editor.image.title')}
                            </PopoverTitle>
                        </PopoverHeader>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-foreground">{translation('editor.image.layout')}</span>
                            <div className="grid grid-cols-2 gap-1.5">
                                <Button size="sm" variant={layout === 'fit' ? 'default' : 'outline'} onClick={() => handleLayoutChange('fit')}>
                                    <Maximize2Icon className="size-3.5" />
                                    {translation('editor.image.layout_fit')}
                                </Button>
                                <Button size="sm" variant={layout === 'fill' ? 'default' : 'outline'} onClick={() => handleLayoutChange('fill')}>
                                    <StretchHorizontalIcon className="size-3.5" />
                                    {translation('editor.image.layout_fill')}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            
                            <span className="text-xs font-medium text-foreground">{translation('editor.image.align')}</span>
                            
                            <div className="flex gap-1">
                                <Button size="icon-sm" variant={align === 'left' ? 'default' : 'outline'} onClick={() => handleAlignChange('left')} title={translation('editor.image.align_left')} className="flex-1">
                                    <AlignLeftIcon className="size-3.5" />
                                </Button>
                                <Button size="icon-sm" variant={align === 'center' ? 'default' : 'outline'} className="flex-1" onClick={() => handleAlignChange('center')} title={translation('editor.image.align_center')}>
                                    <AlignCenterIcon className="size-3.5" />
                                </Button>
                                <Button size="icon-sm" variant={align === 'right' ? 'default' : 'outline'} className="flex-1" onClick={() => handleAlignChange('right')} title={translation('editor.image.align_right')}>
                                    <AlignRightIcon className="size-3.5" />
                                </Button>
                                <Button size="icon-sm" variant={align === 'justify' ? 'default' : 'outline'} className="flex-1" onClick={() => handleAlignChange('justify')} title={translation('editor.image.align_justify')} >
                                    <AlignJustifyIcon className="size-3.5" />
                                </Button>
                            </div>

                        </div>

                        <div className="pt-4 border-t">
                            <Button size="sm" variant="destructive" className="w-full text-xs gap-1.5 justify-center" onClick={handleDelete}>
                                <Trash2Icon className="size-3.5" />
                                {translation('editor.image.delete')}
                            </Button>
                        </div>

                    </PopoverContent>

                </Popover>
            </div>

        </div>
    )
}

