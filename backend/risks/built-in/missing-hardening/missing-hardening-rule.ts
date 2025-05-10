// File: risks/built-in/missing-hardening.ts

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
    TechnicalAssetType,
    TechnicalAssetTechnology,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define constants for RAA limits
const RAA_LIMIT = 55;
const RAA_LIMIT_REDUCED = 40;

// Define the Category structure adhering to the RiskCategory interface
export const MissingHardeningCategory: RiskCategory = {
    id: "missing-hardening",
    title: "Missing Hardening",
    description: `Technical assets with a Relative Attacker Attractiveness (RAA) value of ${RAA_LIMIT}% or higher should be ` +
        "explicitly hardened taking best practices and vendor hardening guides into account.",
    impact: "If this risk remains unmitigated, attackers might be able to easier attack high-value targets.",
    asvs: "V14 - Configuration Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "System Hardening",
    mitigation: "Try to apply all hardening best practices (like CIS benchmarks, OWASP recommendations, vendor " +
        "recommendations, DevSec Hardening Framework, DBSAT for Oracle databases, and others).",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.Tampering, // Hardening failures often enable tampering or EoP
    detectionLogic: `In-scope technical assets with RAA values of ${RAA_LIMIT}% or higher. ` +
        `Generally for high-value targets like datastores, application servers, identity providers and ERP systems this limit is reduced to ${RAA_LIMIT_REDUCED}%`,
    riskAssessment: "The risk rating depends on the sensitivity of the data processed or stored in the technical asset.",
    falsePositives: "Usually no false positives.",
    modelFailurePossibleReason: false,
    cwe: 16, // Configuration
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingHardeningCategory;
}

// Function returning the supported tags
export function SupportedTags(): string[] {
    // Example tag from Go code, adjust if needed for specific checks later
    return ["tomcat"];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    // Define technologies/types with the reduced RAA threshold
    const reducedThresholdTargets: (TechnicalAssetType | TechnicalAssetTechnology)[] = [
        TechnicalAssetType.Datastore,
        TechnicalAssetTechnology.ApplicationServer,
        TechnicalAssetTechnology.IdentityProvider,
        TechnicalAssetTechnology.ERP
    ];

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is in scope
        if (!technicalAsset || technicalAsset.outOfScope) {
            continue;
        }

        // Check if RAA exceeds the general limit OR the reduced limit for specific types
        const standardLimitExceeded = technicalAsset.raa >= RAA_LIMIT;
        const reducedLimitExceeded =
            technicalAsset.raa >= RAA_LIMIT_REDUCED &&
            (reducedThresholdTargets.includes(technicalAsset.type) || reducedThresholdTargets.includes(technicalAsset.technology));

        if (standardLimitExceeded || reducedLimitExceeded) {
            risks.push(createRisk(technicalAsset));
            // Note: Add specific tag checks here if needed, e.g., check for 'tomcat' tag
            // if (technicalAsset.isTaggedWithAny(...SupportedTags())) { ... }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Missing Hardening</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset's highest sensitivity (Confidentiality or Integrity)
    let impact = RiskExploitationImpact.Low;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.Medium;
    }
    // Note: Go code only elevates to Medium. Consider HighImpact if needed for very sensitive high-RAA assets.

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Likely, impact), // Likelihood Likely if hardening is missing on attractive target
        RiskExploitationLikelihood.Likely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Improbable, // Missing hardening itself doesn't guarantee breach, but enables other attacks
        [technicalAsset.id], // The asset needing hardening is the focus
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
