import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from '@/components/ui/breadcrumb'
import { useNoteContext } from '@/contexts/note-context'

export const NoteBreadcrumb = () => {
    
    const { t: translation } = useTranslation()
    const { pathSegments, title } = useNoteContext()

    const hasMoreThanTwoFolders = pathSegments.length > 2
    const lastFolder = pathSegments[pathSegments.length - 1]

    return (
        <Breadcrumb>
            <BreadcrumbList className='truncate flex-nowrap'>
    
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link to="/notes" />}>{translation('note.breadcrumb.home')}</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link to="/workspace" />}>{translation('note.breadcrumb.workspace')}</BreadcrumbLink>
                </BreadcrumbItem>

                {pathSegments.length > 0 && (
                    <>
                        <BreadcrumbSeparator />
                        {hasMoreThanTwoFolders ? (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbEllipsis />
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <span className="text-muted-foreground">{lastFolder}</span>
                                </BreadcrumbItem>
                            </>
                        ) : (
                            pathSegments.map((segment, index) => (
                                <Fragment key={index}>
                                    {index > 0 && <BreadcrumbSeparator />}
                                    <BreadcrumbItem>
                                        <span className="text-muted-foreground">{segment}</span>
                                    </BreadcrumbItem>
                                </Fragment>
                            ))
                        )}
                    </>
                )}

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                    <BreadcrumbPage className='truncate'>
                        <p className='truncate'>{title.trim() ? title : translation('note.untitled')}</p>
                    </BreadcrumbPage>
                </BreadcrumbItem>

            </BreadcrumbList>
        </Breadcrumb>
    )
}
