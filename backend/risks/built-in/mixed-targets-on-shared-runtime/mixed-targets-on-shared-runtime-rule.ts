// File: risks/built-in/mixed-targets-on-shared-runtime.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    SharedRuntime, // Import SharedRuntime
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    Availability,
    isTechnologyExclusivelyFrontendRelated, // Helper
    isTechnologyExclusivelyBackendRelated,  // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MixedTargetsOnSharedRuntimeCategory: RiskCategory = {
    id: "mixed-targets-on-shared-runtime",
    title: "Mixed Targets on Shared Runtime",
    description: "Different attacker targets (like frontend and backend/datastore components) should not be running on the same " +
        "shared (underlying) runtime.",
    impact: "If this risk is unmitigated, attackers successfully attacking other components of the system might have an easy path towards " +
        "more valuable targets, as they are running on the same shared runtime.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Runtime Separation",
    mitigation: "Use separate runtime environments for running different target components or apply similar separation styles to " +
        "prevent load- or breach-related problems originating from one more attacker-facing asset impacts also the " +
        "other more critical rated backend/datastore assets.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.ElevationOfPrivilege, // Lateral movement is often EoP
    detectionLogic: "Shared runtime running technical assets of different trust-boundaries is at risk. " +
        "Also mixing backend/datastore with frontend components on the same shared runtime is considered a risk.",
    riskAssessment: "The risk rating (low or medium) depends on the confidentiality, integrity, and availability rating of " +
        "the technical asset running on the shared runtime.", // Note: Impact is actually based on highest sensitivity of *any* asset on runtime
    falsePositives: "When all assets running on the shared runtime are hardened and protected to the same extend as if all were " +
        "containing/processing highly sensitive data.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return MixedTargetsOnSharedRuntimeCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.sharedRuntimes) {
        return risks; // No shared runtimes, no risks
    }

    const runtimeIds = Object.keys(modelState.parsedModelRoot.sharedRuntimes).sort();

    for (const id of runtimeIds) {
        const sharedRuntime = modelState.parsedModelRoot.sharedRuntimes[id];
        if (!sharedRuntime || sharedRuntime.technicalAssetsRunning.length < 2) { // Need at least 2 assets to have mixing
            continue;
        }

        let currentTrustBoundaryId: string | undefined = undefined; // Use undefined initially
        let hasFrontend = false;
        let hasBackend = false;
        let riskAdded = false;
        let firstAsset = true; // Flag to initialize currentTrustBoundaryId

        for (const technicalAssetId of sharedRuntime.technicalAssetsRunning) {
            const technicalAsset = modelState.parsedModelRoot.technicalAssets[technicalAssetId];
            if (!technicalAsset) {
                 console.warn(`Technical asset ${technicalAssetId} listed in shared runtime ${sharedRuntime.id} not found.`);
                 continue; // Skip if asset doesn't exist
            }

            const assetBoundaryId = technicalAsset.getTrustBoundaryId(); // Use helper method

            // Initialize trust boundary on the first asset
            if (firstAsset) {
                currentTrustBoundaryId = assetBoundaryId;
                firstAsset = false;
            }
            // Check if trust boundary differs from the first one found
            else if (currentTrustBoundaryId !== assetBoundaryId) {
                // Risk due to different trust boundaries on same runtime
                risks.push(createRisk(sharedRuntime));
                riskAdded = true;
                break; // Only one risk per shared runtime needed for this condition
            }

            // Check for frontend/backend mix regardless of boundary check result
            if (isTechnologyExclusivelyFrontendRelated(technicalAsset.technology)) {
                hasFrontend = true;
            }
            if (isTechnologyExclusivelyBackendRelated(technicalAsset.technology)) {
                hasBackend = true;
            }
        } // End loop through assets on runtime

        // If no risk was added due to boundary mismatch, check for frontend/backend mix
        if (!riskAdded && hasFrontend && hasBackend) {
            risks.push(createRisk(sharedRuntime));
        }
    }
    return risks;
}

// Helper function to determine if the shared runtime hosts highly sensitive assets
function isMoreRisky(sharedRuntime: SharedRuntime): boolean {
     if (!modelState.parsedModelRoot?.technicalAssets) return false;

    return sharedRuntime.technicalAssetsRunning.some(techAssetId => {
        const techAsset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
        // Check direct fields as per Go code
        return techAsset && (
            techAsset.confidentiality === Confidentiality.StrictlyConfidential ||
            techAsset.integrity === Criticality.MissionCritical ||
            techAsset.availability === Criticality.MissionCritical
        );
    });
}


// Helper function to create a Risk instance
function createRisk(sharedRuntime: SharedRuntime): Risk {
    const category = Category();
    const impact = isMoreRisky(sharedRuntime)
        ? RiskExploitationImpact.Medium
        : RiskExploitationImpact.Low;

    // TODO: Consider adding list of asset titles to the risk title for better context
    const title = `<b>Mixed Targets on Shared Runtime</b> named <b>${sharedRuntime.title}</b> might enable attackers moving from one less ` +
                  `valuable target to a more valuable one`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Low likelihood as requires prior compromise
        RiskExploitationLikelihood.Unlikely,
        impact, // Determined by highest sensitivity of assets on the runtime
        title,
        `${category.id}@${sharedRuntime.id}`, // Synthetic ID focuses on the shared runtime
        DataBreachProbability.Improbable, // Focus is lateral movement/EoP
        [...sharedRuntime.technicalAssetsRunning], // All assets on the runtime are potentially involved
        undefined,
        undefined, // No single technical asset is *most* relevant
        undefined,
        sharedRuntime.id, // Most relevant element is the shared runtime
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
