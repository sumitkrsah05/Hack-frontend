import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Translucent version of any CSS color (hex, var(), hsl()) — replaces hex+alpha
// concatenation so theme-aware var() colors keep working.
export function alpha(color, pct) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}


export const isIframe = window.self !== window.top;
