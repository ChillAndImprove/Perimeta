// File: risks/built-in/missing-identity-provider-isolation.ts

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
    TrustBoundaryType, // Used in description
    RiskSeverity, // Used in description
    isTechnologyIdentityRelated, // Helper
    isTechnologyCloseToHighValueTargetsTolerated, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingIdentityProviderIsolationCategory: RiskCategory = {
    id: "missing-identity-provider-isolation",
    title: "Missing Identity Provider Isolation",
    description: "Highly sensitive identity provider assets and their identity datastores should be isolated from other assets " +
        `by their own network segmentation trust-boundary (${TrustBoundaryType.ExecutionEnvironment} boundaries do not count as network isolation).`,
    impact: "If this risk is unmitigated, attackers successfully attacking other components of the system might have an easy path towards " +
        "highly sensitive identity provider assets and their identity datastores, as they are not separated by network segmentation.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Network Segmentation",
    mitigation: "Apply a network segmentation trust-boundary around the highly sensitive identity provider assets and their identity datastores.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.ElevationOfPrivilege, // Gaining access to IdP is a form of EoP
    detectionLogic: "In-scope identity provider assets and their identity datastores " +
        "when surrounded by other (not identity-related) assets (without a network trust-boundary in-between). " +
        "This risk is especially prevalent when other non-identity related assets are within the same execution environment (i.e. same database or same application server).",
    riskAssessment: `Default is ${RiskExploitationImpact.High} impact. The impact is increased to ${RiskExploitationImpact.VeryHigh} when the asset missing the ` + // Adjusted to use impact enum
        `trust-boundary protection is rated as ${Confidentiality.StrictlyConfidential} or ${Criticality.MissionCritical}.`,
    falsePositives: "When all assets within the network segmentation trust-boundary are hardened and protected to the same extend as if all were " +
        "identity providers with data of highest sensitivity.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingIdentityProviderIsolationCategory;
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

    for (const technicalAsset of allAssets) {
        // Check if asset is relevant (in scope, identity related)
        if (technicalAsset.outOfScope || !isTechnologyIdentityRelated(technicalAsset.technology)) {
            continue;
        }

        // Determine if the asset itself is highly sensitive (for potential impact increase)
        const moreImpact =
            technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
            technicalAsset.integrity === Criticality.MissionCritical ||
            technicalAsset.availability === Criticality.MissionCritical; // Use direct fields as per Go

        let createRiskEntry = false;
        let sameExecutionEnv = false;

        // Check against all *other* assets
        for (const sparringAssetCandidate of allAssets) {
            if (technicalAsset.id === sparringAssetCandidate.id) {
                continue; // Don't compare with self
            }

            // Check if the sparring partner is NOT identity related and NOT a type tolerated near high-value targets
            if (!isTechnologyIdentityRelated(sparringAssetCandidate.technology) &&
                !isTechnologyCloseToHighValueTargetsTolerated(sparringAssetCandidate.technology))
            {
                // Check if they are in the same execution environment
                if (technicalAsset.isSameExecutionEnvironment(sparringAssetCandidate.id)) {
                    createRiskEntry = true;
                    sameExecutionEnv = true;
                    break; // Found critical proximity, no need to check further network boundaries for this sparring partner
                }
                 // If not same exec env, check if they are in the same network boundary (excluding exec envs)
                else if (technicalAsset.isSameTrustBoundaryNetworkOnly(sparringAssetCandidate.id)) {
                    createRiskEntry = true;
                    // Don't break here, continue checking other assets in case one *is* in the same exec env
                }
            }
        } // End inner loop checking sparring partners

        // If any unsuitable neighbor was found (either same exec env or same network segment)
        if (createRiskEntry) {
            risks.push(createRisk(technicalAsset, moreImpact, sameExecutionEnv));
        }
    } // End outer loop iterating through potential IdP assets
    return risks;
}


// Helper function to create a Risk instance
function createRisk(techAsset: TechnicalAsset, moreImpact: boolean, sameExecutionEnv: boolean): Risk {
    const category = Category();
    let impact = RiskExploitationImpact.High;
    let likelihood = RiskExploitationLikelihood.Unlikely;
    let location = "<b>in the same network segment</b>";

    if (moreImpact) {
        impact = RiskExploitationImpact.VeryHigh;
    }
    if (sameExecutionEnv) {
        likelihood = RiskExploitationLikelihood.Likely; // Higher likelihood if co-located in same execution environment
        location = "<b>in the same execution environment</b>";
    }

    const title = `<b>Missing Identity Provider Isolation</b> to further encapsulate and protect identity-related asset <b>${techAsset.title}</b> against unrelated ` +
                  `lower protected assets ${location}, which might be easier to compromise by attackers`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${techAsset.id}`, // Synthetic ID focuses on the IdP asset
        DataBreachProbability.Improbable, // Focus is lateral movement/EoP, not direct data breach by lack of isolation itself
        [techAsset.id], // The IdP asset itself is the primary potential "breach" point (of credentials/control)
        undefined,
        techAsset.id, // Most relevant asset is the IdP needing isolation
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
