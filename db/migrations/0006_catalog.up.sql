-- The product catalogue: categories, products, prices per market, photos, variants and stock.
-- Money is stored in minor units (paisa / cents) as bigint. Stock is kept per variant and per
-- market, because the two markets are stocked separately.

CREATE TABLE categories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  label               text NOT NULL,
  hero_title          text NOT NULL,
  title               text NOT NULL,
  description         text NOT NULL,
  hero_image_src      text NOT NULL,
  hero_image_alt      text NOT NULL,
  hero_image_position text,
  -- Text of the first pill on the category page, e.g. "ALL MEN".
  all_label           text NOT NULL,
  -- Sizes offered by the sidebar size filter.
  filter_sizes        text[] NOT NULL DEFAULT '{}',
  -- Bounds of the sidebar price slider, in minor units.
  price_min           bigint NOT NULL,
  price_max           bigint NOT NULL,
  price_step          bigint NOT NULL,
  sort                integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT categories_price_range CHECK (price_min >= 0 AND price_max > price_min AND price_step > 0)
);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  slug        text NOT NULL,
  -- Pill text, e.g. "FORMAL TAILORING".
  label       text NOT NULL,
  -- Short name for the breadcrumb, e.g. "Formal".
  short_label text,
  sort        integer NOT NULL DEFAULT 0,

  CONSTRAINT subcategories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT subcategories_slug_unique UNIQUE (category_id, slug),
  -- Lets products point at a subcategory and its category together (see products).
  CONSTRAINT subcategories_id_category_unique UNIQUE (id, category_id)
);

-- The sidebar "Category" filter choices on a category page ("Men Casual", ...).
CREATE TABLE collections (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  text NOT NULL UNIQUE,
  label text NOT NULL,

  CONSTRAINT collections_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE category_collections (
  category_id   uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  sort          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, collection_id)
);

CREATE INDEX category_collections_collection_idx ON category_collections (collection_id);

CREATE TABLE products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  tagline        text,
  -- Home page products can belong to no category.
  category_id    uuid REFERENCES categories (id) ON DELETE RESTRICT,
  subcategory_id uuid,
  collection_id  uuid REFERENCES collections (id) ON DELETE SET NULL,
  availability   text,
  badge_label    text,
  badge_tone     text,
  is_new         boolean NOT NULL DEFAULT false,
  rating_avg     numeric(2, 1),
  rating_count   integer NOT NULL DEFAULT 0,
  -- Short descriptors such as scent notes.
  notes          text[] NOT NULL DEFAULT '{}',
  has_size_guide boolean NOT NULL DEFAULT false,
  -- An unlisted product has a page but is not shown in category or product lists.
  listed         boolean NOT NULL DEFAULT true,
  status         text NOT NULL DEFAULT 'active',
  deleted_at     timestamptz,
  -- Position in the all-products list; category pages keep the same relative order.
  sort           integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT products_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT products_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  CONSTRAINT products_status_valid CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT products_availability_valid CHECK (availability IN ('in-stock', 'pre-order', 'fitting-ready')),
  CONSTRAINT products_badge_tone_valid CHECK (badge_tone IN ('dark', 'light')),
  CONSTRAINT products_badge_complete CHECK ((badge_label IS NULL) = (badge_tone IS NULL)),
  CONSTRAINT products_rating_valid CHECK (rating_avg BETWEEN 0 AND 5),
  CONSTRAINT products_rating_count_valid CHECK (rating_count >= 0),
  CONSTRAINT products_subcategory_needs_category CHECK (subcategory_id IS NULL OR category_id IS NOT NULL),
  -- A subcategory must belong to the product's own category.
  CONSTRAINT products_subcategory_fk FOREIGN KEY (subcategory_id, category_id)
    REFERENCES subcategories (id, category_id) ON DELETE RESTRICT
);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Everything the shop shows is "active, not deleted"; this keeps those reads fast.
CREATE INDEX products_visible_sort_idx ON products (sort, id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX products_category_idx ON products (category_id, sort);
CREATE INDEX products_collection_idx ON products (collection_id);

CREATE TABLE product_prices (
  product_id        uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  market            text NOT NULL,
  currency          text NOT NULL,
  amount            bigint NOT NULL,
  compare_at_amount bigint,
  PRIMARY KEY (product_id, market),

  CONSTRAINT product_prices_market_currency CHECK (
    (market = 'PK' AND currency = 'PKR') OR (market = 'DE' AND currency = 'EUR')
  ),
  CONSTRAINT product_prices_amount_valid CHECK (amount >= 0),
  CONSTRAINT product_prices_compare_at_valid CHECK (compare_at_amount IS NULL OR compare_at_amount > amount)
);

CREATE TABLE product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  src        text NOT NULL,
  alt        text NOT NULL,
  position   text,
  sort       integer NOT NULL DEFAULT 0,

  CONSTRAINT product_images_sort_unique UNIQUE (product_id, sort)
);

CREATE TABLE product_detail_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,

  CONSTRAINT product_detail_sections_sort_unique UNIQUE (product_id, sort)
);

-- One row per sellable combination of colour and size (either can be absent).
CREATE TABLE product_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku        text NOT NULL UNIQUE,
  color_name text,
  color_hex  text,
  size_label text,
  sort       integer NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_variants_color_complete CHECK ((color_name IS NULL) = (color_hex IS NULL)),
  CONSTRAINT product_variants_color_hex_valid CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9a-fA-F]{6}$')
);

-- A product cannot have the same colour and size twice (NULL counts as "none").
CREATE UNIQUE INDEX product_variants_combination_unique
  ON product_variants (product_id, COALESCE(color_name, ''), COALESCE(size_label, ''));

CREATE INDEX product_variants_product_idx ON product_variants (product_id, sort);

-- How many of a variant are in stock in a market. "available" is on_hand - reserved.
CREATE TABLE inventory (
  variant_id          uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  market              text NOT NULL,
  on_hand             integer NOT NULL DEFAULT 0,
  reserved            integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 3,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, market),

  CONSTRAINT inventory_market_valid CHECK (market IN ('PK', 'DE')),
  CONSTRAINT inventory_on_hand_valid CHECK (on_hand >= 0),
  CONSTRAINT inventory_reserved_valid CHECK (reserved >= 0 AND reserved <= on_hand),
  CONSTRAINT inventory_threshold_valid CHECK (low_stock_threshold >= 0)
);

CREATE TRIGGER inventory_set_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Every change to stock, so the numbers can always be explained. Never edited or deleted.
CREATE TABLE stock_movements (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  market     text NOT NULL,
  delta      integer NOT NULL,
  reason     text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT stock_movements_market_valid CHECK (market IN ('PK', 'DE')),
  CONSTRAINT stock_movements_reason_valid CHECK (
    reason IN ('initial_import', 'adjustment', 'sale', 'return', 'correction')
  ),
  CONSTRAINT stock_movements_delta_nonzero CHECK (delta <> 0)
);

CREATE INDEX stock_movements_variant_idx ON stock_movements (variant_id, market, created_at);

-- The products shown in the home page sections, in order.
CREATE TABLE home_features (
  section    text NOT NULL,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sort       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (section, product_id),

  CONSTRAINT home_features_section_valid CHECK (section IN ('featured', 'new-arrivals', 'special-offers')),
  CONSTRAINT home_features_sort_unique UNIQUE (section, sort) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX home_features_product_idx ON home_features (product_id);
