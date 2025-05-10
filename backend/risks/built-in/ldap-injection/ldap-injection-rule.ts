// File: risks/built-in/ldap-injection.ts

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
    Protocol,
    Usage,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const LdapInjectionCategory: RiskCategory = {
    id: "ldap-injection",
    title: "LDAP-Injection",
    description: "When an LDAP server is accessed LDAP-Injection risks might arise. " +
        "The risk rating depends on the sensitivity of the LDAP server itself and of the data assets processed or stored.",
    impact: "If this risk remains unmitigated, attackers might be able to modify LDAP queries and access more data from the LDAP server than allowed.",
    asvs: "V5 - Validation, Sanitization and Encoding Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html",
    action: "LDAP-Injection Prevention",
    mitigation: "Try to use libraries that properly encode LDAP meta characters in searches and queries to access " +
        "the LDAP sever in order to stay safe from LDAP-Injection vulnerabilities. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Tampering, // Injection attacks fundamentally tamper with query logic
    detectionLogic: "In-scope clients accessing LDAP servers via typical LDAP access protocols.",
    riskAssessment: "The risk rating depends on the sensitivity of the LDAP server itself and of the data assets processed or stored.",
    falsePositives: "LDAP server queries by search values not consisting of parts controllable by the caller can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 90,
};

// Export the Category function
export function Category(): RiskCategory {
    return LdapInjectionCategory;
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

    // Iterate through all assets to find potential LDAP servers (targets)
    for (const targetAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
        // Although any asset *could* be an LDAP server, the risk arises from the *callers* making LDAP requests.
        // We iterate through incoming flows to find LDAP protocol usage.
        const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[targetAsset.id] || [];

        for (const incomingFlow of incomingFlows) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingFlow.sourceId];

            // Check if the caller (source) is in scope and the protocol is LDAP/LDAPS
            if (sourceAsset && !sourceAsset.outOfScope &&
                (incomingFlow.protocol === Protocol.LDAP || incomingFlow.protocol === Protocol.LDAPS))
            {
                // Determine likelihood based on usage
                const likelihood = incomingFlow.usage === Usage.DevOps
                    ? RiskExploitationLikelihood.Unlikely // DevOps usage might be less risky/exposed
                    : RiskExploitationLikelihood.Likely;   // Business usage is more likely target

                // Pass the targetAsset (potential LDAP server) and the incomingFlow
                risks.push(createRisk(targetAsset, incomingFlow, likelihood));
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    ldapServerAsset: TechnicalAsset, // The asset being called via LDAP protocol
    incomingFlow: CommunicationLink, // The communication link using LDAP
    likelihood: RiskExploitationLikelihood): Risk
{
    const category = Category();
    const callerAsset = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];

    if (!callerAsset) {
        // Should not happen if GenerateRisks checks sourceAsset existence, but good practice
        throw new Error(`Caller asset ${incomingFlow.sourceId} not found for risk generation.`);
    }

    const title = `<b>LDAP-Injection</b> risk at <b>${callerAsset.title}</b> against LDAP server <b>${ldapServerAsset.title}</b> via <b>${incomingFlow.title}</b>`;

    // Determine impact based on the sensitivity of the LDAP server asset
    let impact = RiskExploitationImpact.Medium;
    const criticalConf = ldapServerAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = ldapServerAsset.getHighestIntegrity() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.High;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${callerAsset.id}@${ldapServerAsset.id}@${incomingFlow.id}`, // Synthetic ID includes caller, target, and link
        DataBreachProbability.Probable, // LDAP injection often leads to reading sensitive data
        [ldapServerAsset.id], // The LDAP server is the primary point of data breach
        undefined,
        callerAsset.id, // Most relevant asset is the one performing the potentially injectable query
        undefined,
        undefined,
        incomingFlow.id // Most relevant link is the one carrying the LDAP query
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
