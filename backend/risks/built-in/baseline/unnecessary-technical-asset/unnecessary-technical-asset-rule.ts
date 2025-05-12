// File: risks/built-in/unnecessary-technical-asset.ts

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
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnnecessaryTechnicalAssetCategory: RiskCategory = {
    id: "unnecessary-technical-asset",
    title: "Unnecessary Technical Asset",
    description: "When a technical asset does not process or store any data assets, this is " +
        "an indicator for an unnecessary technical asset (or for an incomplete model). " +
        "This is also the case if the asset has no communication links (either outgoing or incoming).",
    impact: "If this risk is unmitigated, attackers might be able to target unnecessary technical assets.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Attack Surface Reduction",
    mitigation: "Try to avoid using technical assets that do not process or store anything.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Unnecessary assets might provide pivot points
    detectionLogic: "Technical assets not processing or storing any data assets.",
    riskAssessment: RiskSeverity.Low, // Use enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // Indicates potential model incompleteness or unused asset
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return UnnecessaryTechnicalAssetCategory;
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

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];
        if (!technicalAsset) continue; // Should not happen

        // Condition 1: No data processed or stored
        const noDataHandled = technicalAsset.dataAssetsProcessed.length === 0 &&
                              technicalAsset.dataAssetsStored.length === 0;

        // Condition 2: No communication links (neither outgoing nor incoming)
        const noOutgoingLinks = technicalAsset.communicationLinks.length === 0;
        const noIncomingLinks = (modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || []).length === 0;
        const noCommunication = noOutgoingLinks && noIncomingLinks;

        // If either condition is met (and asset is in scope implicitly by being checked)
        if (noDataHandled || noCommunication) {
            // Scope check wasn't explicitly in Go's if condition, but implied by context.
            // Adding it here for clarity, though an out-of-scope asset likely wouldn't exist anyway.
             if (!technicalAsset.outOfScope) {
                risks.push(createRisk(technicalAsset));
             }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Unnecessary Technical Asset</b> named <b>${technicalAsset.title}</b>`;

    // Risk severity is Low as per category definition
    const impact = RiskExploitationImpact.Low;
    const likelihood = RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        RiskSeverity.Low, // Set severity directly
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID uses the asset ID
        DataBreachProbability.Improbable,
        [technicalAsset.id], // Focus is the unnecessary asset itself
        undefined,
        technicalAsset.id, // Most relevant asset
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
