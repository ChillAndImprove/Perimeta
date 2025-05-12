// File: risks/built-in/missing-identity-propagation.ts

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
    Availability,
    Authentication,
    Authorization, // Import Authorization enum
    TechnicalAssetType,
    Usage,
    isTechnologyUsuallyProcessingEnduserRequests, // Helper
    isTechnologyUsuallyAbleToPropagateIdentityToOutgoingTargets, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingIdentityPropagationCategory: RiskCategory = {
    id: "missing-identity-propagation",
    title: "Missing Identity Propagation",
    description: "Technical assets (especially multi-tenant systems), which usually process data for endusers should " +
        "authorize every request based on the identity of the enduser when the data flow is authenticated (i.e. non-public). " +
        "For DevOps usages at least a technical-user authorization is required.",
    impact: "If this risk remains unmitigated, attackers might be able to access or modify foreign data after a successful compromise of a component within " +
        "the system due to missing resource-based authorization checks.",
    asvs: "V4 - Access Control Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html",
    action: "Identity Propagation and Resource-based Authorization",
    mitigation: "When processing requests for endusers if possible authorize in the backend against the propagated " +
        "identity of the enduser. This can be achieved in passing JWTs or similar tokens and checking them in the backend " +
        "services. For DevOps usages apply at least a technical-user authorization.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.ElevationOfPrivilege,
    detectionLogic: "In-scope service-like technical assets which usually process data based on enduser requests, if authenticated " +
        "(i.e. non-public), should authorize incoming requests based on the propagated enduser identity when their rating is sensitive. " +
        "This is especially the case for all multi-tenant assets (there even less-sensitive rated ones). " +
        "DevOps usages are exempted from this risk.",
    riskAssessment: "The risk rating (medium or high) " + // Note: createRisk logic uses Low/Medium, might need adjustment if High is intended
        "depends on the confidentiality, integrity, and availability rating of the technical asset.",
    falsePositives: "Technical assets which do not process requests regarding functionality or data linked to end-users (customers) " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 284, // Improper Access Control
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingIdentityPropagationCategory;
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

        // Check if asset is relevant (in scope, processes end user requests)
        if (!technicalAsset || technicalAsset.outOfScope || !isTechnologyUsuallyProcessingEnduserRequests(technicalAsset.technology)) {
            continue;
        }

        // Check if asset meets sensitivity threshold OR is multi-tenant with lower threshold
        const isSensitive =
            technicalAsset.confidentiality >= Confidentiality.Confidential ||
            technicalAsset.integrity >= Criticality.Critical ||
            technicalAsset.availability >= Criticality.Critical; // Use direct fields as per Go code

        const isMultiTenantSensitive = technicalAsset.multiTenant && (
            technicalAsset.confidentiality >= Confidentiality.Restricted ||
            technicalAsset.integrity >= Criticality.Important ||
            technicalAsset.availability >= Criticality.Important // Use direct fields
        );

        if (isSensitive || isMultiTenantSensitive) {
            // Check each incoming communication link
            const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
            for (const commLink of commLinks) {
                const caller = modelState.parsedModelRoot.technicalAssets[commLink.sourceId];

                // Skip if caller doesn't exist, can't propagate identity, or is a datastore
                if (!caller || !isTechnologyUsuallyAbleToPropagateIdentityToOutgoingTargets(caller.technology) || caller.type === TechnicalAssetType.Datastore) {
                    continue;
                }

                // Check if link is authenticated but lacks end-user identity propagation
                if (commLink.authentication !== Authentication.None &&
                    commLink.authorization !== Authorization.EnduserIdentityPropagation)
                {
                    // Special handling for DevOps: Allow if *any* authorization (like TechnicalUser) is present
                    if (commLink.usage === Usage.DevOps && commLink.authorization !== Authorization.None) {
                        continue; // Skip DevOps link if it has at least TechnicalUser authZ
                    }

                    // Determine if the target asset's sensitivity warrants higher impact
                    const highRiskTarget =
                        technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
                        technicalAsset.integrity === Criticality.MissionCritical ||
                        technicalAsset.availability === Criticality.MissionCritical; // Use direct fields

                    risks.push(createRisk(technicalAsset, commLink, highRiskTarget));
                }
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, incomingAccess: CommunicationLink, moreRisky: boolean): Risk {
    const category = Category();
    const caller = modelState.parsedModelRoot?.technicalAssets[incomingAccess.sourceId];
    const callerTitle = caller ? caller.title : incomingAccess.sourceId;

    // Impact is Low, elevated to Medium if the target asset is highly sensitive
    const impact = moreRisky ? RiskExploitationImpact.Medium : RiskExploitationImpact.Low;

    const title = `<b>Missing Enduser Identity Propagation</b> over communication link <b>${incomingAccess.title}</b> ` +
                  `from <b>${callerTitle}</b> ` +
                  `to <b>${technicalAsset.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely as it requires prior compromise
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${incomingAccess.id}@${caller?.id || incomingAccess.sourceId}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Improbable, // Focus is on action/EoP, not direct data breach by missing propagation itself
        [technicalAsset.id], // The asset making decisions without the correct identity is affected
        undefined,
        technicalAsset.id, // Most relevant asset is the one missing the identity check
        undefined,
        undefined,
        incomingAccess.id // Most relevant link is the one lacking propagation
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
