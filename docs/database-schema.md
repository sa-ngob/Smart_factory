# Database Schema (Smart Factory Tabler)

This document describes the current database schema used by the project (SQLite `smart_factory.db`). It summarizes tables, columns, keys, indexes and core relationships. The text is in Thai.

---

## 1. Overview
- DB Engine: SQLite
- File: `smart_factory.db` (by default in `./data` when running with Docker)
- WAL mode enabled for concurrency

## 2. Tables & Columns

### users
- id INTEGER PRIMARY KEY AUTOINCREMENT
- fullName TEXT NOT NULL
- email TEXT UNIQUE NOT NULL
- password TEXT NOT NULL (bcrypt hashed)
- role TEXT NOT NULL (role name; denormalized convenience column)
- status TEXT DEFAULT 'active'

Notes: There is also a `roles` table; `users.role` stores role name as convenience; you may prefer storing role_id instead.

---

### roles
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT UNIQUE NOT NULL

---

### pages
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT UNIQUE NOT NULL
- url TEXT UNIQUE NOT NULL

---

### role_pages (many-to-many)
- role_id INTEGER
- page_id INTEGER
- PRIMARY KEY (role_id, page_id)
- FOREIGN KEY (role_id) REFERENCES roles(id)
- FOREIGN KEY (page_id) REFERENCES pages(id)

This table maps roles to pages (permissions for role to access a page).

---

### entities
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT NOT NULL
- tax_id TEXT
- address TEXT
- branch_code TEXT
- branch_name TEXT
- contact_person TEXT
- email TEXT
- phone TEXT

---

### entity_roles
- entity_id INTEGER NOT NULL
- role_name TEXT NOT NULL
- PRIMARY KEY (entity_id, role_name)
- FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE

This table maps an entity to role names (useful for multi-entity roles or entity-scoped roles).

---

### items
- id INTEGER PRIMARY KEY AUTOINCREMENT
- item_code TEXT UNIQUE NOT NULL
- item_name TEXT NOT NULL
- item_type TEXT
- uom TEXT
- stock_quantity INTEGER DEFAULT 0
- status TEXT
- cycle_time_sec REAL
- material_dry_temp REAL

---

### molds
Columns include:
- id INTEGER PRIMARY KEY AUTOINCREMENT
- mold_code TEXT UNIQUE NOT NULL
- mold_name TEXT NOT NULL
- customer_id INTEGER (FK -> entities.id)
- received_date TEXT
- storage_location TEXT
- mold_type TEXT
- runner_system TEXT
- gate_type TEXT
- size_w REAL, size_l REAL, size_h REAL
- weight REAL
- cavity INTEGER
- part_weight_gram REAL
- runner_weight_gram REAL
- cycle_time_sec REAL
- shot_counter INTEGER DEFAULT 0
- status TEXT DEFAULT 'active'
- core_image_path TEXT
- cavity_image_path TEXT
- part_image_path TEXT
- FOREIGN KEY (customer_id) REFERENCES entities(id)

---

### mold_parts
- id INTEGER PRIMARY KEY AUTOINCREMENT
- mold_id INTEGER NOT NULL (FK -> molds.id)
- part_number TEXT NOT NULL
- part_name TEXT NOT NULL
- quantity INTEGER DEFAULT 1
- material TEXT
- notes TEXT
- FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE CASCADE

---

### machines
- id INTEGER PRIMARY KEY AUTOINCREMENT
- machine_code TEXT UNIQUE NOT NULL
- machine_name TEXT NOT NULL
- status TEXT DEFAULT 'idle'
- cycle_time_sec REAL
- material_dry_temp REAL

---

### defect_codes
- id INTEGER PRIMARY KEY AUTOINCREMENT
- code TEXT UNIQUE NOT NULL
- description TEXT NOT NULL

---

### machine_data (real-time machine status store)
- machine_id TEXT PRIMARY KEY
- timestamp DATETIME NOT NULL
- mold_count INTEGER
- machine_status INTEGER
- mold_temp_core REAL
- mold_temp_cavity REAL
- mo_number TEXT
- cycle_time_sec REAL
- material_dry_temp REAL
- item_name TEXT

Notes: `machine_id` is a text primary key. This table is likely used for latest snapshot data.

---

### downtime_reasons
- id INTEGER PRIMARY KEY AUTOINCREMENT
- reason_code TEXT UNIQUE NOT NULL
- description TEXT NOT NULL
- category TEXT CHECK(category IN ('planned', 'unplanned', 'setup'))

---

### machine_status_logs
- id INTEGER PRIMARY KEY AUTOINCREMENT
- machine_id TEXT NOT NULL (FK -> machines.machine_code)
- status INTEGER NOT NULL
- start_time TEXT NOT NULL
- end_time TEXT
- duration_sec INTEGER
- reason_id INTEGER (FK -> downtime_reasons.id)
- notes TEXT
- FOREIGN KEY (machine_id) REFERENCES machines (machine_code)
- FOREIGN KEY (reason_id) REFERENCES downtime_reasons (id)

Indexes: idx_status_logs_machine_time on (machine_id, start_time)

---

## 3. Relationships Summary (ER-style)
- users:role -> roles.name (denormalized; prefer role_id in future for FK)
- roles <-> pages : many-to-many via role_pages
- entities (1) -> molds (many) via molds.customer_id
- molds (1) -> mold_parts (many) via mold_parts.mold_id
- machines (1) -> machine_status_logs (many) via machines.machine_code (machine_id text)
- downtime_reasons (1) -> machine_status_logs (many) via reason_id

Diagram (textual):
```
roles <---- role_pages ----> pages
   ^
   |
 users (role TEXT)  (denormalized)

entities --> molds --> mold_parts
machines --> machine_status_logs <-- downtime_reasons
machines -> machine_data (latest snapshot stored in machine_data)
```

## 4. Additional Observations & Recommendations
- `users.role` currently stores role name (TEXT). For consistency and referential integrity, consider storing `role_id` referencing `roles.id` and add an index.
- `machine_data`: Primary Key is `machine_id` TEXT; consider using an auto-increment id plus unique constraint on `machine_id` if you want to store historic snapshots; or add a `snapshots` table for history.
- Consider unifying timestamp format (ISO8601) and using `INTEGER` storing epoch for efficient queries.
- Add more indexes on frequently queried fields (e.g., pages.url, items.item_code, engines for pattern queries)
- Add migrations (e.g., using `knex`, `sequelize-cli`, or `flyway`) for schema evolution, rather than `CREATE TABLE IF NOT EXISTS` only.
- Consider moving to PostgreSQL or MySQL if scale/ACID requirements grow; or keep SQLite for simplicity and portability in single-node deployments.

## 5. Example: Sequelize Model (JS) - Basic mapping
Below are sample Sequelize models for key tables (illustrative only):

```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.INTEGER }
  });
  return User;
};

// models/Role.js
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false }
  });
  return Role;
};

// models/Page.js
module.exports = (sequelize, DataTypes) => {
  const Page = sequelize.define('Page', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    url: { type: DataTypes.STRING, unique: true, allowNull: false }
  });
  return Page;
};

// And a join table RolePage
module.exports = (sequelize, DataTypes) => {
  const RolePage = sequelize.define('RolePage', { }, { timestamps: false });
  return RolePage;
};

// Associations
// Role.belongsToMany(Page, { through: RolePage });
// Page.belongsToMany(Role, { through: RolePage });
```

## 6. Example: SQL DDL snippets
These snippets are close to the ones in `database.js` and can be copy/pasted to set up the DB:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active'
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  url TEXT UNIQUE NOT NULL
);

CREATE TABLE role_pages (
  role_id INTEGER,
  page_id INTEGER,
  PRIMARY KEY(role_id, page_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);
```

---

If you want, I can:
- Generate SQLAlchemy models for `app.py` (Flask) so the Python service can reuse the same schema
- Generate Sequelize models for the Node.js app and a small migration script
- Produce a simple ER diagram (PlantUML or mermaid) saved to `docs/` with visual relationships

บอกผมว่าต้องการอะไรต่อครับ 🙂
