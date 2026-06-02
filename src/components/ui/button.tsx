import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold uppercase tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground border-3 border-black shadow-hard-sm hover:shadow-[5px_5px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        secondary: "bg-white text-black border-3 border-black shadow-hard-sm hover:shadow-[5px_5px_0px_#000]",
        accent: "bg-accent text-black border-3 border-black shadow-hard-sm hover:shadow-[5px_5px_0px_#000]",
        ghost: "text-black hover:bg-muted border-3 border-transparent",
        outline: "bg-white text-black border-3 border-black hover:shadow-hard-sm",
      },
      size: { sm: "h-9 px-3 text-[10px] rounded-md", md: "h-11 px-5 text-xs rounded-lg", lg: "h-13 px-6 text-sm rounded-xl", xl: "h-14 px-8 text-sm rounded-xl" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";
export { Button, buttonVariants };
