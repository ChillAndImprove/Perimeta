// File: risks/built-in/unnecessary-data-asset.ts

import {
    RiskCategory,
    Risk,
    DataAsset, // Import DataAsset type
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnnecessaryDataAssetCategory: RiskCategory = {
    id: "unnecessary-data-asset",
    title: "Unnecessary Data Asset",
    description: "When a data asset is not processed or stored by any data assets and also not transferred by any " + // Note: "by any data assets" seems like a typo, should be "technical assets"
        "communication links, this is an indicator for an unnecessary data asset (or for an incomplete model).",
    impact: "If this risk is unmitigated, attackers might be able to access unnecessary data assets using " +
        "other vulnerabilities.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Attack Surface Reduction",
    mitigation: "Try to avoid having data assets that are not required/used.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Accessing unused data might provide info for EoP
    detectionLogic: "Modelled data assets not processed or stored by any data assets and also not transferred by any " + // Again, typo likely means "technical assets"
        "communication links.",
    riskAssessment: RiskSeverity.Low, // Use enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // Indicates potential model incompleteness or unused elements
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return UnnecessaryDataAssetCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.dataAssets || !modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No data or technical assets, nothing to check
    }

    // Start with all data asset IDs as potentially unused
    const unusedDataAssetIDs = new Set<string>(Object.keys(modelState.parsedModelRoot.dataAssets));

    // Iterate through technical assets to find usage
    for (const technicalAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
        // Remove processed and stored assets
        technicalAsset.dataAssetsProcessed.forEach(id => unusedDataAssetIDs.delete(id));
        technicalAsset.dataAssetsStored.forEach(id => unusedDataAssetIDs.delete(id));

        // Remove transferred assets (sent or received)
        for (const commLink of technicalAsset.communicationLinks) {
            commLink.dataAssetsSent.forEach(id => unusedDataAssetIDs.delete(id));
            commLink.dataAssetsReceived.forEach(id => unusedDataAssetIDs.delete(id));
        }
    }

    // Create risks for the remaining unused data assets
    // Sort IDs for consistent risk generation order
    const sortedUnusedIds = Array.from(unusedDataAssetIDs).sort();

    for (const unusedDataAssetID of sortedUnusedIds) {
        risks.push(createRisk(unusedDataAssetID));
    }

    return risks;
}


// Helper function to create a Risk instance
function createRisk(unusedDataAssetID: string): Risk {
    const category = Category();
    const unusedDataAsset = modelState.parsedModelRoot?.dataAssets[unusedDataAssetID];
    const title = `<b>Unnecessary Data Asset</b> named <b>${unusedDataAsset?.title || unusedDataAssetID}</b>`; // Use ID as fallback title

    // Severity is Low as per category definition
    const impact = RiskExploitationImpact.Low;
    const likelihood = RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        RiskSeverity.Low, // Set severity directly
        likelihood,
        impact,
        title,
        `${category.id}@${unusedDataAssetID}`, // Synthetic ID uses the unused data asset ID
        DataBreachProbability.Improbable, // Unused data doesn't directly cause breach
        [unusedDataAssetID], // Focus is the unused data asset itself
        unusedDataAssetID, // Most relevant data asset
        undefined, // No specific technical asset is most relevant
        undefined,
        undefined,
        undefined
    );

    return risk;
}


// !!! ADD THIS EXPORT BLOCK AT THE END !!!
// Import the interface used in the export block
import { CustomRiskRule } from '../../../model/types.ts'; // Adjust path if needed!

export const Rule: CustomRiskRule = {
    category: Category,         // Assumes Category function exists in the file
    supportedTags: SupportedTags, // Assumes SupportedTags function exists in the file
    generateRisks: GenerateRisks, // Assumes GenerateRisks function exists in the file
};
