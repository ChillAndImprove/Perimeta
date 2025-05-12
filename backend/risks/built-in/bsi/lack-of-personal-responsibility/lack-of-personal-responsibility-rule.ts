import {
    RiskCategory,
    Risk,
    TechnicalAsset, // Changed from DataAsset
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,    // For impact calculation
    Criticality,        // For impact calculation
    TechnicalAssetTechnology, // To filter specific asset types
    modelState
} from '../../../../model/types.ts'; // Adjust the path back to model.ts as needed

// Define the Category structure
export const LackOfResponsibilityForAssetCategory: RiskCategory = {
    id: "lack-of-personal-responsibility-for-asset-ism2.1",
    title: "Lack of Personal Responsibility for Technical Asset Security (BSI ISM.2.1)",
    description: "If the security responsibilities for specific technical assets (like desktops, client systems, or managed components) " +
        "are not clearly defined for the personnel in roles that manage or primarily use them, " +
        "it is likely that necessary security measures for these assets will not be implemented. " +
        "This often happens because implementing security measures can represent additional effort in the accustomed workflow for those roles.",
    impact: "Failure to implement necessary security measures on technical assets, due to unclear responsibilities of associated roles, " +
        "leads to unmitigated vulnerabilities on those assets. This increases the likelihood of security incidents (e.g., malware on a desktop, misconfigured component), " +
        "data breaches involving data processed or accessed by the asset, operational disruptions of the asset, and non-compliance. " +
        "This can result in financial losses, reputational damage, and legal consequences.",
    asvs: "Derived from BSI IT-Grundschutz Baustein ISM.2.1 (Security Management - Roles and Responsibilities). Aligns with ASVS V1 (Architecture) regarding clear ownership and responsibility for system components.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz)",
    action: "Define and Enforce Security Responsibilities for Roles Managing/Using Key Technical Assets",
    mitigation: "Clearly define, document, and communicate all security-related responsibilities for roles that manage, configure, or are primary users of " +
        "specific technical assets (especially endpoints like desktops, client systems, and critical components). " +
        "Ensure that every individual in those roles understands their specific security duties concerning the assets they are responsible for or use (e.g., patching, secure configuration, reporting incidents). " +
        "Implement a process for accountability. Top management should visibly support and enforce these responsibilities. Regular awareness training should reinforce these roles and asset-specific duties.",
    check: "Are security responsibilities for roles managing/using specific technical assets (like desktops, tools, specific components) clearly defined, documented, assigned, communicated, and understood? Is there evidence of accountability for security tasks related to these assets?",
    function: RiskFunction.Governance,
    stride: STRIDE.Repudiation, // Individuals might repudiate their responsibility for asset security, leading to tampering or info disclosure if the asset is compromised
    detectionLogic: "Applies to technical assets (like desktops, client systems, specific tools/components) that are tagged with a 'role:*' identifier, " +
                    "indicating that personnel in these roles are key to the asset's security or are its primary users. " +
                    "The risk arises if their responsibilities towards these assets are not clearly defined and enforced.",
    riskAssessment: "The likelihood is high if responsibilities are unclear. The impact depends on the criticality of the technical asset itself and the data it processes or can access. " +
                    "For example, an administrator's desktop with unclear security responsibilities poses a higher risk than a standard user's desktop, assuming both have unclear responsibilities.",
    falsePositives: "This risk is organizational. Automated detection based on tags and asset type is an indicator. Actual confirmation requires review of organizational processes, role descriptions, and security policies related to asset management. " +
                    "An organization might have these roles and assets with clearly defined responsibilities, making this a false positive if only tags/types are checked without process review.",
    modelFailurePossibleReason: false,
    cwe: 200, // Consequence: Exposure of Sensitive Information (if asset is compromised)
              // Could also be CWE-284 (Improper Access Control) if responsibilities for configuring access are unclear.
};

export function Category(): RiskCategory {
    return LackOfResponsibilityForAssetCategory;
}

export function SupportedTags(): string[] {
    return [
        "role:administrator",
        "role:it-sicherheitsbeauftragter",
        "role:datenschutzbeauftragter",
        "role:fachadministrator",
        "role:endbenutzer",
        "role:entwickler",
        "role:externer-dienstleister",
        "role:pruefer",
        "role:redakteur",
        "role:leitungsebene"
    ];
}

// Technologies that often represent user endpoints or manageable components
const RELEVANT_TECHNOLOGIES: TechnicalAssetTechnology[] = [
    TechnicalAssetTechnology.ClientSystem,
    TechnicalAssetTechnology.Desktop,
    TechnicalAssetTechnology.MobileApp, // If centrally managed or configured by a role
    TechnicalAssetTechnology.DevOpsClient,
    TechnicalAssetTechnology.Tool,       // e.g., a security tool managed by an IT admin
    TechnicalAssetTechnology.CLI,        // Specific CLI tools used by roles
    TechnicalAssetTechnology.IoTDevice,  // If managed by a specific operational role
    // TechnicalAssetTechnology.Library, // Could be added if developers have specific responsibilities for library security beyond just using them
    // Add other relevant technologies here if needed
];

export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot?.technicalAssets) {
        return risks;
    }

    const supportedRoleTags = SupportedTags();

    for (const techAssetId in modelState.parsedModelRoot.technicalAssets) {
        const techAsset = modelState.parsedModelRoot.technicalAssets[techAssetId];

        if (techAsset && !techAsset.outOfScope && RELEVANT_TECHNOLOGIES.includes(techAsset.technology)) {
            let matchedRoleTag: string | undefined = undefined;
            for (const tag of supportedRoleTags) {
                if (techAsset.isTaggedWithAny(tag)) { // isTaggedWithAny can take a single tag
                    matchedRoleTag = tag;
                    break;
                }
            }

            if (matchedRoleTag) {
                // This risk applies if such an asset exists and is associated with a role,
                // assuming the weakness (unclear responsibility for that asset by that role) is present.
                const risk = createRiskForTechnicalAsset(techAsset, matchedRoleTag);
                risks.push(risk);
            }
        }
    }
    return risks;
}

function createRiskForTechnicalAsset(technicalAsset: TechnicalAsset, roleTag: string): Risk {
    const category = Category();
    const roleName = roleTag.substring(roleTag.indexOf(':') + 1);
    const title = `<b>${category.title}</b> for asset <b>${technicalAsset.title}</b> (type: ${technicalAsset.technology}), associated with role: <u>${roleName}</u>`;

    // Base Likelihood: If responsibilities are *assumed* to be unclear (which is the premise of this risk trigger),
    // then negative outcomes are likely.
    const likelihood = RiskExploitationLikelihood.Likely;

    // Determine impact based on asset sensitivity
    let impact = RiskExploitationImpact.Low;
    const highConf = technicalAsset.confidentiality >= Confidentiality.Confidential;
    const highInteg = technicalAsset.integrity >= Criticality.Critical;
    const highAvail = technicalAsset.availability >= Criticality.Critical;

    const criticalConf = technicalAsset.confidentiality === Confidentiality.StrictlyConfidential;
    const criticalInteg = technicalAsset.integrity === Criticality.MissionCritical;
    const criticalAvail = technicalAsset.availability === Criticality.MissionCritical;

    if (highConf || highInteg || highAvail) {
        impact = RiskExploitationImpact.Medium;
    }
    if (criticalConf || criticalInteg || criticalAvail) {
        impact = RiskExploitationImpact.High;
    }
    // If asset is important but not highly/critically sensitive, but the role is powerful (e.g. admin desktop),
    // we might still consider a higher base impact. For now, asset sensitivity drives it.

    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Possible, // If security measures for the asset are neglected, data breach via this asset is possible
        [], // No specific data assets directly breached by *this* organizational risk itself, but data *on* or *accessible by* the tech asset are at risk
        technicalAsset.dataAssetsProcessed.map(da => da.id).concat(technicalAsset.dataAssetsStored.map(da => da.id)), // Data assets at risk *due to* compromise of this technical asset
        technicalAsset.id, // Most relevant technical asset
        undefined, // No specific trust boundary usually most relevant
        technicalAsset.id // The asset itself can be seen as a shared runtime for this context
    );

    return risk;
}

import { CustomRiskRule } from '../../../model.ts';

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags,
    generateRisks: GenerateRisks,
};
