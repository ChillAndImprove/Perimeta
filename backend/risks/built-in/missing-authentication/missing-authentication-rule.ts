// File: risks/built-in/missing-authentication.ts

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
    Availability, // Import Availability if needed for checks, though current logic uses getHighestAvailability
    Authentication,
    TechnicalAssetTechnology,
    TechnicalAssetType,
    isProtocolProcessLocal, // Helper
    isTechnologyUnprotectedCommsTolerated, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingAuthenticationCategory: RiskCategory = {
    id: "missing-authentication",
    title: "Missing Authentication",
    description: "Technical assets (especially multi-tenant systems) should authenticate incoming requests when the asset processes or stores sensitive data. ",
    impact: "If this risk is unmitigated, attackers might be able to access or modify sensitive data in an unauthenticated way.",
    asvs: "V2 - Authentication Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
    action: "Authentication of Incoming Requests",
    mitigation: "Apply an authentication method to the technical asset. To protect highly sensitive data consider " +
        "the use of two-factor authentication for human users.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege, // Can also be Spoofing, but EoP fits better for bypassing authN
    detectionLogic: `In-scope technical assets (except ${TechnicalAssetTechnology.LoadBalancer}, ${TechnicalAssetTechnology.ReverseProxy}, ${TechnicalAssetTechnology.ServiceRegistry}, ${TechnicalAssetTechnology.WAF}, ${TechnicalAssetTechnology.IDS}, and ${TechnicalAssetTechnology.IPS} and in-process calls) should authenticate incoming requests when the asset processes or stores ` +
        `sensitive data. This is especially the case for all multi-tenant assets (there even non-sensitive ones).`,
    riskAssessment: "The risk rating (medium or high) " +
        "depends on the sensitivity of the data sent across the communication link. Monitoring callers are exempted from this risk.",
    falsePositives: "Technical assets which do not process requests regarding functionality or data linked to end-users (customers) " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 306, // Missing Authentication for Critical Function
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingAuthenticationCategory;
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

    // Define exempted technologies
    const exemptedTechnologies = [
        TechnicalAssetTechnology.LoadBalancer,
        TechnicalAssetTechnology.ReverseProxy,
        TechnicalAssetTechnology.ServiceRegistry,
        TechnicalAssetTechnology.WAF,
        TechnicalAssetTechnology.IDS,
        TechnicalAssetTechnology.IPS
    ];

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is relevant (in scope, not exempted tech)
        if (!technicalAsset || technicalAsset.outOfScope || exemptedTechnologies.includes(technicalAsset.technology)) {
            continue;
        }

        // Check if asset handles sensitive data OR is multi-tenant
        const handlesSensitiveData =
            technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
            technicalAsset.getHighestIntegrity() >= Criticality.Critical ||
            technicalAsset.getHighestAvailability() >= Criticality.Critical; // Original Go code uses direct field, helper is safer

        if (handlesSensitiveData || technicalAsset.multiTenant) {
            // Check each incoming communication link
            const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
            for (const commLink of commLinks) {
                const caller = modelState.parsedModelRoot.technicalAssets[commLink.sourceId];

                // Skip if caller doesn't exist or is exempted (e.g., monitoring, datastore)
                if (!caller || isTechnologyUnprotectedCommsTolerated(caller.technology) || caller.type === TechnicalAssetType.Datastore) {
                    continue;
                }

                // Skip if link is process-local
                if (isProtocolProcessLocal(commLink.protocol)) {
                    continue;
                }

                // Check if authentication is missing
                if (commLink.authentication === Authentication.None) {
                     // Determine impact based on link sensitivity
                    const highRisk = commLink.getHighestConfidentiality() === Confidentiality.StrictlyConfidential ||
                                     commLink.getHighestIntegrity() === Criticality.MissionCritical;
                    const lowRisk = commLink.getHighestConfidentiality() <= Confidentiality.Internal &&
                                    commLink.getHighestIntegrity() <= Criticality.Operational; // Adjusted slightly for clarity <=

                    let impact = RiskExploitationImpact.Medium;
                    if (highRisk) {
                        impact = RiskExploitationImpact.High;
                    } else if (lowRisk) {
                        impact = RiskExploitationImpact.Low;
                    }

                    // Use the generic CreateRisk function (defined below, similar to Go)
                    // Note: This rule specifically checks for *any* authN missing, not specifically 2FA.
                    // The CreateRisk function has a 'twoFactor' flag which is set to false here.
                    risks.push(CreateRisk(technicalAsset, commLink, commLink, "", impact, RiskExploitationLikelihood.Likely, false, Category()));
                }
            }
        }
    }
    return risks;
}


// Generic Risk Creation Function (similar structure to Go)
// Can be reused by other rules like missing-authentication-second-factor
export function CreateRisk(
    technicalAsset: TechnicalAsset,
    incomingAccess: CommunicationLink,         // The specific link missing authentication
    incomingAccessOrigin: CommunicationLink,   // The original link where the request initiated (might be same as incomingAccess)
    hopBetween: string,                        // Name of intermediate asset if forwarded
    impact: RiskExploitationImpact,
    likelihood: RiskExploitationLikelihood,
    twoFactor: boolean,                        // Flag if this risk is specifically about missing 2FA
    category: RiskCategory                     // Pass the specific category (Missing AuthN or Missing 2FA)
    ): Risk
{
    const factorString = twoFactor ? "Two-Factor " : "";
    const hopBetweenStr = hopBetween ? `forwarded via <b>${hopBetween}</b> ` : '';
    const sourceAsset = modelState.parsedModelRoot?.technicalAssets[incomingAccessOrigin.sourceId];
    const sourceTitle = sourceAsset ? sourceAsset.title : incomingAccessOrigin.sourceId;

    const title = `<b>Missing ${factorString}Authentication</b> covering communication link <b>${incomingAccess.title}</b> ` +
                  `from <b>${sourceTitle}</b> ${hopBetweenStr}` +
                  `to <b>${technicalAsset.title}</b>`;

    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${incomingAccess.id}@${sourceAsset?.id || incomingAccessOrigin.sourceId}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Possible, // Unauthorized access can lead to data breach
        [technicalAsset.id], // The asset being accessed without authN is the breach point
        undefined,
        technicalAsset.id, // The asset missing authentication is most relevant
        undefined,
        undefined,
        incomingAccess.id // The link lacking authentication is most relevant
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
