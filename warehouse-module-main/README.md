# 🚀 SMART PMB — Warehouse & Stock Management

> A modern, full-stack digital ecosystem for Sri Lanka's Paddy Marketing Board that seamlessly consolidates warehouse tracking, stock intake, purchase management, and real-time capacity alerts into a lean, modular dashboard.

<p align="center">
  <a href="https://nextjs.org/" target="_blank" rel="noreferrer">
    <img src="https://skillicons.dev/icons?i=nextjs" alt="nextjs" width="50" height="50"/>
  </a>&nbsp;
  <a href="https://nodejs.org/" target="_blank" rel="noreferrer">
    <img src="https://skillicons.dev/icons?i=nodejs" alt="nodejs" width="50" height="50"/>
  </a>&nbsp;
  <a href="https://www.postgresql.org/" target="_blank" rel="noreferrer">
    <img src="https://skillicons.dev/icons?i=postgres" alt="postgresql" width="50" height="50"/>
  </a>&nbsp;
  <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer">
    <img src="https://skillicons.dev/icons?i=tailwind" alt="tailwind" width="50" height="50"/>
  </a>&nbsp;
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
    <img src="https://skillicons.dev/icons?i=ts" alt="typescript" width="50" height="50"/>
  </a>
</p>

---

## 🌟 Overview

**SMART PMB — Warehouse & Stock Management** is a streamlined, high-performance module designed to eliminate administrative friction for the Sri Lanka Paddy Marketing Board. Operating on a robust architecture, it allows PMB Officers and Authorized Purchasers to manage warehouse operations with precision while providing a clean, distraction-free environment for stock oversight.

By prioritizing a "minimal control surface" design, the platform ensures rapid data entry, instant visual feedback, and reliable state management, making it the ideal tool for paddy procurement and storage workflows.

### Why This Module?

* **Centralized Manifest**: Replaces manual spreadsheets and paper logs with a structured, persistent database view of all warehouses and stock.
* **Status-Driven UX**: Warehouse cards feature intelligent utilization progress bars that provide immediate visual context on capacity.
* **Instant Filtering**: Optimized navigation allows for rapid retrieval of warehouse details, inventory breakdowns, and purchase records.
* **Reliable Persistence**: Backed by PostgreSQL infrastructure to ensure your procurement data is always safe and synchronized.
* **Validation-First Input**: Ensures data integrity with comprehensive real-time capacity checks before stock intake commits.

---

## ✨ Features

### 🎯 Core Features

* **Warehouse Dashboard**: KPI summary cards (total warehouses, capacity, stock, utilization), assigned warehouse grid with utilization bars, and purchase orders awaiting pickup.
* **Warehouse Detail & Inventory**: Per-warehouse info card, inventory breakdown table, div-based bar chart by paddy type, and add/remove stock actions.
* **Stock Intake Form**: Record purchase intakes with farmer/buyer, paddy type, quantity, amount, and target warehouse — includes live capacity projection.
* **Capacity Alerts Panel**: Notification-style list of warehouses above 85% capacity or below 20% utilization, with colored severity dots.
* **Role-Based Access**: JWT authentication with role guards — `PMB_OFFICER` for approvals/warehouse creation, `AUTHORIZED_PURCHASER` for purchase intake.

### 🎨 UI/UX Features

* **Dark Forest Green Theme**: A professional `#16321f` — `#1c3d27` sidebar with warm cream `#F7F4EC` main background designed for long-duration technical tasks.
* **Visual Status Badges**: Pill-shaped, color-coded indicators with animated dots for quick scanning of payment and warehouse statuses.
* **Gradient KPI Cards**: A variety of amber, mid-green, pale-green, and dark-green gradient cards so the metrics row isn't monotone.
* **Responsive Layouts**: Fixed 84px icon-rail sidebar with flexible grid systems built with Tailwind CSS that adapt from desktop to tablet.
* **Kinetic Interaction**: Subtle animations for card hover lifts, progress bar fills, fade-up entry sequences, and pulse-dot live indicators.

### 🔧 Technical Features

* **Modular Component Architecture**: Decoupled UI components (KPICard, WarehouseCard, StatusBadge, DataTable, Modal, Sidebar, Header) ensure maintainability.
* **Transactional Stock Updates**: Purchase intake is wrapped in a PostgreSQL transaction with row-level locking (`FOR UPDATE`) to prevent concurrent capacity overflows.
* **State Optimization**: Next.js 14 App Router with static page generation for dashboard views, client components for interactive forms and warehouse detail pages.
* **Self-Contained Mock Data**: Frontend runs fully standalone with comprehensive mock data in `lib/data.ts` — no backend connection required for UI exploration.

---

## 🎥 Demo

### Live Previews
🔗 *Deployment coming soon*

---

## 🛠️ Technologies Used

### Frontend & UI
* **Next.js 14**: React framework with App Router for page-based routing and static generation.
* **Tailwind CSS**: Utility-first CSS framework for the dark-green/cream dashboard theme.
* **TypeScript**: Strict type-safety for complex warehouse, inventory, and purchase data models.

### Core Ecosystem & Logic
* **Node.js (Express)**: Scalable backend routing and REST API framework with JWT middleware.
* **PostgreSQL**: Relational database with raw SQL queries and transactional stock updates.

### Validation & Tooling
* **Zod**: Schema-based request body validation on all POST endpoints.
* **Dotenv**: Secure configuration management for database credentials and JWT secrets.

---

## 📦 Installation

To host SMART PMB locally, follow these steps:

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (only required for backend)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/warehouse-module.git
   cd warehouse-module
   ```

2. **Setup the Database** (backend only)
   ```bash
   cd my_project_output
   psql -U postgres -c "CREATE DATABASE smart_pmb"
   psql -U postgres -d smart_pmb -f sql/schema.sql
   ```

3. **Setup Backend & Environment**
   ```bash
   cd deliverables/backend
   npm install
   # Edit .env if needed: DATABASE_URL, JWT_SECRET, PORT
   npm run dev
   ```
   The API starts at `http://localhost:4000`.

4. **Launch the Frontend**
   ```bash
   cd deliverables/frontend
   npm install
   npm run dev
   ```
   The dashboard opens at `http://localhost:3000`.

> **Note**: The frontend uses built-in mock data and works fully without the backend. Connect to the API by updating `lib/data.ts` fetch calls when ready.

---

## 🚀 Usage

* **Exploring the Dashboard**: Start at `/` to view KPI cards, assigned warehouses grid, pending purchase orders, and recent approvals.
* **Viewing Warehouse Details**: Click any warehouse card to see its inventory breakdown, stock chart, and add/remove stock modals.
* **Recording Stock Intake**: Navigate to `/intake` to record a new purchase — the form shows live projected utilization and warns on capacity overflow.
* **Monitoring Alerts**: Visit `/alerts` to see a notification-style list of warehouses needing attention (high capacity or low utilization).
* **Managing Warehouses**: Browse all warehouses at `/warehouses` with utilization progress bars and status badges.

---

## 📁 Project Structure

```
warehouse-module/
├── my_project_output/
│   ├── sql/
│   │   └── schema.sql              # Full schema + seed data
│   ├── deliverables/
│   │   ├── frontend/               # Next.js 14 App Router
│   │   │   ├── app/
│   │   │   │   ├── page.tsx        # Dashboard
│   │   │   │   ├── layout.tsx      # Root layout (sidebar + header)
│   │   │   │   ├── alerts/         # Capacity alerts panel
│   │   │   │   ├── intake/         # Stock intake form
│   │   │   │   └── warehouses/     # Warehouse list & detail
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.tsx     # Fixed left icon rail
│   │   │   │   ├── Header.tsx      # Top bar with status + user
│   │   │   │   ├── KPICard.tsx     # Gradient metric cards
│   │   │   │   ├── WarehouseCard.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── SectionHeader.tsx
│   │   │   └── lib/
│   │   │       ├── data.ts         # Mock data store
│   │   │       └── format.ts       # Formatting utilities
│   │   └── backend/                # Express.js REST API
│   │       ├── server.js           # Entry point
│   │       └── src/
│   │           ├── db/pool.js      # PostgreSQL connection pool
│   │           ├── middleware/      # JWT auth + error handler
│   │           ├── routes/         # warehouses, purchases, deliveries, approvals
│   │           └── validators/     # Zod schemas
│   └── public/
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint                           | Auth Required | Role                  | Description                        |
|--------|------------------------------------|---------------|-----------------------|------------------------------------|
| GET    | `/api/warehouses`                  | Yes           | Any                   | List all warehouses                |
| GET    | `/api/warehouses/:id`              | Yes           | Any                   | Single warehouse details           |
| GET    | `/api/warehouses/:id/inventory`    | Yes           | Any                   | Inventory for a warehouse          |
| POST   | `/api/warehouses`                  | Yes           | PMB_OFFICER           | Create a new warehouse             |
| GET    | `/api/purchases?status=`           | Yes           | Any                   | List purchases (optional filter)   |
| POST   | `/api/purchases`                   | Yes           | AUTHORIZED_PURCHASER  | Record purchase intake (transactional) |
| GET    | `/api/deliveries`                  | Yes           | Any                   | List deliveries                    |
| POST   | `/api/deliveries`                  | Yes           | PMB_OFFICER           | Assign delivery                    |
| GET    | `/api/approvals/recent`            | Yes           | Any                   | Recent approval feed               |
| GET    | `/api/health`                      | No            | —                     | Health check                       |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear commit messages
- Update documentation as needed
- Test your changes across browsers
- Ensure responsive design is maintained

---

## 👨‍💻 Author

- **GitHub** <a href="https://github.com/darkfeed2005" target="_blank" rel="noreferrer"> <img src="https://skillicons.dev/icons?i=github" alt="github" width="20" height="20"/> </a>
- LinkedIn <a href="https://www.linkedin.com/in/kalana-yasassri-684591251/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/linkedin/linkedin-original.svg" alt="linkedin" width="20" height="20"/> </a>
- Instagram <a href="https://www.instagram.com/kalana_yasassri" target="_blank" rel="noreferrer"> <img src="https://skillicons.dev/icons?i=instagram" alt="instagram" width="20" height="20"/> </a>
