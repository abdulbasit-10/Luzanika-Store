/** Input formatters for the card fields. They only shape what is typed; checking happens in checkout-schema. */

export function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})(?=.)/g, "$1 ");
}

/** "1224" -> "12/24"; a lone first digit above 1 gets a leading zero ("3" -> "03/"). */
export function formatExpiry(value: string) {
  let digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

export function formatCvv(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}
