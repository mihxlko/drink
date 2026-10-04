// Source for the offline prototype bundle. Rebuild from the repository root:
// npx esbuild prototypes/time-card-libraries.js --bundle --format=iife --minify --outfile=prototypes/time-card-vendor.js
// Versions: Torph 0.1.3 (MIT), Numora 4.0.0.
// Numora's package metadata declares MIT, but its shipped LICENSE is GPL-3.0.
// Resolve that upstream discrepancy before production adoption/distribution.
// Both shipped license texts are preserved in time-card-vendor.LICENSE.txt.
import { TextMorph, segmentNumber } from 'torph'
import { NumoraInput, FormatOn, ThousandStyle } from 'numora'
window.TimeCardLibraries = { TextMorph, segmentNumber, NumoraInput, FormatOn, ThousandStyle }
