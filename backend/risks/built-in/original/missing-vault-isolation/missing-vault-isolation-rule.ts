// File: risks/built-in/missing-vault-isolation.ts

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
    TechnicalAssetType, // Added for storage check
    TrustBoundaryType, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingVaultIsolationCategory: RiskCategory = {
    id: "missing-vault-isolation",
    title: "Missing Vault Isolation",
    description: "Highly sensitive vault assets and their datastores should be isolated from other assets " +
        `by their own network segmentation trust-boundary (${TrustBoundaryType.ExecutionEnvironment} boundaries do not count as network isolation).`,
    impact: "If this risk is unmitigated, attackers successfully attacking other components of the system might have an easy path towards " +
        "highly sensitive vault assets and their datastores, as they are not separated by network segmentation.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Network Segmentation",
    mitigation: "Apply a network segmentation trust-boundary around the highly sensitive vault assets and their datastores.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.ElevationOfPrivilege,
    detectionLogic: "In-scope vault assets " +
        "when surrounded by other (not vault-related) assets (without a network trust-boundary in-between). " +
        "This risk is especially prevalent when other non-vault related assets are within the same execution environment (i.e. same database or same application server).",
    riskAssessment: `Default is ${RiskExploitationImpact.Medium} impact. The impact is increased to ${RiskExploitationImpact.High} when the asset missing the ` + // Adjusted to use impact enum
        `trust-boundary protection is rated as ${Confidentiality.StrictlyConfidential} or ${Criticality.MissionCritical}.`,
    falsePositives: "When all assets within the network segmentation trust-boundary are hardened and protected to the same extend as if all were " +
        "vaults with data of highest sensitivity.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingVaultIsolationCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Helper function to check if a storage asset seems directly connected to a vault
function isVaultStorage(vault: TechnicalAsset, storage: TechnicalAsset): boolean {
    // Check if storage is a Datastore and if there's a direct connection from the vault
    return storage.type === TechnicalAssetType.Datastore && vault.hasDirectConnection(storage.id);
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const allAssets = Object.values(modelState.parsedModelRoot.technicalAssets);

    for (const technicalAsset of allAssets) {
        // Check if asset is relevant (in scope, is a Vault)
        if (technicalAsset.outOfScope || technicalAsset.technology !== TechnicalAssetTechnology.Vault) {
            continue;
        }

        // Determine if the vault itself is highly sensitive (for potential impact increase)
        const moreImpact =
            technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
            technicalAsset.integrity === Criticality.MissionCritical ||
            technicalAsset.availability === Criticality.MissionCritical; // Use direct fields

        let createRiskEntry = false;
        let sameExecutionEnv = false;

        // Check against all *other* assets
        for (const sparringAssetCandidate of allAssets) {
            if (technicalAsset.id === sparringAssetCandidate.id) {
                continue; // Don't compare with self
            }

            // Check if the sparring partner is NOT a Vault and NOT its direct storage
            if (sparringAssetCandidate.technology !== TechnicalAssetTechnology.Vault &&
                !isVaultStorage(technicalAsset, sparringAssetCandidate))
            {
                // Check if they are in the same execution environment
                if (technicalAsset.isSameExecutionEnvironment(sparringAssetCandidate.id)) {
                    createRiskEntry = true;
                    sameExecutionEnv = true;
                    break; // Found critical proximity, no need to check further
                }
                // If not same exec env, check if they are in the same network boundary
                else if (technicalAsset.isSameTrustBoundaryNetworkOnly(sparringAssetCandidate.id)) {
                    createRiskEntry = true;
                    // Continue checking other assets in case one is in the same exec env
                }
            }
        } // End inner loop checking sparring partners

        // If any unsuitable neighbor was found
        if (createRiskEntry) {
            risks.push(createRisk(technicalAsset, moreImpact, sameExecutionEnv));
        }
    } // End outer loop iterating through potential Vault assets
    return risks;
}


// Helper function to create a Risk instance
function createRisk(techAsset: TechnicalAsset, moreImpact: boolean, sameExecutionEnv: boolean): Risk {
    const category = Category();
    let impact = RiskExploitationImpact.Medium; // Default impact for missing vault isolation
    let likelihood = RiskExploitationLikelihood.Unlikely;
    let location = "<b>in the same network segment</b>";

    if (moreImpact) { // If the vault itself is highly sensitive
        impact = RiskExploitationImpact.High;
    }
    if (sameExecutionEnv) {
        likelihood = RiskExploitationLikelihood.Likely; // Higher likelihood if co-located
        location = "<b>in the same execution environment</b>";
    }

    const title = `<b>Missing Vault Isolation</b> to further encapsulate and protect vault-related asset <b>${techAsset.title}</b> against unrelated ` +
                  `lower protected assets ${location}, which might be easier to compromise by attackers`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${techAsset.id}`, // Synthetic ID focuses on the Vault asset
        DataBreachProbability.Improbable, // Focus is lateral movement/EoP
        [techAsset.id], // The Vault asset itself is the primary potential "breach" point
        undefined,
        techAsset.id, // Most relevant asset is the Vault needing isolation
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
