import { Icons } from '@/config/icons'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  className?: string
}

const icons = {
  success: Icons.Success,
  error: Icons.Error,
  warning: Icons.Warning,
  info: Info,
}

const styles = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
}

export default function Alert({ type, message, className }: AlertProps) {
  const Icon = icons[type]
  return (
    <div className={cn('flex items-start gap-2.5 p-3 rounded-md border text-xs leading-relaxed', styles[type], className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}
