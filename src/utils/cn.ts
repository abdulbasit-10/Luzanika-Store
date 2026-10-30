import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined;

/** Joins class names and resolves Tailwind conflicts so a later class overrides an earlier one. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
