// File: risks/built-in/service-registry-poisoning.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    CommunicationLink, // Import if needed by helper functions (getHighest...)
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    Availability,
    TechnicalAssetTechnology,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const ServiceRegistryPoisoningCategory: RiskCategory = {
    id: "service-registry-poisoning",
    title: "Service Registry Poisoning",
    description: "When a service registry used for discovery of trusted service endpoints Service Registry Poisoning risks might arise.",
    impact: "If this risk remains unmitigated, attackers might be able to poison the service registry with malicious service endpoints or " +
        "malicious lookup and config data leading to breach of sensitive data.",
    asvs: "V10 - Malicious Code Verification Requirements", // Or V4 Access Control
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html",
    action: "Service Registry Integrity Check",
    mitigation: "Try to strengthen the access control of the service registry and apply cross-checks to detect maliciously poisoned lookup data.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture, // Could also be Operations depending on focus
    stride: STRIDE.Spoofing, // Poisoning leads to spoofed service endpoints
    detectionLogic: "In-scope service registries.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical assets accessing the service registry " +
        "as well as the data assets processed or stored.",
    falsePositives: "Service registries not used for service discovery " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 693, // Protection Mechanism Failure (broad, but relevant)
};

// Export the Category function
export function Category(): RiskCategory {
    return ServiceRegistryPoisoningCategory;
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

        // Check if asset is relevant (in scope, is a ServiceRegistry)
        if (technicalAsset && !technicalAsset.outOfScope && technicalAsset.technology === TechnicalAssetTechnology.ServiceRegistry) {
            const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
            // Pass the incoming flows to createRisk for impact calculation
            risks.push(createRisk(technicalAsset, incomingFlows));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    technicalAsset: TechnicalAsset, // The Service Registry asset
    incomingFlows: CommunicationLink[] // All links pointing TO the registry
    ): Risk
{
    const category = Category();
    const title = `<b>Service Registry Poisoning</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on highest sensitivity of the registry itself, its callers, or the data flowing to/from it
    let impact = RiskExploitationImpact.Low;

    // Check registry sensitivity
    const registryCritConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const registryCritInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const registryCritAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (registryCritConf || registryCritInteg || registryCritAvail) {
        impact = RiskExploitationImpact.Medium;
    }

    // Check sensitivity of callers and data flows (if impact is still low)
    if (impact === RiskExploitationImpact.Low) {
        for (const incomingFlow of incomingFlows) {
            const caller = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];
            if (!caller) continue; // Skip if caller not found

            const callerCritConf = caller.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
            const callerCritInteg = caller.getHighestIntegrity() === Criticality.MissionCritical;
            const callerCritAvail = caller.getHighestAvailability() === Criticality.MissionCritical;

            const flowCritConf = incomingFlow.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
            const flowCritInteg = incomingFlow.getHighestIntegrity() === Criticality.MissionCritical;
            const flowCritAvail = incomingFlow.getHighestAvailability() === Criticality.MissionCritical; // Availability on link less relevant here?

            if (callerCritConf || callerCritInteg || callerCritAvail || flowCritConf || flowCritInteg) {
                impact = RiskExploitationImpact.Medium;
                break; // Found a sensitive caller or flow, impact is Medium
            }
        }
    }


    // Collect IDs of assets potentially affected by poisoning (callers using the registry)
    // Also include the registry itself.
    const dataBreachTechnicalAssetIDs = new Set<string>([technicalAsset.id]);
     // TODO: The original Go comment suggested finding all assets USING the registry.
     // This requires checking OUTGOING links FROM the registry, or links where the registry is the SOURCE.
     // The current Go code and this translation only list the registry itself.
     // To implement the TODO: Iterate through all assets, check their incoming links,
     // if a link's sourceId is the registry's ID, add the asset's ID to the set.
     /* Example for TODO:
        if (modelState.parsedModelRoot?.technicalAssets) {
             for (const potentialClient of Object.values(modelState.parsedModelRoot.technicalAssets)) {
                const clientIncoming = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[potentialClient.id] || [];
                if (clientIncoming.some(link => link.sourceId === technicalAsset.id)) {
                    dataBreachTechnicalAssetIDs.add(potentialClient.id);
                }
             }
        }
     */


    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely as requires specific attack vector
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the registry
        DataBreachProbability.Improbable, // Poisoning itself is not direct breach, enables other attacks
        Array.from(dataBreachTechnicalAssetIDs), // Convert set to array
        undefined,
        technicalAsset.id, // Most relevant asset is the registry itself
        undefined,
        undefined,
        undefined // No specific comm link is most relevant for the poisoning itself
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
