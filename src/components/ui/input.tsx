import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "flex h-12 w-full rounded-lg border-3 border-black bg-white px-4 py-2 text-sm text-black font-bold placeholder:text-gray-400 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:shadow-hard-sm disabled:opacity-50",
      className
    )} {...props} />
  )
);
Input.displayName = "Input";
export { Input };
