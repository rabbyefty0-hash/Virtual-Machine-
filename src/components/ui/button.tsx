import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/80 backdrop-blur-xl text-white hover:bg-indigo-600 shadow-lg border border-white/20 liquid-glass",
        destructive:
          "bg-red-500/80 backdrop-blur-xl text-white hover:bg-red-600 shadow-lg border border-white/20 liquid-glass",
        outline:
          "border border-white/20 bg-white/5 backdrop-blur-xl hover:bg-white/10 text-white shadow-sm liquid-glass",
        secondary:
          "bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 shadow-sm border border-white/10 liquid-glass",
        ghost: "hover:bg-white/10 hover:text-white rounded-full transition-colors",
        link: "text-indigo-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
