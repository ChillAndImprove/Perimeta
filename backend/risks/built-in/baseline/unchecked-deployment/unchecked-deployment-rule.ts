// File: risks/built-in/unchecked-deployment.ts

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
    Usage,
    isTechnologyDevelopmentRelevant, // Helper
    modelState // Access the global model state
} from '../../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UncheckedDeploymentCategory: RiskCategory = {
    id: "unchecked-deployment",
    title: "Unchecked Deployment",
    description: "For each build-pipeline component Unchecked Deployment risks might arise when the build-pipeline " +
        "does not include established DevSecOps best-practices. DevSecOps best-practices scan as part of CI/CD pipelines for " +
        "vulnerabilities in source- or byte-code, dependencies, container layers, and dynamically against running test systems. " +
        "There are several open-source and commercial tools existing in the categories DAST, SAST, and IAST.",
    impact: "If this risk remains unmitigated, vulnerabilities in custom-developed software or their dependencies " +
        "might not be identified during continuous deployment cycles.",
    asvs: "V14 - Configuration Verification Requirements", // Or V11 Build
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html",
    action: "Build Pipeline Hardening",
    mitigation: "Apply DevSecOps best-practices and use scanning tools to identify vulnerabilities in source- or byte-code," +
        "dependencies, container layers, and optionally also via dynamic scans against running test systems.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture, // Could be Operations or Development too
    stride: STRIDE.Tampering, // Deploying unchecked code can lead to tampering
    detectionLogic: "All development-relevant technical assets.",
    riskAssessment: "The risk rating depends on the highest rating of the technical assets and data assets processed by deployment-receiving targets.",
    falsePositives: "When the build-pipeline does not build any software components it can be considered a false positive " +
        "after individual review.",
    modelFailurePossibleReason: false,
    cwe: 1127, // Security Presumption for External Software Dependency (related to dependency scanning)
};

// Export the Category function
export function Category(): RiskCategory {
    return UncheckedDeploymentCategory;
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

    const allAssets = Object.values(modelState.parsedModelRoot.technicalAssets);

    for (const technicalAsset of allAssets) {
        // Check if asset is relevant (development-related) - scope check happens implicitly if target is out of scope
        if (isTechnologyDevelopmentRelevant(technicalAsset.technology)) {
            risks.push(createRisk(technicalAsset));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk { // technicalAsset is the dev-relevant asset
    const category = Category();
    const title = `<b>Unchecked Deployment</b> risk at <b>${technicalAsset.title}</b>`;

    let impact = RiskExploitationImpact.Low; // Initialize impact
    const uniqueDataBreachTechnicalAssetIDs = new Set<string>();
    uniqueDataBreachTechnicalAssetIDs.add(technicalAsset.id); // The dev asset itself is involved

    if (modelState.parsedModelRoot?.technicalAssets && modelState.parsedModelRoot?.dataAssets) {
        // Iterate through outgoing deployment links
        for (const deploymentLink of technicalAsset.communicationLinks) {
            if (deploymentLink.usage === Usage.DevOps) {
                // Check if data sent looks like code/artifact
                const deploysCode = deploymentLink.dataAssetsSent.some(dataAssetId => {
                    const dataAsset = modelState.parsedModelRoot!.dataAssets[dataAssetId];
                    // Assume code/artifacts require high integrity
                    return dataAsset && dataAsset.integrity >= Criticality.Important;
                });

                if (deploysCode) {
                    const targetTechAsset = modelState.parsedModelRoot.technicalAssets[deploymentLink.targetId];
                    if (targetTechAsset && !targetTechAsset.outOfScope) { // Only consider in-scope targets
                        // Add target to potential breach assets
                        uniqueDataBreachTechnicalAssetIDs.add(targetTechAsset.id);

                        // Determine impact based on target sensitivity
                        const isTargetSensitive =
                            targetTechAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
                            targetTechAsset.getHighestIntegrity() >= Criticality.Critical ||
                            targetTechAsset.getHighestAvailability() >= Criticality.Critical;

                        // If any sensitive target is deployed to, elevate impact
                        if (isTargetSensitive) {
                            impact = RiskExploitationImpact.Medium;
                        }
                    }
                }
            }
        }
    }


    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely as it's a process weakness
        RiskExploitationLikelihood.Unlikely,
        impact, // Determined by highest sensitivity of deployed targets
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the dev asset lacking checks
        DataBreachProbability.Possible, // Unchecked deployment *could* lead to breach via vulnerabilities
        Array.from(uniqueDataBreachTechnicalAssetIDs), // Dev asset + all deployed targets
        undefined,
        technicalAsset.id, // Most relevant asset is the dev component lacking checks
        undefined,
        undefined,
        undefined // No single comm link is most relevant
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
