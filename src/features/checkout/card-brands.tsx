/** Small payment-brand marks shown inside the card number field. Decorative. */
export function CardBrands() {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <span className="text-[13px] leading-none font-extrabold tracking-tight text-[#1a1f71] italic">
        VISA
      </span>
      <svg viewBox="0 0 32 20" className="h-4 w-6">
        <circle cx="11" cy="10" r="8" fill="#eb001b" />
        <circle cx="21" cy="10" r="8" fill="#f79e1b" />
        <path d="M16 3.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4Z" fill="#ff5f00" />
      </svg>
      <span className="rounded-sm bg-[#003087] px-1 py-0.5 text-[9px] leading-none font-bold text-white italic">
        PayPal
      </span>
    </span>
  );
}
