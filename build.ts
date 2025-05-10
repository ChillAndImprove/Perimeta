// build.ts
import * as esbuild from 'npm:esbuild@^0.20'; // Import esbuild API
// Import the Deno plugin for esbuild
// Check for latest version: https://deno.land/x/esbuild_deno_loader
import { denoPlugins } from 'https://deno.land/x/esbuild_deno_loader@0.9.0/mod.ts';

console.log("Starting esbuild build via Deno plugin...");

try {
  // Get the import map URL relative to this script's location
  const importMapURL = new URL("./import_map.json", import.meta.url);
  console.log(`Using import map: ${importMapURL.pathname}`);

  const buildResult = await esbuild.build({
    plugins: [...denoPlugins({
        // Use importMapURL to explicitly point to your import map file
        importMapURL: importMapURL.href,
    })],
    entryPoints: ["./app.js"], // Your application entry point
    outfile: "./dist/bundle.js", // Output bundle
    bundle: true,
    format: "esm", // Output format
    sourcemap: true, // Generate sourcemaps
    logLevel: "info", // Show esbuild logs
    // If dependencies require Node built-ins, you might need 'platform: "node"'
    // but 'browser' or 'neutral' is often better for web bundles.
    // platform: "browser", 
  });
  
  console.log("esbuild result:", buildResult); // Log warnings/errors from esbuild
  console.log("Build finished successfully!");

} catch (err) {
  console.error("\nBuild script failed:");
  console.error(err);
  Deno.exit(1); // Exit with a non-zero code to indicate failure
  
} finally {
    // Always stop esbuild service to prevent dangling processes
    esbuild.stop();
    console.log("esbuild service stopped.");
}
