'use client'

import { DayTimeline, type TimelineBlock } from '@/components/schedule/DayTimeline'

interface Props {
  blocks: TimelineBlock[]
}

export function LiveTimeline({ blocks }: Props) {
  return <DayTimeline blocks={blocks} readOnly showNowLine />
}
