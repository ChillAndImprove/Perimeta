// File: risks/built-in/cross-site-request-forgery.ts

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
    Criticality,
    Usage,
    modelState, // Access the global model state
    isTechnologyWebApplication, // Helper for technology check
    isPotentialWebAccessProtocol // Helper for protocol check
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const CrossSiteRequestForgeryCategory: RiskCategory = {
    id: "cross-site-request-forgery",
    title: "Cross-Site Request Forgery (CSRF)",
    description: "When a web application is accessed via web protocols Cross-Site Request Forgery (CSRF) risks might arise.",
    impact: "If this risk remains unmitigated, attackers might be able to trick logged-in victim users into unwanted actions within the web application " +
        "by visiting an attacker controlled web site.",
    asvs: "V4 - Access Control Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
    action: "CSRF Prevention",
    mitigation: "Try to use anti-CSRF tokens ot the double-submit patterns (at least for logged-in requests). " +
        "When your authentication scheme depends on cookies (like session or token cookies), consider marking them with " +
        "the same-site flag. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Spoofing,
    detectionLogic: "In-scope web applications accessed via typical web access protocols.",
    riskAssessment: "The risk rating depends on the integrity rating of the data sent across the communication link.",
    falsePositives: "Web applications passing the authentication sate via custom headers instead of cookies can " +
        "eventually be false positives. Also when the web application " +
        "is not accessed via a browser-like component (i.e not by a human user initiating the request that " +
        "gets passed through all components until it reaches the web application) this can be considered a false positive.",
    modelFailurePossibleReason: false,
    cwe: 352,
};

// Export the Category function
export function Category(): RiskCategory {
    return CrossSiteRequestForgeryCategory;
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
        if (!technicalAsset || technicalAsset.outOfScope || !isTechnologyWebApplication(technicalAsset.technology)) {
            continue;
        }

        // Check incoming flows for web protocols
        const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingFlow of incomingFlows) {
            if (isPotentialWebAccessProtocol(incomingFlow.protocol)) {
                // Determine likelihood based on usage
                const likelihood = incomingFlow.usage === Usage.DevOps
                    ? RiskExploitationLikelihood.Likely
                    : RiskExploitationLikelihood.VeryLikely; // Business usage implies higher likelihood

                risks.push(createRisk(technicalAsset, incomingFlow, likelihood));
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, incomingFlow: CommunicationLink, likelihood: RiskExploitationLikelihood): Risk {
    const category = Category();
    const sourceAsset = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];
    const sourceTitle = sourceAsset ? sourceAsset.title : incomingFlow.sourceId; // Fallback to ID if source asset not found

    const title = `<b>Cross-Site Request Forgery (CSRF)</b> risk at <b>${technicalAsset.title}</b> via <b>${incomingFlow.title}</b> from <b>${sourceTitle}</b>`;

    // Determine impact based on the integrity of data transferred over the link
    let impact = RiskExploitationImpact.Low;
    // The getHighestIntegrity method on the CommunicationLink considers both sent/received data
    if (incomingFlow.getHighestIntegrity() === Criticality.MissionCritical) {
        impact = RiskExploitationImpact.Medium;
    }
    // Note: The Go code only elevates to Medium. If Critical integrity should lead to High impact, add that check.
    // else if (incomingFlow.getHighestIntegrity() === Criticality.Critical) {
    //    impact = RiskExploitationImpact.Medium; // Or potentially Low depending on requirements
    // }


    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}@${incomingFlow.id}`, // Synthetic ID includes asset and link
        DataBreachProbability.Improbable, // CSRF typically leads to unwanted actions, not direct data breach
        [technicalAsset.id], // The affected asset is the primary "breach" point (for actions)
        undefined,
        technicalAsset.id, // Most relevant asset is the target web app
        undefined,
        undefined,
        incomingFlow.id // Most relevant link is the incoming web request
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
