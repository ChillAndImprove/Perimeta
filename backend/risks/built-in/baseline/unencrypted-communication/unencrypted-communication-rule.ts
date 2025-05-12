// File: risks/built-in/unencrypted-communication.ts

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
    Authentication, // Import Authentication enum
    TechnicalAssetTechnology, // For checking monitoring
    Protocol, // For checking process local etc.
    isProtocolEncrypted, // Helper
    isProtocolProcessLocal, // Helper
    isTechnologyUnprotectedCommsTolerated, // Helper
    modelState // Access the global model state
} from '../../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnencryptedCommunicationCategory: RiskCategory = {
    id: "unencrypted-communication",
    title: "Unencrypted Communication",
    description: "Due to the confidentiality and/or integrity rating of the data assets transferred over the " +
        "communication link this connection must be encrypted.",
    impact: "If this risk is unmitigated, network attackers might be able to to eavesdrop on unencrypted sensitive data sent between components.",
    asvs: "V9 - Communication Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html",
    action: "Encryption of Communication Links",
    mitigation: "Apply transport layer encryption to the communication link.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.InformationDisclosure,
    detectionLogic: `Unencrypted technical communication links of in-scope technical assets (excluding ${TechnicalAssetTechnology.Monitoring} traffic as well as ${Protocol.LocalFileAccess} and ${Protocol.InProcessLibraryCall}) ` + // Adjusted for TS enums
        `transferring sensitive data.`, // TODO more detailed text required here
    riskAssessment: "Depending on the confidentiality rating of the transferred data-assets either medium or high risk.",
    falsePositives: "When all sensitive data sent over the communication link is already fully encrypted on document or data level. " +
        "Also intra-container/pod communication can be considered false positive when container orchestration platform handles encryption.",
    modelFailurePossibleReason: false,
    cwe: 319, // Cleartext Transmission of Sensitive Information
};

// Export the Category function
export function Category(): RiskCategory {
    return UnencryptedCommunicationCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Helper function to check data asset sensitivity (high)
function isHighSensitivity(dataAsset: DataAsset): boolean {
    return dataAsset.confidentiality === Confidentiality.StrictlyConfidential ||
           dataAsset.integrity === Criticality.MissionCritical;
}

// Helper function to check data asset sensitivity (medium)
function isMediumSensitivity(dataAsset: DataAsset): boolean {
    return dataAsset.confidentiality === Confidentiality.Confidential ||
           dataAsset.integrity === Criticality.Critical;
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    // Iterate through all technical assets as communication sources
    for (const technicalAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
        for (const dataFlow of technicalAsset.communicationLinks) {
            const sourceAsset = technicalAsset; // Easier to read
            const targetAsset = modelState.parsedModelRoot.technicalAssets[dataFlow.targetId];

            // Skip if source or target not found, or if either is out of scope
            if (!sourceAsset || !targetAsset || sourceAsset.outOfScope || targetAsset.outOfScope) {
                continue;
            }

            // Check conditions for needing encryption
            const needsEncryption =
                !isProtocolEncrypted(dataFlow.protocol) && // Protocol is NOT encrypted
                !isProtocolProcessLocal(dataFlow.protocol) && // Protocol is NOT process local
                !isTechnologyUnprotectedCommsTolerated(sourceAsset.technology) && // Source doesn't tolerate unencrypted
                !isTechnologyUnprotectedCommsTolerated(targetAsset.technology); // Target doesn't tolerate unencrypted

            if (!needsEncryption) {
                continue; // This link doesn't require encryption based on protocol/tech type
            }

            // Check sensitivity of data transferred or if authentication data is sent
            const transferringAuthData = dataFlow.authentication !== Authentication.None;
            let riskAddedForFlow = false;
            let highRisk = false;
            let mediumRisk = false;

            // Check sent data
            for (const sentDataAssetId of dataFlow.dataAssetsSent) {
                const dataAsset = modelState.parsedModelRoot.dataAssets[sentDataAssetId];
                if (!dataAsset) continue; // Skip if data asset not found

                if (isHighSensitivity(dataAsset)) {
                    highRisk = true;
                    break; // High sensitivity found, no need to check further data on this flow
                } else if (!dataFlow.vpn && isMediumSensitivity(dataAsset)) {
                    mediumRisk = true; // Medium sensitivity found (and not VPN protected)
                }
            }

            // Check received data only if high risk wasn't already determined by sent data
            if (!highRisk) {
                for (const receivedDataAssetId of dataFlow.dataAssetsReceived) {
                    const dataAsset = modelState.parsedModelRoot.dataAssets[receivedDataAssetId];
                     if (!dataAsset) continue;

                    if (isHighSensitivity(dataAsset)) {
                        highRisk = true;
                        break; // High sensitivity found
                    } else if (!dataFlow.vpn && isMediumSensitivity(dataAsset)) {
                        mediumRisk = true;
                    }
                }
            }

            // Determine if risk should be created based on sensitivity or auth data transfer
            if (highRisk || transferringAuthData || mediumRisk) {
                 // If high sensitivity data or auth data is transferred, impact is High
                 // Otherwise, if only medium sensitivity data (and no VPN), impact is Medium
                const finalHighRisk = highRisk || transferringAuthData;
                risks.push(createRisk(sourceAsset, dataFlow, finalHighRisk, transferringAuthData));
                riskAddedForFlow = true; // Mark risk as added for this flow
            }

        } // End loop through communication links
    } // End loop through assets
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    technicalAsset: TechnicalAsset, // The source asset
    dataFlow: CommunicationLink,
    highRisk: boolean, // Indicates if impact should be high due to data/auth sensitivity
    transferringAuthData: boolean
    ): Risk
{
    const category = Category();
    const targetAsset = modelState.parsedModelRoot?.technicalAssets[dataFlow.targetId];
    const targetTitle = targetAsset ? targetAsset.title : dataFlow.targetId;

    // Impact is Medium by default (medium sensitivity data) or High (high sensitivity data or auth data)
    const impact = highRisk ? RiskExploitationImpact.High : RiskExploitationImpact.Medium;

    let title = `<b>Unencrypted Communication</b> named <b>${dataFlow.title}</b> between <b>${technicalAsset.title}</b> and <b>${targetTitle}</b>`;
    if (transferringAuthData) {
        title += " transferring authentication data (like credentials, token, session-id, etc.)";
    }
    if (dataFlow.vpn && highRisk) { // Add VPN note only if VPN is used BUT risk is still High (due to high sensitivity/auth data)
        title += ` (even VPN-protected connections need to encrypt their data in-transit when confidentiality is ` +
                 `rated ${Confidentiality.StrictlyConfidential} or integrity is rated ${Criticality.MissionCritical})`;
    }

    // Likelihood depends on whether the communication crosses a network boundary
    const likelihood = dataFlow.isAcrossTrustBoundaryNetworkOnly()
        ? RiskExploitationLikelihood.Likely
        : RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${dataFlow.id}@${technicalAsset.id}@${targetAsset?.id || dataFlow.targetId}`, // Synthetic ID includes link, source, target
        DataBreachProbability.Possible, // Eavesdropping can lead to data breach
        [targetAsset?.id || dataFlow.targetId, technicalAsset.id], // Both source and target assets are involved/affected
        undefined,
        technicalAsset.id, // Source asset originating the unencrypted link is often most relevant
        undefined,
        undefined,
        dataFlow.id // Most relevant link is the unencrypted one
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
