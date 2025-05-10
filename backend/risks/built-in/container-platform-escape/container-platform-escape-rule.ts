// File: risks/built-in/container-platform-escape.ts

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
    TechnicalAssetTechnology,
    TechnicalAssetMachine,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const ContainerPlatformEscapeCategory: RiskCategory = {
    id: "container-platform-escape",
    title: "Container Platform Escape",
    description: "Container platforms are especially interesting targets for attackers as they host big parts of a containerized runtime infrastructure. " +
        "When not configured and operated with security best practices in mind, attackers might exploit a vulnerability inside an container and escape towards " +
        "the platform as highly privileged users. These scenarios might give attackers capabilities to attack every other container as owning the container platform " +
        "(via container escape attacks) equals to owning every container.",
    impact: "If this risk is unmitigated, attackers which have successfully compromised a container (via other vulnerabilities) " +
        "might be able to deeply persist in the target system by executing code in many deployed containers " +
        "and the container platform itself.",
    asvs: "V14 - Configuration Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html",
    action: "Container Infrastructure Hardening",
    mitigation: "Apply hardening of all container infrastructures. " +
        "<p>See for example the <i>CIS-Benchmarks for Docker and Kubernetes</i> " +
        "as well as the <i>Docker Bench for Security</i> ( <a href=\"https://github.com/docker/docker-bench-security\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/docker/docker-bench-security</a> ) " +
        "or <i>InSpec Checks for Docker and Kubernetes</i> ( <a href=\"https://github.com/dev-sec/cis-docker-benchmark\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/dev-sec/cis-docker-benchmark</a> and <a href=\"https://github.com/dev-sec/cis-kubernetes-benchmark\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/dev-sec/cis-kubernetes-benchmark</a> ). " + // Fixed link duplication from source
        "Use only trusted base images, verify digital signatures and apply image creation best practices. Also consider using Google's <b>Distroless</i> base images or otherwise very small base images. " + // Note: </b> missing in source?
        "Apply namespace isolation and nod affinity to separate pods from each other in terms of access and nodes the same style as you separate data.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS or CSVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.ElevationOfPrivilege,
    detectionLogic: "In-scope container platforms.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Container platforms not running parts of the target architecture can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 1008,
};

// Export the Category function
export function Category(): RiskCategory {
    return ContainerPlatformEscapeCategory;
}

// Function returning the supported tags
export function SupportedTags(): string[] {
    return ["docker", "kubernetes", "openshift"];
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

        // Check if the asset is relevant (in scope, is a ContainerPlatform)
        if (technicalAsset && !technicalAsset.outOfScope && technicalAsset.technology === TechnicalAssetTechnology.ContainerPlatform) {
            // Optional: Check if tagged with supported tags if needed
            // if (technicalAsset.isTaggedWithAny(...SupportedTags())) { ... }
            risks.push(createRisk(technicalAsset));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
if (window.currentSelectedThreatStandard !== 'ORIGINAL') {
    return [];
}
    const category = Category();
    const title = `<b>Container Platform Escape</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on the platform's highest sensitivity
    // (Compromising the platform impacts everything running on it)
    let impact = RiskExploitationImpact.Medium;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.High;
    }

    // Identify all container assets as potential data breach targets if the platform is escaped
    const dataBreachTechnicalAssetIDs: string[] = [];
    if (modelState.parsedModelRoot?.technicalAssets) {
        for (const [id, techAsset] of Object.entries(modelState.parsedModelRoot.technicalAssets)) {
            if (techAsset.machine === TechnicalAssetMachine.Container) {
                dataBreachTechnicalAssetIDs.push(id);
            }
        }
    }
    // Add the platform itself if not already included (though it's not a container machine type)
    if (!dataBreachTechnicalAssetIDs.includes(technicalAsset.id)) {
         dataBreachTechnicalAssetIDs.push(technicalAsset.id);
    }


    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely, // Successful escape is initially unlikely
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID relates to the platform asset
        DataBreachProbability.Probable, // If escape happens, breach is probable across containers
        dataBreachTechnicalAssetIDs, // All containers and the platform itself are potential breach points
        undefined,
        technicalAsset.id, // Most relevant asset is the platform being escaped
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
