      
import {
    modelState,
    TechnicalAsset,
    Confidentiality,
    Criticality,
    TechnicalAssetTechnology,
    getConfidentialityAttackerAttractivenessForAsset, // Renamed for clarity
    getCriticalityAttackerAttractivenessForAsset,   // Renamed for clarity
    getConfidentialityAttackerAttractivenessForProcessedOrStoredData,
    getCriticalityAttackerAttractivenessForProcessedOrStoredData
} from '../../model/types.ts'; // Adjust path as needed


/**
 * Calculates Relative Attacker Attractiveness (RAA) based on CIA, exposure, and characteristics.
 * Assigns a score from 0 to 100.
 *
 * @returns A summary string indicating the algorithm used.
 */
export function applyRAA(): string {
    const introText = "Calculated RAA based on asset/data CIA, exposure, and characteristics.";
    console.log(introText);

    if (!modelState.parsedModelRoot?.technicalAssets) {
        console.warn("Parsed model root or technical assets not found. Cannot calculate RAA.");
        return "Error: Model not loaded.";
    }

    const assets = Object.values(modelState.parsedModelRoot.technicalAssets);
    if (assets.length === 0) {
        return "No technical assets found to calculate RAA for.";
    }

    const rawScores: Map<string, number> = new Map();
    let maxRawScore = 0;

    // --- First Pass: Calculate Raw Scores ---
    for (const techAsset of assets) {
        // Skip out-of-scope assets - they have no RAA in this context
        if (techAsset.outOfScope) {
            rawScores.set(techAsset.id, 0);
            techAsset.raa = 0; // Explicitly set RAA to 0 for out-of-scope
            continue;
        }

        let score = 0;

        // 1. Asset's own CIA Sensitivity (Max ~123 based on enum values * Attractiveness)
        score += getConfidentialityAttackerAttractivenessForAsset(techAsset.confidentiality);
        score += getCriticalityAttackerAttractivenessForAsset(techAsset.integrity);
        score += getCriticalityAttackerAttractivenessForAsset(techAsset.availability);

        // 2. Sensitivity of Data Handled (Max ~76 based on enum values * Attractiveness)
        // Using the asset's helper methods which find the highest data CIA
        const highestDataConf = techAsset.getHighestConfidentiality();
        const highestDataInteg = techAsset.getHighestIntegrity();
        const highestDataAvail = techAsset.getHighestAvailability();

        score += getConfidentialityAttackerAttractivenessForProcessedOrStoredData(highestDataConf) * 0.8; // Weight data conf slightly less than asset conf
        score += getCriticalityAttackerAttractivenessForProcessedOrStoredData(highestDataInteg) * 0.8; // Weight data integ slightly less than asset integ
        score += getCriticalityAttackerAttractivenessForProcessedOrStoredData(highestDataAvail) * 0.5; // Weight data avail less

        // 3. Exposure Factors (Additive points)
        if (techAsset.internet) {
            score += 50; // Significant bonus for internet exposure
        }
        if (techAsset.usedAsClientByHuman) {
            score += 25; // Bonus for being a common entry point
        }

        // 4. Characteristic Factors (Additive points)
        if (techAsset.multiTenant) {
            score += 20; // Higher impact if compromised
        }
        if (techAsset.customDevelopedParts) {
            score += 15; // Potential for unknown vulnerabilities
        }

        // 5. Technology Type Boost (Examples)
        const boostedTech = [
            TechnicalAssetTechnology.Database, TechnicalAssetTechnology.IdentityProvider, TechnicalAssetTechnology.Vault,
            TechnicalAssetTechnology.HSM, TechnicalAssetTechnology.WebServer, TechnicalAssetTechnology.WebApplication,
            TechnicalAssetTechnology.LoadBalancer, TechnicalAssetTechnology.ReverseProxy, TechnicalAssetTechnology.APIGateway // Example
        ];
        if (boostedTech.includes(techAsset.technology)) {
            score += 10;
        }
        // Could add more granular boosts/penalties here

        // Ensure score is not negative (shouldn't happen with additive approach)
        const finalRawScore = Math.max(0, score);
        rawScores.set(techAsset.id, finalRawScore);

        if (finalRawScore > maxRawScore) {
            maxRawScore = finalRawScore;
        }
    }

    // --- Second Pass: Normalize and Assign RAA ---
    for (const techAsset of assets) {
        // Skip out-of-scope again (already set to 0)
        if (techAsset.outOfScope) {
            continue;
        }

        const rawScore = rawScores.get(techAsset.id) ?? 0;

        if (maxRawScore === 0) {
            techAsset.raa = 0; // Avoid division by zero if all scores are 0
        } else {
            // Normalize to 0-100
            techAsset.raa = (rawScore / maxRawScore) * 100;
        }

         // Optional: Clamp the value just in case
         techAsset.raa = Math.max(0, Math.min(100, techAsset.raa));

        // No need to reassign back to map
    }

    return introText;
}

// Example Usage (assuming modelState is populated):
// const summaryFactors = calculateRAAByFactors();
// console.log(summaryFactors);
// assets.forEach(asset => console.log(`${asset.title}: ${asset.raa.toFixed(2)}`));

    
