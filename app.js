// app.js
// --- Existing Imports ---
import pako from 'pako';
import _ from 'lodash';
import * as YAML from 'yaml';
import Tagify from '@yaireo/tagify';
import Swal from 'sweetalert2';
import DOMPurify from 'dompurify';
import Raphael from 'raphael';
import 'justgage'; 
import { instance } from '@viz-js/viz';
import {
    parseModel,
    generateRisks,
    applyRiskTracking,
    printGraphvizDOT, 
    printDataFlowDiagramGraphvizDOT,
    applyRAAMethod,
    initModelState
} from './backend/main.ts';

window.applyRAAJS = applyRAAMethod;
window.Viz = instance;
window.initModelState = initModelState;
window.parseModelViaString = parseModel;
window.applyRiskGenerationJS = generateRisks;
window.printGraphvizDOT = printGraphvizDOT;
window.printDataFlowDiagramGraphvizDOT = printDataFlowDiagramGraphvizDOT;

// --- Add Imports for Phase 3 Libraries ---
import { Graphviz } from '@hpcc-js/wasm';         // For rendering DOT strings
import { parse as parseDotToAST } from '@ts-graphviz/ast';

// --- Global Assignments (If needed) ---
window.pako = pako;
window._ = _;
window.YAML = YAML;
window.Tagify = Tagify;
window.Swal = Swal;
window.DOMPurify = DOMPurify; // Make DOMPurify global (needed for sanitizer replacement)
window.Raphael = Raphael;     // Make Raphael global (needed by JustGage)
window.DOTParser = parseDotToAST; // Make the renamed parser function globally available

console.log("app.js: Deno-managed modules loaded and attached to window.");
// Log the newly added ones too for confirmation


// --- IMPORTANT: Action Required for DOMPurify ---
// Somewhere in your existing code (maybe inside js/Graph.js, js/EditorUi.js, js/Dialogs.js or inline scripts)
// you likely have code that USES the old sanitizer.
// You MUST find that code and update it to use DOMPurify.
//
// EXAMPLE:
// Find code that might look like:
//   var cleanHtml = oldSanitizeFunction(dirtyHtml);
//   graph.setHtml(cell, cleanHtml); // Maybe?
//
// Replace it with:
//   var cleanHtml = DOMPurify.sanitize(dirtyHtml);
//   graph.setHtml(cell, cleanHtml); // Use the DOMPurify output
//
// You might need to configure DOMPurify depending on your needs, e.g.:
//   var cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: { html: true } });
// Check the DOMPurify documentation: https://github.com/cure53/DOMPurify
// This step is CRUCIAL for the sanitizer replacement to work correctly.
// ----------------------------------------------------

// --- Testing JustGage ---
// JustGage often initializes based on DOM elements having specific classes or IDs
// after the script runs. Ensure any HTML elements meant to be gauges are
// still correctly configured. The library, once imported, should find Raphael
// on the window and attach itself or be ready to use.
// Example (if you were calling it manually):
// document.addEventListener('DOMContentLoaded', () => {
//   if (typeof JustGage === 'function') { // Check if JustGage is now globally available
//      // Example initialization if needed (adapt to your actual usage)
//      var g = new JustGage({ id: "gaugeElementId", value: 50, ... });
//   } else {
//      console.error("JustGage not found globally after import!");
//   }
// });



// --- IMPORTANT: Action Required for DOMPurify ---
// Somewhere in your existing code (maybe inside js/Graph.js, js/EditorUi.js, js/Dialogs.js or inline scripts)
// you likely have code that USES the old sanitizer.
// You MUST find that code and update it to use DOMPurify.
//
// EXAMPLE:
// Find code that might look like:
//   var cleanHtml = oldSanitizeFunction(dirtyHtml);
//   graph.setHtml(cell, cleanHtml); // Maybe?
//
// Replace it with:
//   var cleanHtml = DOMPurify.sanitize(dirtyHtml);
//   graph.setHtml(cell, cleanHtml); // Use the DOMPurify output
//
// You might need to configure DOMPurify depending on your needs, e.g.:
//   var cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: { html: true } });
// Check the DOMPurify documentation: https://github.com/cure53/DOMPurify
// This step is CRUCIAL for the sanitizer replacement to work correctly.
// ----------------------------------------------------

// --- Testing JustGage ---
// JustGage often initializes based on DOM elements having specific classes or IDs
// after the script runs. Ensure any HTML elements meant to be gauges are
// still correctly configured. The library, once imported, should find Raphael
// on the window and attach itself or be ready to use.
// Example (if you were calling it manually):
// document.addEventListener('DOMContentLoaded', () => {
//   if (typeof JustGage === 'function') { // Check if JustGage is now globally available
//      // Example initialization if needed (adapt to your actual usage)
//      var g = new JustGage({ id: "gaugeElementId", value: 50, ... });
//   } else {
//      console.error("JustGage not found globally after import!");
//   }
// });


