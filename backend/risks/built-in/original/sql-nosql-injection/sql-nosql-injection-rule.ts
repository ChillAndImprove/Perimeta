// File: risks/built-in/sql-nosql-injection.ts

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
    Usage,
    isPotentialDatabaseAccessProtocol, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const SqlNosqlInjectionCategory: RiskCategory = {
    id: "sql-nosql-injection",
    title: "SQL/NoSQL-Injection",
    description: "When a database is accessed via database access protocols SQL/NoSQL-Injection risks might arise. " +
        "The risk rating depends on the sensitivity technical asset itself and of the data assets processed or stored.",
    impact: "If this risk is unmitigated, attackers might be able to modify SQL/NoSQL queries to steal and modify data and eventually further escalate towards a deeper system penetration via code executions.",
    asvs: "V5 - Validation, Sanitization and Encoding Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
    action: "SQL/NoSQL-Injection Prevention",
    mitigation: "Try to use parameter binding to be safe from injection vulnerabilities. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Tampering, // Injection tampers with query logic
    detectionLogic: "Database accessed via typical database access protocols by in-scope clients.",
    riskAssessment: "The risk rating depends on the sensitivity of the data stored inside the database.",
    falsePositives: "Database accesses by queries not consisting of parts controllable by the caller can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 89, // Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')
};

// Export the Category function
export function Category(): RiskCategory {
    return SqlNosqlInjectionCategory;
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
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id]; // This is the potential target DB
        if (!technicalAsset) continue;

        // Check incoming flows to this potential target
        const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingFlow of incomingFlows) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingFlow.sourceId];

            // Skip if caller is out of scope
            if (!sourceAsset || sourceAsset.outOfScope) {
                continue;
            }

            // Check if the protocol indicates DB access AND the target is a DB type,
            // OR if the protocol is strictly a DB protocol (regardless of target type modeled)
            const isPotentialDbAccess = isPotentialDatabaseAccessProtocol(incomingFlow.protocol, true); // Use includingLaxProtocols = true
            const isTargetDbType = technicalAsset.technology === TechnicalAssetTechnology.Database ||
                                  technicalAsset.technology === TechnicalAssetTechnology.IdentityStoreDatabase;
            const isStrictlyDbProtocol = isPotentialDatabaseAccessProtocol(incomingFlow.protocol, false); // Use includingLaxProtocols = false

            if ((isPotentialDbAccess && isTargetDbType) || isStrictlyDbProtocol) {
                risks.push(createRisk(technicalAsset, incomingFlow));
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    databaseAsset: TechnicalAsset, // The asset being accessed (potential DB)
    incomingFlow: CommunicationLink // The communication link carrying the query
    ): Risk
{
    const category = Category();
    const callerAsset = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];

    if (!callerAsset) {
        // Should not happen if GenerateRisks checks sourceAsset existence
        throw new Error(`Caller asset ${incomingFlow.sourceId} not found for risk generation.`);
    }

    const title = `<b>SQL/NoSQL-Injection</b> risk at <b>${callerAsset.title}</b> against database <b>${databaseAsset.title}</b> via <b>${incomingFlow.title}</b>`;

    // Determine impact based on the sensitivity of the database asset being accessed
    let impact = RiskExploitationImpact.Medium; // Default impact
    const criticalConf = databaseAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = databaseAsset.getHighestIntegrity() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.High;
    }

    // Determine likelihood based on usage
    const likelihood = incomingFlow.usage === Usage.DevOps
        ? RiskExploitationLikelihood.Likely
        : RiskExploitationLikelihood.VeryLikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${callerAsset.id}@${databaseAsset.id}@${incomingFlow.id}`, // Synthetic ID includes caller, target, and link
        DataBreachProbability.Probable, // Injection likely allows reading/modifying data
        [databaseAsset.id], // The database being queried is the source of the breach
        undefined,
        callerAsset.id, // Most relevant asset is the one performing the potentially injectable query
        undefined,
        undefined,
        incomingFlow.id // Most relevant link is the one carrying the query
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
