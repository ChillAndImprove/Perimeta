// File: risks/built-in/path-traversal.ts

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
    TechnicalAssetTechnology,
    Usage,
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const PathTraversalCategory: RiskCategory = {
    id: "path-traversal",
    title: "Path-Traversal",
    description: "When a filesystem is accessed Path-Traversal or Local-File-Inclusion (LFI) risks might arise. " +
        "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed or stored.",
    impact: "If this risk is unmitigated, attackers might be able to read sensitive files (configuration data, key/credential files, deployment files, " +
        "business data files, etc.) from the filesystem of affected components.",
    asvs: "V12 - File and Resources Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html", // Input validation is key
    action: "Path-Traversal Prevention",
    mitigation: "Before accessing the file cross-check that it resides in the expected folder and is of the expected " +
        "type and filename/suffix. Try to use a mapping if possible instead of directly accessing by a filename which is " +
        "(partly or fully) provided by the caller. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.InformationDisclosure,
    detectionLogic: "Filesystems accessed by in-scope callers.",
    riskAssessment: "The risk rating depends on the sensitivity of the data stored inside the technical asset.",
    falsePositives: "File accesses by filenames not consisting of parts controllable by the caller can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 22, // Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')
};

// Export the Category function
export function Category(): RiskCategory {
    return PathTraversalCategory;
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

        // Check if asset is a relevant target (FileServer or LocalFileSystem)
        if (!technicalAsset ||
            (technicalAsset.technology !== TechnicalAssetTechnology.FileServer &&
             technicalAsset.technology !== TechnicalAssetTechnology.LocalFileSystem))
        {
            continue;
        }

        // Check incoming flows
        const incomingFlows = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const incomingFlow of incomingFlows) {
            const sourceAsset = modelState.parsedModelRoot.technicalAssets[incomingFlow.sourceId];

            // Skip if caller is out of scope
            if (!sourceAsset || sourceAsset.outOfScope) {
                continue;
            }

            // Determine likelihood based on usage
            const likelihood = incomingFlow.usage === Usage.DevOps
                ? RiskExploitationLikelihood.Likely
                : RiskExploitationLikelihood.VeryLikely; // Business usage implies higher likelihood

            risks.push(createRisk(technicalAsset, incomingFlow, likelihood));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    filesystemAsset: TechnicalAsset, // The asset being accessed (FileServer/LocalFileSystem)
    incomingFlow: CommunicationLink, // The communication link accessing the filesystem
    likelihood: RiskExploitationLikelihood): Risk
{
    const category = Category();
    const callerAsset = modelState.parsedModelRoot?.technicalAssets[incomingFlow.sourceId];

    if (!callerAsset) {
        // Should not happen if GenerateRisks checks sourceAsset existence
        throw new Error(`Caller asset ${incomingFlow.sourceId} not found for risk generation.`);
    }

    const title = `<b>Path-Traversal</b> risk at <b>${callerAsset.title}</b> against filesystem <b>${filesystemAsset.title}</b> via <b>${incomingFlow.title}</b>`;

    // Determine impact based on the sensitivity of the filesystem asset being accessed
    let impact = RiskExploitationImpact.Medium; // Default impact for accessing filesystems
    const criticalConf = filesystemAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = filesystemAsset.getHighestIntegrity() === Criticality.MissionCritical;
    // Availability less relevant for Path Traversal impact itself (it's about reading files)

    if (criticalConf || criticalInteg) {
        impact = RiskExploitationImpact.High;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${callerAsset.id}@${filesystemAsset.id}@${incomingFlow.id}`, // Synthetic ID includes caller, target, and link
        DataBreachProbability.Probable, // Successfully reading arbitrary files likely leads to data breach
        [filesystemAsset.id], // The filesystem being read is the source of the breach
        undefined,
        callerAsset.id, // Most relevant asset is the one performing the traversal attempt
        undefined,
        undefined,
        incomingFlow.id // Most relevant link is the one carrying the potentially malicious path
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
