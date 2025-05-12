// File: risks/built-in/unencrypted-asset.ts

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
    TechnicalAssetTechnology,
    EncryptionStyle, // Import EncryptionStyle enum
    isTechnologyEmbeddedComponent, // Helper
    isTechnologyUsuallyStoringEnduserData, // Helper
    modelState // Access the global model state
} from '../../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnencryptedAssetCategory: RiskCategory = {
    id: "unencrypted-asset",
    title: "Unencrypted Technical Assets",
    description: "Due to the confidentiality rating of the technical asset itself and/or the processed data assets " +
        "this technical asset must be encrypted. The risk rating depends on the sensitivity technical asset itself and of the data assets stored.",
    impact: "If this risk is unmitigated, attackers might be able to access unencrypted data when successfully compromising sensitive components.",
    asvs: "V6 - Stored Cryptography Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
    action: "Encryption of Technical Asset",
    mitigation: "Apply encryption to the technical asset.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.InformationDisclosure,
    detectionLogic: `In-scope unencrypted technical assets (excluding ${TechnicalAssetTechnology.ReverseProxy}` +
        `, ${TechnicalAssetTechnology.LoadBalancer}, ${TechnicalAssetTechnology.WAF}, ${TechnicalAssetTechnology.IDS}` +
        `, ${TechnicalAssetTechnology.IPS} and embedded components like ${TechnicalAssetTechnology.Library}) ` +
        `storing data assets rated at least as ${Confidentiality.Confidential} or ${Criticality.Critical}. ` +
        `For technical assets storing data assets rated as ${Confidentiality.StrictlyConfidential} or ${Criticality.MissionCritical} the ` +
        `encryption must be of type ${EncryptionStyle.DataWithEnduserIndividualKey}.`,
    riskAssessment: "Depending on the confidentiality rating of the stored data-assets either medium or high risk.",
    falsePositives: "When all sensitive data stored within the asset is already fully encrypted on document or data level.",
    modelFailurePossibleReason: false,
    cwe: 311, // Missing Encryption of Sensitive Data
};

// Export the Category function
export function Category(): RiskCategory {
    return UnencryptedAssetCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Helper function to check if asset type gets an encryption waiver
function isEncryptionWaiver(asset: TechnicalAsset): boolean {
    return asset.technology === TechnicalAssetTechnology.ReverseProxy ||
           asset.technology === TechnicalAssetTechnology.LoadBalancer ||
           asset.technology === TechnicalAssetTechnology.WAF ||
           asset.technology === TechnicalAssetTechnology.IDS ||
           asset.technology === TechnicalAssetTechnology.IPS ||
           isTechnologyEmbeddedComponent(asset.technology); // Use helper
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

        // Check if asset is relevant (in scope, not waived)
        if (!technicalAsset || technicalAsset.outOfScope || isEncryptionWaiver(technicalAsset)) {
            continue;
        }

        // Check sensitivity threshold
        const isSensitive =
            technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
            technicalAsset.getHighestIntegrity() >= Criticality.Critical;

        if (isSensitive) {
            const isVerySensitive =
                technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential ||
                technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;

            // Check if end-user key encryption is required
            const requiresEnduserKey = isVerySensitive && isTechnologyUsuallyStoringEnduserData(technicalAsset.technology);

            // Case 1: No encryption at all
            if (technicalAsset.encryption === EncryptionStyle.None) {
                const impact = isVerySensitive ? RiskExploitationImpact.High : RiskExploitationImpact.Medium;
                risks.push(createRisk(technicalAsset, impact, requiresEnduserKey));
            }
            // Case 2: Requires end-user key, but has a weaker form of encryption
            else if (requiresEnduserKey &&
                     (technicalAsset.encryption === EncryptionStyle.Transparent ||
                      technicalAsset.encryption === EncryptionStyle.DataWithSymmetricSharedKey ||
                      technicalAsset.encryption === EncryptionStyle.DataWithAsymmetricSharedKey))
            {
                 // Impact is Medium because *some* encryption exists, but not the required type
                 risks.push(createRisk(technicalAsset, RiskExploitationImpact.Medium, requiresEnduserKey));
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    technicalAsset: TechnicalAsset,
    impact: RiskExploitationImpact,
    requiresEnduserKey: boolean): Risk
{
    const category = Category();
    let title = `<b>Unencrypted Technical Asset</b> named <b>${technicalAsset.title}</b>`;
    if (requiresEnduserKey) {
        // Adjust title if specific encryption type was required but missing/wrong
        title += ` missing enduser-individual encryption (like ${EncryptionStyle.DataWithEnduserIndividualKey})`;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely as requires prior compromise
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the asset
        DataBreachProbability.Improbable, // Lack of encryption itself doesn't guarantee breach, enables it after compromise
        [technicalAsset.id], // The unencrypted asset is the focus
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
