import Dropdown, {
  DropdownItem,
  DropdownHeader,
  DropdownDivider,
} from './Dropdown'

function DropdownMenuItem({
  shortcut,
  children,
  className,
  ...props
}) {
  return (
    <DropdownItem className={className} {...props}>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && (
        <kbd className="ml-auto text-[11px] font-mono tracking-wider text-slate-400 select-none">
          {shortcut}
        </kbd>
      )}
    </DropdownItem>
  )
}

function DropdownMenu({ children, ...props }) {
  return <Dropdown {...props}>{children}</Dropdown>
}

DropdownMenu.Item = DropdownMenuItem
DropdownMenu.Header = DropdownHeader
DropdownMenu.Divider = DropdownDivider

export {
  DropdownMenuItem,
  DropdownHeader as DropdownMenuHeader,
  DropdownDivider as DropdownMenuDivider,
}

export default DropdownMenu
