// File: risks/built-in/server-side-request-forgery.ts

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
    TechnicalAssetTechnology,
    Usage,
    isTechnologyClient, // Helper
    isPotentialWebAccessProtocol, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const ServerSideRequestForgeryCategory: RiskCategory = {
    id: "server-side-request-forgery",
    title: "Server-Side Request Forgery (SSRF)",
    description: "When a server system (i.e. not a client) is accessing other server systems via typical web protocols " +
        "Server-Side Request Forgery (SSRF) or Local-File-Inclusion (LFI) or Remote-File-Inclusion (RFI) risks might arise. ",
    impact: "If this risk is unmitigated, attackers might be able to access sensitive services or files of network-reachable components by modifying outgoing calls of affected components.",
    asvs: "V12 - File and Resources Verification Requirements", // Although SSRF specific ASVS exists (V10.6), V12 covers related file inclusion
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html",
    action: "SSRF Prevention",
    mitigation: "Try to avoid constructing the outgoing target URL with caller controllable values. Alternatively use a mapping (whitelist) when accessing outgoing URLs instead of creating them including caller " +
        "controllable values. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.InformationDisclosure, // SSRF often used to disclose internal info or access internal services
    detectionLogic: "In-scope non-client systems accessing (using outgoing communication links) targets with either HTTP or HTTPS protocol.",
    riskAssessment: "The risk rating (low or medium) depends on the sensitivity of the data assets receivable via web protocols from " +
        "targets within the same network trust-boundary as well on the sensitivity of the data assets receivable via web protocols from the target asset itself. " +
        "Also for cloud-based environments the exploitation impact is at least medium, as cloud backend services can be attacked via SSRF.",
    falsePositives: "Servers not sending outgoing web requests can be considered " +
        "as false positives after review.",
    modelFailurePossibleReason: false,
    cwe: 918, // Server-Side Request Forgery (SSRF)
};

// Export the Category function
export function Category(): RiskCategory {
    return ServerSideRequestForgeryCategory;
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

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is relevant (in scope, not a client, not LB)
        if (!technicalAsset || technicalAsset.outOfScope ||
            isTechnologyClient(technicalAsset.technology) ||
            technicalAsset.technology === TechnicalAssetTechnology.LoadBalancer)
        {
            continue;
        }

        // Check outgoing communication links for potential web access
        for (const outgoingFlow of technicalAsset.communicationLinks) {
            if (isPotentialWebAccessProtocol(outgoingFlow.protocol)) {
                risks.push(createRisk(technicalAsset, outgoingFlow));
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, outgoingFlow: CommunicationLink): Risk {
    const category = Category();
    const targetAsset = modelState.parsedModelRoot?.technicalAssets[outgoingFlow.targetId];

    if (!targetAsset) {
        // Should not happen in consistent model, but handle defensively
         throw new Error(`Target asset ${outgoingFlow.targetId} for outgoing flow ${outgoingFlow.id} not found.`);
    }

    const title = `<b>Server-Side Request Forgery (SSRF)</b> risk at <b>${technicalAsset.title}</b> server-side web-requesting ` +
                  `the target <b>${targetAsset.title}</b> via <b>${outgoingFlow.title}</b>`;

    let impact = RiskExploitationImpact.Low; // Default impact

    // 1. Check sensitivity of the direct target
    if (targetAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential) {
        impact = RiskExploitationImpact.Medium;
    }

    // 2. Check sensitivity of potential *other* targets within the *same network boundary* reachable via web protocols
    const uniqueDataBreachTechnicalAssetIDs = new Set<string>();
    uniqueDataBreachTechnicalAssetIDs.add(technicalAsset.id); // The asset performing SSRF is affected

    if (modelState.parsedModelRoot?.technicalAssets) {
        for (const potentialTargetAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
            // Check if potential target is in the same network boundary as the SSRF source asset
            if (technicalAsset.isSameTrustBoundaryNetworkOnly(potentialTargetAsset.id)) {
                // Check if this potential target has any incoming web access links
                const potentialTargetIncomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[potentialTargetAsset.id] || [];
                const isWebAccessible = potentialTargetIncomingLinks.some(link => isPotentialWebAccessProtocol(link.protocol));

                if (isWebAccessible) {
                     uniqueDataBreachTechnicalAssetIDs.add(potentialTargetAsset.id); // Add as potential SSRF target
                     // Elevate impact if *any* web-accessible asset in the same boundary is highly confidential
                     if (potentialTargetAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential) {
                         impact = RiskExploitationImpact.Medium;
                     }
                }
            }
        }
    }

    // 3. Adjust impact for cloud environments
    const sourceBoundary = technicalAsset.getTrustBoundary(); // Use helper
    // Use optional chaining and nullish coalescing
    const isInCloud = sourceBoundary?.type === "network-cloud-provider" || sourceBoundary?.type === "network-cloud-security-group" ;
    if (impact === RiskExploitationImpact.Low && isInCloud) {
        impact = RiskExploitationImpact.Medium;
    }

    // Determine likelihood based on outgoing flow usage
    const likelihood = outgoingFlow.usage === Usage.DevOps
        ? RiskExploitationLikelihood.Unlikely
        : RiskExploitationLikelihood.Likely; // Business usage implies higher likelihood

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}@${targetAsset.id}@${outgoingFlow.id}`, // Synthetic ID includes source, target, and link
        DataBreachProbability.Possible, // SSRF can possibly lead to data breach via internal access
        Array.from(uniqueDataBreachTechnicalAssetIDs), // Include all potentially reachable assets in the same boundary
        undefined,
        technicalAsset.id, // Most relevant asset is the one vulnerable to SSRF
        undefined,
        undefined,
        outgoingFlow.id // Most relevant link is the outgoing web request
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
