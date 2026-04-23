# Start and Test the Filter System

## Quick Start

### 1. Start the Application

```bash
cd /Users/abozian/VS\ Code/teza_project/backend
mvn spring-boot:run
```

Wait for the application to start (you'll see "Started RealEstateApplication").

### 2. View the Filter System

Open your browser and go to:
**http://localhost:8080**

Scroll down to the "CURRENT OFFERS" section - you'll see the new **🔍 FILTERS** button!

## What You'll See

### On the Main Page (http://localhost:8080)

1. **Filter Button**: Click "🔍 FILTERS" to open the filter panel
2. **Filter Panel**: Includes:
   - Category dropdown (Sale, Rent, Commercial)
   - Price range inputs (min/max)
   - Location search
   - Labels checkboxes (if any labels exist)
   - Saved filters (admin-created filters)
3. **Apply/Clear Buttons**: Apply your filter criteria or clear all
4. **Active Filters Display**: Shows which filters are currently active
5. **Filter Count Badge**: Shows how many filters are active

## Testing the Backend API

### Test Public Endpoints

```bash
# List active filters
curl http://localhost:8080/api/filters

# Apply custom filters
curl -X POST http://localhost:8080/api/filters/apply \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["Sale"],
    "minPrice": 30000,
    "maxPrice": 80000
  }'
```

### Test as Manager (Label Management)

First, log in as a manager/admin user, then:

```bash
# Create a label
curl -X POST http://localhost:8080/api/manager/labels \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Luxury",
    "description": "Premium properties",
    "color": "#FFD700"
  }'

# List all labels
curl http://localhost:8080/api/manager/labels -b cookies.txt

# Assign label to offer
curl -X POST http://localhost:8080/api/manager/offers/1/labels/1 -b cookies.txt
```

### Test as Admin (Filter Definitions)

```bash
# Create a filter
curl -X POST http://localhost:8080/api/admin/filters \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Affordable Apartments",
    "description": "Budget-friendly apartments",
    "active": true,
    "criteria": {
      "categories": ["Sale"],
      "maxPrice": 50000,
      "location": "Chișinău"
    }
  }'

# List all filters (including inactive)
curl http://localhost:8080/api/admin/filters -b cookies.txt
```

## Complete Testing Workflow

### Step 1: Create Sample Data

1. Start the app and log in as admin
2. Create some labels:
   - Go to Manager panel or use API
   - Create labels like "Luxury", "New Construction", "Renovated"
3. Create filter definitions:
   - Go to Admin panel or use API
   - Create filters like:
     - "Affordable Homes" (maxPrice: 50000)
     - "Premium Properties" (minPrice: 100000, labels: [Luxury])
     - "Rentals in Center" (categories: [Rent], location: "Centru")

### Step 2: Assign Labels to Offers

1. Go to Manager panel
2. Edit an offer and assign labels to it

### Step 3: Test Filtering

1. Go to main page (http://localhost:8080)
2. Click "🔍 FILTERS"
3. Try different combinations:
   - Select a category
   - Set price range
   - Enter a location
   - Check some labels
4. Click "Apply Filters"
5. See the results update and active filters display

### Step 4: Test Subscriptions

1. Log in as a regular user
2. Find a filter in the "Saved Filters" section
3. Click "Subscribe" on a filter
4. Create a new offer that matches the filter criteria
5. Check the application logs - you'll see notification log entries

## Viewing Notifications

Currently, notifications are logged. Check the console output:

```
NOTIFICATION: User john - New offer: Apartment in Centru (Price: 45000, Location: Centru)
```

## Troubleshooting

### Application Won't Start

**Issue**: Database connection error

**Solution**: Make sure PostgreSQL is running:
```bash
# Check PostgreSQL status
psadmin status

# Start if needed
brew services start postgresql
# or
pg_ctl -D /usr/local/var/postgres start
```

**Database Setup**:
```sql
-- Create databases
CREATE DATABASE realestate;
CREATE DATABASE audit;

-- Create user
CREATE USER app WITH PASSWORD 'appsecret';
GRANT ALL PRIVILEGES ON DATABASE realestate TO app;
GRANT ALL PRIVILEGES ON DATABASE audit TO app;
```

### Filters Not Showing

1. Check browser console for errors (F12)
2. Verify filters.js is loaded: View Source → check for `<script src="/js/filters.js"></script>`
3. Clear browser cache and reload

### API Returns 401/403

- 401: You're not logged in → Log in first
- 403: You don't have permission → Check your user role
  - Filters management: ADMIN only
  - Labels management: MANAGER or ADMIN
  - Subscriptions: Any authenticated user

## Demo Page

Open this file in your browser for a complete reference:
**file:///Users/abozian/VS Code/teza_project/FILTER_DEMO.html**

This shows:
- All implemented features
- All API endpoints
- Example requests
- Filter criteria structure
- Notification flow
- Role requirements

## Documentation

See **FILTERING_SYSTEM.md** for complete technical documentation.
