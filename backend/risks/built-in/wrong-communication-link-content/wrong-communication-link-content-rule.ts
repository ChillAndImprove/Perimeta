// File: risks/built-in/wrong-communication-link-content.ts

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
    TechnicalAssetMachine,
    Protocol,
    RiskSeverity, // Used in description
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const WrongCommunicationLinkContentCategory: RiskCategory = {
    id: "wrong-communication-link-content",
    title: "Wrong Communication Link Content",
    description: "When a communication link is defined as readonly, but does not receive any data asset, " +
        "or when it is defined as not readonly, but does not send any data asset, it is likely to be a model failure.",
    impact: "If this potential model error is not fixed, some risks might not be visible.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html",
    action: "Model Consistency",
    mitigation: "Try to model the correct readonly flag and/or data sent/received of communication links. " +
        "Also try to use communication link types matching the target technology/machine types.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.InformationDisclosure, // Inconsistent model hides information
    detectionLogic: "Communication links with inconsistent data assets being sent/received not matching their readonly flag or otherwise inconsistent protocols not matching the target technology type.",
    riskAssessment: RiskSeverity.Low, // Use enum value directly
    falsePositives: "Usually no false positives as this looks like an incomplete model.",
    modelFailurePossibleReason: true, // Indicates model inconsistency
    cwe: 1008, // Weak R&D Software Development Process (can cover modeling errors)
};

// Export the Category function
export function Category(): RiskCategory {
    return WrongCommunicationLinkContentCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    const generatedRiskKeys = new Set<string>(); // To prevent duplicate risks for same link/reason

    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    // Iterate through assets as communication sources
    for (const technicalAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
        for (const commLink of technicalAsset.communicationLinks) {
            const targetAsset = modelState.parsedModelRoot.technicalAssets[commLink.targetId];
            if (!targetAsset) {
                console.warn(`Target asset ${commLink.targetId} for link ${commLink.id} not found. Skipping content check.`);
                continue; // Cannot check consistency without target
            }

            // 1. Check readonly consistency
            let readOnlyMismatchReason = "";
            if (commLink.readonly && commLink.dataAssetsReceived.length === 0) {
                readOnlyMismatchReason = "(data assets sent/received not matching the communication link's readonly flag: readonly but nothing received)";
            } else if (!commLink.readonly && commLink.dataAssetsSent.length === 0) {
                 readOnlyMismatchReason = "(data assets sent/received not matching the communication link's readonly flag: not readonly but nothing sent)";
            }

            if (readOnlyMismatchReason) {
                const risk = createRisk(technicalAsset, commLink, readOnlyMismatchReason);
                if (!generatedRiskKeys.has(risk.syntheticId)) {
                    risks.push(risk);
                    generatedRiskKeys.add(risk.syntheticId);
                }
            }


            // 2. Check protocol consistency against target
            let protocolMismatchReason = "";
            if (commLink.protocol === Protocol.InProcessLibraryCall && targetAsset.technology !== TechnicalAssetTechnology.Library) {
                 protocolMismatchReason = `(protocol type "${Protocol.InProcessLibraryCall}" does not match target technology type "${targetAsset.technology}": expected "${TechnicalAssetTechnology.Library}")`;
            } else if (commLink.protocol === Protocol.LocalFileAccess && targetAsset.technology !== TechnicalAssetTechnology.LocalFileSystem) {
                 protocolMismatchReason = `(protocol type "${Protocol.LocalFileAccess}" does not match target technology type "${targetAsset.technology}": expected "${TechnicalAssetTechnology.LocalFileSystem}")`;
            } else if (commLink.protocol === Protocol.ContainerSpawning && targetAsset.machine !== TechnicalAssetMachine.Container) {
                 protocolMismatchReason = `(protocol type "${Protocol.ContainerSpawning}" does not match target machine type "${targetAsset.machine}": expected "${TechnicalAssetMachine.Container}")`;
            }
             // Add more protocol checks here if needed

            if (protocolMismatchReason) {
                 const risk = createRisk(technicalAsset, commLink, protocolMismatchReason);
                 // Use a slightly different synthetic ID for protocol mismatch to avoid collision with readonly mismatch on the same link
                 risk.syntheticId += "-protocol";
                 if (!generatedRiskKeys.has(risk.syntheticId)) {
                    risks.push(risk);
                    generatedRiskKeys.add(risk.syntheticId);
                 }
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, commLink: CommunicationLink, reason: string): Risk {
    const category = Category();
    const title = `<b>Wrong Communication Link Content</b> ${reason} at <b>${technicalAsset.title}</b> ` +
                  `regarding communication link <b>${commLink.title}</b>`;

    // Risk severity is Low as per category definition
    const impact = RiskExploitationImpact.Low;
    const likelihood = RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        RiskSeverity.Low, // Set severity directly
        likelihood,
        impact,
        title,
        // Synthetic ID includes source asset and link ID
        `${category.id}@${technicalAsset.id}@${commLink.id}`,
        DataBreachProbability.Improbable,
        [], // No specific data breach targets from this modeling risk
        undefined,
        technicalAsset.id, // Most relevant asset is the source of the link
        undefined,
        undefined,
        commLink.id // Most relevant link is the inconsistent one
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
