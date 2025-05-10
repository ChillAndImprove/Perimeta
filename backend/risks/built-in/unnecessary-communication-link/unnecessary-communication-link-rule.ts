// File: risks/built-in/unnecessary-communication-link.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    CommunicationLink,
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
export const UnnecessaryCommunicationLinkCategory: RiskCategory = {
    id: "unnecessary-communication-link",
    title: "Unnecessary Communication Link",
    description: "When a technical communication link does not send or receive any data assets, this is " +
        "an indicator for an unnecessary communication link (or for an incomplete model).",
    impact: "If this risk is unmitigated, attackers might be able to target unnecessary communication links.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Attack Surface Reduction",
    mitigation: "Try to avoid using technical communication links that do not send or receive anything.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Unnecessary links might provide unintended paths
    detectionLogic: "In-scope technical assets' technical communication links not sending or receiving any data assets.",
    riskAssessment: RiskSeverity.Low, // Use enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // Indicates potential model incompleteness
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return UnnecessaryCommunicationLinkCategory;
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

        for (const commLink of technicalAsset.communicationLinks) {
            // Check if link transfers no data
            if (commLink.dataAssetsSent.length === 0 && commLink.dataAssetsReceived.length === 0) {
                const targetAsset = modelState.parsedModelRoot.technicalAssets[commLink.targetId];

                // Check if *either* source or target is in scope
                if (targetAsset && (!technicalAsset.outOfScope || !targetAsset.outOfScope)) {
                    risks.push(createRisk(technicalAsset, commLink));
                } else if (!targetAsset) {
                    // If target doesn't exist but source is in scope, still flag it
                     console.warn(`Communication link ${commLink.id} from ${technicalAsset.id} points to non-existent target ${commLink.targetId}. Flagging risk as source is in scope: ${!technicalAsset.outOfScope}`);
                     if (!technicalAsset.outOfScope) {
                         risks.push(createRisk(technicalAsset, commLink));
                     }
                }
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, commLink: CommunicationLink): Risk {
    const category = Category();
    const title = `<b>Unnecessary Communication Link</b> titled <b>${commLink.title}</b> at technical asset <b>${technicalAsset.title}</b>`;

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
        `${category.id}@${commLink.id}@${technicalAsset.id}`, // Synthetic ID includes link and source asset
        DataBreachProbability.Improbable,
        [technicalAsset.id], // The asset with the unnecessary link is the focus
        undefined,
        technicalAsset.id, // Most relevant asset is the source
        undefined,
        undefined,
        commLink.id // Most relevant link is the unnecessary one
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
