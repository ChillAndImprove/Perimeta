// File: risks/built-in/unguarded-access-from-internet.ts

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
    TechnicalAssetTechnology,
    Protocol,
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UnguardedAccessFromInternetCategory: RiskCategory = {
    id: "unguarded-access-from-internet",
    title: "Unguarded Access From Internet",
    description: "Internet-exposed assets must be guarded by a protecting service, application, " +
        "or reverse-proxy.",
    impact: "If this risk is unmitigated, attackers might be able to directly attack sensitive systems without any hardening components in-between " +
        "due to them being directly exposed on the internet.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Encapsulation of Technical Asset",
    mitigation: "Encapsulate the asset behind a guarding service, application, or reverse-proxy. " +
        "For admin maintenance a bastion-host should be used as a jump-server. " +
        "For file transfer a store-and-forward-host should be used as an indirect file exchange platform.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Bypassing guards can lead to EoP
    detectionLogic: `In-scope technical assets (excluding ${TechnicalAssetTechnology.LoadBalancer}) with confidentiality rating ` +
        `of ${Confidentiality.Confidential} (or higher) or with integrity rating of ${Criticality.Critical} (or higher) when ` +
        `accessed directly from the internet. All ${TechnicalAssetTechnology.WebServer}, ${TechnicalAssetTechnology.WebApplication}, ` +
        `${TechnicalAssetTechnology.ReverseProxy}, ${TechnicalAssetTechnology.WAF}, and ${TechnicalAssetTechnology.Gateway} assets are exempted from this risk when ` +
        `they do not consist of custom developed code and ` +
        `the data-flow only consists of HTTP or FTP protocols. Access from ${TechnicalAssetTechnology.Monitoring} systems ` +
        `as well as VPN-protected connections are exempted.`,
    riskAssessment: `The matching technical assets are at ${RiskSeverity.Low} risk. When either the ` +
        `confidentiality rating is ${Confidentiality.StrictlyConfidential} or the integrity rating ` +
        `is ${Criticality.MissionCritical}, the risk-rating is considered ${RiskSeverity.Medium}. ` +
        `For assets with RAA values higher than 40 % the risk-rating increases.`,
    falsePositives: `When other means of filtering client requests are applied equivalent of ${TechnicalAssetTechnology.ReverseProxy}, ${TechnicalAssetTechnology.WAF}, or ${TechnicalAssetTechnology.Gateway} components.`,
    modelFailurePossibleReason: false,
    cwe: 501, // Trust Boundary Violation
};

// Export the Category function
export function Category(): RiskCategory {
    return UnguardedAccessFromInternetCategory;
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

    // Define technologies exempted under specific conditions (no custom code, specific protocols)
    const conditionallyExemptedTech = [
        TechnicalAssetTechnology.WebServer,
        TechnicalAssetTechnology.WebApplication,
        TechnicalAssetTechnology.ReverseProxy,
        TechnicalAssetTechnology.WAF,
        TechnicalAssetTechnology.Gateway,
    ];

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id]; // The potential target

        // Basic checks: In scope and not a Load Balancer
        if (!technicalAsset || technicalAsset.outOfScope || technicalAsset.technology === TechnicalAssetTechnology.LoadBalancer) {
            continue;
        }

        // Check sensitivity threshold
        const isSensitiveTarget =
            technicalAsset.confidentiality >= Confidentiality.Confidential ||
            technicalAsset.integrity >= Criticality.Critical; // Use direct fields as per Go

        if (!isSensitiveTarget) {
            continue; // Target not sensitive enough for this risk
        }

        // Check incoming links
        const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        // Sort links for consistent risk generation if multiple internet sources exist (though loop breaks)
        commLinks.sort((a, b) => a.id.localeCompare(b.id));

        for (const incomingAccess of commLinks) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingAccess.sourceId];

            // Check if source is from the Internet
            if (!sourceAsset || !sourceAsset.internet) {
                continue; // Source not from internet
            }

            // Check for exemptions based on source or link properties
            if (sourceAsset.technology === TechnicalAssetTechnology.Monitoring || incomingAccess.vpn) {
                continue; // Exempt monitoring or VPN access
            }

             // Check for conditional exemptions (specific tech + no custom code + specific protocols)
            if (!technicalAsset.customDevelopedParts && conditionallyExemptedTech.includes(technicalAsset.technology)) {
                const isHttp = incomingAccess.protocol === Protocol.HTTP || incomingAccess.protocol === Protocol.HTTPS;
                 const isFtp = technicalAsset.technology === TechnicalAssetTechnology.Gateway &&
                              (incomingAccess.protocol === Protocol.FTP || incomingAccess.protocol === Protocol.FTPS || incomingAccess.protocol === Protocol.SFTP);
                 if (isHttp || isFtp) {
                    continue; // Exempt this specific combination
                 }
            }

            // If we reach here, it's an unguarded access from the internet to a sensitive asset
            const highRiskTarget =
                technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
                technicalAsset.integrity === Criticality.MissionCritical; // Use direct fields

            risks.push(createRisk(technicalAsset, incomingAccess, sourceAsset, highRiskTarget));
            // Found an unguarded access from internet, add risk and move to next target asset
            break;

        } // End inner loop (incoming links)
    } // End outer loop (target assets)
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    targetAsset: TechnicalAsset,
    dataFlow: CommunicationLink,
    clientFromInternet: TechnicalAsset,
    moreRisky: boolean // Based on target sensitivity
    ): Risk
{
    const category = Category();
    // Impact is Low, elevated to Medium if target is highly sensitive OR has high RAA
    let impact = RiskExploitationImpact.Low;
    if (moreRisky || targetAsset.raa > 40) {
        impact = RiskExploitationImpact.Medium;
    }

    // Likelihood is VeryLikely as internet exposure is direct
    const likelihood = RiskExploitationLikelihood.VeryLikely;

    const title = `<b>Unguarded Access from Internet</b> of <b>${targetAsset.title}</b> by <b>${clientFromInternet.title}</b> via <b>${dataFlow.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${targetAsset.id}@${clientFromInternet.id}@${dataFlow.id}`, // Synthetic ID includes target, source, and link
        DataBreachProbability.Possible, // Direct access increases possibility of breach
        [targetAsset.id], // The exposed target asset is the breach point
        undefined,
        targetAsset.id, // Most relevant asset is the one exposed
        undefined,
        undefined,
        dataFlow.id // Most relevant link is the one from the internet
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
