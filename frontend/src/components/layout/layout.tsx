import { Outlet } from 'react-router-dom'
import { Leftbar } from './components/leftbar/leftbar'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'

const Layout = () => {
    return (
        <SidebarProvider className='h-dvh overflow-hidden' defaultOpen={false}>
            <Leftbar />
            <SidebarInset>
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout