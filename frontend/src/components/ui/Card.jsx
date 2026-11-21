
import { cn } from '../../utils/cn'

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

function Card({
  children,
  className,
  padding = 'md',
  hover = false,
  ...props
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200',
        hover && 'hover:shadow-md hover:border-slate-300',
        paddings[padding] ?? paddings.md,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold leading-tight tracking-tight text-slate-900',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

function CardDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('text-sm text-slate-500 leading-normal', className)}
      {...props}
    >
      {children}
    </p>
  )
}

function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('pt-2', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center pt-4 border-t border-slate-100', className)}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}

export default Card
