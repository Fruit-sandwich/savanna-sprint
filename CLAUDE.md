# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Savanna Legacy Sprint is a web application for an African cultural art challenge hosted on Arweave. This is a static website that showcases the "Cultural Permanence and the Virtues" art sprint, allowing users to submit and view artwork celebrating African virtues (Courage, Focus, Patience, Sharing, Unity).

## Architecture

### Frontend Structure
- **Static HTML/CSS/JS website** - No build process required
- **Multi-language support** - English and Kiswahili with dynamic content switching
- **Arweave/AO integration** - Uses AOConnect and StampJS SDKs via CDN for blockchain interactions

### Key Files
- `index.html` - Main landing page with submission form and countdown timer
- `gallery.html` - Gallery view for browsing submitted artworks
- `data/content.json` - Multilingual content data (rules, guidelines, stories)
- `js/main.js` - Core functionality, language switching, countdown timer
- `js/gallery.js` - Gallery loading, filtering, pagination
- `js/stamps.js` - Stamping/voting functionality for artworks
- `js/submission.js` - Artwork submission handling
- `css/styles.css` - Main stylesheet
- `css/gallery.css` - Gallery-specific styles

### External Dependencies
- **AOConnect SDK** - Loaded via CDN for Arweave AO process interactions
- **StampJS SDK** - Loaded via CDN for stamping functionality
- **Arweave/Bazar** - Artwork storage and display platform

## Development

### Running the Project
No build process required. Serve the files with any static web server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (if available)
npx http-server

# Using PHP
php -S localhost:8000
```

### Environment Variables
Configure `.env` file with:
- `UCM_PROCESS_ID` - AO process ID for Universal Content Machine
- `X_API_BEARER_TOKEN` - Twitter/X API token for social integration

### Key Concepts
- **Virtues System** - Five African virtues each associated with an animal (Lion=Courage, Cheetah=Focus, etc.)
- **Arweave Integration** - All artwork permanently stored on Arweave blockchain
- **Bilingual Content** - All user-facing text supports English/Kiswahili switching
- **Submission Workflow** - Users submit Bazar asset URLs, system validates and displays approved entries

### Content Management
- All text content stored in `data/content.json`
- Language switching handled by CSS classes (`kizungu`/`kiswahili`) and JavaScript
- Dynamic content loading from JSON for rules, guidelines, and story text