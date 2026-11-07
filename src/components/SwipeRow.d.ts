import type { ComponentType, CSSProperties, ReactNode } from "react"

type SwipeAction = {
  id: string
  label: string
  icon?: ReactNode
  color?: string
  dismiss?: boolean
  onSelect?: () => void
}

type SwipeRowProps = {
  children: ReactNode
  drawer?: "one"
  actions?: SwipeAction[]
  actionColor?: string
  drawerColor?: string
  rowColor?: string
  textColor?: string
  height?: number
  radius?: number
  actionWidth?: number
  direction?: "left" | "right"
  snapBounce?: number
  resistance?: number
  collapseMs?: number
  commitAt?: number
  fullSwipe?: boolean
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAction?: (action: SwipeAction) => void
  onCommit?: (action: SwipeAction) => void
  closeOnAction?: boolean
  haptic?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

declare const SwipeRow: ComponentType<SwipeRowProps>
export default SwipeRow
