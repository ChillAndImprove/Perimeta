// File: risks/built-in/search-query-injection.ts

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
    Usage,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const SearchQueryInjectionCategory: RiskCategory = {
    id: "search-query-injection",
    title: "Search-Query Injection",
    description: "When a search engine server is accessed Search-Query Injection risks might arise." +
        "<br><br>See for example <a href=\"https://github.com/veracode-research/solr-injection\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/veracode-research/solr-injection</a> and " +
        "<a href=\"https://github.com/veracode-research/solr-injection/blob/master/slides/DEFCON-27-Michael-Stepankin-Apache-Solr-Injection.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/veracode-research/solr-injection/blob/master/slides/DEFCON-27-Michael-Stepankin-Apache-Solr-Injection.pdf</a> " +
        "for more details (here related to Solr, but in general showcasing the topic of search query injections).",
    impact: "If this risk remains unmitigated, attackers might be able to read more data from the search index and " +
        "eventually further escalate towards a deeper system penetration via code executions.",
    asvs: "V5 - Validation, Sanitization and Encoding Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html",
    action: "Search-Query Injection Prevention",
    mitigation: "Try to use libraries that properly encode search query meta characters in searches and don't expose the " +
        "query unfiltered to the caller. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Tampering, // Injection attacks tamper with query logic
    detectionLogic: "In-scope clients accessing search engine servers via typical search access protocols.",
    riskAssessment: "The risk rating depends on the sensitivity of the search engine server itself and of the data assets processed or stored.",
    falsePositives: "Server engine queries by search values not consisting of parts controllable by the caller can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 74, // Improper Neutralization of Special Elements in Output Used ('Injection')
};

// Export the Category function
export function Category(): RiskCategory {
    return SearchQueryInjectionCategory;
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

    // Define relevant target technologies
    const targetTechnologies = [
        TechnicalAssetTechnology.SearchEngine,
        TechnicalAssetTechnology.SearchIndex
    ];

    // Define relevant access protocols
    const relevantProtocols = [
        Protocol.HTTP,
        Protocol.HTTPS,
        Protocol.BINARY,
        Protocol.BINARYEncrypted // Assuming binary protocols might carry search queries
    ];

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is a relevant target
        if (!technicalAsset || !targetTechnologies.includes(technicalAsset.technology)) {
            continue;
        }

        // Check incoming flows
        const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingFlow of incomingFlows) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingFlow.sourceId];

            // Skip if caller is out of scope or protocol is not relevant
            if (!sourceAsset || sourceAsset.outOfScope || !relevantProtocols.includes(incomingFlow.protocol)) {
                continue;
            }

            // Determine likelihood based on usage
            const likelihood = incomingFlow.usage === Usage.DevOps
                ? RiskExploitationLikelihood.Likely
                : RiskExploitationLikelihood.VeryLikely; // Business usage implies higher likelihood

            risks.push(createRisk(technicalAsset, incomingFlow, likelihood));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    searchAsset: TechnicalAsset, // The asset being queried (SearchEngine/SearchIndex)
    incomingFlow: CommunicationLink, // The communication link carrying the query
    likelihood: RiskExploitationLikelihood): Risk
{
    const category = Category();
    const callerAsset = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];

    if (!callerAsset) {
        // Should not happen if GenerateRisks checks sourceAsset existence
        throw new Error(`Caller asset ${incomingFlow.sourceId} not found for risk generation.`);
    }

    const title = `<b>Search Query Injection</b> risk at <b>${callerAsset.title}</b> against search engine server <b>${searchAsset.title}</b> via <b>${incomingFlow.title}</b>`;

    // Determine impact based on the sensitivity of the search asset being accessed
    let impact = RiskExploitationImpact.Medium; // Default impact
    const criticalConf = searchAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = searchAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const lowConf = searchAsset.getHighestConfidentiality() <= Confidentiality.Internal;
    const lowInteg = searchAsset.getHighestIntegrity() <= Criticality.Operational; // Adjusted <= as per Go

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.High;
    } else if (lowConf && lowInteg) { // Check for low sensitivity case
        impact = RiskExploitationImpact.Low;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${callerAsset.id}@${searchAsset.id}@${incomingFlow.id}`, // Synthetic ID includes caller, target, and link
        DataBreachProbability.Probable, // Injection likely allows reading unauthorized data
        [searchAsset.id], // The search asset being queried is the source of the breach
        undefined,
        callerAsset.id, // Most relevant asset is the one performing the potentially injectable query
        undefined,
        undefined,
        incomingFlow.id // Most relevant link is the one carrying the search query
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
