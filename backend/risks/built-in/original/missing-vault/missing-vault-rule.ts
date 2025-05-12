// File: risks/built-in/missing-vault.ts

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
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingVaultCategory: RiskCategory = {
    id: "missing-vault",
    title: "Missing Vault (Secret Storage)",
    description: "In order to avoid the risk of secret leakage via config files (when attacked through vulnerabilities being able to " +
        "read files like Path-Traversal and others), it is best practice to use a separate hardened process with proper authentication, " +
        "authorization, and audit logging to access config secrets (like credentials, private keys, client certificates, etc.). " +
        "This component is usually some kind of Vault.",
    impact: "If this risk is unmitigated, attackers might be able to easier steal config secrets (like credentials, private keys, client certificates, etc.) once " +
        "a vulnerability to access files is present and exploited.",
    asvs: "V6 - Stored Cryptography Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
    action: "Vault (Secret Storage)",
    mitigation: "Consider using a Vault (Secret Storage) to securely store and access config secrets (like credentials, private keys, client certificates, etc.).",
    check: "Is a Vault (Secret Storage) in place?",
    function: RiskFunction.Architecture,
    stride: STRIDE.InformationDisclosure,
    detectionLogic: "Models without a Vault (Secret Storage).",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Models where no technical assets have any kind of sensitive config data to protect " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: true, // Indicates model might be incomplete or pattern not used
    cwe: 522, // Insufficiently Protected Credentials
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingVaultCategory;
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

    let hasVault = false;
    let impact = RiskExploitationImpact.Low;
    let mostRelevantAsset: TechnicalAsset | null = null;

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];
        if (!technicalAsset) continue;

        // Check if a Vault exists (regardless of scope for this check)
        if (technicalAsset.technology === TechnicalAssetTechnology.Vault) {
            hasVault = true;
            // We could potentially break here if *any* vault is sufficient,
            // but iterating allows finding the most sensitive asset later.
        }

        // Determine highest impact based on sensitivity of *any* asset in the model
        // (The potential benefit of a vault applies broadly)
        const isSensitive =
            technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
            technicalAsset.getHighestIntegrity() >= Criticality.Critical ||
            technicalAsset.getHighestAvailability() >= Criticality.Critical;
         const isDirectlySensitive = // Also check direct asset sensitivity as per Go code
             technicalAsset.confidentiality >= Confidentiality.Confidential ||
             technicalAsset.integrity >= Criticality.Critical ||
             technicalAsset.availability >= Criticality.Critical;


        if (isSensitive || isDirectlySensitive) {
             impact = RiskExploitationImpact.Medium;
        }

        // Track the most sensitive asset overall as the reference point if no vault exists
        if (!mostRelevantAsset || technicalAsset.getHighestSensitivityScore() > (mostRelevantAsset?.getHighestSensitivityScore() ?? -1)) {
            mostRelevantAsset = technicalAsset;
        }
    }

    // If no vault was found in the entire model, create the risk
    if (!hasVault && mostRelevantAsset) {
        // Use the most sensitive asset found as the reference
        risks.push(createRisk(mostRelevantAsset, impact));
    }

    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, impact: RiskExploitationImpact): Risk {
    const category = Category();
    // Reference the most sensitive asset as an example of what could benefit from a vault
    const title = `<b>Missing Vault (Secret Storage)</b> in the threat model (referencing asset <b>${technicalAsset.title}</b> as an example)`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Low likelihood as it's a missing best practice
        RiskExploitationLikelihood.Unlikely,
        impact, // Determined by highest sensitivity of any asset in the model
        title,
        `${category.id}@${technicalAsset.id}`, // Use referenced asset ID for synthetic ID consistency
        DataBreachProbability.Improbable, // Missing vault doesn't directly cause breach
        [], // No assets directly breached by *this* risk
        undefined,
        technicalAsset.id, // Most relevant asset is the example sensitive one
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
