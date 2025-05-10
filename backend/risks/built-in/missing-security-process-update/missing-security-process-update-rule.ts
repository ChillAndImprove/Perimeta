import {
    RiskCategory,
    Risk,
    TechnicalAsset, // Used for type hint
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

export const MissingSecurityProcessUpdatesCategory: RiskCategory = {
    id: "missing-security-process-updates-con1.6",
    title: "Missing Regular Updates to Security Concepts and Threat Awareness (BSI CON.1.A6)",
    description: "The information security landscape is constantly evolving due to new business processes, applications, IT systems, and emerging threats. If an organization lacks an effective and regular review process for its security concepts, measures, and threat awareness (Revisionskonzept), the overall security level degrades over time. This leads to a 'false sense of security' (Scheinsicherheit) where existing protections become outdated or insufficient against new attack vectors.",
    impact: "Failure to regularly update security processes and threat awareness leads to an outdated security posture. This significantly increases the likelihood of successful attacks exploiting new vulnerabilities or unaddressed threat vectors. The organization may become non-compliant with evolving regulations, and assets become progressively more vulnerable, leading to potential data breaches, operational disruptions, and reputational damage. This undermines the entire security program.",
    asvs: "Derived from BSI IT-Grundschutz CON.1.A6 (Aktualisierung des Sicherheitskonzepts - Updating the security concept). This rule emphasizes the need for continuous review and adaptation of security measures and awareness in response to changes.",
    cheatSheet: "https://www.bsi.bund.de/EN/Topics/ITGrundschutz/itgrundschutz_node.html (General BSI IT-Grundschutz - See CON.1 'Kontinuierlicher Verbesserungsprozess' and specifically CON.1.A6)",
    action: "Establish and Maintain a Continuous Security Improvement Process, Including Regular Review of Security Concepts, Measures, and Threat Intelligence, led by the Information Security Officer (ISB).",
    mitigation: "The Information Security Officer (ISB), with management support, must: " +
        "1. Establish a formal, documented process for periodically reviewing and updating the overall information security concept, policies, and related documentation (e.g., annually or upon significant organizational, technological, or threat landscape changes). " +
        "2. Integrate sources of threat intelligence and conduct regular risk assessments to identify new and evolving threats and vulnerabilities. " +
        "3. Ensure that significant changes in business processes, IT systems, and applications trigger a mandatory review and update of relevant security measures and risk assessments. " +
        "4. Promote ongoing security awareness training programs that are regularly updated to include information on new and evolving threats relevant to the organization. " +
        "5. Document all reviews, updates, identified gaps, and the rationale behind decisions regarding the security concept. " +
        "6. Regularly report to top management on the status of the security concept, the effectiveness of the review process, and any necessary updates or resource requirements.",
    check: "Is there a documented, active, and effective process, overseen by the Information Security Officer (ISB), for regularly reviewing and updating the organization's security concepts, risk assessments, and security measures? This includes reacting to new business requirements, technological changes, and emerging threats. Is there evidence of recent updates (e.g., within the last 12-18 months or after major changes) and dissemination of new threat information?",
    function: RiskFunction.Governance, // This is a core governance function.
    stride: STRIDE.Tampering, // Failure to update processes can be seen as tampering with (or allowing the degradation of) the overall security posture. All STRIDE categories are ultimately affected.
    detectionLogic: "This risk applies if an Information Security Officer (ISB) role (e.g., tagged with 'role:it-sicherheitsbeauftragter') is identified in the model. The existence of an ISB implies this responsibility. The risk materializes if this crucial update and review process is presumed to be lacking or ineffective without explicit evidence of its robust implementation.",
    riskAssessment: "The likelihood of this governance process failing or being insufficiently implemented is assumed 'Possible' by default when an ISB is present, as it requires continuous effort. The impact is 'High' because an outdated security posture affects the protection of all assets and data within the ISB's scope of responsibility, potentially rendering many other security measures ineffective against new threats. The impact determination will consider the most sensitive data in the model.",
    falsePositives: "A false positive might occur if the ISB *is* performing these updates diligently and has a robust, documented process, but this is not explicitly captured or evident in the threat model in a way that Threagile can automatically negate the risk. This risk often serves as a reminder of an essential, ongoing governance function.",
    modelFailurePossibleReason: false,
    cwe: 1119, // CWE-1119: Incomplete strategylementation of Security Policy (Process Issues)
              // Could also broadly relate to CWE-16 (Configuration) if outdated configurations are a symptom.
};

export function Category(): RiskCategory {
    return MissingSecurityProcessUpdatesCategory;
}

export function SupportedTags(): string[] {
    // This risk is tied to the ISB's responsibility.
    // It triggers if an asset representing the ISB or their function is found.
    return [
        "role:it-sicherheitsbeauftragter"
    ];
}

export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    const category = Category();

    if (!modelState.parsedModelRoot?.technicalAssets || !modelState.parsedModelRoot?.dataAssets) {
        return risks;
    }

    let isbAssetId: string | undefined = undefined;
    // Check if any technical asset is tagged as representing the ISB role or their direct responsibility.
    // This asset serves as an anchor for the organizational risk.
    for (const techAssetId in modelState.parsedModelRoot.technicalAssets) {
        const techAsset: TechnicalAsset | undefined = modelState.parsedModelRoot.technicalAssets[techAssetId];
        if (techAsset && !techAsset.outOfScope && techAsset.isTaggedWithAny("role:it-sicherheitsbeauftragter")) {
            isbAssetId = techAsset.id; // Found an asset representing the ISB or directly managed by them.
            break; // We only need one such asset to confirm the ISB's presence and anchor the risk.
        }
    }

    if (!isbAssetId) {
        // If no ISB role/asset is explicitly modeled, this specific risk (tied to ISB responsibility) does not apply.
        // The underlying issue might still exist but would be covered by a different, more general risk.
        return risks;
    }

    // If an ISB is modeled, this process risk applies to the organization they oversee.
    const title = `<b>${category.title}</b> (affecting overall security posture)`;

    // Likelihood: Assumed 'Possible' as per riskAssessment, as it's an ongoing organizational challenge.
    const likelihood = RiskExploitationLikelihood.Likely;

    // Impact: Based on the most sensitive data in the *entire* system,
    // as an outdated security posture affects everything under the ISB's purview.
    let overallMaxConfidentiality = Confidentiality.Public;
    let overallMaxIntegrity = Criticality.Operational;
    let overallMaxAvailability = Criticality.Operational;
    let mostSensitiveDataAssetOverallId: string | undefined = undefined;
    let maxOverallSensitivityScore = -1;

    for (const daId in modelState.parsedModelRoot.dataAssets) {
        const dataAsset: DataAsset | undefined = modelState.parsedModelRoot.dataAssets[daId];
        if (dataAsset) {
            if (dataAsset.confidentiality > overallMaxConfidentiality) {
                overallMaxConfidentiality = dataAsset.confidentiality;
            }
            if (dataAsset.integrity > overallMaxIntegrity) {
                overallMaxIntegrity = dataAsset.integrity;
            }
            if (dataAsset.availability > overallMaxAvailability) {
                overallMaxAvailability = dataAsset.availability;
            }

            const currentScore =
                Object.values(Confidentiality).indexOf(dataAsset.confidentiality) +
                Object.values(Criticality).indexOf(dataAsset.integrity) +
                Object.values(Criticality).indexOf(dataAsset.availability);
            if (currentScore > maxOverallSensitivityScore) {
                maxOverallSensitivityScore = currentScore;
                mostSensitiveDataAssetOverallId = daId;
            }
        }
    }

    let impact = RiskExploitationImpact.Low; // Default, should be overridden
    const highImpactThreshold =
        overallMaxConfidentiality >= Confidentiality.Confidential ||
        overallMaxIntegrity >= Criticality.Critical ||
        overallMaxAvailability >= Criticality.Critical;

    const criticalImpactThreshold =
        overallMaxConfidentiality >= Confidentiality.StrictlyConfidential ||
        overallMaxIntegrity >= Criticality.MissionCritical ||
        overallMaxAvailability >= Criticality.MissionCritical;

    if (highImpactThreshold) {
        impact = RiskExploitationImpact.Medium;
    }
    if (criticalImpactThreshold) {
        impact = RiskExploitationImpact.High;
    }
    // If there are no sensitive assets, the impact might be lower, but the process failure itself is significant.
    // For a governance failure like this, a minimum impact of Medium might be justified if any assets exist.
    // However, the calculation based on data sensitivity is generally preferred.
    // If ISB exists and some assets exist, even if not highly sensitive, the impact of process failure
    // is at least medium, as it indicates systemic weakness.
    if (Object.keys(modelState.parsedModelRoot.dataAssets).length > 0 && impact < RiskExploitationImpact.Medium) {
         impact = RiskExploitationImpact.Medium; // Ensure at least Medium if ISB and data exist
    }


    const risk = new Risk(
        category.id,
        CalculateSeverity(likelihood, impact),
        likelihood,
        impact,
        title,
        `${category.id}@${isbAssetId || 'global-isb-process'}`, // Synthetic ID, anchored to ISB asset if found
        DataBreachProbability.Possible, // Outdated processes make breaches more possible over time
        isbAssetId ? [isbAssetId] : [], // Anchors to the ISB's "asset" if one is tagged as such.
                                        // This signifies the risk is tied to the ISB's function.
        mostSensitiveDataAssetOverallId, // Link to most sensitive data as an indicator of potential consequence.
        isbAssetId, // The "exploited" asset is conceptually the ISB's function/responsibility.
        undefined,
        undefined,
        undefined
    );
    risks.push(risk);

    return risks;
}

// Standard export for Threagile custom risk rules
import { CustomRiskRule } from '../../../model/types.ts';

export const Rule: CustomRiskRule = {
    category: Category,
    supportedTags: SupportedTags,
    generateRisks: GenerateRisks,
};
