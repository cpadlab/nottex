import { Sidebar, SidebarHeader } from "@/components/ui/sidebar"
import { LeftbarBody } from "./body/body"

export const Leftbar = () => {
    return (
        <Sidebar variant="sidebar" className="md:bg-transparent bg-sidebar md:border-r-0 border-r" collapsible="icon">

            <SidebarHeader />
            <LeftbarBody />

        </Sidebar>
    )
}
