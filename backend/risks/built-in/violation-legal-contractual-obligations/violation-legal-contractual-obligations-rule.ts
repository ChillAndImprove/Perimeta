import {
    RiskCategory,
    Risk,
    // TechnicalAsset, // Not directly used explicitly, but modelState.parsedModelRoot.technicalAssets is
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,    // For impact calculation (asset.confidentiality)
    Criticality,        // For impact calculation (asset.integrity, asset.availability)
    modelState
} from '../../../model/types.ts'; // Adjust path as needed if your Threagile model types are elsewhere

// Define the Category structure for Violation of Legal Regulations and Contractual Agreements
export const ViolationLegalContractualObligationsCategory: RiskCategory = {
    id: "violation-legal-contractual-obligations-ism2.7",
    title: "Violation of Legal Regulations and Contractual Agreements (BSI ISM.2.7)",
    description: "Insufficient security of information, business processes, or IT systems (e.g., due to inadequate security management, lack of awareness of obligations, or failure to implement necessary controls) can lead to violations of applicable legal requirements (e.g., data protection laws, industry-specific regulations) or contractually agreed security standards with business partners. This risk is heightened by insufficient knowledge of diverse national and international laws, such as those related to data protection, information disclosure, insolvency, liability, or third-party information access.",
    impact: "Violations can result in severe legal consequences (e.g., fines, sanctions, lawsuits), contractual penalties (e.g., damages, termination of contracts, loss of business relationships), loss of certifications or licenses, significant reputational damage, and erosion of trust from customers and partners.",
    asvs: "Derived from BSI IT-Grundschutz ISM.2.7 Verstoß gegen gesetzliche Regelungen und vertragliche Vereinbarungen.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - Search for ISM.2.7)",
    action: "Identify, Understand, Implement, and Continuously Monitor Compliance with All Applicable Legal and Contractual Security Obligations.",
    mitigation: "Top management must ensure that: " +
        "1. A comprehensive process is established and maintained to identify all relevant legal (national, international), regulatory, and contractual security obligations applicable to the institution's information, processes, and IT systems. " +
        "2. These obligations are thoroughly understood, documented, and effectively communicated to all relevant personnel and stakeholders. " +
        "3. Appropriate technical and organizational security measures (TOMs) are designed, implemented, maintained, and regularly verified to meet these obligations. This typically involves a robust Information Security Management System (ISMS). " +
        "4. Compliance requirements are integrated into the entire lifecycle (design, development, operation, decommissioning) of IT systems and business processes. " +
        "5. For institutions with international operations or handling international data, specific expertise and adherence to relevant foreign laws (e.g., regarding data protection, disclosure obligations, liability, information access for third parties) are ensured. " +
        "6. Contracts with business partners, suppliers, and service providers are carefully reviewed for security requirements, and mechanisms for ensuring and monitoring compliance are established. " +
        "7. Regular internal and external compliance audits, risk assessments, and reviews are conducted, specifically focusing on legal and contractual adherence, and any identified gaps are remediated promptly.",
    check: "Is the institution fully aware of all its legal, regulatory, and contractual security obligations relevant to its IT systems, information, and business processes? Are there adequate, implemented, and regularly verified security measures and robust governance processes in place to ensure ongoing compliance and prevent violations?",
    function: RiskFunction.Governance, // This risk primarily relates to governance failures in ensuring compliance.
    stride: STRIDE.Repudiation, // Failure to implement required security measures can be seen as repudiating the (implicit or explicit) obligation to comply with laws and contracts.
    detectionLogic: "Applies to technical assets that, due to their nature (e.g., processing sensitive data like PII or financial data; supporting critical business operations; being subject to specific SLAs or regulatory oversight), are likely targets for significant legal or contractual security obligations. The risk materializes if the overall security posture or specific controls for these assets are deemed insufficient to meet such obligations. This insufficiency can stem from inadequate security management, lack of awareness of legal/contractual requirements, or failure to implement and maintain necessary controls.",
    riskAssessment: "The likelihood of violating legal or contractual obligations is rated 'Possible' to 'Likely' if security management practices are generally weak, if there's a lack of awareness of specific obligations, or if compliance measures for critical assets are not evident or robust. The impact is typically 'High' to 'Very High' depending on the criticality of the asset/data involved and the severity of potential consequences (e.g., substantial fines for data protection breaches like GDPR, loss of major contracts, severe reputational damage, or even operational shutdown).",
    falsePositives: "A false positive might occur if, for a specific flagged asset, robust and independently verified compliance measures are indeed in place that fully address all pertinent legal and contractual security obligations. This can happen if these measures are managed outside the scope of the threat model or are not detailed in a way that Threagile can automatically recognize their sufficiency.",
    modelFailurePossibleReason: false,
    cwe: 1396, // CWE-1396: Failure to Address Business Requirement for Security (where legal/contractual requirements are considered key business requirements for security).
              // Violations might also lead to specific weaknesses like CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor) or CWE-16 (Configuration) if controls are missing or misconfigured.
};

export function Category(): RiskCategory {
    return ViolationLegalContractualObligationsCategory;
}

export function SupportedTags(): string[] {
    // This risk applies based on asset criticality (Confidentiality, Integrity, Availability ratings)
    // and the sensitivity of data it handles, rather than relying on specific tags for initial selection.
    // The GenerateRisks function implements this logic by inspecting asset properties.
    // If specific compliance-related tags were consistently used in a model (e.g., 'gdpr-scope',
    // 'pci-scope', 'contract-critical', 'processes-pii'), they could potentially be used to
    // refine or augment the applicability logic within the GenerateRisks function.
    // Returning an empty array as tags are not the primary driver for this rule's asset selection logic.
    return [];
}

export function GenerateRisks(): Risk[] {
    if (window.currentSelectedThreatStandard !== 'BSI') {
        return [];
    }
    const risks: Risk[] = [];
    const categoryDetails = Category(); // Get the category details once

    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks;
    }

    for (const techAssetId in modelState.parsedModelRoot.technicalAssets) {
        const techAsset = modelState.parsedModelRoot.technicalAssets[techAssetId];

        if (techAsset && !techAsset.outOfScope) {
            // Determine if the asset is sensitive or critical enough to likely be subject to
            // significant legal or contractual security obligations.
            // This includes assets with high confidentiality, integrity, or availability requirements.
            const isSensitiveOrCritical =
                techAsset.confidentiality >= Confidentiality.Confidential ||
                techAsset.integrity >= Criticality.Critical ||
                techAsset.availability >= Criticality.Critical;

            if (isSensitiveOrCritical) {
                // This asset is deemed sensitive/critical. The risk is that insufficient security
                // (due to organizational failings like poor security management, lack of awareness of obligations,
                // or inadequate implementation of controls) leads to a violation of legal or contractual
                // obligations related to this asset.

                const title = `<b>${categoryDetails.title}</b> for asset <b>${techAsset.title}</b>, due to potential non-compliance from insufficient security safeguards.`;

                // Likelihood: Default to 'Possible'. This assumes that without explicit evidence of
                // robust compliance and security management specifically addressing this asset's context,
                // a violation is considered possible.
                const likelihood = RiskExploitationLikelihood.Possible;

                // Impact: Determined by the asset's C/I/A ratings, reflecting the potential severity
                // of legal, contractual, financial, or reputational damage from a compliance failure.
                let impact = RiskExploitationImpact.Medium; // Base impact if any C/I/A threshold is met at a lower "high" level.

                const highConf = techAsset.confidentiality >= Confidentiality.Confidential; // e.g., Confidential, StrictlyConfidential
                const highInteg = techAsset.integrity >= Criticality.Critical;       // e.g., Critical, MissionCritical
                const highAvail = techAsset.availability >= Criticality.Critical;     // e.g., Critical, MissionCritical

                const veryHighConf = techAsset.confidentiality === Confidentiality.StrictlyConfidential;
                const veryHighInteg = techAsset.integrity === Criticality.MissionCritical;
                const veryHighAvail = techAsset.availability === Criticality.MissionCritical;

                if (highConf || highInteg || highAvail) {
                    // If data is Confidential, or Integrity/Availability is Critical
                    impact = RiskExploitationImpact.High;
                }
                if (veryHighConf || veryHighInteg || veryHighAvail) {
                    // If data is Strictly Confidential, or Integrity/Availability is Mission-Critical
                    impact = RiskExploitationImpact.VeryHigh;
                }

                const risk = new Risk(
                    categoryDetails.id,
                    CalculateSeverity(likelihood, impact),
                    likelihood,
                    impact,
                    title,
                    `${categoryDetails.id}@${techAsset.id}`, // Synthetic ID for this specific risk instance
                    DataBreachProbability.Possible, // A compliance violation might lead to a data breach, but not necessarily all types of violations are data breaches.
                    [], // Specific vulnerabilities are not identified here; this is a risk of non-compliance due to systemic/governance issues.
                    // Data assets affected are those processed or stored by this technical asset, as they are often the subject of regulations.
                    techAsset.dataAssetsProcessed.map(da => da.id).concat(techAsset.dataAssetsStored.map(da => da.id)),
                    techAsset.id, // The ID of the technical asset this risk applies to.
                    undefined,    // Not directly tied to a specific diagram node like a trust boundary; applies to the asset itself.
                    techAsset.id  // The primary scope of this risk instance is the technical asset.
                );
                risks.push(risk);
            }
        }
    }
    return risks;
}

// Standard export for Threagile custom risk rules
import { CustomRiskRule } from '../../../model.ts'; // Adjust path to Threagile's model definition if necessary

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags, // Returns an empty array; asset selection logic is self-contained in GenerateRisks.
    generateRisks: GenerateRisks,
};
