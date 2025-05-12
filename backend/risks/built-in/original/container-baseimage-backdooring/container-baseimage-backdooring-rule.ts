// File: risks/built-in/container-baseimage-backdooring.ts

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
    TechnicalAssetMachine,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const ContainerBaseImageBackdooringCategory: RiskCategory = {
    id: "container-baseimage-backdooring",
    title: "Container Base Image Backdooring",
    description: "When a technical asset is built using container technologies, Base Image Backdooring risks might arise where " +
        "base images and other layers used contain vulnerable components or backdoors." +
        "<br><br>See for example: <a href=\"https://techcrunch.com/2018/06/15/tainted-crypto-mining-containers-pulled-from-docker-hub/\" target=\"_blank\" rel=\"noopener noreferrer\">https://techcrunch.com/2018/06/15/tainted-crypto-mining-containers-pulled-from-docker-hub/</a>", // Added target/rel for links
    impact: "If this risk is unmitigated, attackers might be able to deeply persist in the target system by executing code in deployed containers.",
    asvs: "V10 - Malicious Code Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html",
    action: "Container Infrastructure Hardening",
    mitigation: "Apply hardening of all container infrastructures (see for example the <i>CIS-Benchmarks for Docker and Kubernetes</i> and the <i>Docker Bench for Security</i>). " +
        "Use only trusted base images of the original vendors, verify digital signatures and apply image creation best practices. " +
        "Also consider using Google's <i>Distroless</i> base images or otherwise very small base images. " +
        "Regularly execute container image scans with tools checking the layers for vulnerable components.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS/CSVS applied?", // Corrected typo from Go source
    function: RiskFunction.Operations,
    stride: STRIDE.Tampering,
    detectionLogic: "In-scope technical assets running as containers.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets.",
    falsePositives: "Fully trusted (i.e. reviewed and cryptographically signed or similar) base images of containers can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 912,
};

// Export the Category function
export function Category(): RiskCategory {
    return ContainerBaseImageBackdooringCategory;
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

        // Check if the asset is relevant (in scope, runs as a container)
        if (technicalAsset && !technicalAsset.outOfScope && technicalAsset.machine === TechnicalAssetMachine.Container) {
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
    const title = `<b>Container Base Image Backdooring</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset's highest sensitivity
    let impact = RiskExploitationImpact.Medium;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.High;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely, // Successful backdoor exploitation is initially unlikely
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Probable, // If exploited, data breach is probable
        [technicalAsset.id], // The container asset itself is the primary breach point
        undefined,
        technicalAsset.id, // Most relevant asset
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
