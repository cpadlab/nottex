import Logo from "@/assets/logo"

const Loading = () => {
    return (
        <div className="fixed bg-background top-0 left-0 right-0 bottom-0 flex items-center justify-center">
            <Logo fill="var(--color-muted-foreground)" className="size-6" />
        </div>
    )
}

export default Loading