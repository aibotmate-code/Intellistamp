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
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
}

export default function Alert({ type, message, className }: AlertProps) {
  const Icon = icons[type]
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border text-sm', styles[type], className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}
