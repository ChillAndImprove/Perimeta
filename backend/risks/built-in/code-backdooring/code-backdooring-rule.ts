      
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
    Usage,
    modelState, // Access the global model state
    isTechnologyDevelopmentRelevant,
     TechnicalAssetTechnology,
     TechnicalAsset,
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const CodeBackdooringCategory: RiskCategory = {
    id: "code-backdooring",
    title: "Code Backdooring",
    description: "For each build-pipeline component Code Backdooring risks might arise where attackers compromise the build-pipeline " +
        "in order to let backdoored artifacts be shipped into production. Aside from direct code backdooring this includes " +
        "backdooring of dependencies and even of more lower-level build infrastructure, like backdooring compilers (similar to what the XcodeGhost malware did) or dependencies.",
    impact: "If this risk remains unmitigated, attackers might be able to execute code on and completely takeover " +
        "production environments.",
    asvs: "V10 - Malicious Code Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html",
    action: "Build Pipeline Hardening",
    mitigation: "Reduce the attack surface of backdooring the build pipeline by not directly exposing the build pipeline " +
        "components on the public internet and also not exposing it in front of unmanaged (out-of-scope) developer clients." +
        "Also consider the use of code signing to prevent code modifications.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.Tampering,
    detectionLogic: "In-scope development relevant technical assets which are either accessed by out-of-scope unmanaged " +
        "developer clients and/or are directly accessed by any kind of internet-located (non-VPN) component or are themselves directly located " +
        "on the internet.",
    riskAssessment: "The risk rating depends on the confidentiality and integrity rating of the code being handled and deployed " +
        "as well as the placement/calling of this technical asset on/from the internet.", // TODO also take the CIA rating of the deployment targets (and their data) into account?
    falsePositives: "When the build-pipeline and sourcecode-repo is not exposed to the internet and considered fully " +
        "trusted (which implies that all accessing clients are also considered fully trusted in terms of their patch management " +
        "and applied hardening, which must be equivalent to a managed developer client environment) this can be considered a false positive " +
        "after individual review.",
    modelFailurePossibleReason: false,
    cwe: 912,
};

// Export the Category function
export function Category(): RiskCategory {
    return CodeBackdooringCategory;
}

// Function returning the supported tags (empty in this case)
export function SupportedTags(): string[] {
    return [];
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

    const assetIds = Object.keys(modelState.parsedModelRoot.technicalAssets).sort();

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if the asset is relevant (in scope, development-related)
        if (!technicalAsset || technicalAsset.outOfScope || !isTechnologyDevelopmentRelevant(technicalAsset.technology)) {
            continue;
        }

        // Check for direct internet exposure
        if (technicalAsset.internet) {
            risks.push(createRisk(technicalAsset, true)); // Elevated risk due to internet exposure
            continue; // Move to next asset once risk is added
        }

        // Check for exposure via incoming links from risky callers
        const incomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        let riskAddedForAsset = false;
        for (const callerLink of incomingLinks) {
            const caller = modelState.parsedModelRoot.technicalAssets[callerLink.sourceId];

            // Check if caller is risky (internet non-VPN, or out-of-scope/unmanaged)
            if (caller && (caller.outOfScope || (!callerLink.vpn && caller.internet))) {
                risks.push(createRisk(technicalAsset, true)); // Elevated risk due to caller
                riskAddedForAsset = true;
                break; // Only add one risk per asset based on links
            }
        }

        // If no elevated risk found yet, add a standard risk (if applicable, Go code didn't seem to add a non-elevated one here)
        // The original Go code only added risks if elevated conditions were met.
        // Replicating that behavior. If a non-elevated risk is needed, add:
        // if (!riskAddedForAsset) {
        //     risks.push(createRisk(technicalAsset, false));
        // }

    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(technicalAsset: TechnicalAsset, elevatedRisk: boolean): Risk {
    const category = Category();
    const title = `<b>Code Backdooring</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset type, elevation, and sensitivity
    let impact = RiskExploitationImpact.Low;
    // CodeInspectionPlatform is less critical for *direct* backdooring impact
    if (technicalAsset.technology !== TechnicalAssetTechnology.CodeInspectionPlatform) {
        if (elevatedRisk) {
            impact = RiskExploitationImpact.Medium;
        }
        // Increase impact based on highest sensitivity of the *asset itself* (code/artifacts handled)
        // Enum string comparison works here if ordered correctly: L < M < H < VH
        const highSensitivity = technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential ||
                                technicalAsset.getHighestIntegrity() >= Criticality.Critical;

        if (highSensitivity) {
            impact = elevatedRisk ? RiskExploitationImpact.High : RiskExploitationImpact.Medium;
        }
        // Note: Original Go code didn't check Availability for impact here, seems reasonable.
    }

    // Identify potential data breach targets (where the backdoored code might be deployed)
    const dataBreachTargetIDs = new Set<string>();
    dataBreachTargetIDs.add(technicalAsset.id); // The build asset itself is compromised

    if (modelState.parsedModelRoot?.dataAssets) {
        for (const commLink of technicalAsset.communicationLinks) {
            // Check if it's a deployment link
            if (commLink.usage === Usage.DevOps) {
                // Check if data sent looks like code (based on integrity)
                const sentCode = commLink.dataAssetsSent.some(dataAssetId => {
                    const dataAsset = modelState.parsedModelRoot!.dataAssets[dataAssetId];
                    // Code/Executables usually have high integrity requirements
                    return dataAsset && dataAsset.integrity >= Criticality.Important;
                });

                if (sentCode) {
                    // If code is sent via DevOps link, the target is a potential data breach location
                    dataBreachTargetIDs.add(commLink.targetId);
                }
            }
        }
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact), // Severity based on likelihood and impact
        RiskExploitationLikelihood.Unlikely, // Likelihood of *successful backdooring exploitation* is initially unlikely
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Probable, // If backdooring succeeds, data breach at targets is probable
        Array.from(dataBreachTargetIDs), // Convert set to array
        undefined, // No specific data asset usually most relevant for the backdooring itself
        technicalAsset.id, // Most relevant technical asset is the compromised build component
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
