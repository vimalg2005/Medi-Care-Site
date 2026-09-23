# MediCare-Site

A professional medical console and doctor-patient scheduling application.

## Project Structure
* **`backend/`**: Express API server connected to MongoDB.
* **`frontend/`**: Patient booking website and Doctor management portal.
* **`admin/`**: Console panel for service management and site administrators.

## Running the Project

### Option 1: Run All Services Together (Recommended)
From the root directory, simply run:
```bash
npm run dev
```
*(or `npm start`)*
This starts **Backend**, **Frontend**, and **Admin** concurrently in one terminal window.

### Option 2: Run Services Individually
You can run individual services from the root folder:
* Backend: `npm run dev:backend` (Runs on `http://localhost:4000`)
* Frontend: `npm run dev:frontend` (Runs on `http://localhost:5173`)
* Admin: `npm run dev:admin` (Runs on `http://localhost:5174`)

Or navigate to each folder directly:
* `cd backend && npm run dev`
* `cd frontend && npm run dev`
* `cd admin && npm run dev`

## Service URLs
* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Admin Console**: [http://localhost:5174](http://localhost:5174)
* **Backend API**: [http://localhost:4000](http://localhost:4000)

## Local Configuration
API URLs and connection bases are central-configured using `.env` files and environment variables.

---
*Created and maintained by Vimal.*
