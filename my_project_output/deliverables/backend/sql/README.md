# SMART PMB — SQL Migrations

Run after Django migrations to ensure all indexes and constraints are applied:

```bash
cd deliverables/backend
python manage.py migrate
psql -U postgres -d smart_pmb -f sql/001_indexes_and_constraints.sql
```
