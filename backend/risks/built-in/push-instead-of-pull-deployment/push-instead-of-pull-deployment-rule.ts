// File: risks/built-in/push-instead-of-pull-deployment.ts

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
    Availability,
    TechnicalAssetTechnology,
    Usage,
    isTechnologyDevelopmentRelevant, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const PushInsteadOfPullDeploymentCategory: RiskCategory = {
    id: "push-instead-of-pull-deployment",
    title: "Push instead of Pull Deployment",
    description: "When comparing push-based vs. pull-based deployments from a security perspective, pull-based " +
        "deployments improve the overall security of the deployment targets. Every exposed interface of a production system to accept a deployment " +
        "increases the attack surface of the production system, thus a pull-based approach exposes less attack surface relevant " +
        "interfaces.",
    impact: "If this risk is unmitigated, attackers might have more potential target vectors for attacks, as the overall attack surface is " +
        "unnecessarily increased.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Build Pipeline Hardening", // Or "Deployment Strategy Hardening"
    mitigation: "Try to prefer pull-based deployments (like GitOps scenarios offer) over push-based deployments to reduce the attack surface of the production system.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture,
    stride: STRIDE.Tampering, // Pushing deployment can tamper with target
    detectionLogic: "Models with build pipeline components accessing in-scope targets of deployment (in a non-readonly way) which " +
        "are not build-related components themselves.",
    riskAssessment: "The risk rating depends on the highest sensitivity of the deployment targets running custom-developed parts.", // Although logic uses target sensitivity regardless of custom parts
    falsePositives: "Communication links that are not deployment paths " +
        "can be considered as false positives after individual review.",
    modelFailurePossibleReason: true, // Model might not accurately represent deployment flow
    cwe: 1127, // Excessive Attack Surface (related)
};

// Export the Category function
export function Category(): RiskCategory {
    return PushInsteadOfPullDeploymentCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
}

// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    let impact = RiskExploitationImpact.Low; // Initialize impact

    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No model, no risks
    }

    const allAssets = Object.values(modelState.parsedModelRoot.technicalAssets);

    // Find Build Pipeline assets
    for (const buildPipeline of allAssets) {
        if (buildPipeline.technology !== TechnicalAssetTechnology.BuildPipeline) {
            continue;
        }

        // Check outgoing communication links
        for (const deploymentLink of buildPipeline.communicationLinks) {
            const targetAsset = modelState.parsedModelRoot.technicalAssets[deploymentLink.targetId];

            // Check if target exists and meets criteria
            if (targetAsset &&
                !deploymentLink.readonly && // Must be write access
                deploymentLink.usage === Usage.DevOps && // Must be DevOps usage
                !targetAsset.outOfScope && // Target must be in scope
                !isTechnologyDevelopmentRelevant(targetAsset.technology) && // Target is not part of build infra itself
                targetAsset.usage === Usage.Business) // Target is a business asset
            {
                // Determine impact based on target sensitivity
                const isTargetSensitive =
                    targetAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
                    targetAsset.getHighestIntegrity() >= Criticality.Critical ||
                    targetAsset.getHighestAvailability() >= Criticality.Critical;

                // If any sensitive target is found via push, the overall impact is Medium
                if (isTargetSensitive) {
                    impact = RiskExploitationImpact.Medium;
                }

                // Create a risk for this specific push deployment path
                // Pass the *current* highest impact found so far (could be Low or Medium)
                risks.push(createRisk(buildPipeline, targetAsset, deploymentLink, impact));

                // Note: Unlike some other rules, this doesn't break. It finds all push deployments.
                // The impact reflects the *highest* sensitivity found across *all* targets.
                // This might slightly inflate impact for less sensitive push targets if a more sensitive one exists elsewhere.
            }
        } // End loop through deployment links
    } // End loop through assets checking for BuildPipeline

    // If multiple risks were generated, adjust their impact to the highest found overall
    // This ensures consistency with the Go code's apparent logic where impact is determined globally.
    if (impact === RiskExploitationImpact.Medium) {
        risks.forEach(risk => {
            risk.exploitationImpact = RiskExploitationImpact.Medium;
            // Recalculate severity based on the potentially updated impact
            risk.severity = CalculateSeverity(risk.exploitationLikelihood, risk.exploitationImpact);
        });
    }


    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    buildPipeline: TechnicalAsset,
    deploymentTarget: TechnicalAsset,
    deploymentCommLink: CommunicationLink,
    impact: RiskExploitationImpact): Risk
{
    const category = Category();
    const title = `<b>Push instead of Pull Deployment</b> at <b>${deploymentTarget.title}</b> via build pipeline asset <b>${buildPipeline.title}</b>`;

    // Likelihood is Unlikely as it represents an architectural pattern weakness, not direct exploitability
    const likelihood = RiskExploitationLikelihood.Unlikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact), // Calculate initial severity
        likelihood,
        impact, // Use the passed impact (potentially adjusted later)
        title,
        // Synthetic ID uses build pipeline ID, making it one risk per pipeline *potentially* pushing
        // (Go version used buildPipeline.Id, not target.Id or link.Id here)
        `${category.id}@${buildPipeline.id}`,
        DataBreachProbability.Improbable, // Push deployment itself doesn't guarantee breach
        [deploymentTarget.id], // The target asset is potentially affected
        undefined,
        deploymentTarget.id, // Most relevant asset is the target being deployed to via push
        undefined,
        undefined,
        deploymentCommLink.id // Most relevant link is the deployment communication
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
