import * as React from 'react'
import { format, setHours, setMinutes } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  minDate?: Date
  placeholder?: string
  disabled?: boolean
}

function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = '날짜와 시간을 선택하세요',
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const hours = value ? String(value.getHours()).padStart(2, '0') : '00'
  const minutes = value ? String(value.getMinutes()).padStart(2, '0') : '00'

  function handleDateSelect(selectedDate: Date | undefined) {
    if (!selectedDate) {
      onChange(undefined)
      return
    }
    // 기존 시간 유지하면서 날짜만 변경
    const currentHours = value ? value.getHours() : new Date().getHours()
    const currentMinutes = value ? value.getMinutes() : 0
    const newDate = setMinutes(setHours(selectedDate, currentHours), currentMinutes)
    onChange(newDate)
  }

  function handleTimeChange(type: 'hours' | 'minutes', rawValue: string) {
    const num = parseInt(rawValue, 10)
    if (isNaN(num)) return

    const base = value || new Date()
    if (type === 'hours' && num >= 0 && num <= 23) {
      onChange(setHours(base, num))
    } else if (type === 'minutes' && num >= 0 && num <= 59) {
      onChange(setMinutes(base, num))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'yyyy년 MM월 dd일 HH:mm', { locale: ko }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={minDate ? { before: minDate } : undefined}
          defaultMonth={value}
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">시간</span>
            <Input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => handleTimeChange('hours', e.target.value)}
              className="h-8 w-16 text-center"
            />
            <span className="text-sm">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => handleTimeChange('minutes', e.target.value)}
              className="h-8 w-16 text-center"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
DateTimePicker.displayName = 'DateTimePicker'

export { DateTimePicker }
export type { DateTimePickerProps }
