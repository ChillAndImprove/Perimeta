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
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const AccidentalSecretLeakCategory: RiskCategory = {
    id: "accidental-secret-leak",
    title: "Accidental Secret Leak",
    description: "Sourcecode repositories (including their histories) as well as artifact registries can accidentally contain secrets like " +
        "checked-in or packaged-in passwords, API tokens, certificates, crypto keys, etc.",
    impact: "If this risk is unmitigated, attackers which have access to affected sourcecode repositories or artifact registries might " +
        "find secrets accidentally checked-in.",
    asvs: "V14 - Configuration Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Build Pipeline Hardening",
    mitigation: "Establish measures preventing accidental check-in or package-in of secrets into sourcecode repositories " +
        "and artifact registries. This starts by using good .gitignore and .dockerignore files, but does not stop there. " +
        "See for example tools like <i>\"git-secrets\" or \"Talisman\"</i> to have check-in preventive measures for secrets. " +
        "Consider also to regularly scan your repositories for secrets accidentally checked-in using scanning tools like <i>\"gitleaks\" or \"gitrob\"</i>.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.InformationDisclosure,
    detectionLogic: "In-scope sourcecode repositories and artifact registries.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Usually no false positives.",
    modelFailurePossibleReason: false,
    cwe: 200,
};

// Export the Category function if the main generator expects it
export function Category(): RiskCategory {
    return AccidentalSecretLeakCategory;
}


// Function returning the supported tags
export function SupportedTags(): string[] {
    return ["git", "nexus"]; // Tags relevant to this risk
}


// Function to generate risks based on the model state
export function GenerateRisks(): Risk[] {
    if (window.currentSelectedThreatStandard !== 'ORIGINAL') {
        return [];
    }
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks; // No assets, no risks
    }

    // Use Object.values for iteration if sorted order isn't strictly required by this rule,
    // or Object.keys().sort() if it is.
    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const techAsset = modelState.parsedModelRoot.technicalAssets[id];

        if (techAsset && !techAsset.outOfScope &&
            (techAsset.technology === TechnicalAssetTechnology.SourcecodeRepository ||
             techAsset.technology === TechnicalAssetTechnology.ArtifactRegistry))
        {
            // Check if the asset has relevant tags
            const isGit = techAsset.isTaggedWithAny('git');
            // Could add check for 'nexus' or other artifact registry tags if needed

            const risk = createRisk(techAsset, isGit ? "Git" : "", isGit ? "Git Leak Prevention" : "");
            risks.push(risk);
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, prefix: string, details: string): Risk {
    const category = Category(); // Get the category details
    const prefixStr = prefix ? ` (${prefix})` : '';
    const title = `<b>Accidental Secret Leak${prefixStr}</b> risk at <b>${technicalAsset.title}</b>${details ? `: <u>${details}</u>` : ''}`;

    // Determine impact based on asset/data sensitivity
    let impact = RiskExploitationImpact.Low;

    // Checking sensitivity levels. String comparison works here because the enum values are ordered alphabetically correctly for this logic.
    // For more complex comparisons, use numerical weights or an ordered array.
    const highConf = technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential;
    const highInteg = technicalAsset.getHighestIntegrity() >= Criticality.Critical;
    const highAvail = technicalAsset.getHighestAvailability() >= Criticality.Critical;

    const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (highConf || highInteg || highAvail) {
        impact = RiskExploitationImpact.Medium;
    }
    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.High;
    }

    // Create the risk object using the Risk constructor from model.ts
    const risk = new Risk(
        category.id, // Pass category ID
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Calculate severity
        RiskExploitationLikelihood.Unlikely, // Likelihood is typically low for accidental leaks found by attackers initially
        impact, // Calculated impact
        title, // Constructed title
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Probable, // If secrets leak, data breach is probable
        [technicalAsset.id], // The asset itself is involved in the breach
        undefined, // No specific data asset usually most relevant
        technicalAsset.id, // Most relevant technical asset
        undefined, // No specific trust boundary usually most relevant
        undefined, // No specific shared runtime usually most relevant
        undefined // No specific communication link usually most relevant
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
