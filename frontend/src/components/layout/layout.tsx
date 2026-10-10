import { Outlet } from 'react-router-dom'
import { Leftbar } from './components/leftbar/leftbar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar'

const Layout = () => {
    return (
        <SidebarProvider defaultOpen={false}>
            <Leftbar />
            <SidebarInset>
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout