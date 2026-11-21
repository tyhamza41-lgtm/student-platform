import { createContext, useContext } from 'react'
import { cn } from '../../utils/cn'

const TableContext = createContext({
  dense: false,
  striped: false,
  hover: true,
})

function Table({
  striped = false,
  hover = true,
  dense = false,
  bordered = false,
  className,
  wrapperClassName,
  children,
  ...props
}) {
  return (
    <TableContext.Provider value={{ dense, striped, hover }}>
      <div
        className={cn(
          'w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs',
          wrapperClassName,
        )}
      >
        <table
          className={cn(
            'w-full caption-bottom text-sm border-collapse',
            bordered && 'border border-slate-200',
            className,
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  )
}

function TableHeader({ className, children, ...props }) {
  return (
    <thead
      className={cn('bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600', className)}
      {...props}
    >
      {children}
    </thead>
  )
}

function TableBody({ className, children, ...props }) {
  return (
    <tbody
      className={cn('divide-y divide-slate-100 bg-white text-slate-800', className)}
      {...props}
    >
      {children}
    </tbody>
  )
}

function TableFooter({ className, children, ...props }) {
  return (
    <tfoot
      className={cn('border-t border-slate-200 bg-slate-50 font-medium text-slate-700', className)}
      {...props}
    >
      {children}
    </tfoot>
  )
}

function TableRow({
  selected = false,
  className,
  children,
  ...props
}) {
  const { hover, striped } = useContext(TableContext)

  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        hover && 'hover:bg-slate-50/80',
        striped && 'even:bg-slate-50/40',
        selected && 'bg-violet-50/60 hover:bg-violet-50/80',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

function TableHead({
  align = 'left',
  className,
  children,
  ...props
}) {
  const { dense } = useContext(TableContext)

  const aligns = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <th
      scope="col"
      className={cn(
        'font-semibold text-slate-700 select-none',
        dense ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-xs',
        aligns[align] ?? aligns.left,
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

function TableCell({
  align = 'left',
  className,
  children,
  ...props
}) {
  const { dense } = useContext(TableContext)

  const aligns = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <td
      className={cn(
        'align-middle text-slate-700',
        dense ? 'px-3 py-2 text-xs' : 'px-4 py-3.5 text-sm',
        aligns[align] ?? aligns.left,
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

function TableCaption({ className, children, ...props }) {
  return (
    <caption
      className={cn('mt-4 text-xs text-slate-500 p-2 text-center', className)}
      {...props}
    >
      {children}
    </caption>
  )
}

Table.Header = TableHeader
Table.Body = TableBody
Table.Footer = TableFooter
Table.Row = TableRow
Table.Head = TableHead
Table.Cell = TableCell
Table.Caption = TableCaption

export {
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}

export default Table
