// File: risks/built-in/missing-cloud-hardening.ts

import {
    RiskCategory,
    Risk,
    TechnicalAsset,
    TrustBoundary,
    SharedRuntime,
    RiskFunction,
    STRIDE,
    RiskExploitationImpact,
    RiskExploitationLikelihood,
    DataBreachProbability,
    CalculateSeverity,
    Confidentiality,
    Criticality,
    Availability,
    modelState, // Access the global model state
    isTaggedWithBaseTag, // Import helper function
    // Get functions are useful for iterating tagged assets/boundaries/runtimes
    getTechnicalAssetsTaggedWithAny,
    getTrustBoundariesTaggedWithAny,
    getSharedRuntimesTaggedWithAny,
} from '../../../model/types.ts'; // Adjust the path back to model.ts as needed

// --- Category Definition ---
export const MissingCloudHardeningCategory: RiskCategory = {
    id: "missing-cloud-hardening",
    title: "Missing Cloud Hardening",
    description: "Cloud components should be hardened according to the cloud vendor best practices. This affects their " +
        "configuration, auditing, and further areas.",
    impact: "If this risk is unmitigated, attackers might access cloud components in an unintended way.",
    asvs: "V1 - Architecture, Design and Threat Modeling Requirements",
    cheatSheet: "https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html",
    action: "Cloud Hardening",
    mitigation: "Apply hardening of all cloud components and services, taking special care to follow the individual risk descriptions (which " +
        "depend on the cloud provider tags in the model). " +
        "<br><br>For <b>Amazon Web Services (AWS)</b>: Follow the <i>CIS Benchmark for Amazon Web Services</i> (see also the automated checks of cloud audit tools like <i>\"PacBot\", \"CloudSploit\", \"CloudMapper\", \"ScoutSuite\", or \"Prowler AWS CIS Benchmark Tool\"</i>). " +
        "<br>For EC2 and other servers running Amazon Linux, follow the <i>CIS Benchmark for Amazon Linux</i> and switch to IMDSv2. " +
        "<br>For S3 buckets follow the <i>Security Best Practices for Amazon S3</i> at <a href=\"https://docs.aws.amazon.com/AmazonS3/latest/dev/security-best-practices.html\" target=\"_blank\" rel=\"noopener noreferrer\">https://docs.aws.amazon.com/AmazonS3/latest/dev/security-best-practices.html</a> to avoid accidental leakage. " +
        "<br>Also take a look at some of these tools: <a href=\"https://github.com/toniblyx/my-arsenal-of-aws-security-tools\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/toniblyx/my-arsenal-of-aws-security-tools</a> " +
        "<br><br>For <b>Microsoft Azure</b>: Follow the <i>CIS Benchmark for Microsoft Azure</i> (see also the automated checks of cloud audit tools like <i>\"CloudSploit\" or \"ScoutSuite\"</i>)." +
        "<br><br>For <b>Google Cloud Platform</b>: Follow the <i>CIS Benchmark for Google Cloud Computing Platform</i> (see also the automated checks of cloud audit tools like <i>\"CloudSploit\" or \"ScoutSuite\"</i>). " +
        "<br><br>For <b>Oracle Cloud Platform</b>: Follow the hardening best practices (see also the automated checks of cloud audit tools like <i>\"CloudSploit\"</i>).",
    check: "Are recommendations from the linked cheat sheet and referenced ASVS chapter applied?",
    function: RiskFunction.Operations,
    stride: STRIDE.Tampering, // Hardening failures often allow tampering
    detectionLogic: "In-scope cloud components (either residing in cloud trust boundaries or more specifically tagged with cloud provider types).",
    riskAssessment: "The risk rating depends on the sensitivity of the technical asset itself and of the data assets processed and stored.",
    falsePositives: "Cloud components not running parts of the target architecture can be considered " +
        "as false positives after individual review.",
    modelFailurePossibleReason: false,
    cwe: 1008, // Weak R&D Software Development Process (can cover config issues)
};

// Export the Category function
export function Category(): RiskCategory {
    return MissingCloudHardeningCategory;
}


// --- Supported Tags ---
const specificSubtagsAWS = ["aws:vpc", "aws:ec2", "aws:s3", "aws:ebs", "aws:apigateway", "aws:lambda", "aws:dynamodb", "aws:rds", "aws:sqs", "aws:iam"];
const baseCloudTags = ["aws", "azure", "gcp", "ocp"];

export function SupportedTags(): string[] {
    return [...baseCloudTags, ...specificSubtagsAWS];
}


// --- Risk Generation Logic ---
export function GenerateRisks(): Risk[] {
    const risks: Risk[] = [];
    if (!modelState.parsedModelRoot) return risks;

    // Using Sets for efficient add/delete/check of IDs
    const sharedRuntimesWithUnspecificCloudRisks = new Set<string>();
    const trustBoundariesWithUnspecificCloudRisks = new Set<string>();
    const techAssetsWithUnspecificCloudRisks = new Set<string>();

    const sharedRuntimeIDsAWS = new Set<string>();
    const trustBoundaryIDsAWS = new Set<string>();
    const techAssetIDsAWS = new Set<string>();

    const sharedRuntimeIDsAzure = new Set<string>();
    const trustBoundaryIDsAzure = new Set<string>();
    const techAssetIDsAzure = new Set<string>();

    const sharedRuntimeIDsGCP = new Set<string>();
    const trustBoundaryIDsGCP = new Set<string>();
    const techAssetIDsGCP = new Set<string>();

    const sharedRuntimeIDsOCP = new Set<string>();
    const trustBoundaryIDsOCP = new Set<string>();
    const techAssetIDsOCP = new Set<string>();

    // Tracks assets with AWS sub-tags like aws:ec2, aws:s3 etc.
    const techAssetIDsWithSubtagSpecificCloudRisks = new Set<string>();

    const allSupportedTags = SupportedTags(); // Cache the result

    // 1. Check assets within cloud trust boundaries
    for (const trustBoundary of Object.values(modelState.parsedModelRoot.trustBoundaries)) {
        const isTBTagged = trustBoundary.isTaggedWithAny(...allSupportedTags);
        // Consider if TB is explicitly tagged OR is a cloud boundary type
        if (isTBTagged || trustBoundary.type === "network-cloud-provider" || trustBoundary.type === "network-cloud-security-group") { // Adjust enum access if needed
            addTrustBoundaryAccordingToBasetag(
                trustBoundary, trustBoundariesWithUnspecificCloudRisks,
                trustBoundaryIDsAWS, trustBoundaryIDsAzure, trustBoundaryIDsGCP, trustBoundaryIDsOCP
            );

            for (const techAssetID of trustBoundary.recursivelyAllTechnicalAssetIDsInside()) {
                const tA = modelState.parsedModelRoot.technicalAssets[techAssetID];
                if (!tA) continue; // Should not happen in consistent model

                let added = false;
                // Prioritize asset's own tags
                if (tA.isTaggedWithAny(...allSupportedTags)) {
                    addAccordingToBasetag(tA, tA.tags,
                        techAssetIDsWithSubtagSpecificCloudRisks,
                        techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
                    added = true;
                } else if (isTBTagged) { // Inherit tags from tagged boundary if asset has none
                    addAccordingToBasetag(tA, trustBoundary.tags,
                        techAssetIDsWithSubtagSpecificCloudRisks,
                        techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
                    added = true;
                }

                if (!added) { // If neither asset nor boundary had specific tags, mark as unspecific
                    techAssetsWithUnspecificCloudRisks.add(techAssetID);
                }
            }
        }
    }

    // 2. Check assets explicitly tagged (model-wide)
    for (const tA of getTechnicalAssetsTaggedWithAny(...allSupportedTags)) {
        addAccordingToBasetag(tA, tA.tags,
            techAssetIDsWithSubtagSpecificCloudRisks,
            techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
    }

    // 3. Check trust boundaries explicitly tagged (model-wide) and their contained assets
    for (const tB of getTrustBoundariesTaggedWithAny(...allSupportedTags)) {
         addTrustBoundaryAccordingToBasetag( // Ensure boundary itself is categorized
             tB, trustBoundariesWithUnspecificCloudRisks,
             trustBoundaryIDsAWS, trustBoundaryIDsAzure, trustBoundaryIDsGCP, trustBoundaryIDsOCP
         );
        for (const candidateID of tB.recursivelyAllTechnicalAssetIDsInside()) {
            const tA = modelState.parsedModelRoot.technicalAssets[candidateID];
            if (!tA) continue;

            // Prioritize asset's own tags, then inherit from boundary
            if (tA.isTaggedWithAny(...allSupportedTags)) {
                addAccordingToBasetag(tA, tA.tags,
                    techAssetIDsWithSubtagSpecificCloudRisks,
                    techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
            } else {
                addAccordingToBasetag(tA, tB.tags, // Inherit boundary tags
                    techAssetIDsWithSubtagSpecificCloudRisks,
                    techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
            }
        }
    }

     // 4. Check shared runtimes explicitly tagged (model-wide) and their running assets
    for (const sR of getSharedRuntimesTaggedWithAny(...allSupportedTags)) {
         addSharedRuntimeAccordingToBasetag( // Ensure runtime itself is categorized
            sR, sharedRuntimesWithUnspecificCloudRisks,
            sharedRuntimeIDsAWS, sharedRuntimeIDsAzure, sharedRuntimeIDsGCP, sharedRuntimeIDsOCP
         );
         for (const candidateID of sR.technicalAssetsRunning) {
            const tA = modelState.parsedModelRoot.technicalAssets[candidateID];
            if (!tA) continue;
            // Assets inherit tags from the shared runtime they run on
            addAccordingToBasetag(tA, sR.tags,
                techAssetIDsWithSubtagSpecificCloudRisks,
                techAssetIDsAWS, techAssetIDsAzure, techAssetIDsGCP, techAssetIDsOCP);
        }
    }

    // --- Refine Sets: Remove specific items from unspecific sets ---
    function removeFromUnspecific(specificSet: Set<string>, unspecificSet: Set<string>) {
        for (const id of specificSet) {
            unspecificSet.delete(id);
        }
    }

    // Remove specifically categorized runtimes from the unspecific set
    removeFromUnspecific(sharedRuntimeIDsAWS, sharedRuntimesWithUnspecificCloudRisks);
    removeFromUnspecific(sharedRuntimeIDsAzure, sharedRuntimesWithUnspecificCloudRisks);
    removeFromUnspecific(sharedRuntimeIDsGCP, sharedRuntimesWithUnspecificCloudRisks);
    removeFromUnspecific(sharedRuntimeIDsOCP, sharedRuntimesWithUnspecificCloudRisks);

    // Remove specifically categorized boundaries from the unspecific set
    removeFromUnspecific(trustBoundaryIDsAWS, trustBoundariesWithUnspecificCloudRisks);
    removeFromUnspecific(trustBoundaryIDsAzure, trustBoundariesWithUnspecificCloudRisks);
    removeFromUnspecific(trustBoundaryIDsGCP, trustBoundariesWithUnspecificCloudRisks);
    removeFromUnspecific(trustBoundaryIDsOCP, trustBoundariesWithUnspecificCloudRisks);

    // Remove specifically categorized assets from the unspecific set
    removeFromUnspecific(techAssetIDsWithSubtagSpecificCloudRisks, techAssetsWithUnspecificCloudRisks);
    removeFromUnspecific(techAssetIDsAWS, techAssetsWithUnspecificCloudRisks);
    removeFromUnspecific(techAssetIDsAzure, techAssetsWithUnspecificCloudRisks);
    removeFromUnspecific(techAssetIDsGCP, techAssetsWithUnspecificCloudRisks);
    removeFromUnspecific(techAssetIDsOCP, techAssetsWithUnspecificCloudRisks);


    // --- Create Risks ---
    let addedAWS = false, addedAzure = false, addedGCP = false, addedOCP = false;

    // Shared Runtimes (Specific Clouds)
    for (const id of sharedRuntimeIDsAWS)   risks.push(createRiskForSharedRuntime(modelState.parsedModelRoot.sharedRuntimes[id]!, "AWS", "CIS Benchmark for AWS"));
    for (const id of sharedRuntimeIDsAzure) risks.push(createRiskForSharedRuntime(modelState.parsedModelRoot.sharedRuntimes[id]!, "Azure", "CIS Benchmark for Microsoft Azure"));
    for (const id of sharedRuntimeIDsGCP)   risks.push(createRiskForSharedRuntime(modelState.parsedModelRoot.sharedRuntimes[id]!, "GCP", "CIS Benchmark for Google Cloud Computing Platform"));
    for (const id of sharedRuntimeIDsOCP)   risks.push(createRiskForSharedRuntime(modelState.parsedModelRoot.sharedRuntimes[id]!, "OCP", "Vendor Best Practices for Oracle Cloud Platform"));
    // Shared Runtimes (Unspecific Cloud)
    for (const id of sharedRuntimesWithUnspecificCloudRisks) risks.push(createRiskForSharedRuntime(modelState.parsedModelRoot.sharedRuntimes[id]!, "", ""));
    // Set flags if any specific cloud runtime risk was added
    addedAWS = addedAWS || sharedRuntimeIDsAWS.size > 0;
    addedAzure = addedAzure || sharedRuntimeIDsAzure.size > 0;
    addedGCP = addedGCP || sharedRuntimeIDsGCP.size > 0;
    addedOCP = addedOCP || sharedRuntimeIDsOCP.size > 0;


    // Trust Boundaries (Specific Clouds)
    for (const id of trustBoundaryIDsAWS)   risks.push(createRiskForTrustBoundary(modelState.parsedModelRoot.trustBoundaries[id]!, "AWS", "CIS Benchmark for AWS"));
    for (const id of trustBoundaryIDsAzure) risks.push(createRiskForTrustBoundary(modelState.parsedModelRoot.trustBoundaries[id]!, "Azure", "CIS Benchmark for Microsoft Azure"));
    for (const id of trustBoundaryIDsGCP)   risks.push(createRiskForTrustBoundary(modelState.parsedModelRoot.trustBoundaries[id]!, "GCP", "CIS Benchmark for Google Cloud Computing Platform"));
    for (const id of trustBoundaryIDsOCP)   risks.push(createRiskForTrustBoundary(modelState.parsedModelRoot.trustBoundaries[id]!, "OCP", "Vendor Best Practices for Oracle Cloud Platform"));
    // Trust Boundaries (Unspecific Cloud)
    for (const id of trustBoundariesWithUnspecificCloudRisks) risks.push(createRiskForTrustBoundary(modelState.parsedModelRoot.trustBoundaries[id]!, "", ""));
    // Set flags if any specific cloud boundary risk was added
    addedAWS = addedAWS || trustBoundaryIDsAWS.size > 0;
    addedAzure = addedAzure || trustBoundaryIDsAzure.size > 0;
    addedGCP = addedGCP || trustBoundaryIDsGCP.size > 0;
    addedOCP = addedOCP || trustBoundaryIDsOCP.size > 0;


    // Technical Assets (Generic Cloud - only one per provider, based on most sensitive)
    if (!addedAWS) {
        const mostRelevant = findMostSensitiveTechnicalAsset(techAssetIDsAWS);
        if (mostRelevant) risks.push(createRiskForTechnicalAsset(mostRelevant, "AWS", "CIS Benchmark for AWS"));
    }
    if (!addedAzure) {
        const mostRelevant = findMostSensitiveTechnicalAsset(techAssetIDsAzure);
        if (mostRelevant) risks.push(createRiskForTechnicalAsset(mostRelevant, "Azure", "CIS Benchmark for Microsoft Azure"));
    }
    if (!addedGCP) {
        const mostRelevant = findMostSensitiveTechnicalAsset(techAssetIDsGCP);
        if (mostRelevant) risks.push(createRiskForTechnicalAsset(mostRelevant, "GCP", "CIS Benchmark for Google Cloud Computing Platform"));
    }
    if (!addedOCP) {
        const mostRelevant = findMostSensitiveTechnicalAsset(techAssetIDsOCP);
        if (mostRelevant) risks.push(createRiskForTechnicalAsset(mostRelevant, "OCP", "Vendor Best Practices for Oracle Cloud Platform"));
    }
    // Technical Assets (Unspecific Cloud - one for most sensitive)
    // Note: Original Go didn't explicitly create a risk for 'techAssetsWithUnspecificCloudRisks'
    // It seems risks are generated based on tagged boundaries/runtimes or specific cloud tags.
    // If you need a generic risk for untagged cloud assets, add similar logic here.
    /*
    if (!addedAWS && !addedAzure && !addedGCP && !addedOCP && techAssetsWithUnspecificCloudRisks.size > 0) {
        const mostRelevant = findMostSensitiveTechnicalAsset(techAssetsWithUnspecificCloudRisks);
        if (mostRelevant) risks.push(createRiskForTechnicalAsset(mostRelevant, "", ""));
    }
    */

    // Technical Assets (Subtag Specific - AWS examples)
    for (const id of techAssetIDsWithSubtagSpecificCloudRisks) {
        const tA = modelState.parsedModelRoot.technicalAssets[id];
        if (!tA) continue;
        // Use isTaggedWithAnyTraversingUp to check asset, its boundary, and runtime tags
        if (tA.isTaggedWithAnyTraversingUp("aws:ec2")) {
            risks.push(createRiskForTechnicalAsset(tA, "EC2", "CIS Benchmark for Amazon Linux"));
        }
        if (tA.isTaggedWithAnyTraversingUp("aws:s3")) {
            risks.push(createRiskForTechnicalAsset(tA, "S3", "Security Best Practices for AWS S3"));
        }
        // TODO: Add more subtag-specific checks here (aws:lambda, etc.)
    }

    return risks;
}

// --- Helper Functions ---

// Adds a Trust Boundary ID to the correct set based on its cloud tags
function addTrustBoundaryAccordingToBasetag(
    trustBoundary: TrustBoundary,
    unspecificSet: Set<string>,
    awsSet: Set<string>, azureSet: Set<string>, gcpSet: Set<string>, ocpSet: Set<string>
): void {
    // Check base cloud provider tags first
    let addedToSpecific = false;
    if (trustBoundary.isTaggedWithBaseTag("aws"))   { awsSet.add(trustBoundary.id); addedToSpecific = true; }
    if (trustBoundary.isTaggedWithBaseTag("azure")) { azureSet.add(trustBoundary.id); addedToSpecific = true; }
    if (trustBoundary.isTaggedWithBaseTag("gcp"))   { gcpSet.add(trustBoundary.id); addedToSpecific = true; }
    if (trustBoundary.isTaggedWithBaseTag("ocp"))   { ocpSet.add(trustBoundary.id); addedToSpecific = true; }

    // If it wasn't added to any specific cloud set, add to unspecific (if relevant)
    if (!addedToSpecific) {
        unspecificSet.add(trustBoundary.id);
    }
}

// Adds a Shared Runtime ID to the correct set based on its cloud tags
function addSharedRuntimeAccordingToBasetag(
    sharedRuntime: SharedRuntime,
    unspecificSet: Set<string>,
    awsSet: Set<string>, azureSet: Set<string>, gcpSet: Set<string>, ocpSet: Set<string>
): void {
     let addedToSpecific = false;
    if (sharedRuntime.isTaggedWithBaseTag("aws"))   { awsSet.add(sharedRuntime.id); addedToSpecific = true; }
    if (sharedRuntime.isTaggedWithBaseTag("azure")) { azureSet.add(sharedRuntime.id); addedToSpecific = true; }
    if (sharedRuntime.isTaggedWithBaseTag("gcp"))   { gcpSet.add(sharedRuntime.id); addedToSpecific = true; }
    if (sharedRuntime.isTaggedWithBaseTag("ocp"))   { ocpSet.add(sharedRuntime.id); addedToSpecific = true; }

    if (!addedToSpecific) {
        unspecificSet.add(sharedRuntime.id);
    }
}

// Adds a Technical Asset ID to the correct set(s) based on provided tags
function addAccordingToBasetag(
    techAsset: TechnicalAsset,
    tagsToCheck: string[], // Tags from asset, boundary, or runtime
    subtagSpecificSet: Set<string>,
    awsSet: Set<string>, azureSet: Set<string>, gcpSet: Set<string>, ocpSet: Set<string>
): void {
    // Check for specific AWS service tags first
    if (tagsToCheck.some(tag => specificSubtagsAWS.includes(tag))) {
        subtagSpecificSet.add(techAsset.id);
        // Don't necessarily stop here, it might *also* have a generic 'aws' tag
    }

    // Check base cloud provider tags using the helper function
    if (isTaggedWithBaseTag(tagsToCheck, "aws"))   awsSet.add(techAsset.id);
    if (isTaggedWithBaseTag(tagsToCheck, "azure")) azureSet.add(techAsset.id);
    if (isTaggedWithBaseTag(tagsToCheck, "gcp"))   gcpSet.add(techAsset.id);
    if (isTaggedWithBaseTag(tagsToCheck, "ocp"))   ocpSet.add(techAsset.id);
}


// Finds the most sensitive technical asset within a given set of IDs
function findMostSensitiveTechnicalAsset(techAssetIDs: Set<string>): TechnicalAsset | null {
    let mostRelevantAsset: TechnicalAsset | null = null;
    let highestScore = -1; // Initialize score to be lower than any possible score

    for (const id of techAssetIDs) {
        const tA = modelState.parsedModelRoot?.technicalAssets[id];
        if (!tA) continue;

        const currentScore = tA.getHighestSensitivityScore();
        if (!mostRelevantAsset || currentScore > highestScore) {
            mostRelevantAsset = tA;
            highestScore = currentScore;
        }
    }
    return mostRelevantAsset;
}

// --- Risk Creation Helper Functions ---

function createRiskForSharedRuntime(sharedRuntime: SharedRuntime, prefix: string, details: string): Risk {
    const category = Category();
    const prefixStr = prefix ? ` (${prefix})` : '';
    const title = `<b>Missing Cloud Hardening${prefixStr}</b> risk at shared runtime <b>${sharedRuntime.title}</b>${details ? `: <u>${details}</u>` : ''}`;

    // Determine impact based on the runtime's highest sensitivity
    let impact = RiskExploitationImpact.Medium;
    const highConf = sharedRuntime.getHighestConfidentiality() >= Confidentiality.Confidential;
    const highInteg = sharedRuntime.getHighestIntegrity() >= Criticality.Critical;
    const highAvail = sharedRuntime.getHighestAvailability() >= Criticality.Critical;
    const criticalConf = sharedRuntime.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
    const criticalInteg = sharedRuntime.getHighestIntegrity() === Criticality.MissionCritical;
    const criticalAvail = sharedRuntime.getHighestAvailability() === Criticality.MissionCritical;

    if (highConf || highInteg || highAvail) impact = RiskExploitationImpact.High;
    if (criticalConf || criticalInteg || criticalAvail) impact = RiskExploitationImpact.VeryHigh; // Elevate further for highest sensitivity

    // Create risk
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${sharedRuntime.id}`, // Synthetic ID
        DataBreachProbability.Probable,
        [...sharedRuntime.technicalAssetsRunning], // All assets running on it are affected
        undefined,
        undefined, // No single tech asset is most relevant
        undefined,
        sharedRuntime.id, // Most relevant is the shared runtime
        undefined
    );
    return risk;
}

function createRiskForTrustBoundary(trustBoundary: TrustBoundary, prefix: string, details: string): Risk {
    const category = Category();
    const prefixStr = prefix ? ` (${prefix})` : '';
    const title = `<b>Missing Cloud Hardening${prefixStr}</b> risk at trust boundary <b>${trustBoundary.title}</b>${details ? `: <u>${details}</u>` : ''}`;

    // Determine impact based on the boundary's highest sensitivity
    let impact = RiskExploitationImpact.Medium;
    const highConf = trustBoundary.getHighestConfidentiality() >= Confidentiality.Confidential;
    const highInteg = trustBoundary.getHighestIntegrity() >= Criticality.Critical;
    const highAvail = trustBoundary.getHighestAvailability() >= Criticality.Critical;
     const criticalConf = trustBoundary.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
     const criticalInteg = trustBoundary.getHighestIntegrity() === Criticality.MissionCritical;
     const criticalAvail = trustBoundary.getHighestAvailability() === Criticality.MissionCritical;

    if (highConf || highInteg || highAvail) impact = RiskExploitationImpact.High;
    if (criticalConf || criticalInteg || criticalAvail) impact = RiskExploitationImpact.VeryHigh;

    // Create risk
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${trustBoundary.id}`, // Synthetic ID
        DataBreachProbability.Probable,
        [...trustBoundary.recursivelyAllTechnicalAssetIDsInside()], // All assets inside are affected
        undefined,
        undefined, // No single tech asset most relevant
        trustBoundary.id, // Most relevant is the trust boundary
        undefined,
        undefined
    );
    return risk;
}

function createRiskForTechnicalAsset(technicalAsset: TechnicalAsset, prefix: string, details: string): Risk {
    const category = Category();
    const prefixStr = prefix ? ` (${prefix})` : '';
    const title = `<b>Missing Cloud Hardening${prefixStr}</b> risk at technical asset <b>${technicalAsset.title}</b>${details ? `: <u>${details}</u>` : ''}`;

    // Determine impact based on the asset's highest sensitivity
    let impact = RiskExploitationImpact.Medium;
    const highConf = technicalAsset.getHighestConfidentiality() >= Confidentiality.Confidential;
    const highInteg = technicalAsset.getHighestIntegrity() >= Criticality.Critical;
    const highAvail = technicalAsset.getHighestAvailability() >= Criticality.Critical;
     const criticalConf = technicalAsset.getHighestConfidentiality() === Confidentiality.StrictlyConfidential;
     const criticalInteg = technicalAsset.getHighestIntegrity() === Criticality.MissionCritical;
     const criticalAvail = technicalAsset.getHighestAvailability() === Criticality.MissionCritical;

    if (highConf || highInteg || highAvail) impact = RiskExploitationImpact.High;
    if (criticalConf || criticalInteg || criticalAvail) impact = RiskExploitationImpact.VeryHigh;

    // Create risk
    const risk = new Risk(
        category.id,
        CalculateSeverity(RiskExploitationLikelihood.Unlikely, impact),
        RiskExploitationLikelihood.Unlikely,
        impact,
        title,
        `${category.id}@${technicalAsset.id}`, // Synthetic ID
        DataBreachProbability.Probable,
        [technicalAsset.id], // The asset itself is the breach point
        undefined,
        technicalAsset.id, // Most relevant asset
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
