import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth tables (shape required by Better Auth's core schema)          */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Domain: consulting projects → sites → SKUs → order lines           */
/* ------------------------------------------------------------------ */

export const projectStatus = pgEnum("project_status", [
  "discovery",
  "analysis",
  "design",
  "delivered",
]);

/** A consulting engagement for one client. */
export const project = pgTable("project", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  client: text("client").notNull(),
  industry: text("industry").notNull(),
  status: projectStatus("status").notNull().default("discovery"),
  summary: text("summary"),
  startedOn: date("started_on").notNull(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** A physical warehouse / distribution site inside a project. */
export const site = pgTable(
  "site",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    city: text("city").notNull(),
    /** Footprint in m². */
    floorArea: real("floor_area").notNull(),
    clearHeight: real("clear_height").notNull(),
    dockDoors: integer("dock_doors").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("site_project_idx").on(t.projectId)],
);

/** A stock-keeping unit handled at a site. Dimensions in mm, weight in kg. */
export const sku = pgTable(
  "sku",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    lengthMm: integer("length_mm").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    weightKg: real("weight_kg").notNull(),
    unitsPerCase: integer("units_per_case").notNull(),
  },
  (t) => [uniqueIndex("sku_site_code_uq").on(t.siteId, t.code)],
);

/** One line of an outbound order — the raw input for movement analysis. */
export const orderLine = pgTable(
  "order_line",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    skuId: text("sku_id")
      .notNull()
      .references(() => sku.id, { onDelete: "cascade" }),
    orderNo: text("order_no").notNull(),
    shippedOn: date("shipped_on").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    index("order_line_site_date_idx").on(t.siteId, t.shippedOn),
    index("order_line_sku_idx").on(t.skuId),
  ],
);
