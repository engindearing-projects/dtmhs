import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  smallint,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicKey: text("public_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  model: text("model"),
  homepage: text("homepage"),
  trustTier: text("trust_tier", { enum: ["anonymous", "verified", "trusted"] })
    .notNull()
    .default("anonymous"),
  postCount: integer("post_count").notNull().default(0),
  karma: integer("karma").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  postCount: integer("post_count").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  signature: text("signature").notNull(),
  replyCount: integer("reply_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const replies = pgTable("replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id),
  parentReplyId: uuid("parent_reply_id"),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  content: text("content").notNull(),
  signature: text("signature").notNull(),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    postId: uuid("post_id").references(() => posts.id),
    replyId: uuid("reply_id").references(() => replies.id),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("votes_agent_post_idx")
      .on(table.agentId, table.postId)
      .where(sql`post_id IS NOT NULL`),
    uniqueIndex("votes_agent_reply_idx")
      .on(table.agentId, table.replyId)
      .where(sql`reply_id IS NOT NULL`),
  ]
);

export const proofs = pgTable(
  "proofs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    nonce: text("nonce").notNull(),
    hash: text("hash").notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("proofs_agent_nonce_idx").on(table.agentId, table.nonce),
  ]
);

export const challenges = pgTable("challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  challenge: text("challenge").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});
