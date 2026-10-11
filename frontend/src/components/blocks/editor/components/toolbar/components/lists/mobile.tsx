import { Select, SelectContent, SelectTrigger, SelectItem, SelectSeparator } from '@/components/ui/select'
import { ListIcon, ListIndentDecreaseIcon, ListIndentIncreaseIcon, ListOrderedIcon, ListTodoIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fragment } from 'react/jsx-runtime'
import { useEditorContext } from '@/contexts/editor-context'
import { cn } from 'cn'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { getModifierKey } from '@/hooks/use-keybindings'

export interface SelectItemConfig {
    label: string
    value: string
    icon: LucideIcon
    shortcut: string[]
}

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

    const mod = getModifierKey()

    const selectItems: SelectItemConfig[] = [
        { 
            icon: ListIcon, 
            label: "editor.toolbar.list",
            value: "list",
            shortcut: [mod, "Shift", "8"],
        },
        { 
            icon: ListTodoIcon, 
            label: "editor.toolbar.listodo",
            value: "listodo",
            shortcut: [mod, "Shift", "9"],
        },
        { 
            icon: ListOrderedIcon, 
            label: "editor.toolbar.listorder",
            value: "listorder",
            shortcut: [mod, "Shift", "7"],
        },
        { 
            icon: ListIndentDecreaseIcon, 
            label: "editor.toolbar.indentdecrease",
            value: "indentdecrease",
            shortcut: [mod, "["],
        },
        { 
            icon: ListIndentIncreaseIcon, 
            label: "editor.toolbar.indentincrease",
            value: "indentincrease",
            shortcut: [mod, "]"],
        }
    ]

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
            
            <SelectTrigger size="sm" className={cn("w-auto gap-2 flex", !isCompact && "md:hidden", isAnyListActive && "bg-secondary text-secondary-foreground")} aria-pressed={isAnyListActive} data-active={isAnyListActive}>
                <ActiveIcon />
            </SelectTrigger>
        
            <SelectContent className="w-auto md:min-w-[240px]">
                {selectItems.map((item, index) => {
                    const isActive = (item.value === "list" && isList) || (item.value === "listodo" && isListTodo) || (item.value === "listorder" && isListOrdered)
                    return (
                        <Fragment key={item.value}>
                            {index === 3 && <SelectSeparator />}
                            <SelectItem className={cn("cursor-pointer", isActive && "bg-secondary/70 text-secondary-foreground font-medium")} value={item.value}>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex items-center gap-2">
                                        <item.icon />
                                        <span>{translation(item.label)}</span>
                                    </div>
                                    {item.shortcut && (
                                        <KbdGroup className="hidden md:inline-flex">
                                            {item.shortcut.map((key) => (
                                                <Kbd key={key}>{key}</Kbd>
                                            ))}
                                        </KbdGroup>
                                    )}
                                </div>
                            </SelectItem>
                        </Fragment>
                    )
                })}
            </SelectContent>

        </Select>
    )
}