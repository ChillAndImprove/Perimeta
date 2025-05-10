// File: risks/built-in/missing-network-segmentation.ts

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
    TechnicalAssetType,
    TechnicalAssetTechnology,
    RiskSeverity, // Used in description
    isTechnologyLessProtectedType, // Helper
    isTechnologyCloseToHighValueTargetsTolerated, // Helper
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define constant for RAA limit
const RAA_LIMIT = 50;

// Define the Category structure adhering to the RiskCategory interface
export const MissingNetworkSegmentationCategory: RiskCategory = {
    id: "missing-network-segmentation",
    title: "Missing Network Segmentation",
    description: "Highly sensitive assets and/or datastores residing in the same network segment than other " +
        "lower sensitive assets (like webservers or content management systems etc.) should be better protected " +
        "by a network segmentation trust-boundary.",
    impact: "If this risk is unmitigated, attackers successfully attacking other components of the system might have an easy path towards " +
        "more valuable targets, as they are not separated by network segmentation.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Network Segmentation",
    mitigation: "Apply a network segmentation trust-boundary around the highly sensitive assets and/or datastores.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.ElevationOfPrivilege, // Lateral movement is often EoP
    detectionLogic: `In-scope technical assets with high sensitivity and RAA values as well as datastores ` +
        `when surrounded by assets (without a network trust-boundary in-between) which are of type ${TechnicalAssetTechnology.ClientSystem}, ${TechnicalAssetTechnology.WebServer}, ` + // Example types, list can be expanded or use helper
        `${TechnicalAssetTechnology.WebApplication}, ${TechnicalAssetTechnology.CMS}, ${TechnicalAssetTechnology.WebServiceREST}, ${TechnicalAssetTechnology.WebServiceSOAP}, ` +
        `${TechnicalAssetTechnology.BuildPipeline}, ${TechnicalAssetTechnology.SourcecodeRepository}, ${TechnicalAssetTechnology.Monitoring}, or similar and there is no direct connection between these ` +
        `(hence no requirement to be so close to each other).`, // Note: Detection logic uses the helper function `isTechnologyLessProtectedType`
    riskAssessment: `Default is ${RiskSeverity.Low} risk. The risk is increased to ${RiskSeverity.Medium} when the asset missing the ` +
        `trust-boundary protection is rated as ${Confidentiality.StrictlyConfidential} or ${Criticality.MissionCritical}.`,
    falsePositives: "When all assets within the network segmentation trust-boundary are hardened and protected to the same extend as if all were " +
        "containing/processing highly sensitive data.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover architectural flaws)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingNetworkSegmentationCategory;
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

    // Get assets once for inner loop efficiency
    const allAssets = Object.values(modelState.parsedModelRoot.technicalAssets);
    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    // Define exempted technologies (security controls that might sit in segments)
    const exemptedTechnologies = [
        TechnicalAssetTechnology.ReverseProxy,
        TechnicalAssetTechnology.WAF,
        TechnicalAssetTechnology.IDS,
        TechnicalAssetTechnology.IPS,
        TechnicalAssetTechnology.ServiceRegistry
    ];


    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is relevant (in scope, not exempted tech)
        if (!technicalAsset || technicalAsset.outOfScope || exemptedTechnologies.includes(technicalAsset.technology)) {
            continue;
        }

        // Check if asset is sensitive (high RAA AND (Datastore OR Sensitive CIA))
        const isSensitive =
            technicalAsset.raa >= RAA_LIMIT &&
            (technicalAsset.type === TechnicalAssetType.Datastore ||
             technicalAsset.confidentiality >= Confidentiality.Confidential ||
             technicalAsset.integrity >= Criticality.Critical ||
             technicalAsset.availability >= Criticality.Critical); // Use direct fields as per Go

        if (isSensitive) {
            // Check for unsuitable neighbors
            for (const sparringAssetCandidate of allAssets) {
                // Skip self, out-of-scope, or assets tolerated near high-value targets
                if (technicalAsset.id === sparringAssetCandidate.id ||
                    sparringAssetCandidate.outOfScope ||
                    isTechnologyCloseToHighValueTargetsTolerated(sparringAssetCandidate.technology))
                {
                    continue;
                }

                // Check if sparring partner is a 'less protected type' AND
                // in the same network boundary AND
                // there's no direct connection between them
                if (isTechnologyLessProtectedType(sparringAssetCandidate.technology) &&
                    technicalAsset.isSameTrustBoundaryNetworkOnly(sparringAssetCandidate.id) &&
                    !technicalAsset.hasDirectConnection(sparringAssetCandidate.id))
                {
                    // Determine if the sensitive asset itself requires higher impact
                    const highRiskTarget =
                        technicalAsset.confidentiality === Confidentiality.StrictlyConfidential ||
                        technicalAsset.integrity === Criticality.MissionCritical ||
                        technicalAsset.availability === Criticality.MissionCritical; // Use direct fields

                    risks.push(createRisk(technicalAsset, highRiskTarget));
                    break; // Found one unsuitable neighbor, add risk and move to next sensitive asset
                }
            } // End inner loop (sparring partners)
        } // End sensitivity check
    } // End outer loop (sensitive assets)
    return risks;
}


// Helper function to create a Risk instance
function createRisk(techAsset: TechnicalAsset, moreRisky: boolean): Risk {
    const category = Category();
    // Impact is Low, elevated to Medium if the target asset is highly sensitive
    const impact = moreRisky ? RiskExploitationImpact.Medium : RiskExploitationImpact.Low;

    const title = `<b>Missing Network Segmentation</b> to further encapsulate and protect <b>${techAsset.title}</b> against unrelated ` +
                  `lower protected assets in the same network segment, which might be easier to compromise by attackers`;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Likelihood Unlikely as requires prior compromise
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${techAsset.id}`, // Synthetic ID focuses on the asset needing protection
        DataBreachProbability.Improbable, // Lack of segmentation itself doesn't cause breach
        [techAsset.id], // The asset needing protection is the focus point
        undefined,
        techAsset.id, // Most relevant asset
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
