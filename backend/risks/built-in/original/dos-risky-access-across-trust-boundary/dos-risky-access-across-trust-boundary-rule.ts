// File: risks/built-in/dos-risky-access-across-trust-boundary.ts

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
    TechnicalAssetTechnology,
    RiskSeverity, // Used in description text
    isProtocolProcessLocal, // Helper function
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const DoSRiskyAccessAcrossTrustBoundaryCategory: RiskCategory = {
    id: "dos-risky-access-across-trust-boundary",
    title: "DoS-risky Access Across Trust-Boundary",
    description: "Assets accessed across trust boundaries with critical or mission-critical availability rating " +
        "are more prone to Denial-of-Service (DoS) risks.",
    impact: "If this risk remains unmitigated, attackers might be able to disturb the availability of important parts of the system.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html",
    action: "Anti-DoS Measures",
    mitigation: "Apply anti-DoS techniques like throttling and/or per-client load blocking with quotas. " +
        "Also for maintenance access routes consider applying a VPN instead of public reachable interfaces. " +
        "Generally applying redundancy on the targeted technical asset reduces the risk of DoS.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.DenialOfService,
    detectionLogic: `In-scope technical assets (excluding ${TechnicalAssetTechnology.LoadBalancer}) with ` + // Use enum string directly
        `availability rating of ${Criticality.Critical} or higher which have incoming data-flows across a ` +
        `network trust-boundary (excluding ${Usage.DevOps} usage).`,
    riskAssessment: `Matching technical assets with availability rating ` +
        `of ${Criticality.Critical} or higher are ` +
        `at ${RiskSeverity.Low} risk. When the availability rating is ` +
        `${Criticality.MissionCritical} and neither a VPN nor IP filter for the incoming data-flow nor redundancy ` +
        `for the asset is applied, the risk-rating is considered ${RiskSeverity.Medium}.`, 
    falsePositives: "When the accessed target operations are not time- or resource-consuming.",
    modelFailurePossibleReason: false,
    cwe: 400,
};

// Export the Category function
export function Category(): RiskCategory {
    return DoSRiskyAccessAcrossTrustBoundaryCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    let risks: Risk[] = []; // Use let as the array reference might change in checkRisk
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No assets, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is relevant (in scope, not LB, high availability)
        if (
            technicalAsset &&
            !technicalAsset.outOfScope &&
            technicalAsset.technology !== TechnicalAssetTechnology.LoadBalancer &&
            technicalAsset.availability >= Criticality.Critical // String comparison works if ordered correctly
        ) {
            const incomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
            for (const incomingAccess of incomingLinks) {
                const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingAccess.sourceId];

                if (!sourceAsset) {
                    console.warn(`Source asset ${incomingAccess.sourceId} for link ${incomingAccess.id} not found.`);
                    continue; // Skip if source asset doesn't exist
                }

                // Check if source is a forwarding asset (like LB, ReverseProxy, WAF)
                if (sourceAsset.technology === TechnicalAssetTechnology.LoadBalancer ||
                    sourceAsset.technology === TechnicalAssetTechnology.ReverseProxy ||
                    sourceAsset.technology === TechnicalAssetTechnology.WAF) // Assuming these are the forwarders
                {
                    // Look one hop further back
                    const callersCommLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[sourceAsset.id] || [];
                    for (const callersCommLink of callersCommLinks) {
                         // Pass the intermediate asset's title as hopBetween
                        risks = checkRisk(technicalAsset, callersCommLink, sourceAsset.title, risks);
                    }
                } else {
                    // Direct connection, no hopBetween
                    risks = checkRisk(technicalAsset, incomingAccess, "", risks);
                }
            }
        }
    }
    return risks;
}

// Helper function to check conditions and potentially add a risk
function checkRisk(
    technicalAsset: TechnicalAsset,
    incomingAccess: CommunicationLink,
    hopBetween: string,
    currentRisks: Risk[]): Risk[]
{
    // Check conditions: across network boundary, not process local, not DevOps usage
    if (
        incomingAccess.isAcrossTrustBoundaryNetworkOnly() && // Use the helper method
        !isProtocolProcessLocal(incomingAccess.protocol) && // Use the helper method
        incomingAccess.usage !== Usage.DevOps
    ) {
        // Determine if it's a high-risk scenario
        const highRisk =
            technicalAsset.availability === Criticality.MissionCritical &&
            !incomingAccess.vpn &&
            !incomingAccess.ipFiltered && // Renamed property from Go
            !technicalAsset.redundant;

        const sourceAsset = modelState.parsedModelRoot?.technicalAssets[incomingAccess.sourceId];
        if (sourceAsset) { // Ensure source asset exists before creating risk
             currentRisks.push(createRisk(technicalAsset, incomingAccess, hopBetween, sourceAsset, highRisk));
        } else {
             console.warn(`Source asset ${incomingAccess.sourceId} for link ${incomingAccess.id} not found during risk creation.`);
        }
    }
    return currentRisks; // Return the (potentially updated) array
}


// Helper function to create a Risk instance
function createRisk(
    techAsset: TechnicalAsset,
    dataFlow: CommunicationLink,
    hopBetween: string,
    clientOutsideTrustBoundary: TechnicalAsset, // The original caller
    moreRisky: boolean): Risk
{
    const category = Category();
    const impact = moreRisky ? RiskExploitationImpact.Medium : RiskExploitationImpact.Low;
    const hopBetweenStr = hopBetween ? ` forwarded via <b>${hopBetween}</b>` : '';

    const title = `<b>Denial-of-Service</b> risky access of <b>${techAsset.title}</b> by <b>${clientOutsideTrustBoundary.title}</b> via <b>${dataFlow.title}</b>${hopBetweenStr}`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${techAsset.id}@${clientOutsideTrustBoundary.id}@${dataFlow.id}`, // Synthetic ID includes target, caller, and link
        DataBreachProbability.Improbable, // DoS doesn't typically lead to data breach directly
        [], // No specific assets breached directly by DoS risk itself
        undefined,
        techAsset.id, // Most relevant asset is the one potentially DoS'd
        undefined,
        undefined,
        dataFlow.id // Most relevant link is the one carrying the potentially overwhelming traffic
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
