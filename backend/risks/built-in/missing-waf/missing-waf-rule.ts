// File: risks/built-in/missing-waf.ts

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
    isTechnologyWebApplication, // Helper
    isTechnologyWebService,     // Helper
    isPotentialWebAccessProtocol, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingWafCategory: RiskCategory = {
    id: "missing-waf",
    title: "Missing Web Application Firewall (WAF)",
    description: "To have a first line of filtering defense, security architectures with web-services or web-applications should include a WAF in front of them. " +
        "Even though a WAF is not a replacement for security (all components must be secure even without a WAF) it adds another layer of defense to the overall " +
        "system by delaying some attacks and having easier attack alerting through it.",
    impact: "If this risk is unmitigated, attackers might be able to apply standard attack pattern tests at great speed without any filtering.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Virtual_Patching_Cheat_Sheet.html",
    action: "Web Application Firewall (WAF)",
    mitigation: "Consider placing a Web Application Firewall (WAF) in front of the web-services and/or web-applications. For cloud environments many cloud providers offer " +
        "pre-configured WAFs. Even reverse proxies can be enhances by a WAF component via ModSecurity plugins.",
    check: "Is a Web Application Firewall (WAF) in place?",
    function: RiskFunction.Operations,
    stride: STRIDE.Tampering, // WAFs primarily mitigate tampering/injection attempts
    detectionLogic: "In-scope web-services and/or web-applications accessed across a network trust boundary not having a Web Application Firewall (WAF) in front of them.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Targets only accessible via WAFs or reverse proxies containing a WAF component (like ModSecurity) can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural gaps)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingWafCategory;
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
        // Check if asset is relevant (in scope, web app or web service)
        if (technicalAsset.outOfScope ||
            (!isTechnologyWebApplication(technicalAsset.technology) && !isTechnologyWebService(technicalAsset.technology)))
        {
            continue;
        }

        // Check incoming links
        const incomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingAccess of incomingLinks) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingAccess.sourceId];

            // Check if the incoming access is risky (across network boundary, web protocol, source is not a WAF)
            if (sourceAsset && // Ensure source exists
                incomingAccess.isAcrossTrustBoundaryNetworkOnly() &&
                isPotentialWebAccessProtocol(incomingAccess.protocol) &&
                sourceAsset.technology !== TechnicalAssetTechnology.WAF)
            {
                // If conditions met, add the risk for this asset and break inner loop
                // (only one Missing WAF risk per target asset needed)
                risks.push(createRisk(technicalAsset));
                break;
            }
        } // End inner loop (incoming links)
    } // End outer loop (assets)
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Missing Web Application Firewall (WAF)</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset's highest sensitivity
    let impact = RiskExploitationImpact.Low; // Default impact is Low for just missing WAF layer
    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.Medium;
    }

    // Likelihood is generally considered Unlikely as WAF is a defense-in-depth, not primary security
    const likelihood = RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the asset needing WAF protection
        DataBreachProbability.Improbable, // Missing WAF itself doesn't directly cause breach
        [technicalAsset.id], // The asset needing protection is the focus point
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
