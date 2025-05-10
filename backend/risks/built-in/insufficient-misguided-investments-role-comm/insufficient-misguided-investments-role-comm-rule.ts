import {
    RiskCategory,
    Risk,
    TechnicalAsset, // Used for type hint for techAsset
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    modelState,
    DataAsset // Used for finding most sensitive data asset
} from '../../../model/types.ts'; // Adjust path as needed

// Define the Category structure for Insufficient or Misguided Security Investments (Role Communication Focus)
export const InsufficientMisguidedInvestmentsRoleCommCategory: RiskCategory = {
    id: "insufficient-misguided-investments-role-comm-ism2.4",
    title: "Insufficient/Misguided Investments for Role-Managed Assets due to Communication Gaps (BSI ISM.2.4)",
    description: "When personnel in key roles (e.g., developers, administrators) do not effectively communicate the security status, needs, and deficiencies of the assets they manage to the institution's leadership, management lacks the necessary information to make informed security investment decisions for these assets. This can lead to insufficient resources being allocated or resources being misapplied, resulting in an imbalanced security posture where these specific assets suffer from critical vulnerabilities, or expensive solutions are poorly implemented for them.",
    impact: "If key roles fail to adequately inform management about the security needs of assets they are responsible for, these assets are likely to be under-resourced or have resources misapplied. This can lead to unaddressed vulnerabilities, an imbalanced security posture for these specific assets, wasted financial resources on ineffective solutions, a false sense of security, and ultimately, failure to protect these assets and their data effectively.",
    asvs: "Derived from BSI IT-Grundschutz ISM.2.4. This rule applies it by considering how a lack of upward communication from key roles about asset-specific security needs can lead to misguided or insufficient investments affecting those assets.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - See ISM.2.4)",
    action: "Establish Clear Communication Channels and Responsibilities for Key Roles to Report Security Needs to Management for Informed Investment Decisions.",
    mitigation: "Top management must ensure that: " +
        "1. Clear processes and responsibilities are established for personnel in key roles (e.g., developers, administrators, asset owners) to regularly and comprehensively report the security status, identified deficiencies, and resource needs for the assets they manage. " +
        "2. This information is actively solicited, received, and considered by management when making security investment decisions concerning these assets. " +
        "3. Security investment decisions for specific assets are based on this communicated information and a thorough risk assessment, ensuring resources are allocated sufficiently and appropriately. " +
        "4. Roles are empowered and encouraged to advocate for the security needs of their systems. " +
        "5. The effectiveness of these communication channels and the resulting investment decisions are periodically reviewed.",
    check: "For technical assets managed by specific roles (e.g., developers, administrators): Is there evidence that these roles are unable to secure adequate or appropriate resources for necessary security measures (e.g., tools, training, time for patching/hardening) because their needs are not effectively communicated to, or understood/prioritized by, management? Do critical vulnerabilities persist on these assets due to lack of funding for remediation attributable to this communication gap?",
    function: RiskFunction.Governance, // Still a governance issue, but pinpointed by the role's communication failure
    stride: STRIDE.Repudiation, // If needs aren't communicated or acted upon due to communication failure, the responsibility for securing the asset with proper funding is effectively repudiated.
    detectionLogic: "Applies to technical assets tagged with a 'role:*' identifier (e.g., 'role:entwickler', 'role:administrator'). " +
                    "The risk arises if the personnel in these roles fail to effectively communicate the security requirements, deficiencies, and necessary investments for these assets to management, " +
                    "leading to insufficient or misguided investments specifically for these assets.",
    riskAssessment: "The likelihood of the *organizational failing* (personnel in a specific role not effectively communicating asset-specific security investment needs upwards, or management not acting upon such communication) is assumed if not proven otherwise. If this failing exists for an asset managed by such a role, " +
                    "the likelihood of *that asset being negatively impacted by insufficient or misapplied security resources* is 'Likely'. " +
                    "The impact is determined by the overall sensitivity of the technical asset itself and the data it handles.",
    falsePositives: "This risk assumes a communication breakdown regarding investment needs for a role-managed asset. " +
                    "A false positive for a specific asset might occur if, despite general communication challenges, the team/role responsible for *that specific asset* has an exceptionally effective ad-hoc communication channel with management for funding, or if this asset's security is adequately funded through a separate, well-justified budget line not dependent on typical reporting channels.",
    modelFailurePossibleReason: false,
    cwe: 1396, // CWE-1396: Failure to Address Business Requirement for Security
};

export function Category(): RiskCategory {
    return InsufficientMisguidedInvestmentsRoleCommCategory;
}

export function SupportedTags(): string[] {
    // These tags indicate an asset is managed by a specific role.
    // If that role doesn't communicate needs upwards, investment may be poor for THIS asset.
    return [
        "role:administrator",
        "role:it-sicherheitsbeauftragter", // They should definitely be communicating investment needs
        "role:datenschutzbeauftragter",    // And them
        "role:fachadministrator",
        // "role:endbenutzer", // Less likely to be responsible for communicating investment needs for asset security
        "role:entwickler",
        "role:externer-dienstleister", // If they manage an asset, they should report needs
        // "role:pruefer", // Less direct responsibility for asset security funding
        // "role:redakteur", // Less direct responsibility for asset security funding
        "role:leitungsebene" // If a 'leitungsebene' directly "owns" or is responsible for an asset's budget.
    ];
}

export function GenerateRisks(): Risk[] {
    if (window.currentSelectedThreatStandard !== 'BSI') {
        return [];
    }
    const risks: Risk[] = [];
    const category = Category();

    if (!modelState.parsedModelRoot?.technicalAssets || !modelState.parsedModelRoot?.dataAssets) {
        return risks;
    }

    const relevantRoleTags = SupportedTags();

    for (const techAssetId in modelState.parsedModelRoot.technicalAssets) {
        const techAsset: TechnicalAsset | undefined = modelState.parsedModelRoot.technicalAssets[techAssetId];

        if (techAsset && !techAsset.outOfScope) {
            let matchedRoleTag: string | undefined = undefined;
            for (const tag of relevantRoleTags) {
                if (techAsset.isTaggedWithAny(tag)) {
                    matchedRoleTag = tag;
                    break;
                }
            }

            if (matchedRoleTag) {
                const roleName = matchedRoleTag.substring(matchedRoleTag.indexOf(':') + 1);
                const title = `<b>${category.title}</b> for asset <b>${techAsset.title}</b> (managed by role: <u>${roleName}</u>), due to potential failure to communicate security investment needs.`;

                // Likelihood: If the role doesn't communicate needs, it's likely this asset gets poor investment.
                const likelihood = RiskExploitationLikelihood.Likely;

                // Impact based on overall asset sensitivity
                let impact = RiskExploitationImpact.Low;

                const assetConf = techAsset.confidentiality;
                const assetInteg = techAsset.integrity;
                const assetAvail = techAsset.availability;

                const dataConf = techAsset.getHighestConfidentiality();
                const dataInteg = techAsset.getHighestIntegrity();
                const dataAvail = techAsset.getHighestAvailability();

                const effectiveConf = assetConf > dataConf ? assetConf : dataConf;
                const effectiveInteg = assetInteg > dataInteg ? assetInteg : dataInteg;
                const effectiveAvail = assetAvail > dataAvail ? assetAvail : dataAvail;

                const highImpactThreshold =
                    effectiveConf >= Confidentiality.Confidential ||
                    effectiveInteg >= Criticality.Critical ||
                    effectiveAvail >= Criticality.Critical;

                const criticalImpactThreshold =
                    effectiveConf >= Confidentiality.StrictlyConfidential ||
                    effectiveInteg >= Criticality.MissionCritical ||
                    effectiveAvail >= Criticality.MissionCritical;

                if (highImpactThreshold) {
                    impact = RiskExploitationImpact.Medium;
                }
                if (criticalImpactThreshold) {
                    impact = RiskExploitationImpact.High;
                }

                let mostSensitiveDataAssetId: string | undefined = undefined;
                let maxSensitivityScore = -1;
                const allDataAssetIds = new Set<string>();
                techAsset.dataAssetsStored.forEach(id => allDataAssetIds.add(id));
                techAsset.dataAssetsProcessed.forEach(id => allDataAssetIds.add(id));
                allDataAssetIds.forEach(daId => {
                    const dataAsset: DataAsset | undefined = modelState.parsedModelRoot.dataAssets[daId];
                    if (dataAsset) {
                        const currentScore =
                            Object.values(Confidentiality).indexOf(dataAsset.confidentiality) +
                            Object.values(Criticality).indexOf(dataAsset.integrity) +
                            Object.values(Criticality).indexOf(dataAsset.availability);
                        if (currentScore > maxSensitivityScore) {
                            maxSensitivityScore = currentScore;
                            mostSensitiveDataAssetId = daId;
                        }
                    }
                });

                const risk = new Risk(
                    category.id,
                    CalculateSeverity(likelihood, impact),
                    likelihood,
                    impact,
                    title,
                    `${category.id}@${techAsset.id}`, // Synthetic ID
                    DataBreachProbability.Possible,
                    [techAsset.id],
                    mostSensitiveDataAssetId,
                    techAsset.id,
                    undefined,
                    undefined,
                    undefined
                );
                risks.push(risk);
            }
        }
    }
    return risks;
}

// Standard export for Threagile custom risk rules
import { CustomRiskRule } from '../../../model/types.ts';

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags,
    generateRisks: GenerateRisks,
};
