// File: risks/built-in/xml-external-entity.ts

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
    isPotentialWebAccessProtocol, // Used for SSRF-like impact check
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const XmlExternalEntityCategory: RiskCategory = {
    id: "xml-external-entity",
    title: "XML External Entity (XXE)",
    description: "When a technical asset accepts data in XML format, XML External Entity (XXE) risks might arise.",
    impact: "If this risk is unmitigated, attackers might be able to read sensitive files (configuration data, key/credential files, deployment files, " +
        "business data files, etc.) form the filesystem of affected components and/or access sensitive services or files " +
        "of other components.",
    asvs: "V14 - Configuration Verification Requirements", // Could also be V5 (Input Validation)
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html",
    action: "XML Parser Hardening",
    mitigation: "Apply hardening of all XML parser instances in order to stay safe from XML External Entity (XXE) vulnerabilities. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Development,
    stride: STRIDE.InformationDisclosure, // Primary impact is often reading files/accessing resources
    detectionLogic: "In-scope technical assets accepting XML data formats.",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored. " +
        "Also for cloud-based environments the exploitation impact is at least medium, as cloud backend services can be attacked via SSRF (and XXE vulnerabilities are often also SSRF vulnerabilities).",
    falsePositives: "Fully trusted (i.e. cryptographically signed or similar) XML data can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 611, // Improper Restriction of XML External Entity Reference
};

// Export the Category function
export function Category(): RiskCategory {
    return XmlExternalEntityCategory;
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
    const generatedRiskAssetIds = new Set<string>(); // Prevent duplicate risks per asset

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        // Check if asset is in scope and accepts XML
        if (technicalAsset && !technicalAsset.outOfScope &&
            technicalAsset.dataFormatsAccepted.includes(DataFormat.XML))
        {
             // Only add one risk per asset
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
    const title = `<b>XML External Entity (XXE)</b> risk at <b>${technicalAsset.title}</b>`;

    // Determine impact based on asset sensitivity and potential for SSRF-like behavior
    let impact = RiskExploitationImpact.Medium; // Default impact for XXE
    const isVerySensitive =
        technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential ||
        technicalAsset.getHighestIntegrity() === Criticality.MissionCritical ||
        technicalAsset.getHighestAvailability() === Criticality.MissionCritical; // Check highest Avail too

    if (isVerySensitive) {
        impact = RiskExploitationImpact.High;
    }

    // --- SSRF-like Data Breach Target Identification (as per TODO in Go code) ---
    const uniqueDataBreachTechnicalAssetIDs = new Set<string>();
    uniqueDataBreachTechnicalAssetIDs.add(technicalAsset.id); // The vulnerable asset itself

    // Check neighbors in the same network boundary that are web-accessible
    if (modelState.parsedModelRoot?.technicalAssets) {
        for (const potentialTargetAsset of Object.values(modelState.parsedModelRoot.technicalAssets)) {
             // Check if potential target is in the same network boundary as the XXE-vulnerable asset
             if (technicalAsset.isSameTrustBoundaryNetworkOnly(potentialTargetAsset.id)) {
                // Check if this potential target has any incoming web access links
                const potentialTargetIncomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[potentialTargetAsset.id] || [];
                const isWebAccessible = potentialTargetIncomingLinks.some(link => isPotentialWebAccessProtocol(link.protocol));

                if (isWebAccessible) {
                     uniqueDataBreachTechnicalAssetIDs.add(potentialTargetAsset.id); // Add as potential SSRF/XXE target
                     // Elevate impact further? The Go code didn't explicitly do this based on neighbors for XXE,
                     // but the RiskAssessment text mentions cloud SSRF impact.
                     // Let's keep the impact calculation based on the primary asset's sensitivity for now.
                }
            }
        }
    }
     // --- End SSRF-like Check ---

     // Adjust for cloud-based special risks (like SSRF check)
     const sourceBoundary = technicalAsset.getTrustBoundary();
     const isInCloud = sourceBoundary?.type === "network-cloud-provider" || sourceBoundary?.type === "network-cloud-security-group";
     if (impact === RiskExploitationImpact.Medium && isInCloud) { // Elevate to High if in cloud, mimicking SSRF impact logic
         impact = RiskExploitationImpact.High;
     }


    // Likelihood is VeryLikely if XML is accepted and parser not hardened
    const likelihood = RiskExploitationLikelihood.VeryLikely;

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the asset parsing XML
        DataBreachProbability.Probable, // XXE can read files/access resources, making breach probable
        Array.from(uniqueDataBreachTechnicalAssetIDs), // Include self + potentially reachable neighbors
        undefined,
        technicalAsset.id, // Most relevant asset is the one parsing XML
        undefined,
        undefined,
        undefined // No specific communication link is always most relevant
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
