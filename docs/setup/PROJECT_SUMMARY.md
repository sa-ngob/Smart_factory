# Project Summary & Deployment Guide

## Project Structure

This project is a **Smart Factory Management System** built with Node.js, Express, and PostgreSQL. It features a modern, responsive UI using Tabler (Bootstrap 5) and includes modules for Manufacturing Orders (MO), Inventory, Sales, and Machine Monitoring (OEE, Real-time status).

### Key Directories
- **`/public`**: Contains all frontend logic (HTML, CSS, client-side JS). The UI is rendered here.
- **`/routes`**: API endpoints for different modules (`dashboard.js`, `manufacturingOrders.js`, `inventory.js`, `sales.js`, etc.).
- **`/database.js`**: Core database connection logic (PostgreSQL) and schema initialization.
- **`server.js`**: Main application entry point.

### Key Features
- **Dashboard**: Real-time Machine monitoring and OEE analysis.
- **Manufacturing**: Manage MOs, track production (Good/Scrap), and view Gantt charts.
- **Inventory**: Manage Items, Stock, and Transactions.
- **Sales**: Manage Customers, Sales Orders, and Invoices.
- **Authentication**: User login, role-based access, and session management.

---

## Deployment via Docker

The project relies on **PostgreSQL**. The easiest way to run the full stack (App + Database) is using Docker Compose.

### Prerequisites
- Docker & Docker Compose installed.

### Steps to Run

1.  **Stop any existing instances**:
    ensure no other services are using port `3000` or `5433`.

2.  **Run with Docker Compose**:
    Open a terminal in the project root and run:
    ```bash
    docker compose up -d --build
    ```
    - This will:
        - Build the Node.js application image.
        - Start a PostgreSQL container (exposed on port `5433` to host).
        - Start the Application container (exposed on port `3000`).
        - Automatically wait for the database to be ready before starting the app.

3.  **Access the Application**:
    - Open your browser and visit: [http://localhost:3000](http://localhost:3000)
    - Default Login: `admin` / `admin123` (or as configured).

4.  **Database Access**:
    - You can connect to the database externally using a client (like DBeaver or PgAdmin) at:
      - **Host**: `localhost`
      - **Port**: `5433`
      - **User**: `postgres`
      - **Password**: `postgres123`
      - **Database**: `smart_factory`

### Troubleshooting

- **Database Connection Error**: Ensure the `postgres` container is healthy. Check with `docker compose ps`.
- **Port Conflicts**: If port `5433` is taken, modify `docker-compose.yml` under `ports` section of the `postgres` service.

## Local Development (Without Docker App)

If you prefer to run the app locally via `npm start` but keep the database in Docker:

1.  **Start only the Database**:
    ```bash
    docker compose up -d postgres
    ```
2.  **Run the App**:
    ```bash
    npm install
    npm start
    ```
    - Ensure your `.env` file points to `localhost:5433`.
