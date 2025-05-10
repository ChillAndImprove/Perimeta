// File: risks/built-in/unnecessary-data-transfer.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    CommunicationLink,
    DataAsset, // Import DataAsset type
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    RiskSeverity, // Used in description
    isTechnologyUnnecessaryDataTolerated, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnnecessaryDataTransferCategory: RiskCategory = {
    id: "unnecessary-data-transfer",
    title: "Unnecessary Data Transfer",
    description: "When a technical asset sends or receives data assets, which it neither processes or stores this is " +
        "an indicator for unnecessarily transferred data (or for an incomplete model). When the unnecessarily " +
        "transferred data assets are sensitive, this poses an unnecessary risk of an increased attack surface.",
    impact: "If this risk is unmitigated, attackers might be able to target unnecessarily transferred data.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Attack Surface Reduction",
    mitigation: "Try to avoid sending or receiving sensitive data assets which are not required (i.e. neither " +
        "processed or stored) by the involved technical asset.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Accessing unnecessary data might aid EoP
    detectionLogic: "In-scope technical assets sending or receiving sensitive data assets which are neither processed nor " +
        "stored by the technical asset are flagged with this risk. The risk rating (low or medium) depends on the " +
        "confidentiality, integrity, and availability rating of the technical asset. Monitoring data is exempted from this risk.", // Note: Availability not used in Go impact calc
    riskAssessment: `The risk assessment is depending on the confidentiality and integrity rating of the transferred data asset ` +
        `either ${RiskSeverity.Low} or ${RiskSeverity.Medium}.`,
    falsePositives: "Technical assets missing the model entries of either processing or storing the mentioned data assets " +
        "can be considered as false positives (incomplete models) after individual review. These should then be addressed by " +
        "completing the model so that all necessary data assets are processed and/or stored by the technical asset involved.",
    modelFailurePossibleReason: true, // Indicates potential model incompleteness
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return UnnecessaryDataTransferCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    let risks: Risk[] = []; // Use let as it will be passed and potentially modified
    const generatedRiskSyntheticIds = new Set<string>(); // Track added risks to avoid duplicates

    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];
        if (!technicalAsset || technicalAsset.outOfScope) {
            continue;
        }

        // Check outgoing data flows
        for (const outgoingDataFlow of technicalAsset.communicationLinks) {
            const targetAsset = modelState.parsedModelRoot.technicalAssets[outgoingDataFlow.targetId];
            // Skip if target tolerates unnecessary data (e.g., monitoring)
            if (targetAsset && isTechnologyUnnecessaryDataTolerated(targetAsset.technology)) {
                continue;
            }
            // Check risks for the *source* asset (technicalAsset) regarding this outgoing flow
            risks = checkRisksAgainstTechnicalAsset(risks, technicalAsset, outgoingDataFlow, false, generatedRiskSyntheticIds);
        }

        // Check incoming data flows
        const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        // Sort incoming links for consistent risk generation if needed (Go code didn't sort here)
        // commLinks.sort((a, b) => a.id.localeCompare(b.id));
        for (const incomingDataFlow of commLinks) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingDataFlow.sourceId];
             // Skip if source tolerates unnecessary data
            if (sourceAsset && isTechnologyUnnecessaryDataTolerated(sourceAsset.technology)) {
                continue;
            }
            // Check risks for the *target* asset (technicalAsset) regarding this incoming flow
            risks = checkRisksAgainstTechnicalAsset(risks, technicalAsset, incomingDataFlow, true, generatedRiskSyntheticIds);
        }
    }
    return risks;
}

// Helper function to check data assets on a flow against the technical asset
function checkRisksAgainstTechnicalAsset(
    currentRisks: Risk[],
    technicalAsset: TechnicalAsset, // The asset being checked (either source or target of flow)
    dataFlow: CommunicationLink,
    isIncomingFlow: boolean, // True if checking received data, false if checking sent data
    generatedRiskSyntheticIds: Set<string> // Keep track of generated risks
    ): Risk[]
{
    const dataAssetsToCheck = isIncomingFlow ? dataFlow.dataAssetsReceived : dataFlow.dataAssetsSent;
    const commPartnerId = isIncomingFlow ? dataFlow.sourceId : dataFlow.targetId;
    const commPartnerAsset = modelState.parsedModelRoot?.technicalAssets[commPartnerId];

    if (!commPartnerAsset) {
         console.warn(`Communication partner ${commPartnerId} not found for link ${dataFlow.id}. Skipping unnecessary data check for asset ${technicalAsset.id}.`);
         return currentRisks; // Cannot check without partner asset
    }


    for (const transferredDataAssetId of dataAssetsToCheck) {
        // Check if the technical asset neither processes nor stores this transferred data
        if (!technicalAsset.processesOrStoresDataAsset(transferredDataAssetId)) {
            const transferredDataAsset = modelState.parsedModelRoot?.dataAssets[transferredDataAssetId];

            // Check if data asset exists and is sensitive
            if (transferredDataAsset &&
                (transferredDataAsset.confidentiality >= Confidentiality.Confidential ||
                 transferredDataAsset.integrity >= Criticality.Critical))
            {
                const risk = createRisk(technicalAsset, transferredDataAsset, commPartnerAsset);
                // Add risk only if its synthetic ID hasn't been added before
                if (!generatedRiskSyntheticIds.has(risk.syntheticId)) {
                    currentRisks.push(risk);
                    generatedRiskSyntheticIds.add(risk.syntheticId);
                }
                // Note: Go code logic might add duplicates if checked from both ends;
                // using the Set prevents this.
            }
        }
    }
    return currentRisks;
}


// Helper function to create a Risk instance
function createRisk(
    technicalAsset: TechnicalAsset, // The asset unnecessarily handling the data
    dataAssetTransferred: DataAsset, // The data asset being transferred
    commPartnerAsset: TechnicalAsset // The asset on the other end of the communication
    ): Risk
{
    const category = Category();

    // Determine impact based on the sensitivity of the *transferred data asset*
    const moreRisky =
        dataAssetTransferred.confidentiality === Confidentiality.StrictlyConfidential ||
        dataAssetTransferred.integrity === Criticality.MissionCritical;

    const impact = moreRisky ? RiskExploitationImpact.Medium : RiskExploitationImpact.Low;

    const title = `<b>Unnecessary Data Transfer</b> of <b>${dataAssetTransferred.title}</b> data at <b>${technicalAsset.title}</b> ` +
                  `from/to <b>${commPartnerAsset.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely (modeling issue)
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        // Synthetic ID includes the data asset, the handling asset, and the partner asset
        `${category.id}@${dataAssetTransferred.id}@${technicalAsset.id}@${commPartnerAsset.id}`,
        DataBreachProbability.Improbable, // Unnecessary transfer itself isn't a direct breach path
        [technicalAsset.id], // Focus is on the asset handling unnecessary data
        dataAssetTransferred.id, // Most relevant data asset is the one transferred unnecessarily
        technicalAsset.id, // Most relevant tech asset is the one handling it
        undefined,
        undefined,
        undefined // No single comm link is universally most relevant (could be incoming or outgoing)
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
