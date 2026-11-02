import type {
  Currency,
  Market,
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentStatus,
} from "@/server/repositories/order-repository";

export interface OrderItemDto {
  slug: string;
  name: string;
  image?: { src: string; alt: string; position?: string };
  color?: string;
  size?: string;
  quantity: number;
  /** Minor units, as they were when the order was placed. */
  unitAmount: number;
  lineTotal: number;
}

export interface OrderAddressDto {
  country: string;
  city: string;
  address: string;
  zip: string;
}

export interface OrderDto {
  /** Shown to the shopper and used in URLs, e.g. "LZ-PK-000123". */
  number: string;
  market: Market;
  currency: Currency;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "card";
  /** Who collects the money ("simulated" only in development); null if no payment attempt exists. */
  paymentProvider: string | null;
  /** ISO 8601. */
  placedAt: string;
  paidAt: string | null;
  /** Unpaid orders give their stock back after this moment. */
  reservationExpiresAt: string | null;
  /** Minor units. */
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  /** With `taxIncluded`, the part of `total` that is tax. */
  taxTotal: number;
  /** null: no tax worked out. true: the tax is already inside the prices. false: added on top. */
  taxIncluded: boolean | null;
  total: number;
  email: string;
  phone: string;
  shipping: OrderAddressDto & { name: string; company?: string };
  billing: OrderAddressDto | null;
  items: OrderItemDto[];
}

const iso = (value: Date | null) =>
  value === null ? null : new Date(value).toISOString();

function toItem(row: OrderItemRow): OrderItemDto {
  return {
    slug: row.product_slug,
    name: row.name,
    ...(row.image_src
      ? {
          image: {
            src: row.image_src,
            alt: row.image_alt ?? "",
            ...(row.image_position ? { position: row.image_position } : {}),
          },
        }
      : {}),
    ...(row.color ? { color: row.color } : {}),
    ...(row.size ? { size: row.size } : {}),
    quantity: row.quantity,
    unitAmount: Number(row.unit_amount),
    lineTotal: Number(row.line_total),
  };
}

export function toOrderDto(row: OrderRow, items: OrderItemRow[]): OrderDto {
  return {
    number: row.number,
    market: row.market,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentProvider: row.payment_provider,
    placedAt: new Date(row.placed_at).toISOString(),
    paidAt: iso(row.paid_at),
    reservationExpiresAt:
      row.status === "waiting_payment" ? iso(row.reservation_expires_at) : null,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    shippingTotal: Number(row.shipping_total),
    taxTotal: Number(row.tax_total),
    taxIncluded: row.tax_included,
    total: Number(row.total),
    email: row.email,
    phone: row.phone,
    shipping: {
      name: row.ship_name,
      ...(row.ship_company ? { company: row.ship_company } : {}),
      country: row.ship_country,
      city: row.ship_city,
      address: row.ship_address,
      zip: row.ship_zip,
    },
    billing:
      row.bill_country !== null &&
      row.bill_city !== null &&
      row.bill_address !== null &&
      row.bill_zip !== null
        ? {
            country: row.bill_country,
            city: row.bill_city,
            address: row.bill_address,
            zip: row.bill_zip,
          }
        : null,
    items: items.filter((item) => item.order_id === row.id).map(toItem),
  };
}
