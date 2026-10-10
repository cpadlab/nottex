import { Outlet } from 'react-router-dom'
import { Leftbar } from './components/leftbar/leftbar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar'

const Layout = () => {
    return (
        <SidebarProvider defaultOpen={false}>
            <Leftbar />
            <SidebarInset>
                <div className='scroll-fade h-dvh overflow-y-auto'>
                    <SidebarTrigger />
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout