import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { NAVIGATION_ITEMS } from "./body.conf"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export const LeftbarBody = () => {

    const { t: translation } = useTranslation()

    return (
        <SidebarContent className="items-center md:justify-center flex-1">

            <SidebarGroup>
                <SidebarGroupLabel>{translation('layout.sidebar.workspace')}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {NAVIGATION_ITEMS.map((item, index) => (
                            <SidebarMenuItem key={index}>
                                <SidebarMenuButton render={<Link to={item.path} />}>
                                    <item.icon />
                                    <span className="md:hidden">{translation(item.label)}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

        </SidebarContent>
    )
}
