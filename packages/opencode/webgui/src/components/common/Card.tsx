import type { HTMLAttributes, ReactNode } from "react"

/**
 * Props for the Card component
 */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode
  /** Add hover effect with shadow (default: false) */
  hoverable?: boolean
  /** Internal padding size (default: "md") */
  padding?: "none" | "sm" | "md" | "lg"
}

const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
}

/**
 * A container component with optional header, body, and footer sections.
 *
 * @example
 * ```tsx
 * <Card hoverable padding="md">
 *   <CardHeader>
 *     <h3>Title</h3>
 *   </CardHeader>
 *   <CardBody>
 *     <p>Content goes here</p>
 *   </CardBody>
 *   <CardFooter>
 *     <button>操作</button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export function Card({ children, hoverable = false, padding = "md", className = "", ...props }: CardProps) {
  const paddingClass = paddingClasses[padding]
  const hoverClass = hoverable ? "hover:shadow-md cursor-pointer transition-shadow duration-200" : ""

  return (
    <div className={`modern-card ${paddingClass} ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Props for the CardHeader component
 */
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Header content */
  children: ReactNode
}

/**
 * Card header section with bottom border
 */
export function CardHeader({ children, className = "", ...props }: CardHeaderProps) {
  return (
    <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-800 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Props for the CardBody component
 */
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Body content */
  children: ReactNode
}

/**
 * Card main content area
 */
export function CardBody({ children, className = "", ...props }: CardBodyProps) {
  return (
    <div className={`px-4 py-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Props for the CardFooter component
 */
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Footer content */
  children: ReactNode
}

/**
 * Card footer section with top border and gray background
 */
export function CardFooter({ children, className = "", ...props }: CardFooterProps) {
  return (
    <div
      className={`px-4 py-3 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-200 dark:border-gray-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
