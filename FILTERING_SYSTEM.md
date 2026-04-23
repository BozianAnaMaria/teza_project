# Filtering System Implementation

## Overview

This document describes the comprehensive filtering system that allows users to:
- View offers filtered by multiple criteria (category, labels, price, date, location)
- Subscribe to specific filters to receive notifications for new matching offers
- Combine multiple filters for precise searching
- Manage labels (managers) and filter definitions (admins)

## Architecture

### Database Schema

#### New Tables

1. **`labels`** - Reusable labels that can be assigned to offers
   - `id` (BIGSERIAL PRIMARY KEY)
   - `name` (VARCHAR(100) UNIQUE) - Label name
   - `description` (VARCHAR(255)) - Optional description
   - `color` (VARCHAR(7)) - Hex color code for UI display
   - `created_at` (TIMESTAMP)

2. **`filters`** - Filter definitions created by admins
   - `id` (BIGSERIAL PRIMARY KEY)
   - `name` (VARCHAR(100) UNIQUE) - Filter name
   - `description` (VARCHAR(500)) - Optional description
   - `criteria_json` (VARCHAR(5000)) - JSON string with filter criteria
   - `active` (BOOLEAN) - Whether the filter is active
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)
   - `created_by_id` (BIGINT FK → users)

3. **`offer_labels`** - Many-to-many join table
   - `offer_id` (BIGINT FK → offers)
   - `label_id` (BIGINT FK → labels)
   - PRIMARY KEY (offer_id, label_id)

4. **`filter_subscriptions`** - User subscriptions to filters
   - `id` (BIGSERIAL PRIMARY KEY)
   - `user_id` (BIGINT FK → users)
   - `filter_id` (BIGINT FK → filters)
   - `subscribed_at` (TIMESTAMP)
   - `last_notified_at` (TIMESTAMP) - Ensures only NEW offers trigger notifications
   - UNIQUE (user_id, filter_id)

#### Modified Tables

- **`offers`** - Added `category` field (VARCHAR(100))

### Filter Criteria Structure

Filter criteria are stored as JSON and support the following fields:

```json
{
  "categories": ["Sale", "Rent", "Commercial"],
  "labelIds": [1, 2, 3],
  "minPrice": 10000,
  "maxPrice": 100000,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z",
  "location": "Chișinău"
}
```

All fields are optional and can be combined.

## Components

### Entity Classes

1. **`Label.java`** - Label entity with many-to-many relationship to offers
2. **`Filter.java`** - Filter definition entity
3. **`FilterSubscription.java`** - User subscription to filter
4. **`Offer.java`** - Updated with category field and labels relationship

### DTOs

1. **`LabelDto.java`** - Label data transfer object
2. **`FilterDto.java`** - Filter with criteria and subscription status
3. **`FilterCriteriaDto.java`** - Structured filter criteria
4. **`FilterSubscriptionDto.java`** - Subscription information
5. **`OfferDto.java`** - Updated with category and labels

### Repositories

1. **`LabelRepository.java`** - CRUD operations for labels
2. **`FilterRepository.java`** - CRUD operations for filters
3. **`FilterSubscriptionRepository.java`** - Manage filter subscriptions

### Services

1. **`LabelService.java`**
   - Create, update, delete labels
   - Add/remove labels to/from offers
   - Convert entities to DTOs

2. **`FilterService.java`**
   - Create, update, delete filters
   - Apply filters dynamically using JPA Criteria API
   - Check if offers match filter criteria
   - JSON serialization/deserialization of criteria

3. **`FilterSubscriptionService.java`**
   - Subscribe/unsubscribe users to filters
   - Get user's subscriptions
   - Update last notification timestamp

4. **`NotificationService.java`**
   - Process new offers against active filters
   - Notify subscribed users when offers match their filters
   - Only notify for NEW offers (created after subscription)
   - Update last_notified_at to prevent duplicate notifications

5. **`OfferService.java`** - Updated
   - Trigger notifications when new offers are created
   - Include category and labels in DTO conversion

### Controllers

1. **`AdminController.java`** - Updated (ADMIN role only)
   - `GET /api/admin/filters` - List all filters
   - `GET /api/admin/filters/{id}` - Get filter by ID
   - `POST /api/admin/filters` - Create new filter
   - `PUT /api/admin/filters/{id}` - Update filter
   - `DELETE /api/admin/filters/{id}` - Delete filter

2. **`ManagerController.java`** - New (MANAGER and ADMIN roles)
   - `GET /api/manager/labels` - List all labels
   - `GET /api/manager/labels/{id}` - Get label by ID
   - `POST /api/manager/labels` - Create new label
   - `PUT /api/manager/labels/{id}` - Update label
   - `DELETE /api/manager/labels/{id}` - Delete label
   - `POST /api/manager/offers/{offerId}/labels/{labelId}` - Add label to offer
   - `DELETE /api/manager/offers/{offerId}/labels/{labelId}` - Remove label from offer

3. **`FilterController.java`** - New (Public and authenticated users)
   - `GET /api/filters` - List active filters (public)
   - `GET /api/filters/{id}` - Get filter by ID (public)
   - `POST /api/filters/apply` - Apply filter criteria to get offers (public)
   - `POST /api/filters/{id}/subscribe` - Subscribe to filter (authenticated)
   - `DELETE /api/filters/{id}/subscribe` - Unsubscribe from filter (authenticated)
   - `GET /api/filters/subscriptions` - Get user's subscriptions (authenticated)

### Security Configuration

Updated `SecurityConfig.java` with:
- `/api/admin/filters/**` - ADMIN only
- `/api/manager/**` - MANAGER and ADMIN
- `/api/filters` (GET) - Public
- `/api/filters/*/subscribe` - Authenticated users
- `/api/filters/apply` - Public

## Features

### 1. Dynamic Filtering

Users can apply multiple filter criteria simultaneously:
- **Category**: Filter by offer category (e.g., "Sale", "Rent")
- **Labels**: Filter by one or more labels
- **Price Range**: Min/max price filtering
- **Date Range**: Filter by creation date
- **Location**: Partial text match on location

### 2. Filter Visibility

When filters are active, they are clearly visible:
- The `FilterDto` includes the full criteria structure
- The `subscribed` flag indicates if the current user is subscribed
- Active filters can be displayed in the UI with all their criteria

### 3. Filter Subscriptions

Users can subscribe to filters:
- **One-click subscription**: Subscribe to a predefined filter
- **Automatic notifications**: Receive notifications for new matching offers
- **Smart notifications**: Only notified for offers created AFTER subscription
- **No duplicate notifications**: `last_notified_at` timestamp prevents duplicate alerts

### 4. Label Management

Managers can:
- Create custom labels with colors for visual distinction
- Assign multiple labels to offers
- Remove labels from offers
- Edit label properties

### 5. Filter Administration

Admins can:
- Create filter definitions with complex criteria
- Update existing filters
- Deactivate/activate filters
- Delete unused filters
- **Only admins can create/delete filters**

## Notification Flow

1. User creates a filter subscription (e.g., "Apartments under $50k in Centru")
2. System records `last_notified_at = now()`
3. New offer is created matching the criteria
4. `NotificationService.processNewOffer()` is called
5. System finds all active filters
6. For each filter, checks if new offer matches criteria
7. For each matching filter, finds subscriptions
8. **Only notifies if `offer.createdAt > subscription.lastNotifiedAt`**
9. Updates `last_notified_at` after notification
10. User receives notification (logged for now, can be extended to email/Telegram/push)

## Usage Examples

### Admin: Create a Filter

```http
POST /api/admin/filters
Content-Type: application/json

{
  "name": "Affordable Apartments in Center",
  "description": "Apartments under 60,000 EUR in city center",
  "active": true,
  "criteria": {
    "categories": ["Sale"],
    "maxPrice": 60000,
    "location": "Centru"
  }
}
```

### Manager: Add Label to Offer

```http
POST /api/manager/offers/123/labels/5
```

### User: Apply Filter

```http
POST /api/filters/apply?page=0&size=12
Content-Type: application/json

{
  "categories": ["Sale", "Rent"],
  "labelIds": [1, 3],
  "minPrice": 30000,
  "maxPrice": 80000,
  "location": "Chișinău"
}
```

### User: Subscribe to Filter

```http
POST /api/filters/7/subscribe
```

### User: Get My Subscriptions

```http
GET /api/filters/subscriptions
```

## Future Enhancements

1. **Notification Channels**
   - Email notifications
   - Telegram bot integration (using `user.telegramChatId`)
   - Push notifications
   - In-app notifications

2. **Advanced Filtering**
   - Saved custom filters (user-created)
   - Geolocation-based filtering
   - Keyword search in title/description
   - Sort options

3. **Analytics**
   - Popular filters
   - Subscription trends
   - Filter effectiveness metrics

4. **UI Improvements**
   - Filter builder interface
   - Visual filter tags
   - Real-time filter preview
   - Subscription management dashboard

## Testing

To test the filtering system:

1. Start the application: `mvn spring-boot:run`
2. Create an admin user
3. Create some labels via `/api/manager/labels`
4. Create filter definitions via `/api/admin/filters`
5. Assign labels to offers
6. Test filtering via `/api/filters/apply`
7. Subscribe to filters
8. Create new matching offers and check logs for notifications

## Database Migration

The system uses Hibernate with `ddl-auto: update`, so tables are automatically created. For production, consider:
- Creating explicit migration scripts (Flyway/Liquibase)
- Adding indexes for performance (see `schema-documentation.sql`)
- Setting up proper foreign key constraints

## Security Notes

- Filter CRUD operations are restricted to ADMIN role
- Label management requires MANAGER or ADMIN role
- Filter subscriptions require authentication
- Applying filters (read-only) is public
- All operations are audited via `AuditService`
