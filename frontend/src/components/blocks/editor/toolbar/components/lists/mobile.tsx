import { Select, SelectContent, SelectTrigger, SelectItem, SelectSeparator } from '@/components/ui/select'
import { ListIcon, ListIndentDecreaseIcon, ListIndentIncreaseIcon, ListOrderedIcon, ListTodoIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fragment } from 'react/jsx-runtime'
import { useEditorContext } from '@/contexts/editor-context'
import { cn } from 'cn'

export interface SelectItemConfig {
    label: string
    value: string
    icon: LucideIcon
}

const SELECT_ITEMS: SelectItemConfig[] = [
    { 
        icon: ListIcon, 
        label: "editor.toolbar.list",
        value: "list"
    },
    { 
        icon: ListTodoIcon, 
        label: "editor.toolbar.listodo",
        value: "listodo"
    },
    { 
        icon: ListOrderedIcon, 
        label: "editor.toolbar.listorder",
        value: "listorder"
    },
    { 
        icon: ListIndentDecreaseIcon, 
        label: "editor.toolbar.indentdecrease",
        value: "indentdecrease"
    },
    { 
        icon: ListIndentIncreaseIcon, 
        label: "editor.toolbar.indentincrease",
        value: "indentincrease"
    }
]

export const ListSelect = () => {

    const { t: translation } = useTranslation()
    const {
        isList,
        onList,
        isListTodo,
        onListTodo,
        isListOrdered,
        onListOrdered,
        onListIndentDecrease,
        onListIndentIncrease,
        isCompact,
    } = useEditorContext()

    const currentListValue = isList
        ? "list"
        : isListTodo
          ? "listodo"
          : isListOrdered
            ? "listorder"
            : ""

    const isAnyListActive = Boolean(isList || isListTodo || isListOrdered)

    const ActiveIcon = isListTodo
        ? ListTodoIcon
        : isListOrdered
          ? ListOrderedIcon
          : ListIcon

    const handleValueChange = (val: string | null) => {
        if (!val) return
        switch (val) {
            case "list":
                onList()
                break
            case "listodo":
                onListTodo()
                break
            case "listorder":
                onListOrdered()
                break
            case "indentdecrease":
                onListIndentDecrease()
                break
            case "indentincrease":
                onListIndentIncrease()
                break
        }
    }

    return (    
        <Select value={currentListValue} onValueChange={handleValueChange}>
            
            <SelectTrigger size="sm" className={cn("w-auto gap-2 flex", !isCompact && "md:hidden")} aria-pressed={isAnyListActive} data-active={isAnyListActive}>
                <ActiveIcon />
            </SelectTrigger>
        
            <SelectContent className="w-auto">
                {SELECT_ITEMS.map((item, index) => {
                    return (
                        <Fragment key={item.value}>
                            {index === 3 && <SelectSeparator />}
                            <SelectItem className="cursor-pointer flex items-center gap-2" value={item.value}>
                                <item.icon />
                                <span>{translation(item.label)}</span>
                            </SelectItem>
                        </Fragment>
                    )
                })}
            </SelectContent>

        </Select>
    )
}