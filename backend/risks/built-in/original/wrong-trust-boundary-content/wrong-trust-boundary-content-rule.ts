// File: risks/built-in/wrong-trust-boundary-content.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    TrustBoundary, // Import TrustBoundary type
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    TrustBoundaryType, // Import TrustBoundaryType enum
    TechnicalAssetMachine, // Import TechnicalAssetMachine enum
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts';

// Define the Category structure adhering to the RiskCategory interface
export const WrongTrustBoundaryContentCategory: RiskCategory = {
    id: "wrong-trust-boundary-content",
    title: "Wrong Trust Boundary Content",
    description: `When a trust boundary of type ${TrustBoundaryType.NetworkPolicyNamespaceIsolation} contains ` +
        "non-container assets it is likely to be a model failure.",
    impact: "If this potential model error is not fixed, some risks might not be visible.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html",
    action: "Model Consistency",
    mitigation: "Try to model the correct types of trust boundaries and technical assets. " + // Corrected typo from Go source
                `A ${TrustBoundaryType.NetworkPolicyNamespaceIsolation} boundary should typically only contain assets running as containers or serverless functions.`,
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Model inconsistency might hide EoP paths
    detectionLogic: "Trust boundaries which should only contain containers, but have different assets inside.",
    riskAssessment: RiskSeverity.Low, // Use enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // Indicates model inconsistency
    cwe: 1008, // Weak R&D Software Development Process (can cover modeling errors)
};

// Export the Category function
export function Category(): RiskCategory {
    return WrongTrustBoundaryContentCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.trustBoundaries) {
        return risks; // No boundaries, no risks
    }

    for (const trustBoundary of Object.values(modelState.parsedModelRoot.trustBoundaries)) {
        // Check if the boundary type is NetworkPolicyNamespaceIsolation
        if (trustBoundary.type === TrustBoundaryType.NetworkPolicyNamespaceIsolation) {
            // Check assets inside this boundary
            for (const techAssetID of trustBoundary.technicalAssetsInside) {
                const techAsset = modelState.parsedModelRoot.technicalAssets[techAssetID];

                // Check if asset exists and its machine type is neither Container nor Serverless
                if (techAsset &&
                    techAsset.machine !== TechnicalAssetMachine.Container &&
                    techAsset.machine !== TechnicalAssetMachine.Serverless)
                {
                    // Found a non-container/serverless asset in a namespace boundary
                    risks.push(createRisk(techAsset));
                }
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Wrong Trust Boundary Content</b> (non-container/serverless asset inside ${TrustBoundaryType.NetworkPolicyNamespaceIsolation} boundary) at <b>${technicalAsset.title}</b>`;

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
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the misplaced asset
        DataBreachProbability.Improbable,
        [technicalAsset.id], // Focus is the misplaced asset
        undefined,
        technicalAsset.id, // Most relevant asset
        undefined, // Trust boundary implicitly defined by asset context, maybe add here?
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
