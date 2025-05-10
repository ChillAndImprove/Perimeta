// File: risks/built-in/unguarded-direct-datastore-access.ts

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
    Confidentiality,
    Criticality,
    TechnicalAssetType, // Import for checking Datastore
    TechnicalAssetTechnology,
    Protocol,
    Usage,
    RiskSeverity, // Used in description
    isSharingSameParentTrustBoundary, // Import helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnguardedDirectDatastoreAccessCategory: RiskCategory = {
    id: "unguarded-direct-datastore-access",
    title: "Unguarded Direct Datastore Access",
    description: "Datastores accessed across trust boundaries must be guarded by some protecting service or application.",
    impact: "If this risk is unmitigated, attackers might be able to directly attack sensitive datastores without any protecting components in-between.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Encapsulation of Datastore",
    mitigation: "Encapsulate the datastore access behind a guarding service or application.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Bypassing intended access path is often EoP
    detectionLogic: `In-scope technical assets of type ${TechnicalAssetType.Datastore} (except ${TechnicalAssetTechnology.IdentityStoreLDAP} when accessed from ${TechnicalAssetTechnology.IdentityProvider} and ${TechnicalAssetTechnology.FileServer} when accessed via file transfer protocols) with confidentiality rating ` +
        `of ${Confidentiality.Confidential} (or higher) or with integrity rating of ${Criticality.Critical} (or higher) ` +
        `which have incoming data-flows from assets outside across a network trust-boundary. DevOps config and deployment access is excluded from this risk.`, // TODO new rule "missing bastion host"?
    riskAssessment: `The matching technical assets are at ${RiskSeverity.Low} risk. When either the ` +
        `confidentiality rating is ${Confidentiality.StrictlyConfidential} or the integrity rating ` +
        `is ${Criticality.MissionCritical}, the risk-rating is considered ${RiskSeverity.Medium}. ` +
        `For assets with RAA values higher than 40 % the risk-rating increases.`,
    falsePositives: "When the caller is considered fully trusted as if it was part of the datastore itself.",
    modelFailurePossibleReason: false,
    cwe: 501, // Trust Boundary Violation
};

// Export the Category function
export function Category(): RiskCategory {
    return UnguardedDirectDatastoreAccessCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Helper function to check for allowed FileServer access via FTP protocols
function fileServerAccessViaFTP(technicalAsset: TechnicalAsset, incomingAccess: CommunicationLink): boolean {
    return technicalAsset.technology === TechnicalAssetTechnology.FileServer &&
           (incomingAccess.protocol === Protocol.FTP ||
            incomingAccess.protocol === Protocol.FTPS ||
            incomingAccess.protocol === Protocol.SFTP);
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id]; // The potential datastore target

        // Check if asset is relevant (in scope, is a Datastore)
        if (!technicalAsset || technicalAsset.outOfScope || technicalAsset.type !== TechnicalAssetType.Datastore) {
            continue;
        }

        // Check sensitivity threshold
        const isSensitiveTarget =
            technicalAsset.confidentiality >= Confidentiality.Confidential ||
            technicalAsset.integrity >= Criticality.Critical; // Use direct fields as per Go

        if (!isSensitiveTarget) {
            continue; // Target not sensitive enough
        }

        // Check incoming links
        const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingAccess of commLinks) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingAccess.sourceId];

            // Basic source check
            if (!sourceAsset || sourceAsset.outOfScope) {
                continue;
            }

            // --- Check for Exemptions ---
            // Exemption 1: Identity Store accessed by Identity Provider
            const isIdStore = technicalAsset.technology === TechnicalAssetTechnology.IdentityStoreLDAP ||
                              technicalAsset.technology === TechnicalAssetTechnology.IdentityStoreDatabase;
            if (isIdStore && sourceAsset.technology === TechnicalAssetTechnology.IdentityProvider) {
                continue;
            }

            // Exemption 2: FileServer accessed via FTP/S/SFTP
            if (fileServerAccessViaFTP(technicalAsset, incomingAccess)) {
                continue;
            }

            // Exemption 3: DevOps usage link
            if (incomingAccess.usage === Usage.DevOps) {
                continue;
            }

            // --- Check for Risk Condition ---
            // Condition: Access is across a network boundary AND source/target don't share a parent boundary
            if (incomingAccess.isAcrossTrustBoundaryNetworkOnly() &&
                !isSharingSameParentTrustBoundary(technicalAsset, sourceAsset)) // Use helper
            {
                // Determine if target sensitivity warrants higher impact
                const highRiskTarget =
                    technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
                    technicalAsset.integrity === Criticality.MissionCritical; // Use direct fields

                risks.push(createRisk(technicalAsset, incomingAccess, sourceAsset, highRiskTarget));
                // Note: Unlike some other rules, this doesn't break; it finds all unguarded access links.
            }
        } // End inner loop (incoming links)
    } // End outer loop (target assets)
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    dataStore: TechnicalAsset,
    dataFlow: CommunicationLink,
    clientOutsideTrustBoundary: TechnicalAsset,
    moreRisky: boolean // Based on datastore sensitivity
    ): Risk
{
    const category = Category();
    // Impact is Low, elevated to Medium if datastore is highly sensitive OR has high RAA
    let impact = RiskExploitationImpact.Low;
    if (moreRisky || dataStore.raa > 40) {
        impact = RiskExploitationImpact.Medium;
    }

    // Likelihood is Likely as direct access is possible
    const likelihood = RiskExploitationLikelihood.Likely;

    const title = `<b>Unguarded Direct Datastore Access</b> of <b>${dataStore.title}</b> by <b>${clientOutsideTrustBoundary.title}</b> via <b>${dataFlow.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${dataFlow.id}@${clientOutsideTrustBoundary.id}@${dataStore.id}`, // Synthetic ID includes link, source, and target
        DataBreachProbability.Improbable, // Focus is direct attack vector, not breach via link itself
        [dataStore.id], // The datastore itself is the potential breach point
        undefined,
        dataStore.id, // Most relevant asset is the datastore being accessed directly
        undefined,
        undefined,
        dataFlow.id // Most relevant link is the one crossing the boundary unguarded
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
