import { Sidebar, SidebarHeader } from "@/components/ui/sidebar"
import { LeftbarBody } from "./body/body"

export const Leftbar = () => {
    return (
        <Sidebar variant="sidebar" className="md:bg-transparent md:border-r-0" collapsible="icon">

            <SidebarHeader />
            <LeftbarBody />

        </Sidebar>
    )
}
