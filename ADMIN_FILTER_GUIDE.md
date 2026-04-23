# Admin Filter Management - Quick Guide

## What's New in Admin Panel

I've added a **"Filters" tab** in the admin panel where you can create and manage filter definitions.

## How to Access

1. **Start the application:**
   ```bash
   cd /Users/abozian/VS\ Code/teza_project/backend
   mvn spring-boot:run
   ```

2. **Open your browser:** http://localhost:8080/admin

3. **Log in as admin**

4. **Click the "Filters" tab** (between "Offers" and "Subscriptions")

## Create a Filter

1. Click the **"+ Create Filter"** button
2. Fill in the form:
   - **Filter Name**: e.g., "Affordable Apartments"
   - **Description**: Brief explanation
   - **Active**: Check to make it visible to users
   - **Criteria** (all optional):
     - **Categories**: Sale, Rent, Commercial (comma-separated)
     - **Label IDs**: e.g., 1, 2, 3 (comma-separated)
     - **Min/Max Price**: Price range in EUR
     - **Location**: City or area name
     - **Start/End Date**: Date range filter

3. Click **"Save Filter"**

## Example Filters to Create

### Affordable Homes
```
Name: Affordable Apartments
Description: Budget-friendly apartments under 50,000 EUR
Active: ✓
Criteria:
  - Categories: Sale
  - Max Price: 50000
```

### Premium Properties
```
Name: Luxury Properties
Description: High-end properties over 100,000 EUR
Active: ✓
Criteria:
  - Min Price: 100000
  - Label IDs: 1 (assuming 1 is "Luxury" label)
```

### Rentals in Center
```
Name: City Center Rentals
Description: Rental properties in city center
Active: ✓
Criteria:
  - Categories: Rent
  - Location: Centru
```

## Managing Filters

- **Edit**: Click "Edit" next to any filter to modify it
- **Delete**: Click "Delete" to remove a filter (users subscribed will lose their subscription)
- **Active/Inactive**: Uncheck "Active" to hide a filter from users without deleting it

## Where Users See These Filters

Once you create filters:

1. Users see them on the main page under **"Filters" → "Saved Filters"**
2. Users can:
   - Click "Apply" to use the filter immediately
   - Click "Subscribe" to get notifications for new matching offers
3. When subscribed, users get notified automatically when new offers match the criteria

## Filter Criteria Details

All criteria are **optional** and **combinable**:

- **Categories**: Filter by offer type (Sale, Rent, Commercial)
- **Label IDs**: Filter by labels (create labels in Manager panel first)
- **Price Range**: Min and/or max price
- **Location**: Partial text match (e.g., "Chișinău" matches "Chișinău, Botanica")
- **Date Range**: Filter offers by creation date

## Testing the Filter

After creating a filter:

1. Go to the main page (http://localhost:8080)
2. Click **"🔍 FILTERS"**
3. Scroll to **"Saved Filters"** section
4. You should see your newly created filter!
5. Click **"Apply"** to test it
6. Click **"Subscribe"** to receive notifications

## Creating Labels (for Label Filters)

Before you can use label filters, create some labels:

1. Go to **Manager panel** (http://localhost:8080/manager)
2. Click **"Labels"** tab
3. Create labels like:
   - Luxury (#FFD700)
   - New Construction (#00FF00)
   - Renovated (#FF6B6B)
4. Assign labels to offers in the Manager panel
5. Now you can use those label IDs in your filters!

## Example Workflow

1. **As Admin** → Create labels in Manager panel
2. **As Manager** → Assign labels to offers
3. **As Admin** → Create filters using those labels
4. **As User** → Subscribe to filters
5. **As Manager** → Create new offers matching the criteria
6. **System** → Automatically notifies subscribed users!

## Troubleshooting

### Can't see Filters tab
- Make sure you're logged in as ADMIN
- Refresh the page

### Filter not showing on main page
- Check that "Active" is checked
- Clear browser cache

### Can't apply filter
- Make sure at least one criteria is set
- Check that label IDs exist

## API Endpoints (for testing with cURL)

```bash
# List all filters (admin only)
curl http://localhost:8080/api/admin/filters -b cookies.txt

# Create filter
curl -X POST http://localhost:8080/api/admin/filters \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test Filter",
    "description": "Testing",
    "active": true,
    "criteria": {
      "categories": ["Sale"],
      "maxPrice": 50000
    }
  }'

# Update filter
curl -X PUT http://localhost:8080/api/admin/filters/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{ ... }'

# Delete filter
curl -X DELETE http://localhost:8080/api/admin/filters/1 -b cookies.txt
```

## Complete Filter System Features

✅ **Admin Panel** - Create, edit, delete filters (ADMIN only)
✅ **Manager Panel** - Create and assign labels to offers  
✅ **User Interface** - Apply filters and subscribe to them
✅ **Smart Notifications** - Only for NEW matching offers
✅ **Combinable Criteria** - Use multiple filters together
✅ **Active Filters Display** - See which filters are applied
✅ **Role-Based Access** - Proper security controls

The filter system is now fully functional with a complete UI!
