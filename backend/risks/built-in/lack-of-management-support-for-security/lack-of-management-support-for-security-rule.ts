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
    Confidentiality,    // For impact calculation
    Criticality,        // For impact calculation
    // TechnicalAssetTechnology, // We'll rely on role tags primarily
    modelState
} from '../../../model/types.ts'; // Adjust path as needed

// Define the Category structure for Lack of Management Support
export const LackOfManagementSupportForSecurityCategory: RiskCategory = {
    id: "lack-of-management-support-for-security-ism2.2",
    title: "Lack of Management Support for Information Security (Affecting Role-Managed Assets) (BSI ISM.2.2)",
    description: "If top institutional management does not unequivocally support the information security program and the roles responsible for asset security, " +
        "personnel in these roles (e.g., administrators, developers) may be unable to effectively implement or maintain necessary security measures on the technical assets they manage or primarily use. " +
        "This often occurs because requests for security resources, policy enforcement, or prioritization of security tasks for these assets are not adequately backed or funded by management.",
    impact: "Insufficient management support for security, when affecting roles responsible for specific technical assets, leads to those assets being inadequately protected. " +
        "This results in unmitigated vulnerabilities, increasing the likelihood of compromise of these assets (e.g., malware, unauthorized access), data breaches involving data processed/accessed by them, " +
        "operational disruptions, and non-compliance. The security efforts of responsible personnel are undermined by the lack of top-level backing.",
    asvs: "Derived from BSI IT-Grundschutz ISM.2.2. This rule applies it by considering how a lack of management support " +
          "directly impacts the security of assets managed by key roles, similar to how ISM.2.1 considers lack of personal responsibility for such assets.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - See ISM.2.2)",
    action: "Ensure Top Management Provides Full Support for Security, Enabling Roles to Secure Their Assigned Assets.",
    mitigation: "Top management must actively and visibly support the information security program and empower roles with security responsibilities. This includes: " +
        "1. Allocating necessary resources (budget, tools, time) for roles to secure the assets they manage. " +
        "2. Granting authority to personnel in these roles to implement and enforce security policies on their assigned assets. " +
        "3. Prioritizing security tasks and remediation efforts identified by these roles. " +
        "4. Fostering a culture where security contributions from all roles are valued and supported by leadership. " +
        "Ensure that personnel managing critical assets are not hindered by a lack of management backing when trying to implement security measures.",
    check: "For technical assets managed by specific roles (e.g., administrators, developers): Is there evidence that these roles are unable to adequately secure these assets due to a lack of support, resources, or backing from top management regarding security initiatives or needs?",
    function: RiskFunction.Governance, // Root cause is a governance failure
    stride: STRIDE.Repudiation, // Management effectively repudiates their responsibility to enable asset security, leading to other issues. Can also lead to Elevation of Privilege if admins can't secure systems properly.
    detectionLogic: "Applies to technical assets that are tagged with a 'role:*' identifier, indicating a specific role is key to the asset's security. " +
                    "The risk arises if organizational management does not provide adequate support (e.g., resources, authority, priority) for security, " +
                    "thereby hindering the individuals in these roles from effectively securing these assets.",
    riskAssessment: "The likelihood of the *organizational failing* (lack of management support) is assumed if not proven otherwise. If this failing exists, " +
                    "the likelihood of *negative consequences for assets managed by key roles* is high. " +
                    "The impact depends on the criticality of the technical asset itself and the data it processes or can access. " +
                    "For example, an administrator's desktop, if poorly secured due to lack of management support for security, poses a higher risk than a standard user's desktop suffering from the same systemic issue.",
    falsePositives: "This risk assumes a systemic lack of management support. Automated detection based on 'role:*' tags on assets is an indicator of where this systemic issue could have severe consequences. " +
                    "A false positive for a specific asset might occur if, despite a general lack of management support, the role managing *that specific asset* has found alternative means to secure it, or if management support is selectively adequate for certain critical areas. " +
                    "Requires qualitative assessment of overall management support for security.",
    modelFailurePossibleReason: false,
    cwe: 1397, // CWE-1397: Missing Support for Security Manager Role (extrapolated to roles managing assets)
              // Could also lead to CWE-732 (Incorrect Permission Assignment for Critical Resource) if admins can't enforce proper permissions due to lack of backing.
};

export function Category(): RiskCategory {
    return LackOfManagementSupportForSecurityCategory;
}

export function SupportedTags(): string[] {
    // These are the SAME tags as in your ISM.2.1 "Lack of Personal Responsibility" example.
    // The presence of these tags on an asset means a specific role is involved.
    // This risk (ISM.2.2) now says: if management doesn't support security, that role can't do their job properly for this asset.
    return [
        "role:administrator",
        "role:it-sicherheitsbeauftragter",
        "role:datenschutzbeauftragter",
        "role:fachadministrator",
        "role:endbenutzer", // Could be included if end-user security depends on mgmt-supported tools/training
        "role:entwickler",
        "role:externer-dienstleister", // If their ability to secure assets they manage depends on your mgmt support
        "role:pruefer",
        "role:redakteur",
        "role:leitungsebene" // If even leaders can't secure their assets due to lack of broader org support
    ];
}

// Optional: You could still filter by technology in combination with role tags if desired
// const RELEVANT_TECHNOLOGIES: TechnicalAssetTechnology[] = [
//     TechnicalAssetTechnology.ClientSystem,
//     TechnicalAssetTechnology.Desktop,
//     // ... other relevant technologies for roles
// ];

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

        // Optional: Add technology check here if needed:
        // if (techAsset && !techAsset.outOfScope && RELEVANT_TECHNOLOGIES.includes(techAsset.technology)) {
        if (techAsset && !techAsset.outOfScope) { // Current: No additional technology filter
            let matchedRoleTag: string | undefined = undefined;
            for (const tag of supportedRoleTags) {
                if (techAsset.isTaggedWithAny(tag)) {
                    matchedRoleTag = tag;
                    break;
                }
            }

            if (matchedRoleTag) {
                // This risk applies if such an asset exists and is associated with a role,
                // AND we assume the organizational weakness (lack of management support for security) is present,
                // hindering that role from securing this asset.

                const roleName = matchedRoleTag.substring(matchedRoleTag.indexOf(':') + 1);
                const title = `<b>${category.title}</b> for asset <b>${techAsset.title}</b> (associated with role: <u>${roleName}</u>), due to insufficient management backing for security.`;

                // Likelihood: If management support is lacking, it's likely that roles cannot adequately secure their assets.
                const likelihood = RiskExploitationLikelihood.Likely;

                // Impact based on asset sensitivity (same as ISM.2.1 example)
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
                    DataBreachProbability.Possible,
                    [],
                    techAsset.dataAssetsProcessed.map(da => da.id).concat(techAsset.dataAssetsStored.map(da => da.id)),
                    techAsset.id,
                    undefined,
                    techAsset.id
                );
                risks.push(risk);
            }
        }
    }
    return risks;
}

import { CustomRiskRule } from '../../../model.ts';

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags,
    generateRisks: GenerateRisks,
};
