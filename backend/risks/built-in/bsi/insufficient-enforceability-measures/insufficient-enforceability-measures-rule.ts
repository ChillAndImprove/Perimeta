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
} from '../../../../model/types.ts'; // Adjust path as needed

export const InsufficientEnforceabilityMeasuresCategory: RiskCategory = {
    id: "insufficient-enforceability-measures-ism2.5",
    title: "Insufficient Enforceability of Security Measures for Role-Managed Assets (BSI ISM.2.5)",
    description: "When strategic guiding statements are missing, security objectives are unclear, or cooperation between different organizational units is lacking, it can lead to varying interpretations of the importance of information security. As a result, information security may be deprioritized, and necessary security measures for assets managed by key roles (e.g., developers, administrators) are not consistently implemented or enforced, despite potentially being defined (e.g., by an Information Security Officer - ISO/ISB).",
    impact: "If defined security measures are not enforced for assets managed by responsible roles due to a lack of organizational commitment, cooperation, or clear strategic priority, these assets will likely harbor unmitigated vulnerabilities. This leads to an inconsistent security posture, increased risk of compromise, non-compliance with security policies, and failure to achieve intended security levels, even if an ISO/ISB function exists.",
    asvs: "Derived from BSI IT-Grundschutz ISM.2.5. This rule highlights how a lack of strategic backing, cooperation, and prioritization can undermine the enforcement of security measures on assets, even if an ISO/ISB defines them.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - See ISM.2.5)",
    action: "Strengthen Management Commitment, Clarify Strategic Security Objectives, and Foster Cross-Departmental Cooperation to Ensure Enforceability of Security Measures.",
    mitigation: "Top management must: " +
        "1. Clearly define and communicate strategic guiding statements and objectives for information security, emphasizing its importance and priority. " +
        "2. Foster a culture of security and cooperation across all relevant departments and roles, ensuring that information security is seen as a shared responsibility. " +
        "3. Provide the Information Security Officer (ISO/ISB) and other responsible parties (e.g., asset owners, administrators) with the necessary authority and support to enforce security measures. " +
        "4. Establish processes to monitor the implementation and effectiveness of security measures on all critical assets. " +
        "5. Address and resolve conflicts or resistance to security measures promptly and decisively, reinforcing their importance. " +
        "6. Ensure that roles responsible for implementing measures (e.g., developers, administrators) understand their obligations and are held accountable.",
    check: "For technical assets managed by specific roles (e.g., developers, administrators): Are defined security measures (e.g., patching, hardening, secure coding practices, access controls) consistently not being implemented or are easily bypassed? Is this due to a perceived lack of priority for security, insufficient cooperation from other teams, or a lack of clear mandate/support from management, despite the potential efforts of an ISO/ISB?",
    function: RiskFunction.Governance, // Primarily a failure of governance to ensure measures are actually followed.
    stride: STRIDE.Repudiation, // Ignoring or deprioritizing defined security measures is a form of repudiating the commitment to those measures and overall security.
    detectionLogic: "Applies to technical assets tagged with a 'role:*' identifier (e.g., 'role:entwickler', 'role:administrator'). " +
                    "The risk arises if the organizational environment (lacking strategic clarity, cooperation, or management backing for security) prevents personnel in these roles from effectively implementing or enforcing defined security measures on the assets they manage, or if directives from an ISO/ISB are not heeded for these assets due to these systemic issues.",
    riskAssessment: "The likelihood of the *organizational failing* (security measures not being enforceable/implemented on an asset due to lack of priority, cooperation, or strategic clarity) is assumed 'Likely' if the asset is managed by a designated role and if there's no strong evidence of a fully effective enforcement culture. " +
                    "The impact is determined by the sensitivity of the technical asset itself and the data it handles, as unenforced measures lead to unmitigated vulnerabilities.",
    falsePositives: "This risk assumes a systemic lack of enforceability. " +
                    "A false positive for a specific asset might occur if, despite general organizational challenges, the team/role responsible for *that particular asset* operates with exceptional discipline, has strong internal motivation to enforce security measures, or benefits from a localized pocket of strong management support that ensures compliance for their specific systems.",
    modelFailurePossibleReason: false,
    cwe: 730, // CWE-730: OWASP Top Ten 2017 Category A6 - Security Misconfiguration (if measures are defined but not implemented/enforced)
              // Could also relate to CWE-16 (Configuration) or CWE-1119 (Related to Policy/Process issues)
};

export function Category(): RiskCategory {
    return InsufficientEnforceabilityMeasuresCategory;
}

export function SupportedTags(): string[] {
    // These tags indicate an asset is managed by a specific role that *should* be implementing/enforcing measures.
    // The ISB tag could be added here if you want to specifically highlight assets where the ISB might be struggling.
    // However, the risk is more about the *implementers* not being able to implement due to the environment.
    return [
        "role:administrator",
        "role:fachadministrator",
        "role:entwickler",
        "role:externer-dienstleister", // If they are responsible for implementing measures on an asset
        // "role:it-sicherheitsbeauftragter" // Adding this tag means the risk would apply *to an asset the ISB directly manages*.
                                         // The spirit of the control is broader: measures *defined by ISB (or policy)*
                                         // are not implemented on assets managed by *other* roles.
                                         // If the ISB *also* manages assets, then yes, it could apply to those too.
                                         // For now, let's keep it focused on the primary implementers.
        "role:leitungsebene" // If they are directly responsible for ensuring measures are implemented on specific assets they oversee.
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
    // We don't explicitly need to check for an ISB's existence in the model for this rule to apply.
    // The rule assumes measures *should* be defined (by ISB, policy, etc.) but aren't enforced on role-managed assets.

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
                const title = `<b>${category.title}</b> for asset <b>${techAsset.title}</b> (managed by role: <u>${roleName}</u>), due to potential inability to enforce/implement security measures.`;

                // Likelihood: If the environment doesn't support enforcement, measures likely won't be applied to this asset.
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
                    DataBreachProbability.Probable, // If measures aren't enforced, breaches become more probable
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
