import { Sidebar, SidebarHeader } from "@/components/ui/sidebar"
import { LeftbarBody } from "./body/body"
import Logo from "@/assets/logo"

export const Leftbar = () => {
    return (
        <Sidebar variant="sidebar" className="md:bg-transparent md:border-r-0" collapsible="icon">

            <SidebarHeader>
                <Logo className="size-8" />
            </SidebarHeader>
            <LeftbarBody />

        </Sidebar>
    )
}
