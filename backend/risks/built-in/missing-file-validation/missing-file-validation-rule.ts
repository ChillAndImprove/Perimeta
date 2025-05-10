// File: risks/built-in/missing-file-validation.ts

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
    DataFormat, // Import DataFormat enum
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const MissingFileValidationCategory: RiskCategory = {
    id: "missing-file-validation",
    title: "Missing File Validation",
    description: "When a technical asset accepts files, these input files should be strictly validated about filename and type.",
    impact: "If this risk is unmitigated, attackers might be able to provide malicious files to the application.",
    asvs: "V12 - File and Resources Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html",
    action: "File Validation",
    mitigation: "Filter by file extension and discard (if feasible) the name provided. Whitelist the accepted file types " +
        "and determine the mime-type on the server-side (for example via \"Apache Tika\" or similar checks). If the file is retrievable by " +
        "endusers and/or backoffice employees, consider performing scans for popular malware (if the files can be retrieved much later than they " +
        "were uploaded, also apply a fresh malware scan during retrieval to scan with newer signatures of popular malware). Also enforce " +
        "limits on maximum file size to avoid denial-of-service like scenarios.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.Spoofing, // Can also be Tampering if content is changed, Spoofing fits type/name deception
    detectionLogic: "In-scope technical assets with custom-developed code accepting file data formats.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Fully trusted (i.e. cryptographically signed or similar) files can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 434, // Unrestricted Upload of File with Dangerous Type
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingFileValidationCategory;
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
    const generatedRiskAssetIds = new Set<string>(); // Keep track of assets already added

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is relevant (in scope, custom developed)
        if (!technicalAsset || technicalAsset.outOfScope || !technicalAsset.customDevelopedParts) {
            continue;
        }

        // Check if asset accepts files
        if (technicalAsset.dataFormatsAccepted.includes(DataFormat.File)) {
             // Only add one risk per asset, even if 'File' is listed multiple times
            if (!generatedRiskAssetIds.has(technicalAsset.id)) {
                risks.push(createRisk(technicalAsset));
                generatedRiskAssetIds.add(technicalAsset.id);
            }
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset): Risk {
    const category = Category();
    const title = `<b>Missing File Validation</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset's highest sensitivity
    let impact = RiskExploitationImpact.Low;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.Medium;
    }
    // Note: Go code elevates only to Medium. Consider HighImpact if needed for very sensitive assets.

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.VeryLikely, impact), // Likelihood very likely if validation is missing
        RiskExploitationLikelihood.VeryLikely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Probable, // Uploading malicious files can easily lead to breach/compromise
        [technicalAsset.id], // The asset accepting the file is the breach point
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
