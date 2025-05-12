// File: risks/built-in/missing-build-infrastructure.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
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
export const MissingBuildInfrastructureCategory: RiskCategory = {
    id: "missing-build-infrastructure",
    title: "Missing Build Infrastructure",
    description: "The modeled architecture does not contain a build infrastructure (devops-client, sourcecode-repo, build-pipeline, etc.), " +
        "which might be the risk of a model missing critical assets (and thus not seeing their risks). " +
        "If the architecture contains custom-developed parts, the pipeline where code gets developed " +
        "and built needs to be part of the model.",
    impact: "If this risk is unmitigated, attackers might be able to exploit risks unseen in this threat model due to " +
        "critical build infrastructure components missing in the model.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Build Pipeline Hardening", // Action should probably be "Model Completeness" or similar
    mitigation: "Include the build infrastructure in the model.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.Tampering, // Missing model elements can hide tampering risks
    detectionLogic: "Models with in-scope custom-developed parts missing in-scope development (code creation) and build infrastructure " +
        "components (devops-client, sourcecode-repo, build-pipeline, etc.).",
    riskAssessment: "The risk rating depends on the highest sensitivity of the in-scope assets running custom-developed parts.",
    falsePositives: "Models not having any custom-developed parts " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: true, // Indicates a potential model failure (incompleteness)
    cwe: 1127, // Use of Excessive Resources (broad, but fits model inaccuracy leading to issues)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingBuildInfrastructureCategory;
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

    let hasCustomDevelopedParts = false;
    let hasBuildPipeline = false;
    let hasSourcecodeRepo = false;
    let hasDevOpsClient = false;
    let impact = RiskExploitationImpact.Low;
    let mostRelevantAsset: TechnicalAsset | null = null; // Track the most sensitive asset with custom dev parts

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];
        if (!technicalAsset) continue;

        // Check for custom developed parts (in-scope)
        if (technicalAsset.customDevelopedParts && !technicalAsset.outOfScope) {
            hasCustomDevelopedParts = true;

            // Determine impact and track the most relevant asset
            const isSensitive =
                technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
                technicalAsset.getHighestIntegrity() >= Criticality.Critical ||
                technicalAsset.getHighestAvailability() >= Criticality.Critical;

             // Use HighestSensitivityScore for comparison, fallback to first sensitive asset
             if (!mostRelevantAsset || (isSensitive && technicalAsset.getHighestSensitivityScore() > (mostRelevantAsset?.getHighestSensitivityScore() ?? -1))) {
                 mostRelevantAsset = technicalAsset;
             }

             // Set impact to Medium if any sensitive custom-developed asset is found
             if (isSensitive) {
                  impact = RiskExploitationImpact.Medium;
             }
        }

        // Check for presence of build infrastructure components (regardless of scope for this check)
        if (technicalAsset.technology === TechnicalAssetTechnology.BuildPipeline) {
            hasBuildPipeline = true;
        }
        if (technicalAsset.technology === TechnicalAssetTechnology.SourcecodeRepository) {
            hasSourcecodeRepo = true;
        }
        if (technicalAsset.technology === TechnicalAssetTechnology.DevOpsClient) {
            hasDevOpsClient = true;
        }
    }

    // Combine checks for build infrastructure presence
    const hasBuildInfrastructure = hasBuildPipeline && hasSourcecodeRepo && hasDevOpsClient;

    // If there are custom developed parts but the build infrastructure is missing, create the risk
    if (hasCustomDevelopedParts && !hasBuildInfrastructure && mostRelevantAsset) {
        // Pass the most relevant asset found and the determined impact
        risks.push(createRisk(mostRelevantAsset, impact));
    }

    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, impact: RiskExploitationImpact): Risk {
    const category = Category();
    const title = `<b>Missing Build Infrastructure</b> in the threat model (referencing asset <b>${technicalAsset.title}</b> as an example)`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood low as it's a modeling issue
        RiskExploitationLikelihood.Unlikely,
        impact, // Determined by sensitivity of custom-developed assets
        title,
        `${category.id}@${technicalAsset.id}`, // Use referenced asset ID for synthetic ID consistency
        DataBreachProbability.Improbable, // Missing model doesn't directly cause breach
        [], // No assets directly breached by *this* risk
        undefined,
        technicalAsset.id, // Most relevant asset is the example custom-developed one
        undefined,
        undefined,
        undefined
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
