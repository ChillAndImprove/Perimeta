// File: risks/built-in/missing-authentication-second-factor.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    CommunicationLink,
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    CalculateSeverity, // Although RiskAssessment is fixed, CalculateSeverity is used by CreateRisk
    Confidentiality,
    Criticality,
    Authentication,
    TechnicalAssetTechnology,
    TechnicalAssetType,
    RiskSeverity, // Used in description/RiskAssessment
    isTechnologyTrafficForwarding, // Helper
    isTechnologyUnprotectedCommsTolerated, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Import the generic CreateRisk function from the missing-authentication rule
import { CreateRisk } from '../missing-authentication/missing-authentication-rule.ts';

// Define the Category structure adhering to the RiskCategory interface
export const MissingAuthenticationSecondFactorCategory: RiskCategory = {
    id: "missing-authentication-second-factor",
    title: "Missing Two-Factor Authentication (2FA)",
    description: "Technical assets (especially multi-tenant systems) should authenticate incoming requests with " +
        "two-factor (2FA) authentication when the asset processes or stores highly sensitive data (in terms of confidentiality, integrity, and availability) and is accessed by humans.",
    impact: "If this risk is unmitigated, attackers might be able to access or modify highly sensitive data without strong authentication.",
    asvs: "V2 - Authentication Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html",
    action: "Authentication with Second Factor (2FA)",
    mitigation: "Apply an authentication method to the technical asset protecting highly sensitive data via " +
        "two-factor authentication for human users.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.BusinessSide, // Responsibility lies often with business to require 2FA for sensitive ops
    stride: STRIDE.ElevationOfPrivilege,
    detectionLogic: `In-scope technical assets (except ${TechnicalAssetTechnology.LoadBalancer}, ${TechnicalAssetTechnology.ReverseProxy}, ${TechnicalAssetTechnology.WAF}, ${TechnicalAssetTechnology.IDS}, and ${TechnicalAssetTechnology.IPS}) should authenticate incoming requests via two-factor authentication (2FA) ` +
        `when the asset processes or stores highly sensitive data (in terms of confidentiality, integrity, and availability) and is accessed by a client used by a human user.`,
    riskAssessment: RiskSeverity.Medium, // Fixed Medium severity for missing 2FA on sensitive assets accessed by humans
    falsePositives: "Technical assets which do not process requests regarding functionality or data linked to end-users (customers) " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 308, // Use of Single-factor Authentication
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingAuthenticationSecondFactorCategory;
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

        // Check if asset is relevant (in scope, not exempted forwarding/monitoring tech)
        if (!technicalAsset || technicalAsset.outOfScope ||
            isTechnologyTrafficForwarding(technicalAsset.technology) ||
            isTechnologyUnprotectedCommsTolerated(technicalAsset.technology))
        {
            continue;
        }

        // Check if asset handles sensitive data OR is multi-tenant (requires stronger authN)
        const handlesSensitiveData =
            technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
            technicalAsset.getHighestIntegrity() >= Criticality.Critical ||
            technicalAsset.getHighestAvailability() >= Criticality.Critical;

        if (handlesSensitiveData || technicalAsset.multiTenant) {
            // Check each incoming communication link
            const commLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
            for (const commLink of commLinks) {
                const caller = modelState.parsedModelRoot.technicalAssets[commLink.sourceId];

                // Skip if caller doesn't exist or is exempted
                if (!caller || isTechnologyUnprotectedCommsTolerated(caller.technology) || caller.type === TechnicalAssetType.Datastore) {
                    continue;
                }

                // --- Logic to find the original human user client ---
                if (caller.usedAsClientByHuman) {
                    // Direct access from human client
                    // Check sensitivity of the direct link and if 2FA is missing
                     const requires2FA = commLink.getHighestConfidentiality() >= Confidentiality.Confidential ||
                                        commLink.getHighestIntegrity() >= Criticality.Critical;

                     if (requires2FA && commLink.authentication !== Authentication.TwoFactor) {
                          risks.push(CreateRisk(
                              technicalAsset,
                              commLink,       // The link missing 2FA
                              commLink,       // Origin is the same link
                              "",             // No hop
                              RiskExploitationImpact.Medium, // Impact fixed at Medium for missing 2FA on sensitive
                              RiskExploitationLikelihood.Unlikely, // Exploiting missing 2FA is harder than missing all authN
                              true,           // Indicate this is a 2FA risk
                              Category()      // Pass this rule's category
                          ));
                     }
                } else if (isTechnologyTrafficForwarding(caller.technology)) {
                    // Access via a forwarding asset, check one hop further back
                    const callersCommLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[caller.id] || [];
                    for (const callersCommLink of callersCommLinks) {
                        const callersCaller = modelState.parsedModelRoot.technicalAssets[callersCommLink.sourceId];

                        // Skip if original caller doesn't exist or is exempted
                        if (!callersCaller || isTechnologyUnprotectedCommsTolerated(callersCaller.technology) || callersCaller.type === TechnicalAssetType.Datastore) {
                            continue;
                        }

                        // Check if the *original* caller is human
                        if (callersCaller.usedAsClientByHuman) {
                             // Check sensitivity of the *original* link and if 2FA is missing on it
                            const requires2FA = callersCommLink.getHighestConfidentiality() >= Confidentiality.Confidential ||
                                               callersCommLink.getHighestIntegrity() >= Criticality.Critical;

                            // IMPORTANT: Check 2FA on the ORIGINAL link, not the link to the forwarder
                            if (requires2FA && callersCommLink.authentication !== Authentication.TwoFactor) {
                                risks.push(CreateRisk(
                                    technicalAsset,
                                    commLink,       // The link hitting the target asset
                                    callersCommLink,// The original link from the human
                                    caller.title,   // The intermediate asset
                                    RiskExploitationImpact.Medium, // Impact fixed
                                    RiskExploitationLikelihood.Unlikely, // Likelihood fixed
                                    true,           // Indicate 2FA risk
                                    Category()      // Pass this rule's category
                                ));
                                // Optimization: If we found a human caller via this hop, no need to check other links to the *same* forwarder
                                // break; // Uncomment if only one risk per target->forwarder path is desired
                           }
                        }
                    } // End loop through caller's caller links
                } // End check for forwarding caller
            } // End loop through direct incoming links
        } // End check for sensitive asset / multi-tenant
    } // End loop through all assets
    return risks;
}


// !!! ADD THIS EXPORT BLOCK AT THE END !!!
// Import the interface used in the export block
import { CustomRiskRule } from '../../../model/types.ts'; // Adjust path if needed!

export const Rule: CustomRiskRule = {
    category: Category,         // Assumes Category function exists in the file
    supportedTags: SupportedTags, // Assumes SupportedTags function exists in the file
    generateRisks: GenerateRisks, // Assumes GenerateRisks function exists in the file
};
