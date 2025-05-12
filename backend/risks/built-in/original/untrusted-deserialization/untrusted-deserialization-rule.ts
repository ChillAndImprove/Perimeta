// File: risks/built-in/untrusted-deserialization.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    CommunicationLink, // Used to check incoming protocols
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
    TechnicalAssetTechnology, // Import EJB
    Protocol, // Import IIOP, JRMP etc.
    modelState // Access the global model state
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure adhering to the RiskCategory interface
export const UntrustedDeserializationCategory: RiskCategory = {
    id: "untrusted-deserialization",
    title: "Untrusted Deserialization",
    description: "When a technical asset accepts data in a specific serialized form (like Java or .NET serialization), " +
        "Untrusted Deserialization risks might arise." +
        "<br><br>See <a href=\"https://christian-schneider.net/JavaDeserializationSecurityFAQ.html\" target=\"_blank\" rel=\"noopener noreferrer\">https://christian-schneider.net/JavaDeserializationSecurityFAQ.html</a> " +
        "for more details.",
    impact: "If this risk is unmitigated, attackers might be able to execute code on target systems by exploiting untrusted deserialization endpoints.",
    asvs: "V5 - Validation, Sanitization and Encoding Verification Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html",
    action: "Prevention of Deserialization of Untrusted Data",
    mitigation: "Try to avoid the deserialization of untrusted data (even of data within the same trust-boundary as long as " +
        "it is sent across a remote connection) in order to stay safe from Untrusted Deserialization vulnerabilities. " +
        "Alternatively a strict whitelisting approach of the classes/types/values to deserialize might help as well. " +
        "When a third-party product is used instead of custom developed software, check if the product applies the proper mitigation and ensure a reasonable patch-level.",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Architecture, // Often a fundamental design/data format choice
    stride: STRIDE.Tampering, // Can lead to RCE, which is beyond Tampering, but originates from tampering input
    detectionLogic: "In-scope technical assets accepting serialization data formats (including EJB and RMI protocols).",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Fully trusted (i.e. cryptographically signed or similar) data deserialized can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 502, // Deserialization of Untrusted Data
};

// Export the Category function
export function Category(): RiskCategory {
    return UntrustedDeserializationCategory;
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

    // Define protocols indicating deserialization
    const deserializationProtocols = [
        Protocol.IIOP, Protocol.IIOPEncrypted,
        Protocol.JRMP, Protocol.JRMPEncrypted
    ];

    for (const id of assetIds) {
        const technicalAsset = modelState.parsedModelRoot.technicalAssets[id];

        if (!technicalAsset || technicalAsset.outOfScope) {
            continue;
        }

        let isPotentialTarget = false;
        let isAcrossTrustBoundary = false;
        let relevantCommLinkTitle = ""; // Store title of the link causing across boundary check

        // Check 1: Accepts Serialization DataFormat
        if (technicalAsset.dataFormatsAccepted.includes(DataFormat.Serialization)) {
            isPotentialTarget = true;
            // For data formats, we don't easily know if it came across a boundary without checking *all* links
            // Let's assume it *could* come from anywhere for now, impact/likelihood adjusted later.
            // The check below for specific protocols handles the boundary aspect more directly.
        }

        // Check 2: Is EJB Technology
        if (technicalAsset.technology === TechnicalAssetTechnology.EJB) {
            isPotentialTarget = true;
        }

        // Check 3: Incoming links use specific deserialization protocols (IIOP/JRMP)
        const incomingLinks = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[technicalAsset.id] || [];
        for (const commLink of incomingLinks) {
            if (deserializationProtocols.includes(commLink.protocol)) {
                isPotentialTarget = true;
                // If *any* such link crosses a boundary, mark the flag and store title
                if (commLink.isAcrossTrustBoundaryNetworkOnly()) {
                    isAcrossTrustBoundary = true;
                    relevantCommLinkTitle = commLink.title;
                    // We could break here if finding one across-boundary link is enough,
                    // but checking all ensures we capture the title if needed.
                }
            }
        }

        // If any check indicated potential deserialization target
        if (isPotentialTarget) {
            risks.push(createRisk(technicalAsset, isAcrossTrustBoundary, relevantCommLinkTitle));
        }
    }
    return risks;
}


// Helper function to create a Risk instance
function createRisk(
    technicalAsset: TechnicalAsset,
    acrossTrustBoundary: boolean,
    commLinkTitle: string // Title of link crossing boundary, if applicable
    ): Risk
{
    const category = Category();
    let title = `<b>Untrusted Deserialization</b> risk at <b>${technicalAsset.title}</b>`;
    let likelihood = RiskExploitationLikelihood.Likely; // Default likelihood is high if deserialization occurs
    let impact = RiskExploitationImpact.High; // Default impact is High due to RCE potential

    if (acrossTrustBoundary) {
        likelihood = RiskExploitationLikelihood.VeryLikely; // Higher likelihood if exposed across boundary
        title += ` across a trust boundary (at least via communication link <b>${commLinkTitle}</b>)`;
    }

    // Elevate impact if target asset is highly sensitive
    const isVerySensitive =
        technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential ||
        technicalAsset.getHighestIntegrity() === Criticality.MissionCritical ||
        technicalAsset.getHighestAvailability() === Criticality.MissionCritical; // Check availability too? Go code didn't

    if (isVerySensitive) {
        impact = RiskExploitationImpact.VeryHigh;
    }

    // Create the risk object
    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID focuses on the asset deserializing data
        DataBreachProbability.Probable, // RCE via deserialization often leads to data breach
        [technicalAsset.id], // The asset deserializing data is the breach point
        undefined,
        technicalAsset.id, // Most relevant asset
        undefined,
        undefined,
        undefined // No single link is always most relevant (could be via format or protocol)
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
