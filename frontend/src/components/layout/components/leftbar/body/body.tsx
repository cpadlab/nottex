import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { NAVIGATION_GROUPS } from "./body.conf"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthContext } from "@/contexts/auth-context"

export const LeftbarBody = () => {

    const { t: translation } = useTranslation()
    const location = useLocation()
    const { isAuthenticated } = useAuthContext()

    return (
        <SidebarContent className="items-center md:justify-center flex-1 gap-2">
            {NAVIGATION_GROUPS.map((group) => (
                <SidebarGroup key={group.id} className="p-0">
    
                    {group.label && (
                        <SidebarGroupLabel className="md:hidden">
                            {translation(group.label)}
                        </SidebarGroupLabel>
                    )}

                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.items.map((item) => {
    
                                const translatedLabel = translation(item.label)
                                const isActive = !item.isExternal && location.pathname === item.path
                                const isDisabled = !item.isExternal && !isAuthenticated

                                return (
                                    <SidebarMenuItem key={item.path}>
                                        <SidebarMenuButton isActive={isActive} disabled={isDisabled} tooltip={{ children: translatedLabel, side: "right" }}
                                            className={isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
                                            render={
                                                item.isExternal ? (
                                                    <a href={item.path} target="_blank" rel="noopener noreferrer" />
                                                ) : isDisabled ? (
                                                    <span aria-disabled="true" tabIndex={-1} />
                                                ) : (
                                                    <Link to={item.path} />
                                                )
                                            }
                                        >
                                            <item.icon />
                                            <span className="md:hidden">{translatedLabel}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>

                </SidebarGroup>
            ))}
            
        </SidebarContent>
    )
}


