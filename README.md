# University Frontend

A React + Vite frontend for the Punjab University Gujranwala Campus student information and results dashboard.

This project is designed as an admin-facing academic portal that integrates with a backend API to manage and display:

- students, teachers, courses, semesters, and grading scales
- results, transcripts, course marks, and GPA/CGPA summaries
- timetables, exam schedules, and academic tracking
- contact queries with tracking and admin response workflows
- offline-ready PWA behavior with cached data and notifications

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Backend Integration](#backend-integration)
- [Notes](#notes)

## Features

- Admin login and protected application layout
- Dashboard with key academic summary cards and top student highlights
- Students, teachers, courses, semesters, grading scale, and contact management
- Results pages, transcript generation, and downloadable PDF export
- Searchable student tracking for highlighted monitoring across result pages
- Timetable and exam schedule viewing
- Notifications panel with unread badge and local last-seen tracking
- Offline-ready PWA with service worker caching strategies
- Local storage persistence for student tracking and contact submission history
- Responsive sidebar navigation optimized for desktop and mobile

## Tech Stack

- React 19
- Vite 8
- React Router DOM 7
- Axios
- Lucide React icons
- Recharts for academic charts
- html2pdf.js for transcript export
- Vite PWA plugin for offline support
- ESLint for code quality

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 10 or compatible package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ahmadbasit0808/university-frontend.git
cd university-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the example and customize the API URL:

```bash
copy .env.example .env
```

4. Update `.env` if needed:

```env
VITE_API_URL= place url here
```

### Run Locally

```bash
npm run dev
```

Open the URL shown by Vite in your browser to preview the app.

### Build for Production

```bash
npm run build
```

### Preview the Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the production bundle
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint across the source files

## Project Structure

- `src/`
  - `api/` - Axios API wrappers for backend endpoints
  - `components/` - Reusable UI components and layout elements
  - `context/` - React context providers for auth, tracked students, and table sorting
  - `pages/` - Route pages for dashboard, students, results, contact, timetable, and more
  - `assets/` - Static assets such as logo images
  - `App.jsx` - Application routes and providers
  - `main.jsx` - App bootstrap, service worker registration, and offline indicator

## Backend Integration

This frontend expects a backend API with session-based authentication and the following areas:

- `/auth/login`, `/auth/logout`, `/auth/me` for authentication
- `/students`, `/teachers`, `/courses`, `/semesters`, `/grading-scale`
- `/results`, `/course-results`, `/exam-schedule`, `/timetable`, `/notifications`
- `/contact` for query submission and tracking

The frontend sets `withCredentials: true` on all API requests, so the backend must allow cookies and CORS credentials if served from a different origin.

## Notes

- The app is configured as a PWA with caching rules for static assets and selected API routes.
- Contact query history and tracked student roll numbers are saved in local storage.
- Transcript export uses `html2pdf.js` and can generate printable PDF files from the transcript page.
- Login is required to access admin information and protected features.
