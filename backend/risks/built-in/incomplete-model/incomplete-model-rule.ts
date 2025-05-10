// File: risks/built-in/incomplete-model.ts

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
    TechnicalAssetTechnology,
    Protocol,
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const IncompleteModelCategory: RiskCategory = {
    id: "incomplete-model",
    title: "Incomplete Model",
    description: "When the threat model contains unknown technologies or transfers data over unknown protocols, this is " +
        "an indicator for an incomplete model.",
    impact: "If this risk is unmitigated, other risks might not be noticed as the model is incomplete.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html",
    action: "Threat Modeling Completeness",
    mitigation: "Try to find out what technology or protocol is used instead of specifying that it is unknown.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.InformationDisclosure, // Incomplete model can lead to missed risks (Info Disclosure)
    detectionLogic: "All technical assets and communication links with technology type or protocol type specified as unknown.",
    riskAssessment: RiskSeverity.Low, // Use the enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // This category indicates a potential model failure
    cwe: 1008, // Weak R&D Software Development Process (fitting for incomplete modeling)
};

// Export the Category function
export function Category(): RiskCategory {
    return IncompleteModelCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No assets, no risks
    }

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        if (technicalAsset && !technicalAsset.outOfScope) {
            // Check for unknown technology
            if (technicalAsset.technology === TechnicalAssetTechnology.UnknownTechnology) {
                risks.push(createRiskTechAsset(technicalAsset));
            }

            // Check for unknown protocol in communication links
            for (const commLink of technicalAsset.communicationLinks) {
                if (commLink.protocol === Protocol.UnknownProtocol) {
                    risks.push(createRiskCommLink(technicalAsset, commLink));
                }
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance for Unknown Technology
function createRiskTechAsset(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Unknown Technology</b> specified at technical asset <b>${technicalAsset.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        // Severity is Low as per category's RiskAssessment
        RiskSeverity.Low,
        RiskExploitationLikelihood.Unlikely,
        RiskExploitationImpact.Low,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Improbable,
        [technicalAsset.id], // Potential breach involves the asset itself
        undefined,
        technicalAsset.id, // Most relevant asset
        undefined,
        undefined,
        undefined
    );

    return risk;
}


// Helper function to create a Risk instance for Unknown Protocol
function createRiskCommLink(technicalAsset: TechnicalAsset, commLink: CommunicationLink): Risk {
    const category = Category();
    const title = `<b>Unknown Protocol</b> specified for communication link <b>${commLink.title}</b> at technical asset <b>${technicalAsset.title}</b>`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        // Severity is Low as per category's RiskAssessment
        RiskSeverity.Low,
        RiskExploitationLikelihood.Unlikely,
        RiskExploitationImpact.Low,
        title,
        `${category.id}@${commLink.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Improbable,
        [technicalAsset.id], // Breach involves the asset originating the link
        undefined,
        technicalAsset.id, // Asset originating the link is most relevant
        undefined,
        undefined,
        commLink.id // Most relevant link
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
