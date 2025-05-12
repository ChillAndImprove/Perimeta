import {
    RiskCategory,
    Risk,
    // TechnicalAsset, // Not directly used, but modelState.parsedModelRoot.technicalAssets is
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,    // For impact calculation
    Criticality,        // For impact calculation
    // TechnicalAssetTechnology, // We'll rely on role tags primarily
    modelState
} from '../../../../model/types.ts'; // Adjust path as needed

// Define the Category structure for Insufficient Strategic and Conceptual Security Guidelines
export const InsufficientStrategicConceptualGuidelinesCategory: RiskCategory = {
    id: "insufficient-strategic-conceptual-guidelines-ism2.3",
    title: "Insufficient Strategic and Conceptual Security Guidelines (Affecting Role-Managed/Developed Assets) (BSI ISM.2.3)",
    description: "When strategic and conceptual security guidelines (e.g., security concepts, secure development policies, system hardening standards) are inadequately defined, communicated, not backed by management commitment (viewed as mere intentions), or unresourced, personnel in key roles (especially developers, administrators) lack the necessary direction to implement security effectively. This results in them unintentionally or intentionally deviating from unstated, poorly understood, or unsupported security requirements for the assets they manage or develop. It can also lead to a false sense of security through automation assumed to be inherently secure, and unstructured responses to incidents.",
    impact: "A lack of clear, communicated, and resourced strategic/conceptual security guidelines for roles like developers or administrators means assets are likely developed or managed without proper security considerations being consistently applied. This can result in systemic vulnerabilities (e.g., insecure code, misconfigurations), non-compliance with actual security objectives (despite documented intentions), inconsistent security postures, increased risk of data breaches, and ineffective or chaotic responses to security incidents. Ultimately, only partial security improvements are achieved, and strategic security goals remain unfulfilled.",
    asvs: "Derived from BSI IT-Grundschutz ISM.2.3. This rule applies it by considering how a lack of clear, resourced, and actionable strategic/conceptual guidelines directly impacts the security of assets managed or developed by key roles.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - See ISM.2.3)",
    action: "Establish, Communicate, Enforce, and Resource Clear Strategic and Conceptual Security Guidelines for All Relevant Roles and Assets.",
    mitigation: "Top management must ensure that: " +
        "1. Comprehensive security concepts and strategic guidelines are developed, documented, and cover all relevant areas (e.g., secure development lifecycle, system hardening, incident response, data protection). " +
        "2. These guidelines are effectively communicated to and understood by all relevant personnel, especially roles like developers and administrators. " +
        "3. Strategic security goals are treated as firm commitments, not just intentions, and are backed by sufficient resources (budget, tools, time, training) for implementation. " +
        "4. Adherence to guidelines is monitored, and they are regularly reviewed and updated. " +
        "5. It is not falsely assumed that automation inherently ensures security without specific conceptual guidance and proper configuration. " +
        "6. Incident response procedures are clearly defined based on strategic objectives and are regularly tested.",
    check: "For technical assets managed or developed by specific roles (e.g., developers, administrators): Is there evidence that these roles are unable to implement security measures consistently, write secure code, or respond to incidents effectively due to a lack of clear, communicated, resourced, or management-backed strategic or conceptual security guidelines?",
    function: RiskFunction.Governance, // Root cause is a governance failure to establish and enforce strategy
    stride: STRIDE.Repudiation, // Management treating strategic goals as 'mere intentions' without resources is a form of repudiating the commitment to those goals, leading to guidelines not being followed.
    detectionLogic: "Applies to technical assets that are tagged with a 'role:*' identifier (e.g., 'role:entwickler', 'role:administrator'). " +
                    "The risk arises if the organization's strategic and conceptual security guidelines are insufficient, poorly communicated, not resourced, or not seriously adopted by management, " +
                    "thereby preventing personnel in these roles from applying necessary security practices to the assets they manage or develop.",
    riskAssessment: "The likelihood of the *organizational failing* (insufficient or unresourced strategic/conceptual guidelines) is assumed if not proven otherwise. If this failing exists, " +
                    "the likelihood of *negative consequences for assets managed/developed by key roles* (e.g., developers producing insecure code due to lack of clear, supported secure coding guidelines) is high. " +
                    "The impact depends on the criticality of the technical asset itself and the data it processes or can access. For example, a critical application developed without clear, actionable security guidelines poses a higher risk.",
    falsePositives: "This risk assumes a systemic lack of adequate and actionable strategic/conceptual guidelines. " +
                    "A false positive for a specific asset might occur if, despite a general deficiency in organization-wide guidelines, the team/role responsible for *that specific asset* (e.g., a highly skilled development team) has independently adopted and follows robust security practices, or if specific critical projects have received exceptional ad-hoc guidance and resources.",
    modelFailurePossibleReason: false,
    cwe: 1396, // CWE-1396: Failure to Address Business Requirement for Security (if strategic goals representing security requirements are not seriously pursued)
              // Could also lead to CWE-1035 (Security Misconfiguration) or CWE-657 (Violation of Secure Design Principles) if guidelines are missing/not followed.
};

export function Category(): RiskCategory {
    return InsufficientStrategicConceptualGuidelinesCategory;
}

export function SupportedTags(): string[] {
    // These are the SAME tags as in your ISM.2.1 and ISM.2.2 examples.
    // The presence of these tags on an asset means a specific role is involved.
    // This risk (ISM.2.3) implies that if strategic/conceptual guidelines are poor, that role can't do their job securely for this asset.
    return [
        "role:administrator",
        "role:it-sicherheitsbeauftragter",
        "role:datenschutzbeauftragter",
        "role:fachadministrator",
        "role:endbenutzer",
        "role:entwickler", // Explicitly mentioned as a key concern
        "role:externer-dienstleister",
        "role:pruefer",
        "role:redakteur",
        "role:leitungsebene"
    ];
}

export function GenerateRisks(): Risk[] {
    if (window.currentSelectedThreatStandard !== 'BSI') {
        return [];
    }
    const risks: Risk[] = [];
    const category = Category();

    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks;
    }

    const supportedRoleTags = SupportedTags();

    for (const techAssetId in modelState.parsedModelRoot.technicalAssets) {
        const techAsset = modelState.parsedModelRoot.technicalAssets[techAssetId];

        if (techAsset && !techAsset.outOfScope) {
            let matchedRoleTag: string | undefined = undefined;
            for (const tag of supportedRoleTags) {
                if (techAsset.isTaggedWithAny(tag)) {
                    matchedRoleTag = tag;
                    break;
                }
            }

            if (matchedRoleTag) {
                // This risk applies if such an asset exists and is associated with a role,
                // AND we assume the organizational weakness (insufficient strategic/conceptual guidelines) is present,
                // hindering that role from securing/developing this asset appropriately.

                const roleName = matchedRoleTag.substring(matchedRoleTag.indexOf(':') + 1);
                const title = `<b>${category.title}</b> for asset <b>${techAsset.title}</b> (associated with role: <u>${roleName}</u>), due to insufficient or unresourced strategic/conceptual security guidelines.`;

                // Likelihood: If guidelines are lacking/unsupported, it's likely roles cannot adequately secure/develop assets.
                const likelihood = RiskExploitationLikelihood.Likely;

                // Impact based on asset sensitivity (same logic as ISM.2.1/ISM.2.2 examples)
                let impact = RiskExploitationImpact.Low;
                const highConf = techAsset.confidentiality >= Confidentiality.Confidential;
                const highInteg = techAsset.integrity >= Criticality.Critical;
                const highAvail = techAsset.availability >= Criticality.Critical;

                const criticalConf = techAsset.confidentiality === Confidentiality.StrictlyConfidential;
                const criticalInteg = techAsset.integrity === Criticality.MissionCritical;
                const criticalAvail = techAsset.availability === Criticality.MissionCritical;

                if (highConf || highInteg || highAvail) {
                    impact = RiskExploitationImpact.Medium;
                }
                if (criticalConf || criticalInteg || criticalAvail) {
                    impact = RiskExploitationImpact.High;
                }

                const risk = new Risk(
                    category.id,
                    CalculateSeverity(likelihood, impact),
                    likelihood,
                    impact,
                    title,
                    `${category.id}@${techAsset.id}`, // Synthetic ID
                    DataBreachProbability.Possible, // Lack of guidelines can lead to various breaches
                    [], // Specific vulnerabilities not identified here, it's a systemic risk
                    techAsset.dataAssetsProcessed.map(da => da.id).concat(techAsset.dataAssetsStored.map(da => da.id)),
                    techAsset.id,
                    undefined, // Not directly tied to a specific diagram node like a trust boundary
                    techAsset.id // The technical asset itself is the primary scope
                );
                risks.push(risk);
            }
        }
    }
    return risks;
}

// Standard export for Threagile custom risk rules
import { CustomRiskRule } from '../../../model.ts'; // Ensure S is removed if it's a typo from template

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags,
    generateRisks: GenerateRisks,
};
