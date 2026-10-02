// Offline prototype dependencies. Rebuild from the repository root:
// npx esbuild prototypes/time-card-tuning-libraries.js --bundle --format=iife --minify --outfile=prototypes/time-card-tuning-vendor.js
import { createDialKit, createDialRoot } from 'dialkit/vanilla'
import 'dialkit/vanilla/styles.css'
window.TimeCardTuningLibraries = { createDialKit, createDialRoot }
