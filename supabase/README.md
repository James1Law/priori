# Priori Supabase Setup

This folder contains SQL migration scripts for setting up the Priori database in Supabase.

## Setup Instructions

1. **Go to your Supabase project dashboard**
  - Navigate to your Supabase project at https://supabase.com/dashboard

2. **Open the SQL Editor**
  - Click on "SQL Editor" in the left sidebar
  - Click "New Query"

3. **Run the migration scripts in order:**

### Migration Scripts

| Script | Description |
| --- | --- |
| `001_initial_schema.sql` | Core tables (sessions, items, scores), indexes, triggers |
| `002_enable_rls.sql` | Row Level Security policies for public access |
| `003_add_framework_column.sql` | Framework selection per session |
| `004_add_view_and_cutoff_columns.sql` | View mode and cutoff line support |
| `005_add_backlog_position.sql` | Manual ordering in backlog view |
| `006_add_roadmap_support.sql` | Roadmap periods table and item columns |
| `007_add_quadrant_columns.sql` | Quadrant-based positioning for roadmap |

Copy and paste each script into the SQL Editor and click "Run".

## Verify Setup

After running all scripts, verify the setup:

1. Go to "Table Editor" in Supabase
2. You should see four tables: `sessions`, `items`, `scores`, `roadmap_periods`
3. Click on each table to see the columns

## Database Schema

### sessions
| Column | Type | Description |
| --- | --- | --- |
| id | uuid | Primary key (auto-generated) |
| slug | text | Unique 6-char URL identifier |
| name | text | Optional session name |
| framework | text | Prioritisation framework (rice, ice, etc.) |
| view | text | Current view (scoring, backlog, roadmap) |
| weighted_criteria | jsonb | Custom criteria for weighted scoring |
| cutoff_position | integer | Position of cutoff line in backlog |
| cutoff_label | text | Label for cutoff line |
| created_at | timestamptz | Auto-generated timestamp |
| updated_at | timestamptz | Auto-updated timestamp |

### items
| Column | Type | Description |
| --- | --- | --- |
| id | uuid | Primary key (auto-generated) |
| session_id | uuid | Foreign key to sessions |
| title | text | Item title (required) |
| description | text | Optional description |
| position | integer | Order position in scoring view |
| backlog_position | integer | Manual order in backlog view |
| roadmap_start_period | uuid | FK to roadmap_periods (legacy) |
| roadmap_end_period | uuid | FK to roadmap_periods (legacy) |
| roadmap_start_quadrant | integer | Absolute quadrant index (0-based) |
| roadmap_end_quadrant | integer | Inclusive end quadrant |
| roadmap_row | integer | For future swimlane support |
| created_by | text | Participant who created the item |
| created_at | timestamptz | Auto-generated timestamp |

### scores
| Column | Type | Description |
| --- | --- | --- |
| id | uuid | Primary key (auto-generated) |
| item_id | uuid | Foreign key to items |
| framework | text | Framework name (rice, ice, etc.) |
| criteria | jsonb | Framework-specific data |
| calculated_score | numeric | Computed score |

### roadmap_periods
| Column | Type | Description |
| --- | --- | --- |
| id | uuid | Primary key (auto-generated) |
| session_id | uuid | Foreign key to sessions |
| name | text | Period name (e.g., "Now", "Next", "Later") |
| width | integer | Visual width 1-4 (legacy, now fixed at 4) |
| position | integer | Order in timeline |
| created_at | timestamptz | Auto-generated timestamp |

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
