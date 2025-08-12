import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  real,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// New Event Discovery Tables
export const events = pgTable('events', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  dateTime: timestamp('date_time'),
  platform: varchar('platform', { length: 50 }), // instagram, twitter, tiktok, etc.
  sourceUrl: text('source_url'),
  relevanceScore: real('relevance_score'),
  isStudentFriendly: boolean('is_student_friendly').default(false),
  scrapedAt: timestamp('scraped_at').defaultNow(),
  chatId: uuid('chat_id').references(() => chat.id),
  createdAt: timestamp('created_at').defaultNow(),
  rawData: json('raw_data'), // Store original scraped data
  eventType: varchar('event_type', { length: 50 }), // social, academic, cultural, sports, nightlife
  keywords: json('keywords'), // Array of relevant keywords
  imageUrl: text('image_url'), // Event image if available
  organizer: text('organizer'), // Event organizer/host
  price: text('price'), // Event cost information
  ageRestriction: text('age_restriction'), // Age requirements
  tags: json('tags'), // Array of event tags
});

export type Event = InferSelectModel<typeof events>;

export const eventQueries = pgTable('event_queries', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  query: text('query').notNull(),
  location: text('location'),
  userId: uuid('user_id').references(() => user.id),
  chatId: uuid('chat_id').references(() => chat.id),
  resultsFound: integer('results_found').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  eventType: varchar('event_type', { length: 50 }),
  keywords: json('keywords'),
  processingStatus: varchar('processing_status', { length: 50 }).default(
    'pending',
  ), // pending, processing, completed, failed
  errorMessage: text('error_message'),
  scrapedAt: timestamp('scraped_at'),
  processingTime: integer('processing_time'), // in milliseconds
});

export type EventQuery = InferSelectModel<typeof eventQueries>;

export const eventPlatforms = pgTable('event_platforms', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(), // instagram, twitter, tiktok, facebook
  isActive: boolean('is_active').default(true),
  lastScraped: timestamp('last_scraped'),
  rateLimitRemaining: integer('rate_limit_remaining'),
  rateLimitReset: timestamp('rate_limit_reset'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type EventPlatform = InferSelectModel<typeof eventPlatforms>;
