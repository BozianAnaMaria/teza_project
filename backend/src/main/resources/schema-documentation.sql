-- Schema Documentation for Filtering System
-- This file documents the database schema for the filtering and labeling system
-- Tables are automatically created by Hibernate (ddl-auto: update)

-- Labels Table: Stores reusable labels that can be assigned to offers
CREATE TABLE IF NOT EXISTS labels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    color VARCHAR(7), -- Hex color code, e.g., #FF5733
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Filters Table: Stores filter definitions created by admins
CREATE TABLE IF NOT EXISTS filters (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    criteria_json VARCHAR(5000) NOT NULL, -- JSON string with filter criteria
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);

-- Offer Labels Table: Many-to-many join table between offers and labels
CREATE TABLE IF NOT EXISTS offer_labels (
    offer_id BIGINT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (offer_id, label_id)
);

-- Filter Subscriptions Table: Tracks user subscriptions to filters
CREATE TABLE IF NOT EXISTS filter_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filter_id BIGINT NOT NULL REFERENCES filters(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_notified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, filter_id)
);

-- Update Offers Table: Add category field
ALTER TABLE offers ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_filters_active ON filters(active);
CREATE INDEX IF NOT EXISTS idx_filter_subscriptions_user ON filter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_subscriptions_filter ON filter_subscriptions(filter_id);
CREATE INDEX IF NOT EXISTS idx_offer_labels_offer ON offer_labels(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_labels_label ON offer_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at);

-- Sample FilterCriteria JSON structure:
-- {
--   "categories": ["Sale", "Rent"],
--   "labelIds": [1, 2, 3],
--   "minPrice": 10000,
--   "maxPrice": 100000,
--   "startDate": "2026-01-01T00:00:00Z",
--   "endDate": "2026-12-31T23:59:59Z",
--   "location": "Chișinău"
-- }
