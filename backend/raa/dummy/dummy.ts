      
import { modelState } from './model'; // Assuming your translated model types are in model.ts
import { TechnicalAsset } from './model'; // Import specific type if needed

/**
 * JUST A DUMMY TO HAVE AN ALTERNATIVE PLUGIN TO USE/TEST
 * Assigns a random RAA value to each technical asset.
 *
 * @returns A summary string indicating the dummy algorithm was used.
 */
export function calculateRAADummy(): string {
    const introText = "Just some dummy algorithm implementation for demo purposes of pluggability...";
    console.log("Using dummy RAA random calculation (just to test the usage of other shared object files as plugins)");

    if (!modelState.parsedModelRoot?.technicalAssets) {
        console.warn("Parsed model root or technical assets not found. Cannot calculate dummy RAA.");
        return "Error: Model not loaded.";
    }

    // Iterate over the technical assets in the model state
    for (const assetId in modelState.parsedModelRoot.technicalAssets) {
        if (Object.prototype.hasOwnProperty.call(modelState.parsedModelRoot.technicalAssets, assetId)) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[assetId];

            // Assign a random float between 0 and 100
            // Math.random() gives [0, 1)
            techAsset.raa = Math.random() * 100;

            // No need to reassign techAsset back to the map in TypeScript,
            // as 'techAsset' is a reference to the object in the map.
            // modelState.parsedModelRoot.technicalAssets[assetId] = techAsset; // This line is not strictly necessary
        }
    }

    // Return intro text (for reporting etc., can be short summary-like)
    return introText;
}

// Example usage (assuming modelState is populated elsewhere):
// const summary = calculateRAADummy();
// console.log(summary);
// console.log(modelState.parsedModelRoot?.technicalAssets['some-asset-id']?.raa);

    
