# Feedback System

This directory contains the feedback system implementation for the POM application.

## Overview

The feedback system allows users to submit feedback on any page, including screenshots with highlighted areas, and manage all feedback items through a centralized interface.

## Features

- **Give Feedback Button**: Floating button in bottom-right corner for submitting feedback
- **Check Feedback Button**: Secondary floating button to view all feedback items
- **Screenshot Capture**: Automatic screenshot capture of the current page
- **Highlight Tool**: Canvas-based drawing tool to highlight areas on screenshots
- **Feedback States**: Three states - waiting, active, done
- **Filtering**: Filter feedback items by state (done items hidden by default)
- **Search**: Search feedback by title or description
- **Badge Counter**: Shows number of non-done feedback items
- **Mark All Done**: Bulk action to mark all pending feedback as done

## Architecture

### Files

- `feedback-ui.html` - UI components (buttons, popups, modals)
- `screenshot.js` - Screenshot capture and canvas highlighting functionality
- `feedback-manager.js` - Main feedback management logic (not used in production build)
- `init-feedback.js` - Initialization script (not used in production build)
- `/public/feedback-loader.js` - Standalone loader that integrates everything

### Database

The feedback system uses Supabase for data persistence:

- Table: `feedback`
- Columns: id, page, title, description, image, state, created_at, updated_at
- RLS: Enabled with public access policies (no authentication required)

### Edge Function

- Function: `feedback`
- Endpoints:
  - `GET /feedback` - Get all feedback items
  - `POST /feedback` - Create new feedback
  - `PATCH /feedback/:id` - Update feedback state
  - `PATCH /feedback/mark-all-done` - Mark all non-done feedback as done

## Integration

The feedback system is automatically integrated into all HTML pages via a Vite plugin that injects the feedback-loader.js script before the closing `</body>` tag.

No manual integration is required - the system is automatically available on all pages.

## Usage

### Giving Feedback

1. Click the "Give Feedback" button (blue, larger)
2. Title and description are auto-filled with the current page name
3. A screenshot is automatically captured
4. Use the canvas to draw rectangles highlighting areas of interest
5. Fill in the title and description
6. Click "Submit Feedback"

### Checking Feedback

1. Click the "Check Feedback" button (gray, smaller)
2. View the list of all feedback items
3. Filter by state using the toggle buttons (waiting, active, done)
4. Search by title using the search field
5. Click any item to expand and view details
6. Change state using the dropdown in expanded view
7. Use "Mark All Done" to bulk complete feedback

## API Configuration

The feedback system connects to Supabase using:
- URL: Configured in `.env` as `VITE_SUPABASE_URL`
- Anon Key: Configured in `.env` as `VITE_SUPABASE_ANON_KEY`

The loader automatically uses the correct API endpoint based on the environment.

## Development

To modify the feedback system:

1. Edit files in the `/feedback` directory
2. Update `/public/feedback-loader.js` if changing core functionality
3. Run `npm run build` to rebuild

The Vite plugin will automatically copy the necessary files to the dist folder during build.
