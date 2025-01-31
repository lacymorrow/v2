"use client";

import { Button } from '@/components/ui/button'

export default function ButtonComponent() {
  return (
    <Button onClick={() => console.log('Button clicked')}>
      Click Me
    </Button>
  )
}