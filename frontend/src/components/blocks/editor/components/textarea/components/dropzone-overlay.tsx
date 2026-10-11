import { ImageIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface DropzoneOverlayProps {
    isVisible: boolean
}

export const DropzoneOverlay = ({ isVisible }: DropzoneOverlayProps) => {
    const { t: translation } = useTranslation()

    if (!isVisible) return null

    return (
        <div className="absolute inset-2 z-40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/70 bg-background/85 backdrop-blur-xs select-none pointer-events-none transition-all duration-150 animate-in fade-in-0 zoom-in-95">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs animate-bounce">
                <ImageIcon className="size-8" />
            </div>
            <p className="text-base font-semibold text-foreground tracking-tight">
                {translation("editor.image.dropzone")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                {translation("editor.image.dropzone_sub")}
            </p>
        </div>
    )
}

