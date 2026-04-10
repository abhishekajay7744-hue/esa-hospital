# ESA Hospital - Appointment & Management System

Welcome to the **ESA Hospital Appointment System**. This project provides a complete, modern, and lightweight solution for hospital outpatient bookings. It features a public-facing website where patients can book appointments with various doctors, and a secure admin dashboard where staff can monitor, cancel, and manage registered appointments.

## 🌟 Key Features

### For Patients (Website)
- **Firebase Authentication:** Users can securely sign in using their Google account to track their own appointments securely.
- **Smart Booking System:** Automatically blocks booking if a doctor's availability slots are filled or if their shift time has already passed for the day.
- **Digital Token Receipts:** Instantly generates a professional PDF receipt styled perfectly with a scannable **CODE128 Barcode** to act as their hospital ticket.

### For Administrators (Dashboard)
- **Live Syncing:** Real-time polling keeps the dashboard data perfectly in sync with the live website without needing manual refreshing.
- **Account Tracking:** Shows exactly which Google account was used to register the appointment, or flags it as a "Guest Walk-in".
- **Dynamic Auto-Expiry:** The system actively monitors dates and time ranges. If an appointment timeframe has expired, it automatically updates the system status to "Cancelled".
- **Detailed PDF Reporting:** Administrators can download a comprehensive A4 PDF document containing all information about a patient's consultation and background details.

---

## 🏗️ Technology Stack (How it Works)

This code was designed to be as simple, secure, and fast as possible:
1. **Frontend:** Pure HTML, CSS (Vanilla), and JavaScript. No complex frameworks like React or Angular, making it remarkably easy to understand and modify directly.
2. **Database:** Powered by **Turso (SQLite)**. It interacts with the database directly using `sqlQuery` statements over HTTP requests, providing incredible speeds and zero-latency access. 
3. **Authentication:** Powered by **Firebase**. Secures patient records to specific emails.
4. **Build Tool:** Bundled simply with **Vite**, optimizing scripts and organizing deployments.

---

## 💻 Local Development (For Developers)

To run this project on your personal computer:

1. **Install Node.js:** Make sure you have Node.js installed on your computer.
2. **Install Dependencies:** Open the terminal in the project folder and run:
   ```bash
   npm install
   ```
3. **Set Environment Variables:** 
   Rename `.env.example` to `.env` and put in your Turso Database Credentials and Firebase configuration keys.
4. **Run the local server:**
   ```bash
   npm run dev
   ```
5. **View the Project:**
   The terminal will provide a localhost link (e.g., `http://localhost:8080`).

---

## 🚀 Deployment Guide (GitHub & Vercel)

This application has been pre-configured to automatically deploy perfectly on **Vercel** with clean URLs for the website and dashboard interfaces. 

### Step 1: Upload to GitHub
1. Create a new, blank repository on [GitHub](https://github.com).
2. Push your project to the repository using these terminal commands inside the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial Release"
   git branch -M main
   git remote add origin https://github.com/YourUsername/YourRepoName.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select the GitHub repository you just created.
3. **CRITICAL:** Before clicking deploy, expand the **"Environment Variables"** drop-down. You MUST add the Turso Database URL and Token here (e.g., `VITE_TURSO_URL` and `VITE_TURSO_TOKEN`), otherwise the live version cannot read the database.
4. Click **Deploy**.

### Your Live Links
Because of the specialized `vercel.json` and `vite.config.ts` configuration, Vercel will automatically host both sides of your platform on the same server intelligently:
- **Main Website:** `https://your-vercel-domain.vercel.app/`
- **Admin Dashboard:** `https://your-vercel-domain.vercel.app/dashboard`
