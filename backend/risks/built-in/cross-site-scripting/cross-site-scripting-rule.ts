// File: risks/built-in/cross-site-scripting.ts

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
    modelState, // Access the global model state
    isTechnologyWebApplication // Helper for technology check
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const CrossSiteScriptingCategory: RiskCategory = {
    id: "cross-site-scripting",
    title: "Cross-Site Scripting (XSS)",
    description: "For each web application Cross-Site Scripting (XSS) risks might arise. In terms " +
        "of the overall risk level take other applications running on the same domain into account as well.",
    impact: "If this risk remains unmitigated, attackers might be able to access individual victim sessions and steal or modify user data.",
    asvs: "V5 - Validation, Sanitization and Encoding Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
    action: "XSS Prevention",
    mitigation: "Try to encode all values sent back to the browser and also handle DOM-manipulations in a safe way " +
        "to avoid DOM-based XSS. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Tampering, // Although often leading to Info Disclosure, fundamentally it's tampering with the client-side code execution
    detectionLogic: "In-scope web applications.",
    riskAssessment: "The risk rating depends on the sensitivity of the data processed or stored in the web application.",
    falsePositives: "When the technical asset " +
        "is not accessed via a browser-like component (i.e not by a human user initiating the request that " +
        "gets passed through all components until it reaches the web application) this can be considered a false positive.",
    modelFailurePossibleReason: false,
    cwe: 79,
};

// Export the Category function
export function Category(): RiskCategory {
    return CrossSiteScriptingCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No assets, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if the asset is relevant (in scope, is a web application)
        // TODO: Consider how to model/detect web-views in mobile/rich clients if needed
        if (technicalAsset && !technicalAsset.outOfScope && isTechnologyWebApplication(technicalAsset.technology)) {
            risks.push(createRisk(technicalAsset));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Cross-Site Scripting (XSS)</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on the asset's highest sensitivity
    let impact = RiskExploitationImpact.Medium;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.High;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Likely, impact), // XSS is often likely if protections are missing
        RiskExploitationLikelihood.Likely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Possible, // XSS can lead to session hijacking/data theft
        [technicalAsset.id], // The affected web application is the breach point
        undefined,
        technicalAsset.id, // Most relevant asset is the vulnerable web app
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
