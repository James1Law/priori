# Priori Supabase Setup

This folder contains SQL migration scripts for setting up the Priori database in Supabase.

## Setup Instructions

1. **Go to your Supabase project dashboard**
   - Navigate to: https://supabase.com/dashboard/project/xqdfiyqeevvkcdurwhio

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the migration scripts in order:**

### Step 1: Create Database Schema
Copy and paste the contents of `001_initial_schema.sql` into the SQL Editor and click "Run".

This will create:
- ✅ `sessions` table - stores prioritization sessions
- ✅ `items` table - stores items to be prioritized
- ✅ `scores` table - stores framework-specific scores (for future features)
- ✅ Indexes for performance
- ✅ Auto-update trigger for `updated_at` timestamps

### Step 2: Enable Row Level Security
Copy and paste the contents of `002_enable_rls.sql` into the SQL Editor and click "Run".

This will:
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Create public access policies (since Priori has no authentication)
- ✅ Allow anyone with the session URL to read/write data

## Verify Setup

After running both scripts, verify the setup:

1. Go to "Table Editor" in Supabase
2. You should see three tables: `sessions`, `items`, `scores`
3. Click on each table to see the columns

## Database Schema

### sessions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| slug | text | Unique 6-char URL identifier |
| name | text | Optional session name |
| created_at | timestamptz | Auto-generated timestamp |
| updated_at | timestamptz | Auto-updated timestamp |

### items
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| session_id | uuid | Foreign key to sessions |
| title | text | Item title (required) |
| description | text | Optional description |
| position | integer | Order position |
| created_at | timestamptz | Auto-generated timestamp |

### scores
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| item_id | uuid | Foreign key to items |
| framework | text | Framework name (rice, ice, etc.) |
| criteria | jsonb | Framework-specific data |
| calculated_score | numeric | Computed score |

## Testing Your Setup

After setup, you can test by:

1. Starting the dev server: `npm run dev`
2. Visit http://localhost:5173/
3. Click "Create New Session"
4. Add some items
5. Refresh the page - items should persist!

## Troubleshooting

### Error: "relation already exists"
This means the tables are already created. You can skip that script.

### Error: "permission denied"
Make sure you're logged into Supabase and have owner/admin access to the project.

### Items not saving?
- Check the browser console for errors
- Verify your `.env` file has the correct Supabase URL and anon key
- Check Supabase logs in the dashboard under "Logs"

## Notes

- **No Authentication:** Priori uses URL-based access control. Anyone with a session URL can view/edit it.
- **Data Retention:** Sessions and items persist indefinitely. You may want to add cleanup scripts later.
- **Cascade Deletes:** Deleting a session will automatically delete all its items and scores.
