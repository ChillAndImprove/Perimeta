import * as YAML from 'npm:yaml';

import {
  Digraph,
  Subgraph,
  Node,
  Edge,
  NodeAttributes,
  EdgeAttributes,
  SubgraphAttributes,
  RootGraphAttributes, // Assuming this type exists or use object type
  attribute as _,
  Compass, // For port positions if needed later
  toDot,
  // REMOVED: Style, // Style enum is not exported, use strings like 'dashed'
  // ArrowType, // Consider if ArrowType enum exists for arrow shapes
  // RankType, // Consider if RankType enum exists for rank
  // Color, // Consider if Color enum/helpers exist
} from 'npm:ts-graphviz';
// Import Core Types and State Management
import {
    modelState,
    initModelState,
    CustomRiskRule,
    ModelInput,
    InputTechnicalAsset,
    InputDataAsset,
    InputTrustBoundary,
    InputSharedRuntime,
    InputCommunicationLink,
    InputRiskTracking,
    InputIndividualRiskCategory,
    InputRiskIdentified,
    ParsedModel,
    TechnicalAsset,
    DataAsset,
    TrustBoundary,
    SharedRuntime,
    CommunicationLink,
    Risk,
    RiskCategory,
    RiskTracking,
    // Enums needed for parsing
    parseQuantity, Quantity,
    parseConfidentiality, Confidentiality,
    parseCriticality, Criticality,
    parseUsage, Usage,
    parseEncryptionStyle, EncryptionStyle,
    parseDataFormat, DataFormat, // Assuming you add parseDataFormat
    TechnicalAssetType, TechnicalAssetSize, TechnicalAssetTechnology, TechnicalAssetMachine,
    Authentication, Authorization, Protocol,
    TrustBoundaryType,
    RiskFunction, STRIDE, RiskSeverity, RiskExploitationLikelihood, RiskExploitationImpact,
    DataBreachProbability, RiskStatus,
    // Helper functions
    makeID, normalizeTag, checkTags, // Assuming checkTags exists or is added
    addTagToModelInput,
    getSortedRiskCategories, getSortedRisksOfCategory, getAllRisks, RiskStatistics, getOverallRiskStatistics,
    // Risk Calculation
    CalculateSeverity,
} from './model/types.ts'; // Adjust path if needed

import { applyRAA as calculateRAA } from './raa/multifactor/multi.ts'; // Assuming it's in raa-calculator.ts

// Import Colors (if needed directly, often used by diagramming/reporting)
import * as colors from './colors/colors.ts';

// Import Built-in Risk Rules
// (This list will be long - consider dynamic imports or a build step if it gets unwieldy)


import * as missing_security_process_update from './risks/built-in/missing-security-process-update/missing-security-process-update-rule.ts';
import * as violation_legal_contractual_obligations from './risks/built/violation-legal-contractual-obligations/violation-legal-contractual-obligations-rule.ts';

import * as insufficient_enforceability_measures from './risks/built-in/insufficient-enforceability-measures/insufficient-enforceability-measures-rule.ts';
import * as insufficient_misguided_investments_role_comm from './risks/built-in/insufficient-misguided-investments-role-comm/insufficient-misguided-investments-role-comm-rule.ts';
import * as insufficient_strategic_conceptual_guidelines from './risks/built-in/insufficient-strategic-conceptual-guidelines/insufficient-strategic-conceptual-guidelines-rules.ts';
import * as lack_of_management_support_for_security from './risks/built-in/lack-of-management-support-for-security/lack-of-management-support-for-security-rule.ts';
import * as lack_of_management_support_for_security from './risks/built-in/lack-of-management-support-for-security/lack-of-management-support-for-security-rule.ts';
import * as lack_of_personal_responsibility from './risks/built-in/lack-of-personal-responsibility/lack-of-personal-responsibility-rule.ts';
import * as accidental_secret_leak from './risks/built-in/accidental-secret-leak/accidental-secret-leak-rule.ts';
import * as code_backdooring from './risks/built-in/code-backdooring/code-backdooring-rule.ts';
import * as container_baseimage_backdooring from './risks/built-in/container-baseimage-backdooring/container-baseimage-backdooring-rule.ts';
import * as container_platform_escape from './risks/built-in/container-platform-escape/container-platform-escape-rule.ts';
import * as cross_site_request_forgery from './risks/built-in/cross-site-request-forgery/cross-site-request-forgery-rule.ts';
import * as cross_site_scripting from './risks/built-in/cross-site-scripting/cross-site-scripting-rule.ts';
import * as dos_risky_access_across_trust_boundary from './risks/built-in/dos-risky-access-across-trust-boundary/dos-risky-access-across-trust-boundary-rule.ts';
import * as incomplete_model from './risks/built-in/incomplete-model/incomplete-model-rule.ts';
import * as ldap_injection from './risks/built-in/ldap-injection/ldap-injection-rule.ts';
import * as missing_authentication from './risks/built-in/missing-authentication/missing-authentication-rule.ts';
import * as missing_authentication_second_factor from './risks/built-in/missing-authentication-second-factor/missing-authentication-second-factor-rule.ts';
import * as missing_build_infrastructure from './risks/built-in/missing-build-infrastructure/missing-build-infrastructure-rule.ts';
import * as missing_cloud_hardening from './risks/built-in/missing-cloud-hardening/missing-cloud-hardening-rule.ts';
import * as missing_file_validation from './risks/built-in/missing-file-validation/missing-file-validation-rule.ts';
import * as missing_hardening from './risks/built-in/missing-hardening/missing-hardening-rule.ts';
import * as missing_identity_propagation from './risks/built-in/missing-identity-propagation/missing-identity-propagation-rule.ts';
import * as missing_identity_provider_isolation from './risks/built-in/missing-identity-provider-isolation/missing-identity-provider-isolation-rule.ts';
import * as missing_identity_store from './risks/built-in/missing-identity-store/missing-identity-store-rule.ts';
import * as missing_network_segmentation from './risks/built-in/missing-network-segmentation/missing-network-segmentation-rule.ts';
import * as missing_vault from './risks/built-in/missing-vault/missing-vault-rule.ts';
import * as missing_vault_isolation from './risks/built-in/missing-vault-isolation/missing-vault-isolation-rule.ts';
import * as missing_waf from './risks/built-in/missing-waf/missing-waf-rule.ts';
import * as mixed_targets_on_shared_runtime from './risks/built-in/mixed-targets-on-shared-runtime/mixed-targets-on-shared-runtime-rule.ts';
import * as path_traversal from './risks/built-in/path-traversal/path-traversal-rule.ts';
import * as push_instead_of_pull_deployment from './risks/built-in/push-instead-of-pull-deployment/push-instead-of-pull-deployment-rule.ts';
import * as search_query_injection from './risks/built-in/search-query-injection/search-query-injection-rule.ts';
import * as server_side_request_forgery from './risks/built-in/server-side-request-forgery/server-side-request-forgery-rule.ts';
import * as service_registry_poisoning from './risks/built-in/service-registry-poisoning/service-registry-poisoning-rule.ts';
import * as sql_nosql_injection from './risks/built-in/sql-nosql-injection/sql-nosql-injection-rule.ts';
import * as unchecked_deployment from './risks/built-in/unchecked-deployment/unchecked-deployment-rule.ts';
import * as unencrypted_asset from './risks/built-in/unencrypted-asset/unencrypted-asset-rule.ts';
import * as unencrypted_communication from './risks/built-in/unencrypted-communication/unencrypted-communication-rule.ts';
import * as unguarded_access_from_internet from './risks/built-in/unguarded-access-from-internet/unguarded-access-from-internet-rule.ts';
import * as unguarded_direct_datastore_access from './risks/built-in/unguarded-direct-datastore-access/unguarded-direct-datastore-access-rule.ts';
import * as unnecessary_communication_link from './risks/built-in/unnecessary-communication-link/unnecessary-communication-link-rule.ts';
import * as unnecessary_data_asset from './risks/built-in/unnecessary-data-asset/unnecessary-data-asset-rule.ts';
import * as unnecessary_data_transfer from './risks/built-in/unnecessary-data-transfer/unnecessary-data-transfer-rule.ts';
import * as unnecessary_technical_asset from './risks/built-in/unnecessary-technical-asset/unnecessary-technical-asset-rule.ts';
import * as untrusted_deserialization from './risks/built-in/untrusted-deserialization/untrusted-deserialization-rule.ts';
import * as wrong_communication_link_content from './risks/built-in/wrong-communication-link-content/wrong-communication-link-content-rule.ts';
import * as wrong_trust_boundary_content from './risks/built-in/wrong-trust-boundary-content/wrong-trust-boundary-content-rule.ts';
import * as xml_external_entity from './risks/built-in/xml-external-entity/xml-external-entity-rule.ts';

// --- Global Settings / Constants ---
// const THREAGILE_VERSION = "1.0.0"; // Defined in types.ts
const DEFAULT_BUSINESS_CRITICALITY = Criticality.Important;
const DEFAULT_DATA_ASSET_USAGE = Usage.Business;
const DEFAULT_DATA_ASSET_QUANTITY = Quantity.Few;
const DEFAULT_DATA_ASSET_CONFIDENTIALITY = Confidentiality.Internal;
const DEFAULT_DATA_ASSET_INTEGRITY = Criticality.Operational;
const DEFAULT_DATA_ASSET_AVAILABILITY = Criticality.Operational;

const DEFAULT_TECH_ASSET_USAGE = Usage.Business;
const DEFAULT_TECH_ASSET_TYPE = TechnicalAssetType.Process;
const DEFAULT_TECH_ASSET_SIZE = TechnicalAssetSize.Application;
const DEFAULT_TECH_ASSET_TECH = TechnicalAssetTechnology.UnknownTechnology;
const DEFAULT_TECH_ASSET_MACHINE = TechnicalAssetMachine.Virtual;
const DEFAULT_TECH_ASSET_ENCRYPTION = EncryptionStyle.None;
const DEFAULT_TECH_ASSET_CONFIDENTIALITY = Confidentiality.Internal;
const DEFAULT_TECH_ASSET_INTEGRITY = Criticality.Operational;
const DEFAULT_TECH_ASSET_AVAILABILITY = Criticality.Operational;

const DEFAULT_COMM_LINK_AUTHN = Authentication.None;
const DEFAULT_COMM_LINK_AUTHZ = Authorization.None;
const DEFAULT_COMM_LINK_USAGE = Usage.Business;
const DEFAULT_COMM_LINK_PROTOCOL = Protocol.UnknownProtocol;

const DEFAULT_TRUST_BOUNDARY_TYPE = TrustBoundaryType.NetworkVirtualLAN;

const DEFAULT_RISK_SEVERITY = RiskSeverity.Medium;
const DEFAULT_RISK_LIKELIHOOD = RiskExploitationLikelihood.Likely;
const DEFAULT_RISK_IMPACT = RiskExploitationImpact.Medium;
const DEFAULT_RISK_DB_PROBABILITY = DataBreachProbability.Possible;

const DEFAULT_RISK_TRACKING_STATUS = RiskStatus.Unchecked;

// Regular Expression for ID validation (similar to Go's)
const validIdSyntax = /^[A-Za-z0-9\-]+$/;

// --- Register Built-in Risk Rules ---
// Each rule file should export an object conforming to the CustomRiskRule interface
const builtInRiskRules: CustomRiskRule[] = [
    accidental_secret_leak.Rule, code_backdooring.Rule, container_baseimage_backdooring.Rule, // <- Corrected names
    container_platform_escape.Rule, cross_site_request_forgery.Rule, cross_site_scripting.Rule,
    dos_risky_access_across_trust_boundary.Rule, incomplete_model.Rule, ldap_injection.Rule,
    lack_of_management_support_for_security.Rule,lack_of_personal_responsibility.Rule,
    missing_authentication.Rule, missing_authentication_second_factor.Rule,
    missing_build_infrastructure.Rule, missing_cloud_hardening.Rule, missing_file_validation.Rule,
    missing_hardening.Rule, missing_identity_propagation.Rule, missing_identity_provider_isolation.Rule,
    missing_identity_store.Rule, missing_network_segmentation.Rule, missing_vault.Rule,
    missing_vault_isolation.Rule, missing_waf.Rule, mixed_targets_on_shared_runtime.Rule,
    path_traversal.Rule, push_instead_of_pull_deployment.Rule, search_query_injection.Rule,
    server_side_request_forgery.Rule, service_registry_poisoning.Rule, sql_nosql_injection.Rule,
    unchecked_deployment.Rule, unencrypted_asset.Rule, unencrypted_communication.Rule,
    unguarded_access_from_internet.Rule, unguarded_direct_datastore_access.Rule,
    unnecessary_communication_link.Rule, unnecessary_data_asset.Rule, unnecessary_data_transfer.Rule,
    unnecessary_technical_asset.Rule, untrusted_deserialization.Rule,
    insufficient_strategic_conceptual_guidelines.Rule,insufficient_misguided_investments_role_comm.Rule,
    wrong_communication_link_content.Rule, wrong_trust_boundary_content.Rule, xml_external_entity.Rule,
    insufficient_enforceability_measures.Rule,missing_security_process_update.Rule
];


// Basic `withDefault` equivalent
function withDefault<T>(value: T | undefined | null, defaultValue: T): T {
    // Handle empty strings specifically if needed, otherwise just check for null/undefined
    if (value === '' || value === null || value === undefined) {
        return defaultValue;
    }
    return value;
}

// Placeholder for checkTags - implement validation logic as needed
function checkTags(tags: string[] | undefined, context: string): string[] {
    if (!tags) return [];
    const cleanedTags = tags.map(normalizeTag).filter(tag => tag.length > 0);
    // Add more validation if required (e.g., check against modelState.parsedModelRoot.tagsAvailable)
    // console.log(`Tags for ${context}:`, cleanedTags);
    return cleanedTags;
}
// Helper function to create node model for Actors
function createActorNodeModel(actor: Actor): { id: string, attributes: NodeAttributes } {
    // Using an HTML-like label for better formatting
    const kindAndRoleParts: string[] = [];
    if (actor.kind && actor.kind !== ActorKind.Unspecified) {
        kindAndRoleParts.push(encodeHTML(actor.kind));
    }
    // Add functional role if it's meaningful and not generic like "Service"
    if (actor.functionalRole &&
        actor.functionalRole !== FunctionalRole.Unknown &&
        actor.functionalRole !== FunctionalRole.Service) { // 'Service' might be too generic for display on all non-human actors
        kindAndRoleParts.push(encodeHTML(actor.functionalRole));
    }

    let labelHtml = `<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="2">`;
    labelHtml += `<TR><TD><B>${encodeHTML(actor.title)}</B></TD></TR>`;
    if (kindAndRoroleParts.length > 0) {
        labelHtml += `<TR><TD><FONT POINT-SIZE="14">${kindAndRoleParts.join(', ')}</FONT></TD></TR>`;
    }
    labelHtml += `</TABLE>>`;

    const attributes: NodeAttributes = {
        [_.label]: labelHtml,
        [_.shape]: actor.determineShape(), // From Actor.determineShape()
        [_.style]: 'filled',
        [_.fillcolor]: actor.determineShapeFillColor(), // From Actor.determineShapeFillColor()
        [_.fontname]: 'Verdana', // Consistent with defaultNodeAttrs
        [_.fontsize]: 18,       // Slightly smaller or same as defaultNodeAttrs.fontsize
        // Example: Add border color/width based on actor properties like training level
        // [_.color]: actor.isPoorlyTrained() ? colors.Orange : colors.Black, // Assuming colors.Orange exists
        // [_.penwidth]: actor.isPoorlyTrained() ? 2.0 : 1.5,
    };

    // Ensure actor IDs are safe for DOT. Assuming actor.id is globally unique
    // or made unique by the parser (e.g., doesn't clash with technicalAsset.id).
    return { id: safeDotId(actor.id), attributes };
}


function checkIdSyntax(id: string, context: string): void {
    if (!validIdSyntax.test(id)) {
        throw new Error(`Invalid ID syntax used in ${context} (only letters, numbers, and hyphen allowed): ${id}`);
    }
}
/**
 * Sorts Technical Assets primarily by their diagramTweakOrder (ascending, undefined/0 first),
 * and secondarily by their ID (alphabetical).
 */
function sortByTechnicalAssetOrderAndId(a: TechnicalAsset, b: TechnicalAsset): number {
    const orderA = a.diagramTweakOrder ?? 0; // Treat undefined/null order as 0
    const orderB = b.diagramTweakOrder ?? 0;

    if (orderA !== orderB) {
        return orderA - orderB; // Sort numerically by order
    }

    // If order is the same, sort by ID
    return a.id.localeCompare(b.id);
}
export function applyRAAMethod() {
    calculateRAA();
}

// Parses and validates the model input YAML
export function parseModel(modelYaml: string): ParsedModel {
    console.log("Initializing model state...");
    initModelState(); // Clear any previous state

    let modelInput: ModelInput;
    try {
        // Ensure the input is treated as a string before parsing
        const yamlContent = typeof modelYaml === 'string' ? modelYaml : String(modelYaml);
        const rawParsed = YAML.parse(yamlContent);
        // Basic type check after parsing
        if (typeof rawParsed !== 'object' || rawParsed === null) {
            throw new Error("Parsed YAML is not a valid object.");
        }
        modelInput = rawParsed as ModelInput; // Cast after basic check
        console.log("YAML parsed successfully.");
    } catch (e) {
        console.error("Error parsing YAML input:", e);
        throw new Error(`Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`);
    }

    // --- Basic Model Info ---
    const businessCriticality = parseCriticality(modelInput.business_criticality || '') ?? DEFAULT_BUSINESS_CRITICALITY;
    let reportDate: Date;
    try {
        reportDate = modelInput.date ? new Date(modelInput.date) : new Date();
        if (isNaN(reportDate.getTime())) {
            console.warn(`Invalid date format "${modelInput.date}", using current date.`);
            reportDate = new Date();
        }
    } catch {
        console.warn(`Could not parse date "${modelInput.date}", using current date.`);
        reportDate = new Date();
    }

    // Create the root object for the parsed model state
    const parsedModel: ParsedModel = {
        author: modelInput.author ?? {},
        title: modelInput.title ?? 'Untitled Model',
        date: reportDate,
        managementSummaryComment: modelInput.management_summary_comment ?? '',
        businessOverview: modelInput.business_overview ?? {}, // TODO: Process images like in Go?
        technicalOverview: modelInput.technical_overview ?? {}, // TODO: Process images like in Go?
        businessCriticality: businessCriticality,
        securityRequirements: modelInput.security_requirements ?? {},
        questions: modelInput.questions ?? {},
        abuseCases: modelInput.abuse_cases ?? {},
        tagsAvailable: (modelInput.tags_available ?? []).map(normalizeTag),
        dataAssets: {},
        technicalAssets: {},
        trustBoundaries: {},
        sharedRuntimes: {},
        individualRiskCategories: {},
        riskTracking: {},
        diagramTweakNodesep: modelInput.diagram_tweak_nodesep ?? 2,
        diagramTweakRanksep: modelInput.diagram_tweak_ranksep ?? 2,
        diagramTweakEdgeLayout: modelInput.diagram_tweak_edge_layout ?? '',
        diagramTweakSuppressEdgeLabels: modelInput.diagram_tweak_suppress_edge_labels ?? false,
        diagramTweakLayoutLeftToRight: modelInput.diagram_tweak_layout_left_to_right ?? false,
        diagramTweakInvisibleConnectionsBetweenAssets: modelInput.diagram_tweak_invisible_connections_between_assets ?? [],
        diagramTweakSameRankAssets: modelInput.diagram_tweak_same_rank_assets ?? [],
    };
    modelState.parsedModelRoot = parsedModel; // Assign to global state
    console.log("Parsed basic model information.");

    // --- Data Assets ---
    console.log("Parsing data assets...");
    for (const title in modelInput.data_assets) {
        const assetInput = modelInput.data_assets[title];
        const id = makeID(assetInput.id); // Use makeID consistent with potential Go counterpart
        const context = `data asset '${title}' (ID: ${id})`;
        checkIdSyntax(id, context);
        if (parsedModel.dataAssets[id]) {
            throw new Error(`Duplicate data asset ID used: ${id}`);
        }

        // Use defaults from constants
        const usage = parseUsage(assetInput.usage) ?? DEFAULT_DATA_ASSET_USAGE;
        const quantity = parseQuantity(assetInput.quantity) ?? DEFAULT_DATA_ASSET_QUANTITY;
        const confidentiality = parseConfidentiality(assetInput.confidentiality) ?? DEFAULT_DATA_ASSET_CONFIDENTIALITY;
        const integrity = parseCriticality(assetInput.integrity) ?? DEFAULT_DATA_ASSET_INTEGRITY;
        const availability = parseCriticality(assetInput.availability) ?? DEFAULT_DATA_ASSET_AVAILABILITY;

        // Create DataAsset instance (constructor handles defaults for some fields)
        const dataAsset = new DataAsset({
            ...assetInput, // Spread the input
            id: id, // Ensure ID is set
            // Override parsed enums/values
            usage: usage,
            quantity: quantity,
            confidentiality: confidentiality,
            integrity: integrity,
            availability: availability,
            tags: checkTags(assetInput.tags, context),
        }, id); // Pass ID to constructor too
        dataAsset.title = title; // Set title explicitly from the key

        parsedModel.dataAssets[id] = dataAsset;
    }
    console.log(`Parsed ${Object.keys(parsedModel.dataAssets).length} data assets.`);

    // --- Technical Assets ---
    console.log("Parsing technical assets...");
    const techAssetInputs: Record<string, InputTechnicalAsset> = modelInput.technical_assets ?? {};
    for (const title in techAssetInputs) {
        const assetInput = techAssetInputs[title];
        const id = makeID(assetInput.id);
        const context = `technical asset '${title}' (ID: ${id})`;
        checkIdSyntax(id, context);
        if (parsedModel.technicalAssets[id]) {
            throw new Error(`Duplicate technical asset ID used: ${id}`);
        }

        // Parse enums with defaults
        const usage = parseUsage(assetInput.usage) ?? DEFAULT_TECH_ASSET_USAGE;
        const type = (assetInput.type as TechnicalAssetType) ?? DEFAULT_TECH_ASSET_TYPE; // Direct cast assumes string enums in YAML
        const size = (assetInput.size as TechnicalAssetSize) ?? DEFAULT_TECH_ASSET_SIZE; // Adjust if YAML uses different values
        const technology = (assetInput.technology as TechnicalAssetTechnology) ?? DEFAULT_TECH_ASSET_TECH;
        const machine = (assetInput.machine as TechnicalAssetMachine) ?? DEFAULT_TECH_ASSET_MACHINE;
        const encryption = parseEncryptionStyle(assetInput.encryption) ?? DEFAULT_TECH_ASSET_ENCRYPTION;
        const confidentiality = parseConfidentiality(assetInput.confidentiality) ?? DEFAULT_TECH_ASSET_CONFIDENTIALITY;
        const integrity = parseCriticality(assetInput.integrity) ?? DEFAULT_TECH_ASSET_INTEGRITY;
        const availability = parseCriticality(assetInput.availability) ?? DEFAULT_TECH_ASSET_AVAILABILITY;

        // Validate referenced data assets
        const dataAssetsProcessed = (assetInput.data_assets_processed ?? []).map(daId => {
            if (!parsedModel.dataAssets[daId]) {
                throw new Error(`Missing referenced data asset processed by ${context}: ${daId}`);
            }
            return daId;
        });
        const dataAssetsStored = (assetInput.data_assets_stored ?? []).map(daId => {
            if (!parsedModel.dataAssets[daId]) {
                throw new Error(`Missing referenced data asset stored by ${context}: ${daId}`);
            }
            return daId;
        });
        const dataFormatsAccepted = (assetInput.data_formats_accepted ?? []).map(df => {
             const parsed = parseDataFormat(df); // Assuming parseDataFormat exists
             if (!parsed) throw new Error(`Unknown data format accepted by ${context}: ${df}`);
             return parsed;
        });


        const techAsset = new TechnicalAsset({
            ...assetInput,
            id: id,
            // Override parsed/validated values
            usage: usage,
            type: type,
            size: size,
            technology: technology,
            machine: machine,
            encryption: encryption,
            confidentiality: confidentiality,
            integrity: integrity,
            availability: availability,
            tags: checkTags(assetInput.tags, context),
            data_assets_processed: dataAssetsProcessed,
            data_assets_stored: dataAssetsStored,
            data_formats_accepted: dataFormatsAccepted,
            // Communication links processed separately below
            communication_links: undefined, // Clear input comm links here
        }, id);
        techAsset.title = title; // Set title explicitly

        parsedModel.technicalAssets[id] = techAsset;
    }
     console.log(`Parsed ${Object.keys(parsedModel.technicalAssets).length} technical assets.`);


    // --- Communication Links (Needs all Tech Assets parsed first) ---
    console.log("Parsing communication links...");
    let commLinkCounter = 0;
    for (const sourceId in parsedModel.technicalAssets) {
        const sourceAsset = parsedModel.technicalAssets[sourceId];
        const assetInput = techAssetInputs[sourceAsset.title]; // Get the original input again
        const commLinksInput = assetInput?.communication_links ?? {};

        for (const commLinkTitle in commLinksInput) {
            const linkInput = commLinksInput[commLinkTitle];
            const targetId = makeID(linkInput.target);
             const context = `communication link '${commLinkTitle}' from '${sourceAsset.title}' (ID: ${sourceId}) to '${targetId}'`;

            // Validate target exists
            if (!parsedModel.technicalAssets[targetId]) {
                 throw new Error(`Missing referenced target technical asset in ${context}: ${targetId}`);
            }

            // Parse enums with defaults
            const protocol = (linkInput.protocol as Protocol) ?? DEFAULT_COMM_LINK_PROTOCOL; // Direct cast
            const authentication = (linkInput.authentication as Authentication) ?? DEFAULT_COMM_LINK_AUTHN;
            const authorization = (linkInput.authorization as Authorization) ?? DEFAULT_COMM_LINK_AUTHZ;
            const usage = parseUsage(linkInput.usage) ?? DEFAULT_COMM_LINK_USAGE;

             // Validate referenced data assets
            const dataAssetsSent = (linkInput.data_assets_sent ?? []).map(daId => {
                if (!parsedModel.dataAssets[daId]) {
                    throw new Error(`Missing referenced data asset sent via ${context}: ${daId}`);
                }
                return daId;
            });
            const dataAssetsReceived = (linkInput.data_assets_received ?? []).map(daId => {
                if (!parsedModel.dataAssets[daId]) {
                     throw new Error(`Missing referenced data asset received via ${context}: ${daId}`);
                }
                return daId;
            });

            // Create CommunicationLink instance
             const commLink = new CommunicationLink({
                ...linkInput,
                // Override parsed/validated values
                target: targetId, // Use the validated target ID
                protocol: protocol,
                authentication: authentication,
                authorization: authorization,
                usage: usage,
                tags: checkTags(linkInput.tags, context),
                data_assets_sent: dataAssetsSent,
                data_assets_received: dataAssetsReceived,
            }, sourceId, targetId); // Pass source and target IDs
            commLink.title = commLinkTitle; // Set title from key

            // Add to source asset's list
            sourceAsset.communicationLinks.push(commLink);

            // Add to global maps in modelState
            modelState.communicationLinks[commLink.id] = commLink;
            if (!modelState.incomingTechnicalCommunicationLinksMappedByTargetId[targetId]) {
                modelState.incomingTechnicalCommunicationLinksMappedByTargetId[targetId] = [];
            }
            modelState.incomingTechnicalCommunicationLinksMappedByTargetId[targetId].push(commLink);
            commLinkCounter++;
        }
    }
    console.log(`Parsed ${commLinkCounter} communication links.`);

    // --- Trust Boundaries ---
    console.log("Parsing trust boundaries...");
    const checklistToAvoidAssetInMultipleBoundaries: Record<string, string> = {}; // Store boundary ID
    for (const title in modelInput.trust_boundaries) {
        const boundaryInput = modelInput.trust_boundaries[title];
        const id = makeID(boundaryInput.id);
        const context = `trust boundary '${title}' (ID: ${id})`;
        checkIdSyntax(id, context);
        if (parsedModel.trustBoundaries[id]) {
            throw new Error(`Duplicate trust boundary ID used: ${id}`);
        }

        const type = (boundaryInput.type as TrustBoundaryType) ?? DEFAULT_TRUST_BOUNDARY_TYPE;

        const technicalAssetsInside = (boundaryInput.technical_assets_inside ?? []).map(taId => {
            if (!parsedModel.technicalAssets[taId]) {
                 throw new Error(`Missing referenced technical asset inside ${context}: ${taId}`);
            }
            if (checklistToAvoidAssetInMultipleBoundaries[taId]) {
                throw new Error(`Technical asset ${taId} is defined inside multiple trust boundaries ('${checklistToAvoidAssetInMultipleBoundaries[taId]}' and '${id}')`);
            }
            checklistToAvoidAssetInMultipleBoundaries[taId] = id;
            return taId;
        });

        // Nested boundaries validated later
        const trustBoundariesNested = (boundaryInput.trust_boundaries_nested ?? []).map(tbId => makeID(tbId));

        const trustBoundary = new TrustBoundary({
            ...boundaryInput,
            id: id,
            type: type,
            tags: checkTags(boundaryInput.tags, context),
            technical_assets_inside: technicalAssetsInside,
            trust_boundaries_nested: trustBoundariesNested, // Use mapped IDs
        }, id);
        trustBoundary.title = title;

        parsedModel.trustBoundaries[id] = trustBoundary;

         // Populate mapping for direct parent
        technicalAssetsInside.forEach(taId => {
            modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[taId] = trustBoundary;
        });
    }
    // Validate nested trust boundaries exist
    for(const tbId in parsedModel.trustBoundaries) {
        const tb = parsedModel.trustBoundaries[tbId];
        tb.trustBoundariesNested.forEach(nestedId => {
            if (!parsedModel.trustBoundaries[nestedId]) {
                throw new Error(`Trust boundary '${tb.title}' (ID: ${tbId}) references nested trust boundary with unknown ID: ${nestedId}`);
            }
             // Check for cyclic references (simple parent check)
            const parentId = tb.getParentTrustBoundaryID(); // This uses the global map, should work now
            if (parentId === nestedId) {
                throw new Error(`Cyclic trust boundary nesting detected between '${tb.title}' (ID: ${tbId}) and its referenced nested boundary (ID: ${nestedId})`);
            }
            // Deeper cycle check might be needed if complex nesting occurs
        });
    }
    console.log(`Parsed ${Object.keys(parsedModel.trustBoundaries).length} trust boundaries.`);


    // --- Shared Runtimes ---
    console.log("Parsing shared runtimes...");
    for (const title in modelInput.shared_runtimes) {
        const runtimeInput = modelInput.shared_runtimes[title];
        const id = makeID(runtimeInput.id);
        const context = `shared runtime '${title}' (ID: ${id})`;
         checkIdSyntax(id, context);
        if (parsedModel.sharedRuntimes[id]) {
            throw new Error(`Duplicate shared runtime ID used: ${id}`);
        }

        const technicalAssetsRunning = (runtimeInput.technical_assets_running ?? []).map(taId => {
            if (!parsedModel.technicalAssets[taId]) {
                throw new Error(`Missing referenced technical asset running on ${context}: ${taId}`);
            }
            // Optionally check if asset is already in another runtime if that's disallowed
            return taId;
        });


        const sharedRuntime = new SharedRuntime({
            ...runtimeInput,
            id: id,
            tags: checkTags(runtimeInput.tags, context),
            technical_assets_running: technicalAssetsRunning,
        }, id);
        sharedRuntime.title = title;

        parsedModel.sharedRuntimes[id] = sharedRuntime;

        // Populate mapping
        technicalAssetsRunning.forEach(taId => {
            modelState.directContainingSharedRuntimeMappedByTechnicalAssetId[taId] = sharedRuntime;
        });
    }
    console.log(`Parsed ${Object.keys(parsedModel.sharedRuntimes).length} shared runtimes.`);

    // --- Individual Risk Categories (Used for Custom Risks and Pre-defined Risk Instances) ---
    console.log("Parsing individual risk categories and instances...");
    for (const title in modelInput.individual_risk_categories) {
        const catInput = modelInput.individual_risk_categories[title];
        const id = makeID(catInput.id);
         const catContext = `individual risk category '${title}' (ID: ${id})`;
        checkIdSyntax(id, catContext);
        if (parsedModel.individualRiskCategories[id]) {
            throw new Error(`Duplicate individual risk category ID used: ${id}`);
        }

        const riskFunction = (catInput.function as RiskFunction); // Direct cast
        if (!Object.values(RiskFunction).includes(riskFunction)) {
             throw new Error(`Unknown function value in ${catContext}: ${catInput.function}`);
        }
        const stride = (catInput.stride as STRIDE); // Direct cast
        if (!Object.values(STRIDE).includes(stride)) {
            throw new Error(`Unknown STRIDE value in ${catContext}: ${catInput.stride}`);
        }

        const category: RiskCategory = {
            id: id,
            title: title,
            description: catInput.description ?? '',
            impact: catInput.impact ?? '',
            asvs: catInput.asvs ?? '',
            cheatSheet: catInput.cheat_sheet ?? '',
            action: catInput.action ?? '',
            mitigation: catInput.mitigation ?? '',
            check: catInput.check ?? '',
            detectionLogic: catInput.detection_logic ?? '',
            riskAssessment: catInput.risk_assessment ?? '',
            falsePositives: catInput.false_positives ?? '',
            function: riskFunction,
            stride: stride,
            modelFailurePossibleReason: catInput.model_failure_possible_reason ?? false,
            cwe: catInput.cwe ?? 0,
        };
        parsedModel.individualRiskCategories[id] = category;

        // --- Individual Risk Instances defined within this category ---
        for (const riskTitle in catInput.risks_identified) {
            const riskInput = catInput.risks_identified[riskTitle];
            const riskContext = `individual risk instance '${riskTitle}' under category '${category.title}'`;

            const severity = (riskInput.severity as RiskSeverity) ?? DEFAULT_RISK_SEVERITY;
            const likelihood = (riskInput.exploitation_likelihood as RiskExploitationLikelihood) ?? DEFAULT_RISK_LIKELIHOOD;
            const impact = (riskInput.exploitation_impact as RiskExploitationImpact) ?? DEFAULT_RISK_IMPACT;
            const dataBreachProbability = (riskInput.data_breach_probability as DataBreachProbability) ?? DEFAULT_RISK_DB_PROBABILITY;

             // Validate references
            const mostRelevantDataAssetId = riskInput.most_relevant_data_asset;
            if (mostRelevantDataAssetId && !parsedModel.dataAssets[mostRelevantDataAssetId]) {
                throw new Error(`Missing referenced data asset in ${riskContext}: ${mostRelevantDataAssetId}`);
            }
            const mostRelevantTechnicalAssetId = riskInput.most_relevant_technical_asset;
            if (mostRelevantTechnicalAssetId && !parsedModel.technicalAssets[mostRelevantTechnicalAssetId]) {
                throw new Error(`Missing referenced technical asset in ${riskContext}: ${mostRelevantTechnicalAssetId}`);
            }
             const mostRelevantCommunicationLinkId = riskInput.most_relevant_communication_link;
             // Comm link IDs are synthetic (source->target@protocol) - need careful matching or direct use from input
             // For simplicity here, assume the ID provided in YAML is correct and exists in modelState.communicationLinks
            if (mostRelevantCommunicationLinkId && !modelState.communicationLinks[mostRelevantCommunicationLinkId]) {
                 // Check if it's a title instead of ID? Go code uses createDataFlowId internally.
                 // This part is ambiguous without seeing Go's createDataFlowId exact logic and usage here.
                 // Assuming the ID provided in YAML is the synthetic one for now.
                console.warn(`Referenced communication link in ${riskContext} not found by ID: ${mostRelevantCommunicationLinkId}. Validation might be incomplete.`);
                 // Alternative: Try finding by title? Requires iterating through modelState.communicationLinks.
                 // const foundLink = Object.values(modelState.communicationLinks).find(l => l.title === mostRelevantCommunicationLinkId);
                 // if (!foundLink) { ... throw error ... }
                 // mostRelevantCommunicationLinkId = foundLink.id; // Use the found ID
            }
            const mostRelevantTrustBoundaryId = riskInput.most_relevant_trust_boundary;
            if (mostRelevantTrustBoundaryId && !parsedModel.trustBoundaries[mostRelevantTrustBoundaryId]) {
                 throw new Error(`Missing referenced trust boundary in ${riskContext}: ${mostRelevantTrustBoundaryId}`);
            }
            const mostRelevantSharedRuntimeId = riskInput.most_relevant_shared_runtime;
            if (mostRelevantSharedRuntimeId && !parsedModel.sharedRuntimes[mostRelevantSharedRuntimeId]) {
                 throw new Error(`Missing referenced shared runtime in ${riskContext}: ${mostRelevantSharedRuntimeId}`);
            }
             const dataBreachTechnicalAssetIDs = (riskInput.data_breach_technical_assets ?? []).map(taId => {
                if (!parsedModel.technicalAssets[taId]) {
                     throw new Error(`Missing referenced data breach technical asset in ${riskContext}: ${taId}`);
                }
                return taId;
            });

            // TODO: Generate Synthetic ID - needs a robust TS equivalent of Go's createSyntheticId
            // Placeholder ID generation - replace with proper logic
            const syntheticId = `${category.id}@${mostRelevantTechnicalAssetId || mostRelevantCommunicationLinkId || mostRelevantDataAssetId || 'model'}:${riskTitle.replace(/\s+/g, '-')}`.toLowerCase();


            const risk = new Risk(
                category.id,
                severity,
                likelihood,
                impact,
                riskTitle,
                syntheticId, // Use generated synthetic ID
                dataBreachProbability,
                dataBreachTechnicalAssetIDs,
                mostRelevantDataAssetId,
                mostRelevantTechnicalAssetId,
                mostRelevantTrustBoundaryId,
                mostRelevantSharedRuntimeId,
                mostRelevantCommunicationLinkId,
            );

            // Add this manually defined risk to the main risk collections
            if (!modelState.generatedRisksByCategory.has(category)) {
                modelState.generatedRisksByCategory.set(category, []);
            }
            modelState.generatedRisksByCategory.get(category)!.push(risk);
            if (modelState.generatedRisksBySyntheticId[risk.syntheticId.toLowerCase()]) {
                console.warn(`Duplicate synthetic risk ID generated or defined for ${riskContext}: ${risk.syntheticId}. Overwriting.`);
            }
            modelState.generatedRisksBySyntheticId[risk.syntheticId.toLowerCase()] = risk;

        }
    }
    console.log(`Parsed ${Object.keys(parsedModel.individualRiskCategories).length} individual risk categories.`);


    // --- Risk Tracking ---
    console.log("Parsing risk tracking entries...");
    for (const syntheticRiskId in modelInput.risk_tracking) {
        const trackingInput = modelInput.risk_tracking[syntheticRiskId];
        const context = `risk tracking for '${syntheticRiskId}'`;

        let trackingDate: Date;
        try {
            trackingDate = trackingInput.date ? new Date(trackingInput.date) : new Date(); // Default to now if missing
            if (isNaN(trackingDate.getTime())) {
                 console.warn(`Invalid date format in ${context}: "${trackingInput.date}". Using current date.`);
                trackingDate = new Date();
            }
        } catch {
            console.warn(`Could not parse date in ${context}: "${trackingInput.date}". Using current date.`);
            trackingDate = new Date();
        }

        const status = (trackingInput.status as RiskStatus) ?? DEFAULT_RISK_TRACKING_STATUS;
         if (!Object.values(RiskStatus).includes(status)) {
            throw new Error(`Unknown status value in ${context}: ${trackingInput.status}`);
        }


        const tracking: RiskTracking = {
            syntheticRiskId: syntheticRiskId.trim(), // Keep original ID with potential wildcards for later matching
            justification: trackingInput.justification ?? '',
            ticket: trackingInput.ticket ?? '',
            checkedBy: trackingInput.checked_by ?? '',
            status: status,
            date: trackingDate,
        };

        // Store all tracking entries, including wildcards. Validation happens later.
        parsedModel.riskTracking[tracking.syntheticRiskId] = tracking;
    }
    console.log(`Parsed ${Object.keys(parsedModel.riskTracking).length} risk tracking entries.`);


    // --- Final Steps ---
    console.log("Calculating RAA...");
    calculateRAA(); // Call the RAA calculation function

    console.log("Model parsing complete.");
    return parsedModel;
}


// Generates risks based on the parsed model and registered rules
export function generateRisks(customRiskRules: CustomRiskRule[] = [], skippedRuleIds: Set<string> = new Set()): Map<RiskCategory, Risk[]> {
    if (!modelState.parsedModelRoot) {
        throw new Error("Model not parsed. Call parseModel first.");
    }
    console.log("Starting risk generation...");

    // Combine built-in and custom rules
    const allRules = [...builtInRiskRules, ...customRiskRules];

    // Clear previous generation results (except for manually defined risks from parsing)
    // Keep existing categories/risks from individual_risks section
    // modelState.generatedRisksByCategory = new Map<RiskCategory, Risk[]>(); // Resetting might wipe individual risks? Re-check logic.
    // modelState.generatedRisksBySyntheticId = {}; // Resetting might wipe individual risks? Re-check logic.

    // Add risks from individual_risk_categories again to ensure they are present if reset occurs
    for (const cat of Object.values(modelState.parsedModelRoot.individualRiskCategories)) {
         if (modelState.generatedRisksByCategory.has(cat)) {
            const risks = modelState.generatedRisksByCategory.get(cat)!;
             risks.forEach(risk => {
                 modelState.generatedRisksBySyntheticId[risk.syntheticId.toLowerCase()] = risk;
             });
         }
     }

    for (const rule of allRules) {
        const category = rule.category();
        if (skippedRuleIds.has(category.id)) {
            console.log(`Skipping risk rule: ${category.id} - ${category.title}`);
            continue;
        }

        try {
            // console.log(`Executing risk rule: ${category.id} - ${category.title}`); // Verbose
            // Add supported tags (ensure modelState is updated)
            // modelState.addToListOfSupportedTags(rule.supportedTags()); // addToListOfSupportedTags needs export or move
            rule.supportedTags().forEach(tag => modelState.allSupportedTags[tag] = true);

            const generated = rule.generateRisks();

            if (generated.length > 0) {
                // console.log(`Rule ${category.id} generated ${generated.length} risk(s).`); // Verbose
                const existingRisks = modelState.generatedRisksByCategory.get(category) || [];
                const updatedRisks = [...existingRisks, ...generated];
                modelState.generatedRisksByCategory.set(category, updatedRisks);

                // Update the map keyed by synthetic ID
                generated.forEach(risk => {
                    const lowerId = risk.syntheticId.toLowerCase();
                    if (modelState.generatedRisksBySyntheticId[lowerId]) {
                         // This can happen if a built-in rule generates the same risk as an individual definition
                        console.warn(`Duplicate synthetic risk ID detected during generation: ${risk.syntheticId}. Keeping existing entry (potentially from individual definition).`);
                    } else {
                        modelState.generatedRisksBySyntheticId[lowerId] = risk;
                    }
                });
            }
        } catch (error) {
            console.error(`Error executing risk rule ${category.id} (${category.title}):`, error);
            // Decide whether to continue or re-throw
            // throw error; // Stop execution on first error
        }
    }

    console.log(`Risk generation complete. Total risks identified: ${Object.keys(modelState.generatedRisksBySyntheticId).length}`);
    return modelState.generatedRisksByCategory;
}

// Applies and validates risk tracking information
// Note: This version primarily validates. Attaching status to risks for output
// is often done in the reporting/serialization step.
export function applyRiskTracking(ignoreOrphaned: boolean = false): void {
    if (!modelState.parsedModelRoot) {
        throw new Error("Model not parsed. Call parseModel first.");
    }
     if (Object.keys(modelState.generatedRisksBySyntheticId).length === 0) {
         console.warn("No risks generated yet. Skipping risk tracking application.");
         return;
     }

    console.log("Applying and validating risk tracking...");
    let orphanedCount = 0;
    let matchedCount = 0;
    const appliedTracking = new Set<string>(); // Track applied exact matches

    const riskTrackingEntries = modelState.parsedModelRoot.riskTracking;

    // --- Handle Exact Matches First ---
    for (const syntheticRiskId in riskTrackingEntries) {
        if (syntheticRiskId.includes('*')) continue; // Skip wildcards for now

        const tracking = riskTrackingEntries[syntheticRiskId];
        const lowerId = syntheticRiskId.toLowerCase();

        if (modelState.generatedRisksBySyntheticId[lowerId]) {
            matchedCount++;
            appliedTracking.add(lowerId);
            // console.log(`Tracking applied to risk: ${lowerId} -> Status: ${tracking.status}`); // Verbose
            // In Go, status was directly updated on the risk object here.
            // In TS, we might prefer to look up tracking status when needed (e.g., Risk.getRiskTracking()).
        } else {
            orphanedCount++;
            const message = `Risk tracking references unknown risk (exact ID not found): ${syntheticRiskId}`;
            if (ignoreOrphaned) {
                console.warn(message);
            } else {
                // Provide more context like the Go version
                 throw new Error(message + "\n\nNOTE: Ensure the synthetic risk ID in your tracking section matches a generated risk. Check IDs in generated reports/JSON. You might need to use the 'ignore-orphaned-risk-tracking' option (or equivalent flag).");
            }
        }
    }

    // --- Handle Wildcard Matches ---
    // Basic wildcard implementation (simple '*' match anywhere)
    // Go's version might be more sophisticated (matching parts between '@')
    for (const wildcardId in riskTrackingEntries) {
        if (!wildcardId.includes('*')) continue;

        const tracking = riskTrackingEntries[wildcardId];
        const regex = new RegExp('^' + wildcardId.replace(/\*/g, '.*') + '$', 'i'); // Create regex from wildcard

        let wildcardMatched = false;
        for (const generatedRiskId in modelState.generatedRisksBySyntheticId) {
             if (appliedTracking.has(generatedRiskId)) {
                continue; // Already matched by an exact entry
            }
             if (regex.test(generatedRiskId)) {
                // console.log(`Wildcard tracking '${wildcardId}' applied to risk: ${generatedRiskId} -> Status: ${tracking.status}`); // Verbose
                // Mark this risk as handled by a wildcard to avoid double-matching if multiple wildcards fit
                // This requires modifying the risk or keeping a separate 'handled' set
                 // For simplicity, we won't prevent double matching here, but a real implementation might need it.
                 // If modifying risk: modelState.generatedRisksBySyntheticId[generatedRiskId].status = tracking.status;
                matchedCount++; // Counting potential matches here, could be >1 per wildcard
                wildcardMatched = true;
                 // Apply the tracking status (conceptual - see note above)
            }
        }
         if (!wildcardMatched) {
            // This wildcard didn't match any *unmatched* risks
             // It might have matched already exactly-matched risks, which is harder to track without modifying risks
             console.warn(`Wildcard risk tracking entry did not match any remaining risks: ${wildcardId}`);
        }
    }


    console.log(`Risk tracking validation complete. Matched: ${matchedCount}, Orphaned/Unmatched: ${orphanedCount}`);
}


// --- Helper Functions ---

function safeDotId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(cleaned) ? `id_${cleaned}` : cleaned;
}

function encodeHTML(str: string): string {
  // Basic check for non-string input
  if (typeof str !== 'string') {
       console.warn("encodeHTML received non-string input:", str);
       return String(str); // Attempt to stringify
  }
  // Chain the replacements
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;'); 
}

    
// --- Diagram Node Creation Helpers (moved from diagrams/*.ts) ---



// Data Asset Diagram: Technical Asset Node (simplified)
function createTechAssetNodeForDataDiagram(asset: TechnicalAsset): { id: string; attributes: NodeAttributes } {
    const nodeId = safeDotId(asset.id);
    // Ensure colors are valid strings (hex or standard names)
    // Provide defaults if color functions might not exist or return undefined
    const defaultColor = '#808080'; // Grey as default
    let fillColor = colors.DarkGray ?? defaultColor; // Use default if DarkGray is undefined

    if (!asset.outOfScope) {
        const risks = asset.getGeneratedRisks ? asset.getGeneratedRisks() : []; // Handle potential missing method
        const highestSeverity = getHighestSeverityStillAtRisk(risks);
        const hasRisks = reduceToOnlyStillAtRisk(risks).length > 0;
        if (hasRisks) {
             switch (highestSeverity) {
                case RiskSeverity.Critical: fillColor = colors.RgbHexColorCriticalRisk?.() ?? '#FF0000'; break; // Use default red if function missing
                case RiskSeverity.High:     fillColor = colors.RgbHexColorHighRisk?.() ?? '#FFA500'; break;     // Orange
                case RiskSeverity.Elevated: fillColor = colors.RgbHexColorElevatedRisk?.() ?? '#FFFF00'; break; // Yellow
                case RiskSeverity.Medium:   fillColor = colors.RgbHexColorMediumRisk?.() ?? '#87CEEB'; break;   // SkyBlue
                case RiskSeverity.Low:      fillColor = colors.RgbHexColorLowRisk?.() ?? '#90EE90'; break;      // LightGreen
             }
        }
    } else {
        fillColor = colors.RgbHexColorOutOfScope?.() ?? '#D3D3D3'; // LightGray
    }

    const fontColor = colors.White ?? '#FFFFFF'; // Use default if White is undefined

    const nodeAttrs: NodeAttributes = {
        [_.shape]: 'box',        // Use string 'box'
        [_.style]: 'filled',     // Use string 'filled'
        [_.fillcolor]: fillColor, // Use calculated color string
        [_.color]: fillColor,     // Border color same as fill for this style
        [_.penwidth]: 3.0,
        [_.fontcolor]: fontColor, // Use calculated color string
        // Use direct HTML string for label
        [_.label]: `<b>${encodeHTML(asset.title)}</b>`,
    };
    return { id: nodeId, attributes: nodeAttrs };
}

/**
 * Creates attributes for a Data Asset node in the Data Asset Diagram.
 * Corrected for ts-graphviz: uses string literals and direct HTML labels.
 */
function createDataAssetNodeModel(asset: DataAsset): { id: string; attributes: NodeAttributes } {
     const nodeId = safeDotId(asset.id);
     const defaultColor = '#808080'; // Grey as default
     let fillColor = colors.DarkGray ?? defaultColor; // Use default if DarkGray is undefined

     const isStillAtRisk = asset.isDataBreachPotentialStillAtRisk ? asset.isDataBreachPotentialStillAtRisk() : false;
     const probability = asset.getIdentifiedDataBreachProbabilityStillAtRisk ? asset.getIdentifiedDataBreachProbabilityStillAtRisk() : DataBreachProbability.Improbable;

     if (isStillAtRisk) {
          switch (probability) {
             case DataBreachProbability.Probable:   fillColor = colors.RgbHexColorHighRisk?.() ?? '#FFA500'; break; // Orange
             case DataBreachProbability.Possible:   fillColor = colors.RgbHexColorMediumRisk?.() ?? '#87CEEB'; break; // SkyBlue
             case DataBreachProbability.Improbable: fillColor = colors.RgbHexColorLowRisk?.() ?? '#90EE90'; break; // LightGreen
          }
     }

     const fontColor = colors.White ?? '#FFFFFF'; // Use default if White is undefined

     const nodeAttrs: NodeAttributes = {
         [_.shape]: 'box',        // Use string 'box'
         [_.style]: 'filled',     // Use string 'filled'
         [_.fillcolor]: fillColor, // Use calculated color string
         [_.color]: fillColor,     // Border color same as fill for this style
         [_.penwidth]: 3.0,
         [_.fontcolor]: fontColor, // Use calculated color string
         // Use direct HTML string for label
         [_.label]: `<b>${encodeHTML(asset.title)}</b>`,
     };
     return { id: nodeId, attributes: nodeAttrs };
}
/**
 * Corrects the DOT string output from ts-graphviz for HTML labels
 * by changing "label = <...html...>" (potentially with a semicolon)
 * to the standard "label=<...html...>".
 */
function fixDotHtmlLabelSyntax(dotString: string): string {
    // This regex finds "label", optional whitespace, "=", optional whitespace,
    // then captures the entire <...> HTML tag, and matches an optional trailing semicolon.
    // It replaces the incorrect assignment with the standard DOT label=<...> syntax.
    // Handles different root HTML tags like <table>, <font>, <b> etc.
    // - `label\s*=\s*`: Matches 'label = ' with optional whitespace.
    // - `(`             : Start capture group 1 (the full HTML tag).
    //   - `<`           : Matches the opening '<'.
    //   - `([a-zA-Z]+)` : Capture group 2: the HTML tag name (table, font, etc.).
    //   - `(?:[^>"]*|"[^"]*")*`: Matches attributes, handling quoted values correctly.
    //   - `>`           : Matches the closing '>'.
    //   - `[\s\S]*?`    : Matches content non-greedily.
    //   - `<\/\2>`      : Matches the corresponding closing tag using backreference \2.
    // - `)`             : End capture group 1.
    // - `\s*;?`         : Matches optional whitespace and an optional semicolon.
    // - `gs`            : Global search, dot matches newline.
    const regex = /label\s*=\s*(<([a-zA-Z]+)(?:[^>"]*|"[^"]*")*>[\s\S]*?<\/\2>)\s*;?/gs;
    const correctedDot = dotString.replace(regex, 'label=<$1>');

    if (correctedDot !== dotString) {
        console.log("Applied DOT HTML label syntax correction.");
    } else {
        // Add more logging if it fails to find the pattern
        // console.warn("DOT HTML label syntax correction did not find any matches.");
        // console.log("Original DOT snippet causing issues:", dotString.substring(0, 1000)); // Log start of string
    }
    return correctedDot;
}
// --- Add this function definition within the same scope as
//     internalGenerateDataFlowDiagramDot_MatchGoodLayout ---

// Helper function to find the ID of the parent trust boundary
function getParentTrustBoundaryID(
    boundary: TrustBoundary,
    allBoundaries: { [id: string]: TrustBoundary } = modelState.parsedModelRoot?.trustBoundaries || {} // Default to model state
): string | undefined {
   // Iterate through all potential parent boundaries
   for (const potentialParent of Object.values(allBoundaries)) {
       // Check if the potential parent lists the current boundary's ID in its nested boundaries
       if (potentialParent.trustBoundariesNested?.includes(boundary.id)) {
           return potentialParent.id; // Found the parent
       }
   }
   return undefined; // No parent found
}

// --- Ensure the getTrustBoundaryId helper is also defined ---
function getTrustBoundaryId(
    asset: TechnicalAsset,
    allBoundaries: { [id: string]: TrustBoundary } = modelState.parsedModelRoot?.trustBoundaries || {} // Default to model state
): string | undefined {
   // Find the boundary that lists this asset.id in its technical_assets_inside
   for (const boundary of Object.values(allBoundaries)) {
       if (boundary.technicalAssetsInside?.includes(asset.id)) {
           return boundary.id;
       }
   }
   return undefined;
}


// THE MAIN FUNCTION WITH CORRECTIONS

export function initModelState(): void {
  modelState.parsedModelRoot = undefined;
  modelState.dataAssets = {};
  modelState.technicalAssets = {};
  modelState.trustBoundaries = {};
  modelState.sharedRuntimes = {};
  modelState.communicationLinks = {};
  modelState.incomingTechnicalCommunicationLinksMappedByTargetId = {};
  modelState.directContainingTrustBoundaryMappedByTechnicalAssetId = {};
  modelState.directContainingSharedRuntimeMappedByTechnicalAssetId = {};
  modelState.generatedRisksByCategory = new Map<RiskCategory, Risk[]>();
  modelState.generatedRisksBySyntheticId = {};
  modelState.allSupportedTags = {};
  // Add any other state properties that need resetting
  console.log("Model state initialized/reset.");
}
// --- Main Function to Generate DOT - Revised Order ---
function internalGenerateDataFlowDiagramDot(): string {
    if (!modelState.parsedModelRoot) throw new Error('Model not parsed yet.');
    const parsedModel = modelState.parsedModelRoot;
    const allBoundaries = parsedModel.trustBoundaries || {}; // Ensure it's an object

    // --- Define the known top-level boundary IDs from the "good" example ---
    // *** VERIFY THESE IDs MATCH YOUR MODEL ***
    const devNetworkBoundaryId = "1078183243";
    const appNetworkBoundaryId = "1994712798";

    const G = new Digraph('generatedModel', {
        [_.concentrate]: false, // Match: concentrate=false
    });

    // --- Hardcoded Global Graph Attributes from "Good" Example ---
    const graphAttrs: RootGraphAttributes = {
        [_.labelloc]: 't',
        [_.fontname]: 'Verdana',
        [_.fontsize]: 40,
        [_.outputorder]: 'nodesfirst',
        [_.dpi]: 20,                 // FORCE DPI
        [_.splines]: 'ortho',        // FORCE Splines
        [_.rankdir]: 'TB',           // FORCE Rank Direction
        [_.nodesep]: 2,              // FORCE Node Separation
        [_.ranksep]: 2,              // FORCE Rank Separation
    };
    if (G.attributes?.graph?.apply) G.attributes.graph.apply(graphAttrs);
    else Object.entries(graphAttrs).forEach(([key, value]) => G.set(key, value));

    // --- Hardcoded Default Node/Edge Attributes ---
    const defaultNodeAttrs: NodeAttributes = { [_.fontname]: 'Verdana', [_.fontsize]: 20 };
    if (G.attributes?.node?.apply) G.attributes.node.apply(defaultNodeAttrs);
    else G.set('node', defaultNodeAttrs);

    const defaultEdgeAttrs: EdgeAttributes = {
        [_.shape]: 'none',          // Match: shape="none"
        [_.fontname]: 'Verdana',
        [_.fontsize]: 18,
    };
    if (G.attributes?.edge?.apply) G.attributes.edge.apply(defaultEdgeAttrs);
    else G.set('edge', defaultEdgeAttrs);

    // Maps to store created objects
    const nodeMap = new Map<string, Node>();
    const visibleSubgraphMap = new Map<string, Subgraph>();
    const finalSubgraphStructures = new Map<string, Subgraph>();
    const globalNodes: Node[] = []; // Store Node objects that don't belong to any cluster

    const sortedBoundaryIds = Object.keys(allBoundaries).sort();
    const sortedAssets = Object.values(parsedModel.technicalAssets || {}).sort(sortByTechnicalAssetOrderAndId);

    // --- Pass 1: Create VISIBLE Subgraph objects ---
    sortedBoundaryIds.forEach((boundaryId) => {
        const boundary = allBoundaries[boundaryId];
        if (!boundary) return; // Skip if boundary somehow missing
        const isNested = !!getParentTrustBoundaryID(boundary, allBoundaries);
        const hasChildren = boundary.trustBoundariesNested?.length > 0;
        const hasAssets = boundary.technicalAssetsInside?.length > 0;
        if (!hasAssets && !hasChildren) return;

        const clusterId = `cluster_${safeDotId(boundary.id)}`;
        const labelHtml = `<<table border="0" cellborder="0" cellpadding="0"><tr><td><b>${encodeHTML(boundary.title)}</b> (${encodeHTML(boundary.type)})</td></tr></table>>`;

        const subgraphAttrs: SubgraphAttributes = {
            [_.label]: labelHtml,
            [_.fontsize]: 21,
            [_.style]: boundary.type === TrustBoundaryType.ExecutionEnvironment ? 'dotted' : 'dashed',
            [_.color]: '#3A52C8',
            [_.fontcolor]: boundary.type === TrustBoundaryType.ExecutionEnvironment ? '#555555' : '#3A52C8',
            [_.bgcolor]: boundary.type === TrustBoundaryType.ExecutionEnvironment ? '#FFFFF0' : (isNested ? '#F1F1F1' : '#FAFAFA'),
            [_.fontname]: 'Verdana',
            [_.penwidth]: boundary.type === TrustBoundaryType.ExecutionEnvironment ? 4.5 : (hasChildren ? 5.5 : 4.5),
            [_.forcelabels]: true,
            [_.outputorder]: 'nodesfirst',
            [_.margin]: 50.0,
            [_.dpi]: 20,
        };

        const sub = new Subgraph(clusterId);
        if (typeof sub.apply === 'function') sub.apply(subgraphAttrs);
        else Object.entries(subgraphAttrs).forEach(([key, value]) => sub.set(key, value));
        visibleSubgraphMap.set(boundary.id, sub);
    });

    // --- Pass 2: Create Node objects AND Add Clustered Nodes ---
    sortedAssets.forEach((asset) => {
        const nodeModel = createTechAssetNodeModel(asset); // Use YOUR function
        const parentBoundaryId = getTrustBoundaryId(asset, allBoundaries);
        const parentSubgraph = parentBoundaryId ? visibleSubgraphMap.get(parentBoundaryId) : undefined;

        const graphNode = new Node(nodeModel.id, nodeModel.attributes);
        nodeMap.set(asset.id, graphNode); // Store Node object

        if (parentSubgraph) {
            parentSubgraph.addNode(graphNode);
        } else {
            globalNodes.push(graphNode); // Store global nodes for later addition
        }
    });

    // --- Pass 3: Create Spacers and Determine Final Structures ---
     sortedBoundaryIds.forEach((boundaryId) => {
        const boundary = allBoundaries[boundaryId];
        if (!boundary) return;
        const currentVisibleSubgraph = visibleSubgraphMap.get(boundaryId);
        if (!currentVisibleSubgraph) return; // Skip if empty boundary led to no visible subgraph

        let finalStructure: Subgraph = currentVisibleSubgraph;

        if (drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks && (boundary.technicalAssetsInside?.length > 0 || boundary.trustBoundariesNested?.length > 0)) {
            const spacerId = `cluster_space_boundary_for_layout_only_1${boundary.id}`;
            const spacerLabelHtml = `<<table border="0" cellborder="0" cellpadding="0" bgcolor="#FFFFFF55"><tr><td><b> </b></td></tr></table>>`;
            const spacerAttrs: SubgraphAttributes = {
                [_.label]: spacerLabelHtml,
                [_.style]: 'invis',
                [_.margin]: 50.0,
                [_.penwidth]: 6.5,
                [_.dpi]: 20,
                [_.outputorder]: 'nodesfirst',
                [_.color]: "green",
                [_.fontcolor]: "green",
                [_.fontsize]: 21,
            };
            const spacerSub = new Subgraph(spacerId);
            if (typeof spacerSub.apply === 'function') spacerSub.apply(spacerAttrs);
            else Object.entries(spacerAttrs).forEach(([key, value]) => spacerSub.set(key, value));

            spacerSub.addSubgraph(currentVisibleSubgraph); // Wrap visible in spacer
            finalStructure = spacerSub;
        }
        finalSubgraphStructures.set(boundary.id, finalStructure);
    });

    // --- Pass 4: Assemble Nested Structures ---
     sortedBoundaryIds.forEach((boundaryId) => {
         const boundary = allBoundaries[boundaryId];
         if (!boundary) return;
         const finalStructure = finalSubgraphStructures.get(boundaryId);
         if (!finalStructure) return;

         const parentBoundaryId = getParentTrustBoundaryID(boundary, allBoundaries);
         const parentFinalStructure = parentBoundaryId ? finalSubgraphStructures.get(parentBoundaryId) : undefined;

         if (parentFinalStructure) {
             let parentContainer = parentFinalStructure;
             if (parentFinalStructure.id.startsWith('cluster_space_boundary_for_layout_only_')) {
                 const subgraphs = parentFinalStructure.subgraphs;
                 if (subgraphs?.length > 0) { // Check subgraphs exists and has items
                     parentContainer = subgraphs[0];
                 } else {
                     console.warn(`Spacer subgraph ${parentFinalStructure.id} has no inner subgraph.`);
                 }
             }
             // Add the current boundary's final structure to the parent's effective container
             parentContainer.addSubgraph(finalStructure);
         }
         // NOTE: Do NOT add top-level structures to G here. That happens next.
     });


    // --- Pass 5: Add Top-Level Structures to G in Specific Order ---
    console.log("Adding top-level clusters to graph G..."); // Debug log

    // Add Dev Network structure first
    const devNetworkStructure = finalSubgraphStructures.get(devNetworkBoundaryId);
    if (devNetworkStructure) {
        console.log(` - Adding Dev Network structure: ${devNetworkStructure.id}`);
        G.addSubgraph(devNetworkStructure);
    } else {
        console.warn(`Final structure for Dev Network (ID: ${devNetworkBoundaryId}) not found.`);
    }

    // Add Application Network structure second
    const appNetworkStructure = finalSubgraphStructures.get(appNetworkBoundaryId);
    if (appNetworkStructure) {
        console.log(` - Adding Application Network structure: ${appNetworkStructure.id}`);
        G.addSubgraph(appNetworkStructure);
    } else {
         console.warn(`Final structure for Application Network (ID: ${appNetworkBoundaryId}) not found.`);
    }

    // Add any other top-level boundaries *after* the main two
    sortedBoundaryIds.forEach(boundaryId => {
        const boundary = allBoundaries[boundaryId];
        if (!boundary) return;
        // Check if it's top-level AND not one of the main two we already added
        if (!getParentTrustBoundaryID(boundary, allBoundaries) &&
            boundaryId !== devNetworkBoundaryId &&
            boundaryId !== appNetworkBoundaryId)
        {
            const otherTopLevelStructure = finalSubgraphStructures.get(boundaryId);
            if (otherTopLevelStructure) {
                 console.log(` - Adding other top-level structure: ${otherTopLevelStructure.id}`);
                 G.addSubgraph(otherTopLevelStructure);
             }
        }
    });


    // --- Pass 6: Add Global Nodes to G LAST ---
    console.log(`Adding ${globalNodes.length} global nodes to graph G...`); // Debug log
    globalNodes.forEach(node => {
        console.log(` - Adding global node: ${node.id}`);
        G.addNode(node);
    });

    // --- Pass 7: Create Edges ---
    console.log("Adding edges to graph G..."); // Debug log
    sortedAssets.forEach((asset) => {
        (asset.communicationLinks || []).forEach((link) => {
            const sourceNode = nodeMap.get(link.sourceId);
            const targetNode = nodeMap.get(link.targetId);

            if (!sourceNode || !targetNode) {
                console.warn(`Skipping edge: Cannot find source (${link.sourceId}) or target (${link.targetId}) node object.`);
                return;
            }

            const edgeAttrs: EdgeAttributes = {};
            const suppressBidirectionalArrows = true; // Since we forced ortho

            // Copy relevant attributes from "good" example style if possible, else use methods
             let readOrWriteHead: string = "normal";
             let readOrWriteTail: string = "dot";
             if (link.readonly) {
                 readOrWriteHead = "empty";
                 readOrWriteTail = "odot";
             }
             let dirValue: string = 'forward';
             if (link.isBidirectional?.() && !suppressBidirectionalArrows) {
                 dirValue = 'both';
             }

             edgeAttrs[_.style] = link.determineArrowLineStyle?.() ?? 'solid';
             edgeAttrs[_.penwidth] = link.determineArrowPenWidth?.() ?? 1.5; // Match good example default?
             edgeAttrs[_.arrowtail] = readOrWriteTail;
             edgeAttrs[_.arrowhead] = readOrWriteHead;
             edgeAttrs[_.dir] = dirValue;
             edgeAttrs[_.arrowsize] = 2.0; // Match good example
             edgeAttrs[_.color] = link.determineArrowColor?.() ?? '#000000';
             edgeAttrs[_.constraint] = (link.diagramTweakConstraint === false) ? false : true; // Match good example default
             edgeAttrs[_.weight] = (link.diagramTweakWeight != null && link.diagramTweakWeight > 0) ? link.diagramTweakWeight : 1; // Match good example default

             const suppressEdgeLabels = false; // Match good example
             if (!suppressEdgeLabels) {
                  edgeAttrs[_.xlabel] = encodeHTML(link.protocol ?? '');
                  edgeAttrs[_.fontcolor] = link.determineLabelColor?.() ?? '#444444';
             }

            const edge = new Edge([sourceNode, targetNode], edgeAttrs);
            G.addEdge(edge);
        });
    });

    // --- Diagram Tweaks (Keep COMMENTED OUT for testing base layout) ---
    /*
    (parsedModel.diagramTweakInvisibleConnectionsBetweenAssets || []).forEach((pair) => { ... });
    (parsedModel.diagramTweakSameRankAssets || []).forEach((rankSet) => { ... });
    */

    // --- Generate DOT String ---
    console.log("Generating final DOT string..."); // Debug log
    const rawDotString = toDot(G);
    // console.log("Raw DOT:\n", rawDotString); // Optional: Log raw DOT before potential correction
    const correctedDotString = fixDotHtmlLabelSyntax(rawDotString);
    return correctedDotString;
}
/**
 * Generates the DOT string for the Data Asset Diagram.
 * Corrected for ts-graphviz object model and attributes.
 */
function internalGenerateDataAssetDiagramDot(): string {
    if (!modelState.parsedModelRoot) throw new Error('Model not parsed yet.');
    const parsedModel = modelState.parsedModelRoot;

    const G = new Digraph('dataAssetDiagram', {
        // Set graph-level attributes directly or using apply
        [_.concentrate]: true, // Keep this if needed
    });

    // Apply global graph attributes
    const graphAttrs: RootGraphAttributes = { // Assuming RootGraphAttributes is the correct type
        [_.dpi]: 120, // Use a reasonable default DPI, Go used 20 which is very low
        [_.fontname]: 'Verdana',
        [_.labelloc]: 'c', // Center graph label if any
        [_.fontsize]: 20,
        [_.splines]: 'false', // Use string 'false' for no splines
        [_.rankdir]: 'LR',
        [_.nodesep]: 1.0,
        [_.ranksep]: 3.0,
        [_.outputorder]: 'nodesfirst',
    };
    G.attributes.graph.apply(graphAttrs);

    // Apply default node attributes (will be overridden by specific node attributes)
    const defaultNodeColor = colors.White ?? '#FFFFFF'; // Define default if needed
    G.attributes.node.apply({
        [_.fontcolor]: defaultNodeColor,
        [_.fontname]: 'Verdana',
        [_.fontsize]: 20,
    });

    // Apply default edge attributes
    G.attributes.edge.apply({
        // shape: 'none', // Edge shape usually not needed
        [_.fontname]: 'Verdana',
        [_.fontsize]: 18,
    });

    // Keep track of created nodes using ts-graphviz Node objects
    const nodeMap = new Map<string, Node>();

    // --- Create Technical Asset Nodes ---
    const relevantTechAssets = Object.values(parsedModel.technicalAssets)
        .filter(asset => (asset.dataAssetsStored?.length > 0) || (asset.dataAssetsProcessed?.length > 0));
    relevantTechAssets.sort(sortByTechnicalAssetOrderAndId); // Use the sort function

    relevantTechAssets.forEach((asset) => {
        // Use the corrected node creation function
        const nodeModel = createTechAssetNodeForDataDiagram(asset);
        // Create the actual ts-graphviz Node
        const graphNode = new Node(nodeModel.id, nodeModel.attributes);
        nodeMap.set(asset.id, graphNode); // Store by original asset ID for edges
        G.addNode(graphNode); // Add node to the graph
    });

    // --- Create Data Asset Nodes ---
    const dataAssets = Object.values(parsedModel.dataAssets);
    dataAssets.sort(sortByDataAssetDataBreachProbabilityAndTitle); // Use the sort function

    dataAssets.forEach((asset) => {
        // Use the corrected node creation function
        const nodeModel = createDataAssetNodeModel(asset);
        // Create the actual ts-graphviz Node
        const graphNode = new Node(nodeModel.id, nodeModel.attributes);
        nodeMap.set(asset.id, graphNode); // Store by original asset ID for edges
        G.addNode(graphNode); // Add node to the graph
    });

    // --- Create Edges ---
    relevantTechAssets.forEach((techAsset) => {
        const targetNode = nodeMap.get(techAsset.id); // Get the target Node object
        if (!targetNode) {
            console.warn(`Target technical asset node missing for edges: ${techAsset.id}`);
            return;
        }

        // Stored Edges
        (techAsset.dataAssetsStored || []).forEach(dataAssetId => {
            const sourceNode = nodeMap.get(dataAssetId); // Get the source Node object
            if (sourceNode) {
                // Create the ts-graphviz Edge
                const edge = new Edge([sourceNode, targetNode], {
                    [_.color]: 'blue',
                    [_.style]: 'solid' // Use string 'solid'
                });
                G.addEdge(edge);
            } else {
                console.warn(`Source data asset node missing for stored edge: ${dataAssetId} -> ${techAsset.id}`);
            }
        });

        // Processed Edges (only if not also stored)
        (techAsset.dataAssetsProcessed || []).forEach(dataAssetId => {
            const isStored = (techAsset.dataAssetsStored || []).includes(dataAssetId);
            if (!isStored) {
                const sourceNode = nodeMap.get(dataAssetId); // Get the source Node object
                if (sourceNode) {
                    // Create the ts-graphviz Edge
                    const edge = new Edge([sourceNode, targetNode], {
                        [_.color]: '#666666',
                        [_.style]: 'dashed' // Use string 'dashed'
                    });
                    G.addEdge(edge);
                } else {
                    console.warn(`Source data asset node missing for processed edge: ${dataAssetId} -> ${techAsset.id}`);
                }
            }
        });
    });
    // Generate the potentially incorrect DOT string
    const rawDotString = toDot(G);

    // Apply the correction function
    const correctedDotString = fixDotHtmlLabelSyntax(rawDotString);

    // Return the corrected string
    return correctedDotString;
}


// --- Wrapper Exports for Go WASM Compatibility (defined within main.ts) ---
export function printDataFlowDiagramGraphvizDOT(): string {
    console.log("Generating Data Flow DOT string (for WASM export)...");
    return internalGenerateDataFlowDiagramDot(20); // Use fixed DPI=20 like Go version
}
export function printGraphvizDOT(): string {
    console.log("Generating Data Asset DOT string (for WASM export)...");
    return internalGenerateDataAssetDiagramDot();
}

// Equivalent to makeTechAssetNode from Go (creates NodeModel, not DOT string)
/**
 * Creates the ID and attributes object for a Technical Asset node,
 * using ts-graphviz compatible attribute syntax.
 */
/**
 * Creates the ID and attributes object for a Technical Asset node,
 * using ts-graphviz compatible attribute syntax.
 * REVISED to match Go output more closely (explicit shapes, correct padding).
 */
function createTechAssetNodeModel(
  asset: TechnicalAsset,
  includeRisks: boolean = false, // Keep param if potentially needed later
): { id: string; attributes: NodeAttributes } {

  const nodeId = safeDotId(asset.id);
  const nodeAttrs: NodeAttributes = {}; // Initialize the attributes object

  // --- Determine Node Shape based on Asset Type ---
  let shape: string;
  let isCylinderLineBreak = ""; // For cylinder shape label adjustment like in Go
  switch (asset.type) {
    case TechnicalAssetType.ExternalEntity:
      shape = 'box';
      break;
    case TechnicalAssetType.Process:
      shape = 'ellipse';
      break;
    case TechnicalAssetType.Datastore:
      shape = 'cylinder'; // Graphviz uses 'cylinder' for database-like shapes
       if (asset.redundant) { // Add line break like Go if redundant
           isCylinderLineBreak = "<br/>";
       }
      break;
    default:
      shape = 'ellipse'; // Default shape
  }

  // Override shape if used by human
  if (asset.usedAsClientByHuman) {
    shape = 'octagon';
  }
  nodeAttrs[_.shape] = shape;

  // --- Apply Node Style Attributes Directly ---
  // (Ensure these asset methods return valid strings/numbers/booleans)
  const shapeBorderStyle = asset.determineShapeBorderLineStyle(); // e.g., 'dotted' or 'solid'
  const shapePeripheries = asset.determineShapePeripheries();    // e.g., 1 or 2
  const shapeBorderColor = asset.determineShapeBorderColor();   // e.g., '#FF0000' or 'red'
  const shapeFillColor = asset.determineShapeFillColor();       // e.g., '#A9A9A9' or 'grey'
  const shapePenWidth = asset.determineShapeBorderPenWidth();     // e.g., 1.0 or 3.0
  const labelFontColor = asset.determineLabelColor();         // e.g., '#FFFFFF' or 'white'

  // Combine styles correctly (e.g., 'filled,dotted' or just 'filled')
  nodeAttrs[_.style] = `filled${shapeBorderStyle === 'dotted' ? ',dotted' : ''}`;
  nodeAttrs[_.peripheries] = shapePeripheries;
  nodeAttrs[_.color] = shapeBorderColor;       // Border color
  nodeAttrs[_.fillcolor] = shapeFillColor;     // Fill color
  nodeAttrs[_.penwidth] = shapePenWidth;
  // nodeAttrs[_.fontcolor] = labelFontColor; // Font color is better controlled inside HTML label

  // --- Create HTML Label String ---
  // ***** FIX: Use cellpadding="2" like the Go version *****
  let labelContent = `<table border="0" cellborder="${asset.multiTenant ? '1' : '0'}" cellspacing="0" cellpadding="2">`; // Use cellpadding="2"

  // Top Row: Technology and Size
  labelContent += `<tr><td align="center">`; // Center align content in cells
  labelContent += `<font point-size="15" color="${colors.DarkBlue ?? '#000060'}">${isCylinderLineBreak}${encodeHTML(String(asset.technology))}</font>`;
  labelContent += `<br/><font point-size="15" color="${colors.LightGray ?? '#666666'}">${encodeHTML(String(asset.size))}</font>`;
  labelContent += `</td></tr>`;

  // Middle Row: Title
  labelContent += `<tr><td align="center">`;
  labelContent += `<b><font color="${labelFontColor}">${encodeHTML(asset.title)}</font></b><br/>`; // Removed extra space after <br/>
  labelContent += `</td></tr>`;

  // Bottom Row: RAA
// Bottom Row: RAA
  let raaText = `RAA: ${asset.raa.toFixed(0)} %`; // Use toFixed(0) for integer percentage
  if (asset.outOfScope) {
      raaText = "RAA: out of scope";
  }
  labelContent += `<tr><td align="center">`;
  // V-- Modified line --V
  labelContent += `<font point-size="15" color="#603112">${encodeHTML(raaText)}</font>`;
  // A-- Modified line --A
  labelContent += `</td></tr>`;

  labelContent += `</table>`;  // Assign the complete HTML string to the label attribute
  nodeAttrs[_.label] = labelContent;

  // Return the object structure
  return {
    id: nodeId,
    attributes: nodeAttrs,
  };
}
// --- Main DOT Generation Function ---

// Option to simulate the Go version's spacing behavior (often not needed/desirable)
const drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks = true;

export function generateDataFlowDiagramDot(
  dpi: number = 120, // Default DPI
): string {
  if (!modelState.parsedModelRoot) {
    throw new Error('Model not parsed yet.');
  }
  const parsedModel = modelState.parsedModelRoot;

  // Create the root graph
  const G =new  Digraph('generatedModel', { concentrate: false });

  // Metadata and Global Defaults
  const graphAttrs: SubgraphAttributes = {
    labelloc: 't',
    fontname: 'Verdana',
    fontsize: 40,
    outputorder: 'nodesfirst',
    dpi: dpi,
    rankdir: parsedModel.diagramTweakLayoutLeftToRight ? 'TB' : 'LR',
    nodesep: parsedModel.diagramTweakNodesep, // Use model tweaks
    ranksep: parsedModel.diagramTweakRanksep, // Use model tweaks
  };

  // Splines based on model tweak
  let splines = 'ortho'; // Default
  let suppressBidirectionalArrows = true; // Default for ortho
  if (parsedModel.diagramTweakEdgeLayout) {
    switch (parsedModel.diagramTweakEdgeLayout) {
      case 'spline':
        splines = 'spline';
        // drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks = false; // Control spacing behavior if needed
        suppressBidirectionalArrows = false;
        break;
      case 'polyline':
        splines = 'polyline';
        // drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks = false;
        suppressBidirectionalArrows = false;
        break;
      case 'ortho':
        splines = 'ortho';
        suppressBidirectionalArrows = true;
        break;
      case 'curved':
        splines = 'curved';
        // drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks = false;
        suppressBidirectionalArrows = false;
        break;
      case 'false':
        splines = 'false';
        // drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks = false;
        suppressBidirectionalArrows = false;
        break;
      default:
        console.warn(`Unknown diagram_tweak_edge_layout: ${parsedModel.diagramTweakEdgeLayout}. Using default 'ortho'.`);
        break;
    }
  }
  graphAttrs.splines = splines;

  // Set global attributes
  G.set('graph', graphAttrs);
  G.set('node', { fontname: 'Verdana', fontsize: 20 });
  G.set('edge', { shape: 'none', fontname: 'Verdana', fontsize: 18 });

  // Keep track of created nodes and subgraphs
  const nodeMap = new Map<string, NodeModel>(); // Store node models by original asset ID
  const subgraphMap = new Map<string, Subgraph>(); // Store subgraphs by original boundary ID

  // --- Trust Boundaries (Subgraphs) ---
  const sortedBoundaryIds = Object.keys(parsedModel.trustBoundaries).sort();

  // First pass: Create all subgraph objects
  sortedBoundaryIds.forEach((boundaryId) => {
    const boundary = parsedModel.trustBoundaries[boundaryId];
    const isNested = !!boundary.getParentTrustBoundaryID(); // Check if it has a parent
    const hasChildren = boundary.trustBoundariesNested.length > 0;
    const hasAssets = boundary.technicalAssetsInside.length > 0;

    if (!hasAssets && !hasChildren) return; // Skip empty boundaries

    const clusterId = `cluster_${safeDotId(boundary.id)}`;
    const subgraphAttrs: SubgraphAttributes = {
      // label: attr.html(`<b>${encodeHTML(boundary.title)}</b> (${boundary.type})`), // Simple label
       label: attr.html(`<table border="0" cellborder="0" cellpadding="0"><tr><td><b>${encodeHTML(boundary.title)}</b> (${boundary.type})</td></tr></table>`),
      fontsize: 21,
      style: Style.dashed, // Default style
      color: colors.RgbHexColorTwilight(), // Default color
      fontcolor: colors.RgbHexColorTwilight(), // Default font color
      bgcolor: isNested ? '#F1F1F1' : '#FAFAFA', // Background based on nesting
      fontname: 'Verdana',
      penwidth: hasChildren ? 5.5 : 4.5, // Penwidth based on containing nested boundaries
      forcelabels: true,
      outputorder: 'nodesfirst',
      margin: 50.0,
      dpi: dpi, // Propagate DPI
    };

    // Apply type-specific styling
    if (boundary.type === TrustBoundaryType.NetworkPolicyNamespaceIsolation) {
      subgraphAttrs.fontcolor = '#222222';
      subgraphAttrs.bgcolor = '#DFF4FF';
    } else if (boundary.type === TrustBoundaryType.ExecutionEnvironment) {
      subgraphAttrs.fontcolor = '#555555';
      subgraphAttrs.bgcolor = '#FFFFF0';
      subgraphAttrs.style = Style.dotted;
    }

    const sub = new Subgraph(clusterId, subgraphAttrs);
    subgraphMap.set(boundary.id, sub);

    // Handle optional spacer subgraphs (if needed)
    if (drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks) {
      const spacerId = `cluster_space_boundary_for_layout_only_1${safeDotId(boundary.id)}`;
      const spacerAttrs: SubgraphAttributes = {
         label: attr.html(`<table border="0" cellborder="0" cellpadding="0" bgcolor="#FFFFFF55"><tr><td><b> </b></td></tr></table>`),
         fontsize: 21,
         style: Style.invis,
         color: 'green', // Or transparent
         fontcolor: 'green', // Or transparent
         margin: 50.0,
         penwidth: 6.5, // Doesn't really matter if invis
         outputorder: 'nodesfirst',
         dpi: dpi,
      };
      const spacerSub = new Subgraph(spacerId, spacerAttrs);
      // The spacer will contain the actual subgraph
      spacerSub.addSubgraph(sub);
      // Store the spacer under the original boundary ID if you need to add nodes/subgraphs to it later
      // OR adjust logic to add things directly to 'sub' and ensure 'spacerSub' is added to the correct parent.
      // For simplicity here, we store the main 'sub' and add the spacer later if needed.
    }
  });

  // --- Technical Assets (Nodes) ---
  const sortedAssets = Object.values(parsedModel.technicalAssets)
    .sort((a, b) => {
      if (a.diagramTweakOrder !== b.diagramTweakOrder) {
        return (a.diagramTweakOrder || 0) - (b.diagramTweakOrder || 0);
      }
      return a.id.localeCompare(b.id); // Fallback sort by ID
    });

  sortedAssets.forEach((asset) => {
    const nodeModel = createTechAssetNodeModel(asset);
    nodeMap.set(asset.id, nodeModel); // Store node model

    // Find containing subgraph
    const parentBoundaryId = asset.getTrustBoundaryId(); // Use helper to get direct boundary ID
    const parentSubgraph = parentBoundaryId ? subgraphMap.get(parentBoundaryId) : undefined;

    // Add node to subgraph or root graph
    if (parentSubgraph) {
      parentSubgraph.addNode(new NodeModel(nodeModel.id, nodeModel.attributes));
    } else {
      G.addNode(new NodeModel(nodeModel.id, nodeModel.attributes));
    }
  });

  // Second pass for Trust Boundaries: Add nesting and spacers
  sortedBoundaryIds.forEach((boundaryId) => {
     const boundary = parsedModel.trustBoundaries[boundaryId];
     const currentSubgraph = subgraphMap.get(boundaryId);
     if (!currentSubgraph) return; // Already skipped if empty

     const parentBoundaryId = boundary.getParentTrustBoundaryID();
     const parentSubgraph = parentBoundaryId ? subgraphMap.get(parentBoundaryId) : undefined;

     // Add nested subgraphs
     boundary.trustBoundariesNested.forEach(nestedId => {
         const nestedSubgraph = subgraphMap.get(nestedId);
         if (nestedSubgraph) {
             currentSubgraph.addSubgraph(nestedSubgraph); // Add nested graph to current
         }
     });

     // Add the current subgraph (or its spacer) to its parent or the root graph
     let subgraphToAdd : Subgraph | undefined = currentSubgraph;

     // Handle spacer if enabled - Re-create spacer here to wrap the potentially modified currentSubgraph
     if (drawSpaceLinesForLayoutUnfortunatelyFurtherSeparatesAllRanks && (boundary.technicalAssetsInside.length > 0 || boundary.trustBoundariesNested.length > 0)) {
         const spacerId = `cluster_space_boundary_for_layout_only_1${safeDotId(boundary.id)}`;
         const spacerAttrs: SubgraphAttributes = {
              label: attr.html(`<table border="0" cellborder="0" cellpadding="0" bgcolor="#FFFFFF55"><tr><td><b> </b></td></tr></table>`),
              style: Style.invis, margin: 50.0, penwidth: 6.5, dpi: dpi, outputorder: 'nodesfirst',
         };
         const spacerSub = new Subgraph(spacerId, spacerAttrs);
         spacerSub.addSubgraph(currentSubgraph); // Add the actual content subgraph into the spacer
         subgraphToAdd = spacerSub; // We will add the spacer to the parent
     }


     // Only add top-level boundaries (or their spacers) to the root graph
     // Nested ones are added via parentSubgraph.addSubgraph() above
     if (!parentBoundaryId && subgraphToAdd) {
         G.addSubgraph(subgraphToAdd);
     }
  });


  // --- Data Flows (Edges) ---
  sortedAssets.forEach((asset) => {
    asset.communicationLinks.forEach((link) => {
      const sourceNode = nodeMap.get(link.sourceId);
      const targetNode = nodeMap.get(link.targetId);

      if (!sourceNode || !targetNode) {
        console.warn(`Skipping edge for link ${link.id}: Source or target node not found.`);
        return;
      }

      const edgeAttrs: EdgeAttributes = {};

      // Determine arrow style based on link properties
      let readOrWriteHead = ArrowType.normal;
      let readOrWriteTail = ArrowType.dot;
      if (link.readonly) {
        readOrWriteHead = ArrowType.empty;
        readOrWriteTail = ArrowType.odot;
      }

      let dir = 'forward';
      if (link.isBidirectional() && !suppressBidirectionalArrows) {
        dir = 'both';
      }

      edgeAttrs.style = link.determineArrowLineStyle(); // dotted, dashed, solid
      edgeAttrs.penwidth = link.determineArrowPenWidth();
      edgeAttrs.arrowtail = readOrWriteTail;
      edgeAttrs.arrowhead = readOrWriteHead;
      // @ts-ignore - 'dir' might not be strictly typed, but Graphviz uses it
      edgeAttrs.dir = dir;
      edgeAttrs.arrowsize = 2.0;
      edgeAttrs.color = link.determineArrowColor();
      edgeAttrs.constraint = link.diagramTweakConstraint;

      if (link.diagramTweakWeight > 0) {
        edgeAttrs.weight = link.diagramTweakWeight;
      }

      if (!parsedModel.diagramTweakSuppressEdgeLabels) {
        edgeAttrs.xlabel = encodeHTML(link.protocol); // Use xlabel for edge label
        edgeAttrs.fontcolor = link.determineLabelColor();
      }

      G.addEdge(new EdgeModel([sourceNode.id, targetNode.id], edgeAttrs));
    });
  });

  // --- Diagram Tweaks ---

  // Invisible Connections
  (parsedModel.diagramTweakInvisibleConnectionsBetweenAssets || []).forEach((pair) => {
    const assets = pair.split(','); // Assuming comma-separated
    if (assets.length === 2) {
      const sourceNode = nodeMap.get(assets[0].trim());
      const targetNode = nodeMap.get(assets[1].trim());
      if (sourceNode && targetNode) {
         G.addEdge(new EdgeModel([sourceNode.id, targetNode.id], { style: Style.invis, constraint: false })); // Invisible edge
      } else {
        console.warn(`Invalid asset ID in diagramTweakInvisibleConnectionsBetweenAssets: ${pair}`);
      }
    } else {
       console.warn(`Invalid format in diagramTweakInvisibleConnectionsBetweenAssets (expected 'id1,id2'): ${pair}`);
    }
  });

  // Same Rank Nodes (Apply within the lowest common ancestor subgraph or root graph)
  // This is more complex with the AST. A simpler approach is often to define a dedicated
  // invisible subgraph for ranking if needed. For now, we'll add the rank attribute
  // directly to the nodes within the root graph, which might not always achieve
  // the desired effect if nodes are deep within different clusters.
  // A more robust solution might require finding the common parent subgraph.
  if (parsedModel.diagramTweakSameRankAssets && parsedModel.diagramTweakSameRankAssets.length > 0) {
       const rankSubgraph = new Subgraph(`cluster_rank_${Date.now()}`, { rank: 'same', style: Style.invis }); // Use invisible subgraph for ranking
       parsedModel.diagramTweakSameRankAssets.forEach(assetId => {
            const node = nodeMap.get(assetId.trim());
            if (node) {
                // Add *references* to the nodes to the rank subgraph
                // Note: Adding the actual node object might move it visually in some renderers.
                // Adding just the ID might be safer for rank=same.
                rankSubgraph.node(node.id); // Add node reference by ID
            } else {
                console.warn(`Invalid asset ID in diagramTweakSameRankAssets: ${assetId}`);
            }
       });
       G.addSubgraph(rankSubgraph); // Add the ranking subgraph to the main graph
  }


  // Convert the graph model to DOT string
  const dot = toDot(G);
  return dot;
}


