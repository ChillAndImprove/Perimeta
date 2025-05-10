// generate_dev_map.ts
// Reads the production import map, generates a CDN-based dev map,
// and injects it into specified HTML files between markers.

const IMPORT_MAP_PATH = "./import_map.json";
const DEV_HTML_FILES = ["./index.dev.html", "./indexTest.dev.html"]; // Files to update
const CDN_BASE_URL = "https://esm.sh/"; // Using esm.sh CDN

const START_MARKER = "<!-- === START AUTO-GENERATED IMPORT MAP === -->";
const END_MARKER = "<!-- === END AUTO-GENERATED IMPORT MAP === -->";

async function generateDevMapString(): Promise<string> {
  console.log(`Reading production import map from: ${IMPORT_MAP_PATH}`);
  let importMapJson;
  try {
    const importMapContent = await Deno.readTextFile(IMPORT_MAP_PATH);
    importMapJson = JSON.parse(importMapContent);
  } catch (error) {
    // Improved error handling from previous version
    if (error instanceof Deno.errors.NotFound) {
        console.error(`Error: Import map file not found at ${IMPORT_MAP_PATH}`);
    } else if (error instanceof SyntaxError) {
        console.error(`Error: Failed to parse JSON in ${IMPORT_MAP_PATH}`);
        console.error(error.message)
    } else {
        console.error(`Error reading or parsing ${IMPORT_MAP_PATH}:`, error);
    }
    Deno.exit(1);
  }

  if (!importMapJson.imports) {
      console.error(`Error: No "imports" key found in ${IMPORT_MAP_PATH}`);
      Deno.exit(1);
  }

  const devImports: Record<string, string> = {};

  console.log("Transforming npm: specifiers to CDN URLs...");
  for (const [key, value] of Object.entries(importMapJson.imports)) {
    if (typeof value === 'string') {
        if (value.startsWith("npm:")) {
            const specifier = value.substring(4);
            devImports[key] = `${CDN_BASE_URL}${specifier}`;
        } else {
            console.warn(`Warning: Keeping non-npm specifier for "${key}": "${value}".`);
            devImports[key] = value;
        }
    } else {
         console.warn(`Warning: Skipping non-string value for key "${key}":`, value);
    }
  }

  const devMap = { imports: devImports };
  const devMapString = JSON.stringify(devMap, null, 4); // 4 spaces indentation

  // Construct the full block to inject
  const injectionBlock = `${START_MARKER}
<!-- The content between these markers will be automatically replaced -->
<!-- Run \`deno task generate-map\` to update -->
<script type="importmap">
${devMapString}
</script>
${END_MARKER}`; // Ensure newline at the end of START_MARKER

  return injectionBlock;
}

async function updateHtmlFile(filePath: string, injectionBlock: string) {
  console.log(`Updating file: ${filePath}`);
  try {
    let htmlContent = await Deno.readTextFile(filePath);

    const startIndex = htmlContent.indexOf(START_MARKER);
    const endIndex = htmlContent.indexOf(END_MARKER);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      console.error(`Error: Markers not found or invalid in ${filePath}. Please ensure both START and END markers exist.`);
      return; // Skip this file
    }

    // Extract the part before the start marker and after the end marker
    const before = htmlContent.substring(0, startIndex);
    // Include the length of the end marker itself
    const after = htmlContent.substring(endIndex + END_MARKER.length); 

    // Reconstruct the file content with the new block
    const newHtmlContent = before + injectionBlock + after;

    await Deno.writeTextFile(filePath, newHtmlContent);
    console.log(`Successfully updated ${filePath}`);

  } catch (error) {
     if (error instanceof Deno.errors.NotFound) {
        console.error(`Error: HTML file not found at ${filePath}`);
    } else {
        console.error(`Error reading or writing ${filePath}:`, error);
    }
  }
}

async function main() {
    const injectionBlock = await generateDevMapString();
    console.log("\nGenerated import map block. Injecting into HTML files...");

    for (const filePath of DEV_HTML_FILES) {
        await updateHtmlFile(filePath, injectionBlock);
    }
    console.log("\nImport map generation and injection complete.");
}

main();
