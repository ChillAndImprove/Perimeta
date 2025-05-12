// File: risks/built-in/missing-identity-store.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    Availability,
    TechnicalAssetTechnology,
    Authorization, // Import Authorization enum
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingIdentityStoreCategory: RiskCategory = {
    id: "missing-identity-store",
    title: "Missing Identity Store",
    description: "The modeled architecture does not contain an identity store, which might be the risk of a model missing " +
        "critical assets (and thus not seeing their risks).",
    impact: "If this risk is unmitigated, attackers might be able to exploit risks unseen in this threat model in the identity provider/store " +
        "that is currently missing in the model.",
    asvs: "V2 - Authentication Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
    action: "Identity Store", // Action should probably be "Model Completeness"
    mitigation: "Include an identity store in the model if the application has a login.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.Spoofing, // Missing identity store might hide spoofing risks
    detectionLogic: "Models with authenticated data-flows authorized via enduser-identity missing an in-scope identity store.",
    riskAssessment: "The risk rating depends on the sensitivity of the enduser-identity authorized technical assets and " +
        "their data assets processed and stored.",
    falsePositives: "Models only offering data/services without any real authentication need " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: true, // Indicates model incompleteness
    cwe: 287, // Improper Authentication (broadly related)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingIdentityStoreCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const allAssets = Object.values(modelState.parsedModelRoot.technicalAssets);

    // 1. Check if any in-scope Identity Store exists
    const hasInScopeIdentityStore = allAssets.some(asset =>
        !asset.outOfScope &&
        (asset.technology === TechnicalAssetTechnology.IdentityStoreLDAP ||
         asset.technology === TechnicalAssetTechnology.IdentityStoreDatabase)
    );

    // If an in-scope identity store is found, no risk exists
    if (hasInScopeIdentityStore) {
        return risks; // Return empty array
    }

    // 2. If no store found, check if any communication requires EnduserIdentityPropagation
    let riskIdentified = false;
    let impact = RiskExploitationImpact.Low;
    let mostRelevantAsset: TechnicalAsset | null = null; // Asset referenced in the risk title

    // Iterate through assets and their sorted communication links for reproducibility
    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();
    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];
        if (!technicalAsset) continue; // Should not happen

        // Ensure links are sorted for consistent 'mostRelevantAsset' selection
        const communicationLinks = technicalAsset.getCommunicationLinksSorted(); // Use the class method

        for (const commLink of communicationLinks) {
            if (commLink.authorization === Authorization.EnduserIdentityPropagation) {
                riskIdentified = true;
                const targetAsset = modelState.parsedModelRoot.technicalAssets[commLink.targetId];

                if (targetAsset) { // Check if target asset exists
                    // Determine impact and track the most relevant asset (target of the link)
                    const isSensitive =
                        targetAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
                        targetAsset.getHighestIntegrity() >= Criticality.Critical ||
                        targetAsset.getHighestAvailability() >= Criticality.Critical;

                     // Update impact if a sensitive target is found
                    if (isSensitive) {
                        impact = RiskExploitationImpact.Medium;
                    }

                    // Track the most sensitive target asset as the example
                    if (!mostRelevantAsset || (targetAsset.getHighestSensitivityScore() > (mostRelevantAsset?.getHighestSensitivityScore() ?? -1))) {
                        mostRelevantAsset = targetAsset;
                    }
                } else {
                    console.warn(`Target asset ${commLink.targetId} not found for link ${commLink.id}`);
                }
            }
        }
    }

    // 3. Create risk if needed
    if (riskIdentified && mostRelevantAsset) {
        risks.push(createRisk(mostRelevantAsset, impact));
    }

    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, impact: RiskExploitationImpact): Risk {
    const category = Category();
    // Reference the target asset requiring the identity store as the example
    const title = `<b>Missing Identity Store</b> in the threat model (referencing asset <b>${technicalAsset.title}</b> requiring identity propagation as an example)`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Low likelihood for model incompleteness risk
        RiskExploitationLikelihood.Unlikely,
        impact, // Determined by sensitivity of assets requiring the identity store
        title,
        `${category.id}@${technicalAsset.id}`, // Use referenced asset ID for synthetic ID consistency
        DataBreachProbability.Improbable, // Missing model doesn't directly cause breach
        [], // No assets directly breached by *this* risk
        undefined,
        technicalAsset.id, // Most relevant asset is the example one requiring the store
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
