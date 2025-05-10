// === Constants and Global State ===

export const THREAGILE_VERSION = "1.0.0"; // Also update into example and stub model files and openapi.yaml
import * as colors from '../colors/colors.ts';

export enum DataFormat {
    JSON = "json",
    XML = "xml",
    Serialization = "serialization",
    File = "file",
    CSV = "csv",
}




export function parseDataFormat(value: string | undefined): DataFormat | undefined {
    const lowerValue = value?.trim().toLowerCase();
    if (!lowerValue) {
        return undefined; // Handle empty or undefined input
    }

    // Iterate over the keys (enum member names) of the DataFormat enum
    for (const key of Object.keys(DataFormat)) {
        // Get the string value associated with the current key
        const enumStringValue = DataFormat[key as keyof typeof DataFormat]; // e.g., DataFormat.Serialization gives "serialization"

        // Compare the lower-case input with the enum's string value
        if (enumStringValue === lowerValue) {
            // If they match, return the actual enum member (using the key)
            return DataFormat[key as keyof typeof DataFormat];
        }
    }

    // If no match was found after checking all keys
    return undefined;
}
interface ModelState {
    parsedModelRoot: ParsedModel | null;
    communicationLinks: Record<string, CommunicationLink>;
    incomingTechnicalCommunicationLinksMappedByTargetId: Record<string, CommunicationLink[]>;
    directContainingTrustBoundaryMappedByTechnicalAssetId: Record<string, TrustBoundary>;
    directContainingSharedRuntimeMappedByTechnicalAssetId: Record<string, SharedRuntime>;
    generatedRisksByCategory: Map<RiskCategory, Risk[]>; // Using Map for object keys
    generatedRisksBySyntheticId: Record<string, Risk>;
    allSupportedTags: Record<string, boolean>;
}

export const modelState: ModelState = {
    parsedModelRoot: null,
    communicationLinks: {},
    incomingTechnicalCommunicationLinksMappedByTargetId: {},
    directContainingTrustBoundaryMappedByTechnicalAssetId: {},
    directContainingSharedRuntimeMappedByTechnicalAssetId: {},
    generatedRisksByCategory: new Map<RiskCategory, Risk[]>(),
    generatedRisksBySyntheticId: {},
    allSupportedTags: {},
};

export function initModelState(): void {
    modelState.communicationLinks = {};
    modelState.incomingTechnicalCommunicationLinksMappedByTargetId = {};
    modelState.directContainingTrustBoundaryMappedByTechnicalAssetId = {};
    modelState.directContainingSharedRuntimeMappedByTechnicalAssetId = {};
    modelState.generatedRisksByCategory = new Map<RiskCategory, Risk[]>();
    modelState.generatedRisksBySyntheticId = {};
    modelState.allSupportedTags = {};
    // Note: parsedModelRoot is typically loaded later
}

export function addToListOfSupportedTags(tags: string[]): void {
    for (const tag of tags) {
        modelState.allSupportedTags[tag] = true;
    }
}

// === Interfaces and Enums ===

// Go interface CustomRiskRule
export interface CustomRiskRule {
    category(): RiskCategory;
    supportedTags(): string[];
    generateRisks(): Risk[];
}

// === Helper Functions ===

export function addTagToModelInput(modelInput: ModelInput, tag: string, dryRun: boolean): string | null {
    const normalizedTag = normalizeTag(tag);
    if (!contains(modelInput.tags_available ?? [], normalizedTag)) {
        const changeMessage = "adding tag: " + normalizedTag;
        if (!dryRun) {
            if (!modelInput.tags_available) {
                modelInput.tags_available = [];
            }
            modelInput.tags_available.push(normalizedTag);
        }
        return changeMessage; // Return the change description
    }
    return null; // No change made
}


export function normalizeTag(tag: string): string {
    return tag.trim().toLowerCase();
}

export function makeID(val: string): string {
    const reg = /[^A-Za-z0-9]+/g;
    return val.toLowerCase().replace(reg, "-").replace(/^-+|-+$/g, '').trim();
}

// Contains tells whether an array contains an element
export function contains(arr: string[], x: string): boolean {
    return arr.includes(x);
}

export function containsCaseInsensitiveAny(arr: string[], ...searchItems: string[]): boolean {
    const lowerArr = arr.map(s => s.trim().toLowerCase());
    for (const item of searchItems) {
        if (lowerArr.includes(item.trim().toLowerCase())) {
            return true;
        }
    }
    return false;
}

export function isTaggedWithBaseTag(tags: string[], basetag: string): boolean {
    const lowerBasetag = basetag.toLowerCase().trim();
    for (let tag of tags) {
        tag = tag.toLowerCase().trim();
        if (tag === lowerBasetag || tag.startsWith(lowerBasetag + ":")) {
            return true;
        }
    }
    return false;
}


// === Enums ===

export enum Quantity {
    VeryFew = "very-few",
    Few = "few",
    Many = "many",
    VeryMany = "very-many",
}

export function getQuantityTitle(what: Quantity): string {
    return {
        [Quantity.VeryFew]: "very few",
        [Quantity.Few]: "few",
        [Quantity.Many]: "many",
        [Quantity.VeryMany]: "very many",
    }[what];
}

export function getQuantityFactor(what: Quantity): number {
    return {
        [Quantity.VeryFew]: 1,
        [Quantity.Few]: 2,
        [Quantity.Many]: 3,
        [Quantity.VeryMany]: 5,
    }[what];
}

export function parseQuantity(value: string): Quantity | undefined {
    const lowerValue = value?.trim().toLowerCase();
    return Object.values(Quantity).find(q => q === lowerValue);
}


export enum Confidentiality {
    Public = "public",
    Internal = "internal",
    Restricted = "restricted",
    Confidential = "confidential",
    StrictlyConfidential = "strictly-confidential",
}

export function getConfidentialityAttackerAttractivenessForAsset(what: Confidentiality): number {
    return {
        [Confidentiality.Public]: 8,
        [Confidentiality.Internal]: 13,
        [Confidentiality.Restricted]: 21,
        [Confidentiality.Confidential]: 34,
        [Confidentiality.StrictlyConfidential]: 55,
    }[what];
}

export function getConfidentialityAttackerAttractivenessForProcessedOrStoredData(what: Confidentiality): number {
    return {
        [Confidentiality.Public]: 5,
        [Confidentiality.Internal]: 8,
        [Confidentiality.Restricted]: 13,
        [Confidentiality.Confidential]: 21,
        [Confidentiality.StrictlyConfidential]: 34,
    }[what];
}

export function getConfidentialityAttackerAttractivenessForInOutTransferredData(what: Confidentiality): number {
    return {
        [Confidentiality.Public]: 2,
        [Confidentiality.Internal]: 3,
        [Confidentiality.Restricted]: 5,
        [Confidentiality.Confidential]: 8,
        [Confidentiality.StrictlyConfidential]: 13,
    }[what];
}

export function getConfidentialityRatingStringInScale(what: Confidentiality): string {
    const rating = {
        [Confidentiality.Public]: 1,
        [Confidentiality.Internal]: 2,
        [Confidentiality.Restricted]: 3,
        [Confidentiality.Confidential]: 4,
        [Confidentiality.StrictlyConfidential]: 5,
    }[what];
    return `(rated ${rating} in scale of 5)`;
}

export function parseConfidentiality(value: string): Confidentiality | undefined {
     const lowerValue = value?.trim().toLowerCase();
    return Object.values(Confidentiality).find(c => c === lowerValue);
}

export enum Criticality {
    Archive = "archive",
    Operational = "operational",
    Important = "important",
    Critical = "critical",
    MissionCritical = "mission-critical",
}

export function getCriticalityAttackerAttractivenessForAsset(what: Criticality): number {
    return {
        [Criticality.Archive]: 5,
        [Criticality.Operational]: 8,
        [Criticality.Important]: 13,
        [Criticality.Critical]: 21,
        [Criticality.MissionCritical]: 34,
    }[what];
}

export function getCriticalityAttackerAttractivenessForProcessedOrStoredData(what: Criticality): number {
     return {
        [Criticality.Archive]: 3,
        [Criticality.Operational]: 5,
        [Criticality.Important]: 8,
        [Criticality.Critical]: 13,
        [Criticality.MissionCritical]: 21,
    }[what];
}

export function getCriticalityAttackerAttractivenessForInOutTransferredData(what: Criticality): number {
     return {
        [Criticality.Archive]: 2,
        [Criticality.Operational]: 3,
        [Criticality.Important]: 5,
        [Criticality.Critical]: 8,
        [Criticality.MissionCritical]: 13,
    }[what];
}

export function getCriticalityRatingStringInScale(what: Criticality): string {
     const rating = {
        [Criticality.Archive]: 1,
        [Criticality.Operational]: 2,
        [Criticality.Important]: 3,
        [Criticality.Critical]: 4,
        [Criticality.MissionCritical]: 5,
    }[what];
    return `(rated ${rating} in scale of 5)`;
}

export function parseCriticality(value: string): Criticality | undefined {
    const lowerValue = value?.trim().toLowerCase();
    return Object.values(Criticality).find(c => c === lowerValue);
}

export enum TechnicalAssetType {
    ExternalEntity = "external-entity",
    Process = "process",
    Datastore = "datastore",
}

export enum TechnicalAssetSize {
    System = "system",
    Service = "service",
    Application = "application",
    Component = "component",
}

export enum Authorization {
    None = "none", // Renamed from NoneAuthorization to avoid clash
    TechnicalUser = "technical-user",
    EnduserIdentityPropagation = "enduser-identity-propagation",
}

export enum Authentication {
    None = "none", // Renamed from NoneAuthentication to avoid clash
    Credentials = "credentials",
    SessionId = "session-id",
    Token = "token",
    ClientCertificate = "client-certificate",
    TwoFactor = "two-factor",
    Externalized = "externalized",
}

export enum Usage {
    Business = "business",
    DevOps = "devops",
}

export function getUsageTitle(what: Usage): string {
    return {
        [Usage.Business]: "Business",
        [Usage.DevOps]: "DevOps",
    }[what];
}

export function parseUsage(value: string): Usage | undefined {
    const lowerValue = value?.trim().toLowerCase();
    return Object.values(Usage).find(u => u === lowerValue);
}

export enum EncryptionStyle {
    None = "none", // Renamed from NoneEncryption
    Transparent = "transparent",
    DataWithSymmetricSharedKey = "data-with-symmetric-shared-key",
    DataWithAsymmetricSharedKey = "data-with-asymmetric-shared-key",
    DataWithEnduserIndividualKey = "data-with-enduser-individual-key",
}

export function getEncryptionStyleTitle(what: EncryptionStyle): string {
    return {
        [EncryptionStyle.None]: "None",
        [EncryptionStyle.Transparent]: "Transparent",
        [EncryptionStyle.DataWithSymmetricSharedKey]: "Data with Symmetric Shared Key",
        [EncryptionStyle.DataWithAsymmetricSharedKey]: "Data with Asymmetric Shared Key",
        [EncryptionStyle.DataWithEnduserIndividualKey]: "Data with Enduser Individual Key",
    }[what];
}

export function parseEncryptionStyle(value: string): EncryptionStyle | undefined {
    const lowerValue = value?.trim().toLowerCase();
    return Object.values(EncryptionStyle).find(e => e === lowerValue);
}

export function getDataFormatTitle(what: DataFormat): string {
    return {
        [DataFormat.JSON]: "JSON",
        [DataFormat.XML]: "XML",
        [DataFormat.Serialization]: "Serialization",
        [DataFormat.File]: "File",
        [DataFormat.CSV]: "CSV",
    }[what];
}

export function getDataFormatDescription(what: DataFormat): string {
    return {
        [DataFormat.JSON]: "JSON marshalled object data",
        [DataFormat.XML]: "XML structured data",
        [DataFormat.Serialization]: "Serialization-based object graphs",
        [DataFormat.File]: "File input/uploads",
        [DataFormat.CSV]: "CSV tabular data",
    }[what];
}

export enum Protocol {
    UnknownProtocol = "unknown-protocol",
    HTTP = "http",
    HTTPS = "https",
    WS = "ws",
    WSS = "wss",
    ReverseProxyWebProtocol = "reverse-proxy-web-protocol",
    ReverseProxyWebProtocolEncrypted = "reverse-proxy-web-protocol-encrypted",
    MQTT = "mqtt",
    JDBC = "jdbc",
    JDBCEncrypted = "jdbc-encrypted",
    ODBC = "odbc",
    ODBCEncrypted = "odbc-encrypted",
    SQLAccessProtocol = "sql-access-protocol",
    SQLAccessProtocolEncrypted = "sql-access-protocol-encrypted",
    NoSQLAccessProtocol = "nosql-access-protocol",
    NoSQLAccessProtocolEncrypted = "nosql-access-protocol-encrypted",
    BINARY = "binary",
    BINARYEncrypted = "binary-encrypted",
    TEXT = "text",
    TEXTEncrypted = "text-encrypted",
    SSH = "ssh",
    SSHTunnel = "ssh-tunnel",
    SMTP = "smtp",
    SMTPEncrypted = "smtp-encrypted",
    POP3 = "pop3",
    POP3Encrypted = "pop3-encrypted",
    IMAP = "imap",
    IMAPEncrypted = "imap-encrypted",
    FTP = "ftp",
    FTPS = "ftps",
    SFTP = "sftp",
    SCP = "scp",
    LDAP = "ldap",
    LDAPS = "ldaps",
    JMS = "jms",
    NFS = "nfs",
    SMB = "smb",
    SMBEncrypted = "smb-encrypted",
    LocalFileAccess = "local-file-access",
    NRPE = "nrpe",
    XMPP = "xmpp",
    IIOP = "iiop",
    IIOPEncrypted = "iiop-encrypted",
    JRMP = "jrmp",
    JRMPEncrypted = "jrmp-encrypted",
    InProcessLibraryCall = "in-process-library-call",
    ContainerSpawning = "container-spawning",
}

export function isProtocolProcessLocal(what: Protocol): boolean {
    return what === Protocol.InProcessLibraryCall || what === Protocol.LocalFileAccess || what === Protocol.ContainerSpawning;
}

export function isProtocolEncrypted(what: Protocol): boolean {
    return [
        Protocol.HTTPS, Protocol.WSS, Protocol.JDBCEncrypted, Protocol.ODBCEncrypted,
        Protocol.NoSQLAccessProtocolEncrypted, Protocol.SQLAccessProtocolEncrypted,
        Protocol.BINARYEncrypted, Protocol.TEXTEncrypted, Protocol.SSH, Protocol.SSHTunnel,
        Protocol.FTPS, Protocol.SFTP, Protocol.SCP, Protocol.LDAPS,
        Protocol.ReverseProxyWebProtocolEncrypted, Protocol.IIOPEncrypted,
        Protocol.JRMPEncrypted, Protocol.SMBEncrypted, Protocol.SMTPEncrypted,
        Protocol.POP3Encrypted, Protocol.IMAPEncrypted
    ].includes(what);
}

export function isPotentialDatabaseAccessProtocol(what: Protocol, includingLaxDatabaseProtocols: boolean): boolean {
    const strictlyDatabaseOnly = [
        Protocol.JDBCEncrypted, Protocol.ODBCEncrypted, Protocol.NoSQLAccessProtocolEncrypted,
        Protocol.SQLAccessProtocolEncrypted, Protocol.JDBC, Protocol.ODBC,
        Protocol.NoSQLAccessProtocol, Protocol.SQLAccessProtocol
    ].includes(what);

    if (includingLaxDatabaseProtocols) {
        return strictlyDatabaseOnly || [
            Protocol.HTTPS, Protocol.HTTP, Protocol.BINARY, Protocol.BINARYEncrypted
        ].includes(what);
    }
    return strictlyDatabaseOnly;
}

export function isPotentialWebAccessProtocol(what: Protocol): boolean {
    return [
        Protocol.HTTP, Protocol.HTTPS, Protocol.WS, Protocol.WSS,
        Protocol.ReverseProxyWebProtocol, Protocol.ReverseProxyWebProtocolEncrypted
    ].includes(what);
}


export enum TechnicalAssetTechnology {
    UnknownTechnology = "unknown-technology",
    ClientSystem = "client-system",
    Browser = "browser",
    Desktop = "desktop",
    MobileApp = "mobile-app",
    DevOpsClient = "devops-client",
    WebServer = "web-server",
    WebApplication = "web-application",
    ApplicationServer = "application-server",
    Database = "database",
    FileServer = "file-server",
    LocalFileSystem = "local-file-system",
    ERP = "erp",
    CMS = "cms",
    WebServiceREST = "web-service-rest",
    WebServiceSOAP = "web-service-soap",
    EJB = "ejb",
    SearchIndex = "search-index",
    SearchEngine = "search-engine",
    ServiceRegistry = "service-registry",
    ReverseProxy = "reverse-proxy",
    LoadBalancer = "load-balancer",
    BuildPipeline = "build-pipeline",
    SourcecodeRepository = "sourcecode-repository",
    ArtifactRegistry = "artifact-registry",
    CodeInspectionPlatform = "code-inspection-platform",
    Monitoring = "monitoring",
    LDAPServer = "ldap-server",
    ContainerPlatform = "container-platform",
    BatchProcessing = "batch-processing",
    EventListener = "event-listener",
    IdentityProvider = "identity-provider",
    IdentityStoreLDAP = "identity-store-ldap",
    IdentityStoreDatabase = "identity-store-database",
    Tool = "tool",
    CLI = "cli",
    Task = "task",
    Function = "function",
    Gateway = "gateway",
    IoTDevice = "iot-device",
    MessageQueue = "message-queue",
    StreamProcessing = "stream-processing",
    ServiceMesh = "service-mesh",
    DataLake = "data-lake",
    BigDataPlatform = "big-data-platform",
    ReportEngine = "report-engine",
    AI = "ai",
    MailServer = "mail-server",
    Vault = "vault",
    HSM = "hsm",
    WAF = "waf",
    IDS = "ids",
    IPS = "ips",
    Scheduler = "scheduler",
    Mainframe = "mainframe",
    BlockStorage = "block-storage",
    Library = "library",
}

// Methods for TechnicalAssetTechnology (as standalone functions)
export function isTechnologyWebApplication(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.WebServer, TechnicalAssetTechnology.WebApplication, TechnicalAssetTechnology.ApplicationServer,
        TechnicalAssetTechnology.ERP, TechnicalAssetTechnology.CMS, TechnicalAssetTechnology.IdentityProvider, TechnicalAssetTechnology.ReportEngine
    ].includes(what);
}
export function isTechnologyWebService(what: TechnicalAssetTechnology): boolean {
    return [TechnicalAssetTechnology.WebServiceREST, TechnicalAssetTechnology.WebServiceSOAP].includes(what);
}
export function isTechnologyIdentityRelated(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.IdentityProvider, TechnicalAssetTechnology.IdentityStoreLDAP, TechnicalAssetTechnology.IdentityStoreDatabase
    ].includes(what);
}
export function isTechnologySecurityControlRelated(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.Vault, TechnicalAssetTechnology.HSM, TechnicalAssetTechnology.WAF,
        TechnicalAssetTechnology.IDS, TechnicalAssetTechnology.IPS
    ].includes(what);
}
export function isTechnologyUnprotectedCommsTolerated(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.Monitoring, TechnicalAssetTechnology.IDS, TechnicalAssetTechnology.IPS
    ].includes(what);
}
export function isTechnologyUnnecessaryDataTolerated(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.Monitoring, TechnicalAssetTechnology.IDS, TechnicalAssetTechnology.IPS
    ].includes(what);
}
export function isTechnologyCloseToHighValueTargetsTolerated(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.Monitoring, TechnicalAssetTechnology.IDS, TechnicalAssetTechnology.IPS,
        TechnicalAssetTechnology.LoadBalancer, TechnicalAssetTechnology.ReverseProxy
    ].includes(what);
}
export function isTechnologyClient(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.ClientSystem, TechnicalAssetTechnology.Browser, TechnicalAssetTechnology.Desktop,
        TechnicalAssetTechnology.MobileApp, TechnicalAssetTechnology.DevOpsClient, TechnicalAssetTechnology.IoTDevice
    ].includes(what);
}
export function isTechnologyUsuallyAbleToPropagateIdentityToOutgoingTargets(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.ClientSystem, TechnicalAssetTechnology.Browser, TechnicalAssetTechnology.Desktop, TechnicalAssetTechnology.MobileApp,
		TechnicalAssetTechnology.DevOpsClient, TechnicalAssetTechnology.WebServer, TechnicalAssetTechnology.WebApplication, TechnicalAssetTechnology.ApplicationServer, TechnicalAssetTechnology.ERP,
		TechnicalAssetTechnology.CMS, TechnicalAssetTechnology.WebServiceREST, TechnicalAssetTechnology.WebServiceSOAP, TechnicalAssetTechnology.EJB,
		TechnicalAssetTechnology.SearchEngine, TechnicalAssetTechnology.ReverseProxy, TechnicalAssetTechnology.LoadBalancer, TechnicalAssetTechnology.IdentityProvider,
		TechnicalAssetTechnology.Tool, TechnicalAssetTechnology.CLI, TechnicalAssetTechnology.Task, TechnicalAssetTechnology.Function, TechnicalAssetTechnology.Gateway,
		TechnicalAssetTechnology.IoTDevice, TechnicalAssetTechnology.MessageQueue, TechnicalAssetTechnology.ServiceMesh, TechnicalAssetTechnology.ReportEngine, TechnicalAssetTechnology.WAF, TechnicalAssetTechnology.Library
    ].includes(what);
}
export function isTechnologyLessProtectedType(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.ClientSystem, TechnicalAssetTechnology.Browser, TechnicalAssetTechnology.Desktop, TechnicalAssetTechnology.MobileApp, TechnicalAssetTechnology.DevOpsClient, TechnicalAssetTechnology.WebServer, TechnicalAssetTechnology.WebApplication, TechnicalAssetTechnology.ApplicationServer, TechnicalAssetTechnology.CMS,
		TechnicalAssetTechnology.WebServiceREST, TechnicalAssetTechnology.WebServiceSOAP, TechnicalAssetTechnology.EJB, TechnicalAssetTechnology.BuildPipeline, TechnicalAssetTechnology.SourcecodeRepository,
		TechnicalAssetTechnology.ArtifactRegistry, TechnicalAssetTechnology.CodeInspectionPlatform, TechnicalAssetTechnology.Monitoring, TechnicalAssetTechnology.IoTDevice, TechnicalAssetTechnology.AI, TechnicalAssetTechnology.MailServer, TechnicalAssetTechnology.Scheduler,
		TechnicalAssetTechnology.Mainframe
    ].includes(what);
}
export function isTechnologyUsuallyProcessingEnduserRequests(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.WebServer, TechnicalAssetTechnology.WebApplication, TechnicalAssetTechnology.ApplicationServer,
        TechnicalAssetTechnology.ERP, TechnicalAssetTechnology.WebServiceREST, TechnicalAssetTechnology.WebServiceSOAP,
        TechnicalAssetTechnology.EJB, TechnicalAssetTechnology.ReportEngine
    ].includes(what);
}
export function isTechnologyUsuallyStoringEnduserData(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.Database, TechnicalAssetTechnology.ERP, TechnicalAssetTechnology.FileServer,
        TechnicalAssetTechnology.LocalFileSystem, TechnicalAssetTechnology.BlockStorage, TechnicalAssetTechnology.MailServer,
        TechnicalAssetTechnology.StreamProcessing, TechnicalAssetTechnology.MessageQueue
    ].includes(what);
}
export function isTechnologyExclusivelyFrontendRelated(what: TechnicalAssetTechnology): boolean {
     return [
        TechnicalAssetTechnology.ClientSystem, TechnicalAssetTechnology.Browser, TechnicalAssetTechnology.Desktop, TechnicalAssetTechnology.MobileApp, TechnicalAssetTechnology.DevOpsClient, TechnicalAssetTechnology.CMS, TechnicalAssetTechnology.ReverseProxy, TechnicalAssetTechnology.WAF, TechnicalAssetTechnology.LoadBalancer, TechnicalAssetTechnology.Gateway, TechnicalAssetTechnology.IoTDevice
    ].includes(what);
}
export function isTechnologyExclusivelyBackendRelated(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.Database, TechnicalAssetTechnology.IdentityProvider, TechnicalAssetTechnology.IdentityStoreLDAP, TechnicalAssetTechnology.IdentityStoreDatabase, TechnicalAssetTechnology.ERP, TechnicalAssetTechnology.WebServiceREST, TechnicalAssetTechnology.WebServiceSOAP, TechnicalAssetTechnology.EJB, TechnicalAssetTechnology.SearchIndex,
		TechnicalAssetTechnology.SearchEngine, TechnicalAssetTechnology.ContainerPlatform, TechnicalAssetTechnology.BatchProcessing, TechnicalAssetTechnology.EventListener, TechnicalAssetTechnology.DataLake, TechnicalAssetTechnology.BigDataPlatform, TechnicalAssetTechnology.MessageQueue,
		TechnicalAssetTechnology.StreamProcessing, TechnicalAssetTechnology.ServiceMesh, TechnicalAssetTechnology.Vault, TechnicalAssetTechnology.HSM, TechnicalAssetTechnology.Scheduler, TechnicalAssetTechnology.Mainframe, TechnicalAssetTechnology.FileServer, TechnicalAssetTechnology.BlockStorage
    ].includes(what);
}
export function isTechnologyDevelopmentRelevant(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.BuildPipeline, TechnicalAssetTechnology.SourcecodeRepository,
        TechnicalAssetTechnology.ArtifactRegistry, TechnicalAssetTechnology.CodeInspectionPlatform,
        TechnicalAssetTechnology.DevOpsClient
    ].includes(what);
}
export function isTechnologyTrafficForwarding(what: TechnicalAssetTechnology): boolean {
    return [
        TechnicalAssetTechnology.LoadBalancer, TechnicalAssetTechnology.ReverseProxy, TechnicalAssetTechnology.WAF
    ].includes(what);
}
export function isTechnologyEmbeddedComponent(what: TechnicalAssetTechnology): boolean {
    return what === TechnicalAssetTechnology.Library;
}


export enum TechnicalAssetMachine {
    Physical = "physical",
    Virtual = "virtual",
    Container = "container",
    Serverless = "serverless",
}

export enum TrustBoundaryType {
    NetworkOnPrem = "network-on-prem",
    NetworkDedicatedHoster = "network-dedicated-hoster",
    NetworkVirtualLAN = "network-virtual-lan",
    NetworkCloudProvider = "network-cloud-provider",
    NetworkCloudSecurityGroup = "network-cloud-security-group",
    NetworkPolicyNamespaceIsolation = "network-policy-namespace-isolation",
    ExecutionEnvironment = "execution-environment",
}

export function isTrustBoundaryNetworkBoundary(what: TrustBoundaryType): boolean {
    return [
        TrustBoundaryType.NetworkOnPrem, TrustBoundaryType.NetworkDedicatedHoster, TrustBoundaryType.NetworkVirtualLAN,
        TrustBoundaryType.NetworkCloudProvider, TrustBoundaryType.NetworkCloudSecurityGroup, TrustBoundaryType.NetworkPolicyNamespaceIsolation
    ].includes(what);
}

export function isTrustBoundaryWithinCloud(what: TrustBoundaryType): boolean {
    return [
        TrustBoundaryType.NetworkCloudProvider, TrustBoundaryType.NetworkCloudSecurityGroup
    ].includes(what);
}


export enum RiskSeverity {
    Low = "low",
    Medium = "medium",
    Elevated = "elevated",
    High = "high",
    Critical = "critical",
}

export function getRiskSeverityTitle(what: RiskSeverity): string {
    return {
        [RiskSeverity.Low]: "Low",
        [RiskSeverity.Medium]: "Medium",
        [RiskSeverity.Elevated]: "Elevated",
        [RiskSeverity.High]: "High",
        [RiskSeverity.Critical]: "Critical",
    }[what];
}


export enum RiskExploitationLikelihood {
    Unlikely = "unlikely",
    Likely = "likely",
    VeryLikely = "very-likely",
    Frequent = "frequent",
}

export function getRiskExploitationLikelihoodTitle(what: RiskExploitationLikelihood): string {
    return {
        [RiskExploitationLikelihood.Unlikely]: "Unlikely",
        [RiskExploitationLikelihood.Likely]: "Likely",
        [RiskExploitationLikelihood.VeryLikely]: "Very Likely",
        [RiskExploitationLikelihood.Frequent]: "Frequent",
    }[what];
}

export function getRiskExploitationLikelihoodWeight(what: RiskExploitationLikelihood): number {
    return {
        [RiskExploitationLikelihood.Unlikely]: 1,
        [RiskExploitationLikelihood.Likely]: 2,
        [RiskExploitationLikelihood.VeryLikely]: 3,
        [RiskExploitationLikelihood.Frequent]: 4,
    }[what];
}

export enum RiskExploitationImpact {
    Low = "low",
    Medium = "medium",
    High = "high",
    VeryHigh = "very-high",
}

export function getRiskExploitationImpactTitle(what: RiskExploitationImpact): string {
    return {
        [RiskExploitationImpact.Low]: "Low",
        [RiskExploitationImpact.Medium]: "Medium",
        [RiskExploitationImpact.High]: "High",
        [RiskExploitationImpact.VeryHigh]: "Very High",
    }[what];
}

export function getRiskExploitationImpactWeight(what: RiskExploitationImpact): number {
    return {
        [RiskExploitationImpact.Low]: 1,
        [RiskExploitationImpact.Medium]: 2,
        [RiskExploitationImpact.High]: 3,
        [RiskExploitationImpact.VeryHigh]: 4,
    }[what];
}

export enum RiskFunction {
    BusinessSide = "business-side",
    Architecture = "architecture",
    Development = "development",
    Operations = "operations",
}

export function getRiskFunctionTitle(what: RiskFunction): string {
    return {
        [RiskFunction.BusinessSide]: "Business Side",
        [RiskFunction.Architecture]: "Architecture",
        [RiskFunction.Development]: "Development",
        [RiskFunction.Operations]: "Operations",
    }[what];
}

export enum STRIDE {
    Spoofing = "spoofing",
    Tampering = "tampering",
    Repudiation = "repudiation",
    InformationDisclosure = "information-disclosure",
    DenialOfService = "denial-of-service",
    ElevationOfPrivilege = "elevation-of-privilege",
}

export function getSTRIDETitle(what: STRIDE): string {
    return {
        [STRIDE.Spoofing]: "Spoofing",
        [STRIDE.Tampering]: "Tampering",
        [STRIDE.Repudiation]: "Repudiation",
        [STRIDE.InformationDisclosure]: "Information Disclosure",
        [STRIDE.DenialOfService]: "Denial of Service",
        [STRIDE.ElevationOfPrivilege]: "Elevation of Privilege",
    }[what];
}

export enum DataBreachProbability {
    Improbable = "improbable",
    Possible = "possible",
    Probable = "probable",
}

export function getDataBreachProbabilityTitle(what: DataBreachProbability): string {
    return {
        [DataBreachProbability.Improbable]: "Improbable",
        [DataBreachProbability.Possible]: "Possible",
        [DataBreachProbability.Probable]: "Probable",
    }[what];
}


export enum RiskStatus {
    Unchecked = "unchecked",
    InDiscussion = "in-discussion",
    Accepted = "accepted",
    InProgress = "in-progress",
    Mitigated = "mitigated",
    FalsePositive = "false-positive",
}

export function getRiskStatusTitle(what: RiskStatus): string {
    return {
        [RiskStatus.Unchecked]: "Unchecked",
        [RiskStatus.InDiscussion]: "in Discussion",
        [RiskStatus.Accepted]: "Accepted",
        [RiskStatus.InProgress]: "in Progress",
        [RiskStatus.Mitigated]: "Mitigated",
        [RiskStatus.FalsePositive]: "False Positive",
    }[what];
}

export function isRiskStatusStillAtRisk(what: RiskStatus): boolean {
    return [
        RiskStatus.Unchecked, RiskStatus.InDiscussion, RiskStatus.Accepted, RiskStatus.InProgress
    ].includes(what);
}


// === Interfaces for Input Data ===

export interface Author {
    name?: string;
    homepage?: string;
}

export interface Overview {
    description?: string;
    // Array of map: Use Record<string, string>[] to keep order
    images?: Record<string, string>[];
}

// Corresponds to Go's InputCommunicationLink
export interface InputCommunicationLink {
    target: string;
    description?: string;
    protocol?: string; // Keep as string initially, parse later
    authentication?: string; // Keep as string initially, parse later
    authorization?: string; // Keep as string initially, parse later
    tags?: string[];
    vpn?: boolean;
    ip_filtered?: boolean;
    readonly?: boolean;
    usage?: string; // Keep as string initially, parse later
    data_assets_sent?: string[];
    data_assets_received?: string[];
    diagram_tweak_weight?: number;
    diagram_tweak_constraint?: boolean;
}

// Corresponds to Go's InputRiskIdentified
export interface InputRiskIdentified {
    severity?: string; // Keep as string initially, parse later
    exploitation_likelihood?: string; // Keep as string initially, parse later
    exploitation_impact?: string; // Keep as string initially, parse later
    data_breach_probability?: string; // Keep as string initially, parse later
    data_breach_technical_assets?: string[];
    most_relevant_data_asset?: string;
    most_relevant_technical_asset?: string;
    most_relevant_communication_link?: string;
    most_relevant_trust_boundary?: string;
    most_relevant_shared_runtime?: string;
}

// Corresponds to Go's InputIndividualRiskCategory
export interface InputIndividualRiskCategory {
    id: string;
    description?: string;
    impact?: string;
    asvs?: string;
    cheat_sheet?: string;
    action?: string;
    mitigation?: string;
    check?: string;
    function?: string; // Keep as string initially, parse later
    stride?: string; // Keep as string initially, parse later
    detection_logic?: string;
    risk_assessment?: string;
    false_positives?: string;
    model_failure_possible_reason?: boolean;
    cwe?: number;
    risks_identified?: Record<string, InputRiskIdentified>;
}

// Corresponds to Go's InputRiskTracking
export interface InputRiskTracking {
    status?: string; // Keep as string initially, parse later
    justification?: string;
    ticket?: string;
    date?: string; // Keep as string initially, parse later
    checked_by?: string;
}

// Corresponds to Go's InputSharedRuntime
export interface InputSharedRuntime {
    id: string;
    description?: string;
    tags?: string[];
    technical_assets_running?: string[];
}

// --- JS suffixed types (potentially different enum representation) ---
// These suggest the raw input might use numbers for enums before parsing


// Represents the main input structure from YAML/JSON - String enums
export interface ModelInput {
    threagile_version?: string;
    title: string;
    author?: Author;
    date?: string; // Keep as string initially, parse later
    business_overview?: Overview;
    technical_overview?: Overview;
    business_criticality?: string; // Keep as string initially, parse later
    management_summary_comment?: string;
    questions?: Record<string, string>;
    abuse_cases?: Record<string, string>;
    security_requirements?: Record<string, string>;
    tags_available?: string[];
    data_assets?: Record<string, InputDataAsset>;
    technical_assets?: Record<string, InputTechnicalAsset>;
    trust_boundaries?: Record<string, InputTrustBoundary>;
    shared_runtimes?: Record<string, InputSharedRuntime>;
    individual_risk_categories?: Record<string, InputIndividualRiskCategory>;
    risk_tracking?: Record<string, InputRiskTracking>;
    diagram_tweak_nodesep?: number;
    diagram_tweak_ranksep?: number;
    diagram_tweak_edge_layout?: string;
    diagram_tweak_suppress_edge_labels?: boolean;
    diagram_tweak_layout_left_to_right?: boolean;
    diagram_tweak_invisible_connections_between_assets?: string[];
    diagram_tweak_same_rank_assets?: string[];
}

// Corresponds to Go's InputDataAsset
export interface InputDataAsset {
    id: string;
    description?: string;
    usage?: string; // Keep as string initially, parse later
    tags?: string[];
    origin?: string;
    owner?: string;
    quantity?: string; // Keep as string initially, parse later
    confidentiality?: string; // Keep as string initially, parse later
    integrity?: string; // Keep as string initially, parse later
    availability?: string; // Keep as string initially, parse later
    justification_cia_rating?: string;
}

// Corresponds to Go's InputTechnicalAsset
export interface InputTechnicalAsset {
    id: string;
    description?: string;
    type?: string; // Keep as string initially, parse later
    usage?: string;
    used_as_client_by_human?: boolean;
    out_of_scope?: boolean;
    justification_out_of_scope?: string;
    size?: string; // Keep as string initially, parse later
    technology?: string; // Keep as string initially, parse later
    tags?: string[];
    internet?: boolean;
    machine?: string; // Keep as string initially, parse later
    encryption?: string; // Keep as string initially, parse later
    owner?: string;
    confidentiality?: string;
    integrity?: string;
    availability?: string;
    justification_cia_rating?: string;
    multi_tenant?: boolean;
    redundant?: boolean;
    custom_developed_parts?: boolean;
    data_assets_processed?: string[];
    data_assets_stored?: string[];
    data_formats_accepted?: string[]; // Keep as string initially, parse later
    diagram_tweak_order?: number;
    communication_links?: Record<string, InputCommunicationLink>;
}

// Corresponds to Go's InputTrustBoundary
export interface InputTrustBoundary {
    id: string;
    description?: string;
    type?: string; // Keep as string initially, parse later
    tags?: string[];
    technical_assets_inside?: string[];
    trust_boundaries_nested?: string[];
}


// === Parsed Model Interfaces and Classes ===

export class DataAsset {
    id: string;
    title: string; // Assuming ID is used if title is missing during parsing
    description: string;
    usage: Usage;
    tags: string[];
    origin: string;
    owner: string;
    quantity: Quantity;
    confidentiality: Confidentiality;
    integrity: Criticality;
    availability: Criticality;
    justificationCiaRating: string;

    constructor(input: InputDataAsset, id: string) {
        this.id = id;
        this.title = input.description || id; // Example: Use description or ID as title
        this.description = input.description || '';
        this.usage = parseUsage(input.usage || '') ?? Usage.Business; // Default
        this.tags = input.tags || [];
        this.origin = input.origin || '';
        this.owner = input.owner || '';
        this.quantity = parseQuantity(input.quantity || '') ?? Quantity.Few; // Default
        this.confidentiality = parseConfidentiality(input.confidentiality || '') ?? Confidentiality.Internal; // Default
        this.integrity = parseCriticality(input.integrity || '') ?? Criticality.Operational; // Default
        this.availability = parseCriticality(input.availability || '') ?? Criticality.Operational; // Default
        this.justificationCiaRating = input.justification_cia_rating || '';
    }

    isTaggedWithAny(...tags: string[]): boolean {
        return containsCaseInsensitiveAny(this.tags, ...tags);
    }

    isTaggedWithBaseTag(basetag: string): boolean {
        return isTaggedWithBaseTag(this.tags, basetag);
    }

    // --- Risk related methods ---
    // These require the global modelState to be populated

    getIdentifiedRisksByResponsibleTechnicalAssetId(): Record<string, Risk[]> {
        if (!modelState.parsedModelRoot) return {};

        const uniqueTechAssetIDs: Record<string, boolean> = {};
        this.getProcessedByTechnicalAssetsSorted().forEach(techAsset => {
            if (techAsset.getGeneratedRisks().length > 0) {
                uniqueTechAssetIDs[techAsset.id] = true;
            }
        });
        this.getStoredByTechnicalAssetsSorted().forEach(techAsset => {
            if (techAsset.getGeneratedRisks().length > 0) {
                uniqueTechAssetIDs[techAsset.id] = true;
            }
        });

        const result: Record<string, Risk[]> = {};
        for (const techAssetId in uniqueTechAssetIDs) {
            const asset = modelState.parsedModelRoot.technicalAssets[techAssetId];
            if (asset) {
                 result[techAssetId] = [...(result[techAssetId] || []), ...asset.getGeneratedRisks()];
            }
        }
        return result;
    }

     isDataBreachPotentialStillAtRisk(): boolean {
        if (!modelState.parsedModelRoot) return false;
         return getFilteredByStillAtRisk().some(risk =>
            risk.dataBreachTechnicalAssetIDs.some(techAssetId => {
                const asset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
                return asset && (contains(asset.dataAssetsProcessed, this.id) || contains(asset.dataAssetsStored, this.id));
            })
        );
    }

    getIdentifiedDataBreachProbability(): DataBreachProbability {
        if (!modelState.parsedModelRoot) return DataBreachProbability.Improbable;
        let highestProbability = DataBreachProbability.Improbable;
        for (const risk of getAllRisks()) {
            for (const techAssetId of risk.dataBreachTechnicalAssetIDs) {
                const asset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
                if (asset && (contains(asset.dataAssetsProcessed, this.id) || contains(asset.dataAssetsStored, this.id))) {
                     if (risk.dataBreachProbability > highestProbability) { // Assumes string enum order is correct!
                        highestProbability = risk.dataBreachProbability;
                        if (highestProbability === DataBreachProbability.Probable) return highestProbability; // Max possible
                    }
                    break; // Check next risk once asset match found
                }
            }
        }
        return highestProbability;
    }

     getIdentifiedDataBreachProbabilityStillAtRisk(): DataBreachProbability {
        if (!modelState.parsedModelRoot) return DataBreachProbability.Improbable;
        let highestProbability = DataBreachProbability.Improbable;
         for (const risk of getFilteredByStillAtRisk()) {
            for (const techAssetId of risk.dataBreachTechnicalAssetIDs) {
                 const asset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
                 if (asset && (contains(asset.dataAssetsProcessed, this.id) || contains(asset.dataAssetsStored, this.id))) {
                     if (risk.dataBreachProbability > highestProbability) { // Assumes string enum order is correct!
                        highestProbability = risk.dataBreachProbability;
                        if (highestProbability === DataBreachProbability.Probable) return highestProbability; // Max possible
                    }
                    break; // Check next risk once asset match found
                }
            }
        }
        return highestProbability;
    }

    getIdentifiedDataBreachProbabilityRisksStillAtRisk(): Risk[] {
        if (!modelState.parsedModelRoot) return [];
        const result: Risk[] = [];
        const addedRiskIds = new Set<string>();
         for (const risk of getFilteredByStillAtRisk()) {
            for (const techAssetId of risk.dataBreachTechnicalAssetIDs) {
                 const asset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
                 if (asset && (contains(asset.dataAssetsProcessed, this.id) || contains(asset.dataAssetsStored, this.id))) {
                     if (!addedRiskIds.has(risk.syntheticId)) {
                         result.push(risk);
                         addedRiskIds.add(risk.syntheticId);
                     }
                    break; // Check next risk once asset match found
                }
            }
        }
        return result;
    }

     getIdentifiedDataBreachProbabilityRisks(): Risk[] {
         if (!modelState.parsedModelRoot) return [];
        const result: Risk[] = [];
        const addedRiskIds = new Set<string>();
        for (const risk of getAllRisks()) {
            for (const techAssetId of risk.dataBreachTechnicalAssetIDs) {
                 const asset = modelState.parsedModelRoot!.technicalAssets[techAssetId];
                 if (asset && (contains(asset.dataAssetsProcessed, this.id) || contains(asset.dataAssetsStored, this.id))) {
                    if (!addedRiskIds.has(risk.syntheticId)) {
                        result.push(risk);
                        addedRiskIds.add(risk.syntheticId);
                    }
                    break; // Check next risk once asset match found
                }
            }
        }
        return result;
    }


    // --- Relationship methods ---
    getProcessedByTechnicalAssetsSorted(): TechnicalAsset[] {
        if (!modelState.parsedModelRoot?.technicalAssets) return [];
        const result = Object.values(modelState.parsedModelRoot.technicalAssets)
            .filter(asset => contains(asset.dataAssetsProcessed, this.id));
        result.sort(sortByTechnicalAssetTitle);
        return result;
    }

    getStoredByTechnicalAssetsSorted(): TechnicalAsset[] {
         if (!modelState.parsedModelRoot?.technicalAssets) return [];
        const result = Object.values(modelState.parsedModelRoot.technicalAssets)
            .filter(asset => contains(asset.dataAssetsStored, this.id));
        result.sort(sortByTechnicalAssetTitle);
        return result;
    }

    getSentViaCommLinksSorted(): CommunicationLink[] {
        if (!modelState.communicationLinks) return [];
        const result = Object.values(modelState.communicationLinks)
            .filter(link => contains(link.dataAssetsSent, this.id));
        result.sort(sortByTechnicalCommunicationLinkTitle); // Assuming Title exists and is comparable
        return result;
    }

    getReceivedViaCommLinksSorted(): CommunicationLink[] {
         if (!modelState.communicationLinks) return [];
        const result = Object.values(modelState.communicationLinks)
             .filter(link => contains(link.dataAssetsReceived, this.id));
        result.sort(sortByTechnicalCommunicationLinkTitle); // Assuming Title exists and is comparable
        return result;
    }
}


export class CommunicationLink {
    id: string; // synthetic ID: sourceId + "->" + targetId + "@" + protocol
    sourceId: string;
    targetId: string;
    title: string;
    description: string;
    protocol: Protocol;
    tags: string[];
    vpn: boolean;
    ipFiltered: boolean;
    readonly: boolean;
    authentication: Authentication;
    authorization: Authorization;
    usage: Usage;
    dataAssetsSent: string[];
    dataAssetsReceived: string[];
    diagramTweakWeight: number;
    diagramTweakConstraint: boolean;

     constructor(input: InputCommunicationLink, sourceAssetId: string, targetAssetId: string) {
        this.targetId = targetAssetId; // Input target is the target asset ID
        this.sourceId = sourceAssetId;
        this.title = input.description || `${sourceAssetId} to ${targetAssetId}`; // Default title
        this.description = input.description || '';
        this.protocol = (input.protocol as Protocol) || Protocol.UnknownProtocol; // Requires parsing before constructor
        this.authentication = (input.authentication as Authentication) || Authentication.None; // Requires parsing
        this.authorization = (input.authorization as Authorization) || Authorization.None; // Requires parsing
        this.tags = input.tags || [];
        this.vpn = input.vpn || false;
        this.ipFiltered = input.ip_filtered || false;
        this.readonly = input.readonly || false;
        this.usage = parseUsage(input.usage || '') ?? Usage.Business; // Default
        this.dataAssetsSent = input.data_assets_sent || [];
        this.dataAssetsReceived = input.data_assets_received || [];
        this.diagramTweakWeight = input.diagram_tweak_weight || 0;
        this.diagramTweakConstraint = input.diagram_tweak_constraint || true;
        this.id = `${this.sourceId}->${this.targetId}@${this.protocol}`; // Create synthetic ID
    }


    isTaggedWithAny(...tags: string[]): boolean {
        return containsCaseInsensitiveAny(this.tags, ...tags);
    }

    isTaggedWithBaseTag(basetag: string): boolean {
        return isTaggedWithBaseTag(this.tags, basetag);
    }

    isAcrossTrustBoundary(): boolean {
        const sourceBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.sourceId];
        const targetBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.targetId];
        return sourceBoundary?.id !== targetBoundary?.id; // Check if IDs are different
    }

    isAcrossTrustBoundaryNetworkOnly(): boolean {
        let sourceBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.sourceId];
        if (sourceBoundary && !isTrustBoundaryNetworkBoundary(sourceBoundary.type)) {
            const parentId = sourceBoundary.getParentTrustBoundaryID();
            sourceBoundary = parentId ? modelState.parsedModelRoot?.trustBoundaries[parentId] : undefined;
        }

        let targetBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.targetId];
        if (targetBoundary && !isTrustBoundaryNetworkBoundary(targetBoundary.type)) {
            const parentId = targetBoundary.getParentTrustBoundaryID();
            targetBoundary = parentId ? modelState.parsedModelRoot?.trustBoundaries[parentId] : undefined;
        }

        // Both boundaries must exist and be network boundaries, and their IDs must differ
        return !!sourceBoundary && !!targetBoundary &&
               isTrustBoundaryNetworkBoundary(sourceBoundary.type) &&
               isTrustBoundaryNetworkBoundary(targetBoundary.type) &&
               sourceBoundary.id !== targetBoundary.id;
    }

    getHighestConfidentiality(): Confidentiality {
         if (!modelState.parsedModelRoot?.dataAssets) return Confidentiality.Public;
        let highest = Confidentiality.Public;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.confidentiality > highest) {
                highest = dataAsset.confidentiality;
            }
        };
        this.dataAssetsSent.forEach(checkAsset);
        this.dataAssetsReceived.forEach(checkAsset);
        return highest;
    }

    getHighestIntegrity(): Criticality {
        if (!modelState.parsedModelRoot?.dataAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.integrity > highest) {
                highest = dataAsset.integrity;
            }
        };
        this.dataAssetsSent.forEach(checkAsset);
        this.dataAssetsReceived.forEach(checkAsset);
        return highest;
    }

     getHighestAvailability(): Criticality {
        if (!modelState.parsedModelRoot?.dataAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.availability > highest) {
                highest = dataAsset.availability;
            }
        };
        this.dataAssetsSent.forEach(checkAsset);
        this.dataAssetsReceived.forEach(checkAsset);
        return highest;
    }

    getDataAssetsSentSorted(): DataAsset[] {
        if (!modelState.parsedModelRoot?.dataAssets) return [];
        const result = this.dataAssetsSent
            .map(id => modelState.parsedModelRoot!.dataAssets[id])
            .filter((asset): asset is DataAsset => !!asset); // Filter out undefined if ID not found
        result.sort(sortByDataAssetTitle);
        return result;
    }

    getDataAssetsReceivedSorted(): DataAsset[] {
         if (!modelState.parsedModelRoot?.dataAssets) return [];
        const result = this.dataAssetsReceived
            .map(id => modelState.parsedModelRoot!.dataAssets[id])
            .filter((asset): asset is DataAsset => !!asset);
        result.sort(sortByDataAssetTitle);
        return result;
    }

     // --- Diagramming methods ---

    determineArrowLineStyle(): 'solid' | 'dashed' | 'dotted' {
        if (this.dataAssetsSent.length === 0 && this.dataAssetsReceived.length === 0) {
            return "dotted"; // Model forgery attempt indication
        }
        if (this.usage === Usage.DevOps) {
            return "dashed";
        }
        return "solid";
    }

     determineArrowPenWidth(): number { // Return number directly
        const color = this.determineArrowColor();
        if (color === colors.Pink) return 3.0;
        if (color !== colors.Black) return 2.5;
        return 1.5;
    }

     determineLabelColor(): string {
        // Simplified logic based on highest integrity (can be refined based on risks)
        if (!modelState.parsedModelRoot?.dataAssets) return colors.Gray;

        const highestIntegrity = this.getHighestIntegrity();
        if (highestIntegrity === Criticality.MissionCritical) return colors.Red;
        if (highestIntegrity === Criticality.Critical) return colors.Amber;

        // Original Go code mentions encrypted protocol, but that seems less relevant for label color
        return colors.Gray;
    }

    determineArrowColor(): string {
        if (!modelState.parsedModelRoot?.dataAssets) return colors.Black;

        if (this.dataAssetsSent.length === 0 && this.dataAssetsReceived.length === 0 || this.protocol === Protocol.UnknownProtocol) {
            return colors.Pink; // Model forgery attempt indication
        }
        if (this.usage === Usage.DevOps) {
            return colors.MiddleLightGray;
        }
        if (this.vpn) {
            return colors.DarkBlue;
        }
        if (this.ipFiltered) {
            return colors.Brown;
        }

         // Simplified logic based on highest confidentiality (can be refined based on risks)
        const highestConfidentiality = this.getHighestConfidentiality();
         if (highestConfidentiality === Confidentiality.StrictlyConfidential) return colors.Red;
         if (highestConfidentiality === Confidentiality.Confidential) return colors.Amber;

        return colors.Black;
    }

    isBidirectional(): boolean {
        return this.dataAssetsSent.length > 0 && this.dataAssetsReceived.length > 0;
    }

}


export class TechnicalAsset {
    id: string;
    title: string;
    description: string;
    usage: Usage;
    type: TechnicalAssetType;
    size: TechnicalAssetSize;
    technology: TechnicalAssetTechnology;
    machine: TechnicalAssetMachine;
    internet: boolean;
    multiTenant: boolean;
    redundant: boolean;
    customDevelopedParts: boolean;
    outOfScope: boolean;
    usedAsClientByHuman: boolean;
    encryption: EncryptionStyle;
    justificationOutOfScope: string;
    owner: string;
    confidentiality: Confidentiality;
    integrity: Criticality;
    availability: Criticality;
    justificationCiaRating: string;
    tags: string[];
    dataAssetsProcessed: string[];
    dataAssetsStored: string[];
    dataFormatsAccepted: DataFormat[];
    communicationLinks: CommunicationLink[]; // Parsed links originating from this asset
    diagramTweakOrder: number;
    raa: number = 0; // Relative Attacker Attractiveness - Calculated later

    constructor(input: InputTechnicalAsset, id: string) {
        this.id = id;
        this.title = input.description || id; // Default title
        this.description = input.description || '';
        this.usage = parseUsage(input.usage || '') ?? Usage.Business;
        this.type = (input.type as TechnicalAssetType) || TechnicalAssetType.Process; // Requires parsing
        this.size = (input.size as TechnicalAssetSize) || TechnicalAssetSize.Application; // Requires parsing
        this.technology = (input.technology as TechnicalAssetTechnology) || TechnicalAssetTechnology.UnknownTechnology; // Requires parsing
        this.machine = (input.machine as TechnicalAssetMachine) || TechnicalAssetMachine.Virtual; // Requires parsing
        this.internet = input.internet || false;
        this.multiTenant = input.multi_tenant || false;
        this.redundant = input.redundant || false;
        this.customDevelopedParts = input.custom_developed_parts || false;
        this.outOfScope = input.out_of_scope || false;
        this.usedAsClientByHuman = input.used_as_client_by_human || false;
        this.encryption = parseEncryptionStyle(input.encryption || '') ?? EncryptionStyle.None;
        this.justificationOutOfScope = input.justification_out_of_scope || '';
        this.owner = input.owner || '';
        this.confidentiality = parseConfidentiality(input.confidentiality || '') ?? Confidentiality.Internal;
        this.integrity = parseCriticality(input.integrity || '') ?? Criticality.Operational;
        this.availability = parseCriticality(input.availability || '') ?? Criticality.Operational;
        this.justificationCiaRating = input.justification_cia_rating || '';
        this.tags = input.tags || [];
        this.dataAssetsProcessed = input.data_assets_processed || [];
        this.dataAssetsStored = input.data_assets_stored || [];
        this.dataFormatsAccepted = (input.data_formats_accepted as DataFormat[]) || []; // Requires parsing
        this.communicationLinks = []; // Populated after all assets are created
        this.diagramTweakOrder = input.diagram_tweak_order || 0;
    }

    isTaggedWithAny(...tags: string[]): boolean {
        return containsCaseInsensitiveAny(this.tags, ...tags);
    }

     isTaggedWithBaseTag(basetag: string): boolean {
        return isTaggedWithBaseTag(this.tags, basetag);
    }

    isTaggedWithAnyTraversingUp(...tags: string[]): boolean {
         if (!modelState.parsedModelRoot) return false;
        if (this.isTaggedWithAny(...tags)) {
            return true;
        }
        const boundary = this.getTrustBoundary();
        if (boundary?.isTaggedWithAnyTraversingUp(...tags)) {
            return true;
        }
        // Check shared runtimes
        for (const sr of Object.values(modelState.parsedModelRoot.sharedRuntimes)) {
             if (contains(sr.technicalAssetsRunning, this.id) && sr.isTaggedWithAny(...tags)) {
                 return true;
             }
        }
        return false;
    }


    getTrustBoundary(): TrustBoundary | undefined {
         return modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.id];
    }

     getTrustBoundaryId(): string | undefined {
         return this.getTrustBoundary()?.id;
    }

     isSameTrustBoundary(otherAssetId: string): boolean {
        const myBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.id];
        const otherBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[otherAssetId];
        // Both must be in a boundary and the boundary IDs must be the same
        return !!myBoundary && !!otherBoundary && myBoundary.id === otherBoundary.id;
    }

     isSameExecutionEnvironment(otherAssetId: string): boolean {
        const myBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[this.id];
        const otherBoundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[otherAssetId];
        // Both must be in an ExecutionEnvironment boundary and the boundary IDs must be the same
        return !!myBoundary && myBoundary.type === TrustBoundaryType.ExecutionEnvironment &&
               !!otherBoundary && otherBoundary.type === TrustBoundaryType.ExecutionEnvironment &&
               myBoundary.id === otherBoundary.id;
    }

     isSameTrustBoundaryNetworkOnly(otherAssetId: string): boolean {
        const getNetworkBoundary = (assetId: string): TrustBoundary | undefined => {
            let boundary = modelState.directContainingTrustBoundaryMappedByTechnicalAssetId[assetId];
            while (boundary && !isTrustBoundaryNetworkBoundary(boundary.type)) {
                 const parentId = boundary.getParentTrustBoundaryID();
                 boundary = parentId ? modelState.parsedModelRoot?.trustBoundaries[parentId] : undefined;
            }
            return boundary;
        };

        const myNetworkBoundary = getNetworkBoundary(this.id);
        const otherNetworkBoundary = getNetworkBoundary(otherAssetId);

        // Both must resolve to a network boundary and their IDs must be the same
        return !!myNetworkBoundary && !!otherNetworkBoundary && myNetworkBoundary.id === otherNetworkBoundary.id;
    }

     getHighestSensitivityScore(): number {
        // Direct translation of Go calculation
        return getConfidentialityAttackerAttractivenessForAsset(this.confidentiality) +
               getCriticalityAttackerAttractivenessForAsset(this.integrity) +
               getCriticalityAttackerAttractivenessForAsset(this.availability);
    }

    getHighestConfidentiality(): Confidentiality {
         if (!modelState.parsedModelRoot?.dataAssets) return this.confidentiality;
        let highest = this.confidentiality;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.confidentiality > highest) {
                highest = dataAsset.confidentiality;
            }
        };
        this.dataAssetsProcessed.forEach(checkAsset);
        this.dataAssetsStored.forEach(checkAsset);
        return highest;
    }

    getHighestIntegrity(): Criticality {
        if (!modelState.parsedModelRoot?.dataAssets) return this.integrity;
        let highest = this.integrity;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.integrity > highest) {
                highest = dataAsset.integrity;
            }
        };
        this.dataAssetsProcessed.forEach(checkAsset);
        this.dataAssetsStored.forEach(checkAsset);
        return highest;
    }

     getHighestAvailability(): Criticality {
        if (!modelState.parsedModelRoot?.dataAssets) return this.availability;
        let highest = this.availability;
        const checkAsset = (assetId: string) => {
            const dataAsset = modelState.parsedModelRoot!.dataAssets[assetId];
            if (dataAsset && dataAsset.availability > highest) {
                highest = dataAsset.availability;
            }
        };
        this.dataAssetsProcessed.forEach(checkAsset);
        this.dataAssetsStored.forEach(checkAsset);
        return highest;
    }


     getDataAssetsProcessedSorted(): DataAsset[] {
        if (!modelState.parsedModelRoot?.dataAssets) return [];
        const result = this.dataAssetsProcessed
            .map(id => modelState.parsedModelRoot!.dataAssets[id])
            .filter((asset): asset is DataAsset => !!asset);
        result.sort(sortByDataAssetTitle);
        return result;
    }

    getDataAssetsStoredSorted(): DataAsset[] {
         if (!modelState.parsedModelRoot?.dataAssets) return [];
        const result = this.dataAssetsStored
            .map(id => modelState.parsedModelRoot!.dataAssets[id])
            .filter((asset): asset is DataAsset => !!asset);
        result.sort(sortByDataAssetTitle);
        return result;
    }

     getDataFormatsAcceptedSorted(): DataFormat[] {
        // Simple sort as they are already enum values
        return [...this.dataFormatsAccepted].sort((a, b) => a.localeCompare(b));
    }

     getCommunicationLinksSorted(): CommunicationLink[] {
        const result = [...this.communicationLinks];
        result.sort(sortByTechnicalCommunicationLinkTitle); // Assuming Title exists and is comparable
        return result;
    }

     hasDirectConnection(otherAssetId: string): boolean {
        // Check outgoing links from this asset
        if (this.communicationLinks.some(link => link.targetId === otherAssetId)) {
            return true;
        }
        // Check incoming links to this asset (outgoing from the other asset)
        const otherAsset = modelState.parsedModelRoot?.technicalAssets[otherAssetId];
        if (otherAsset?.communicationLinks.some(link => link.targetId === this.id)) {
            return true;
        }
        // Fallback check using the global incoming map (might be redundant if assets store their links)
         const incomingToMe = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[this.id] || [];
         if (incomingToMe.some(link => link.sourceId === otherAssetId)) {
             return true;
         }
         const incomingToOther = modelState.incomingTechnicalCommunicationLinksMappedByTargetId[otherAssetId] || [];
         if (incomingToOther.some(link => link.sourceId === this.id)) {
             return true;
         }
        return false;
    }

     getGeneratedRisks(): Risk[] {
        const resultingRisks: Risk[] = [];
        // Check if risks have been generated
        if (modelState.generatedRisksByCategory.size === 0 && Object.keys(modelState.generatedRisksBySyntheticId).length === 0) {
            console.warn(`Asking for risks for asset ${this.id}, but no risks generated yet.`);
            return [];
        }

        // Iterate through all generated risks
        for (const risk of Object.values(modelState.generatedRisksBySyntheticId)) {
             if (risk.mostRelevantTechnicalAssetId === this.id) {
                 resultingRisks.push(risk);
             }
        }

        // Sort by severity (descending) then title (ascending)
        resultingRisks.sort(sortByRiskSeverity);
        return resultingRisks;
    }

     getHighestRiskSeverity(): RiskSeverity {
         return getHighestSeverity(this.getGeneratedRisks());
     }

     getHighestRiskSeverityStillAtRisk(): RiskSeverity {
         return getHighestSeverityStillAtRisk(this.getGeneratedRisks());
     }

    processesOrStoresDataAsset(dataAssetId: string): boolean {
        return contains(this.dataAssetsProcessed, dataAssetId) || contains(this.dataAssetsStored, dataAssetId);
    }


     // --- Diagramming methods ---

    determineShapeBorderLineStyle(): 'solid' | 'dotted' {
        if (this.dataAssetsProcessed.length === 0 && this.dataAssetsStored.length === 0 || this.outOfScope) {
            return "dotted"; // Model forgery or out-of-scope indication
        }
        return "solid";
    }

    determineShapePeripheries(): number {
        return this.redundant ? 2 : 1;
    }

    determineShapeStyle(): string {
        return "filled";
    }

    determineShapeBorderPenWidth(): number {
         const color = this.determineShapeBorderColor();
        if (color === colors.Pink) return 3.5;
        if (color !== colors.Black) return 3.0;
        return 2.0;
    }

    determineLabelColor(): string {
        // Simplified logic based on integrity (can be refined based on risks)
        if (!modelState.parsedModelRoot?.dataAssets) return colors.Black;

         const highestIntegrity = this.getHighestIntegrity();
         if (highestIntegrity === Criticality.MissionCritical) return colors.Red;
         if (highestIntegrity === Criticality.Critical) return colors.Amber;

        return colors.Black;
    }

    determineShapeBorderColor(): string {
        // Simplified logic based on confidentiality (can be refined based on risks)
         if (!modelState.parsedModelRoot?.dataAssets) return colors.Black;

        const highestConfidentiality = this.getHighestConfidentiality();
         if (highestConfidentiality === Confidentiality.StrictlyConfidential) return colors.Red;
         if (highestConfidentiality === Confidentiality.Confidential) return colors.Amber;


        // Pink indication for likely model error (no data processed/stored)
        if (this.dataAssetsProcessed.length === 0 && this.dataAssetsStored.length === 0 && !this.outOfScope) {
             return colors.Pink;
        }

        return colors.Black;
    }

     determineShapeFillColor(): string {
         let fillColor = colors.VeryLightGray;

        // Check for potential model issues first
        const hasIncomingLinks = (modelState.incomingTechnicalCommunicationLinksMappedByTargetId[this.id] || []).length > 0;
        const hasOutgoingLinks = this.communicationLinks.length > 0;

        if ((this.dataAssetsProcessed.length === 0 && this.dataAssetsStored.length === 0 && !this.outOfScope) ||
            this.technology === TechnicalAssetTechnology.UnknownTechnology) {
            fillColor = colors.LightPink; // Indicates potential modeling error
        } else if (!hasIncomingLinks && !hasOutgoingLinks && !this.outOfScope) {
             fillColor = colors.LightPink; // Indicates potential modeling error (isolated asset)
        } else if (this.outOfScope) {
            fillColor = colors.OutOfScopeFancy;
        } else if (this.internet) {
            fillColor = colors.ExtremeLightBlue;
        } else if (this.customDevelopedParts) {
            fillColor = colors.CustomDevelopedParts;
        }

        // Adjust based on machine type
        switch (this.machine) {
            case TechnicalAssetMachine.Physical:
                // Darken - Placeholder logic
                fillColor = colors.darkenHexColor(fillColor);
                break;
            case TechnicalAssetMachine.Container:
                 // Brighten - Placeholder logic
                fillColor = colors.brightenHexColor(fillColor);
                break;
            case TechnicalAssetMachine.Serverless:
                 // Brighten more - Placeholder logic
                fillColor = colors.brightenHexColor(colors.brightenHexColor(fillColor));
                break;
             // case TechnicalAssetMachine.Virtual: // No change needed
        }

        return fillColor;
    }

}


export class TrustBoundary {
    id: string;
    title: string;
    description: string;
    type: TrustBoundaryType;
    tags: string[];
    technicalAssetsInside: string[]; // IDs of assets directly inside
    trustBoundariesNested: string[]; // IDs of boundaries directly inside

    constructor(input: InputTrustBoundary, id: string) {
        this.id = id;
        this.title = input.description || id; // Default title
        this.description = input.description || '';
        this.type = (input.type as TrustBoundaryType) || TrustBoundaryType.NetworkVirtualLAN; // Requires parsing, provide default
        this.tags = input.tags || [];
        this.technicalAssetsInside = input.technical_assets_inside || [];
        this.trustBoundariesNested = input.trust_boundaries_nested || [];
    }

    isTaggedWithAny(...tags: string[]): boolean {
        return containsCaseInsensitiveAny(this.tags, ...tags);
    }

     isTaggedWithBaseTag(basetag: string): boolean {
        return isTaggedWithBaseTag(this.tags, basetag);
    }

    isTaggedWithAnyTraversingUp(...tags: string[]): boolean {
         if (this.isTaggedWithAny(...tags)) {
             return true;
         }
         const parentId = this.getParentTrustBoundaryID();
         if (parentId && modelState.parsedModelRoot?.trustBoundaries[parentId]?.isTaggedWithAnyTraversingUp(...tags)) {
             return true;
         }
         return false;
     }


    recursivelyAllTechnicalAssetIDsInside(): string[] {
        const result: string[] = [];
        this._addAssetIDsRecursively(result);
        return Array.from(new Set(result)); // Ensure unique IDs
    }

    private _addAssetIDsRecursively(result: string[]): void {
        result.push(...this.technicalAssetsInside);
        for (const nestedBoundaryID of this.trustBoundariesNested) {
            modelState.parsedModelRoot?.trustBoundaries[nestedBoundaryID]?._addAssetIDsRecursively(result);
        }
    }

    getParentTrustBoundaryID(): string | undefined {
        if (!modelState.parsedModelRoot?.trustBoundaries) return undefined;
        for (const candidate of Object.values(modelState.parsedModelRoot.trustBoundaries)) {
            if (contains(candidate.trustBoundariesNested, this.id)) {
                return candidate.id;
            }
        }
        return undefined;
    }

     // Get all ancestor IDs, including self
    getAllParentTrustBoundaryIDs(): string[] {
        const result: string[] = [];
        this._addTrustBoundaryIDsRecursively(result);
        return result;
    }

    private _addTrustBoundaryIDsRecursively(result: string[]): void {
        result.push(this.id);
        const parentID = this.getParentTrustBoundaryID();
        if (parentID) {
            modelState.parsedModelRoot?.trustBoundaries[parentID]?._addTrustBoundaryIDsRecursively(result);
        }
    }


    getHighestConfidentiality(): Confidentiality {
         if (!modelState.parsedModelRoot?.technicalAssets) return Confidentiality.Public;
        let highest = Confidentiality.Public;
        for (const id of this.recursivelyAllTechnicalAssetIDsInside()) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
            if (techAsset) {
                const assetConf = techAsset.getHighestConfidentiality();
                if (assetConf > highest) {
                    highest = assetConf;
                }
            }
        }
        return highest;
    }

     getHighestIntegrity(): Criticality {
         if (!modelState.parsedModelRoot?.technicalAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
         for (const id of this.recursivelyAllTechnicalAssetIDsInside()) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
            if (techAsset) {
                const assetInteg = techAsset.getHighestIntegrity();
                 if (assetInteg > highest) {
                    highest = assetInteg;
                }
            }
        }
        return highest;
    }

    getHighestAvailability(): Criticality {
        if (!modelState.parsedModelRoot?.technicalAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
        for (const id of this.recursivelyAllTechnicalAssetIDsInside()) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
             if (techAsset) {
                const assetAvail = techAsset.getHighestAvailability();
                if (assetAvail > highest) {
                    highest = assetAvail;
                }
            }
        }
        return highest;
    }

}

export class SharedRuntime {
    id: string;
    title: string;
    description: string;
    tags: string[];
    technicalAssetsRunning: string[]; // IDs

    constructor(input: InputSharedRuntime, id: string) {
        this.id = id;
        this.title = input.description || id; // Default title
        this.description = input.description || '';
        this.tags = input.tags || [];
        this.technicalAssetsRunning = input.technical_assets_running || [];
    }

    isTaggedWithAny(...tags: string[]): boolean {
        return containsCaseInsensitiveAny(this.tags, ...tags);
    }

    isTaggedWithBaseTag(basetag: string): boolean {
        return isTaggedWithBaseTag(this.tags, basetag);
    }

     getHighestConfidentiality(): Confidentiality {
         if (!modelState.parsedModelRoot?.technicalAssets) return Confidentiality.Public;
        let highest = Confidentiality.Public;
        for (const id of this.technicalAssetsRunning) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
             if (techAsset) {
                const assetConf = techAsset.getHighestConfidentiality();
                if (assetConf > highest) {
                    highest = assetConf;
                }
            }
        }
        return highest;
    }

    getHighestIntegrity(): Criticality {
        if (!modelState.parsedModelRoot?.technicalAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
        for (const id of this.technicalAssetsRunning) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
            if (techAsset) {
                 const assetInteg = techAsset.getHighestIntegrity();
                if (assetInteg > highest) {
                    highest = assetInteg;
                }
            }
        }
        return highest;
    }

    getHighestAvailability(): Criticality {
         if (!modelState.parsedModelRoot?.technicalAssets) return Criticality.Archive;
        let highest = Criticality.Archive;
        for (const id of this.technicalAssetsRunning) {
            const techAsset = modelState.parsedModelRoot.technicalAssets[id];
            if (techAsset) {
                const assetAvail = techAsset.getHighestAvailability();
                 if (assetAvail > highest) {
                    highest = assetAvail;
                }
            }
        }
        return highest;
    }

    getTechnicalAssetWithHighestRAA(): TechnicalAsset | undefined {
         if (!modelState.parsedModelRoot?.technicalAssets || this.technicalAssetsRunning.length === 0) {
            return undefined;
        }
        let highestRaaAsset: TechnicalAsset | undefined = undefined;
        let maxRaa = -1;

        for (const assetId of this.technicalAssetsRunning) {
            const candidate = modelState.parsedModelRoot.technicalAssets[assetId];
            if (candidate) {
                if (highestRaaAsset === undefined || candidate.raa > maxRaa) {
                    highestRaaAsset = candidate;
                    maxRaa = candidate.raa;
                }
            }
        }
        return highestRaaAsset;
    }

}

export interface RiskCategory {
    id: string;
    title: string;
    description: string;
    impact: string;
    asvs: string; // OWASP ASVS reference
    cheatSheet: string; // OWASP Cheat Sheet reference
    action: string; // Recommended action/fix
    mitigation: string; // Mitigation description
    check: string; // How to check if vulnerable
    detectionLogic: string; // Logic for automated detection
    riskAssessment: string; // How risk is assessed
    falsePositives: string; // Common false positives
    function: RiskFunction; // Primary function responsible (Dev, Ops, Arch, Biz)
    stride: STRIDE; // STRIDE category
    modelFailurePossibleReason: boolean; // If risk indicates potential model inaccuracy
    cwe: number; // Common Weakness Enumeration ID
}

export class Risk {
    // Category object is stored separately in modelState.generatedRisksByCategory
    // We only store the ID here for efficient lookup and structure.
    categoryId: string;
    severity: RiskSeverity;
    exploitationLikelihood: RiskExploitationLikelihood;
    exploitationImpact: RiskExploitationImpact;
    title: string;
    syntheticId: string; // Unique ID for the risk instance
    mostRelevantDataAssetId?: string;
    mostRelevantTechnicalAssetId?: string;
    mostRelevantTrustBoundaryId?: string;
    mostRelevantSharedRuntimeId?: string;
    mostRelevantCommunicationLinkId?: string;
    dataBreachProbability: DataBreachProbability;
    dataBreachTechnicalAssetIDs: string[]; // Assets likely involved in a breach if risk exploited

     constructor(
        categoryId: string,
        severity: RiskSeverity,
        likelihood: RiskExploitationLikelihood,
        impact: RiskExploitationImpact,
        title: string,
        syntheticId: string,
        dataBreachProbability: DataBreachProbability,
        dataBreachTechnicalAssetIDs: string[],
        relevantDataAssetId?: string,
        relevantTechnicalAssetId?: string,
        relevantTrustBoundaryId?: string,
        relevantSharedRuntimeId?: string,
        relevantCommunicationLinkId?: string,
     ) {
        this.categoryId = categoryId;
        this.severity = severity;
        this.exploitationLikelihood = likelihood;
        this.exploitationImpact = impact;
        this.title = title;
        this.syntheticId = syntheticId;
        this.dataBreachProbability = dataBreachProbability;
        this.dataBreachTechnicalAssetIDs = dataBreachTechnicalAssetIDs;
        this.mostRelevantDataAssetId = relevantDataAssetId;
        this.mostRelevantTechnicalAssetId = relevantTechnicalAssetId;
        this.mostRelevantTrustBoundaryId = relevantTrustBoundaryId;
        this.mostRelevantSharedRuntimeId = relevantSharedRuntimeId;
        this.mostRelevantCommunicationLinkId = relevantCommunicationLinkId;
    }

     // Get the full category details (requires modelState.parsedModelRoot)
     getCategory(): RiskCategory | undefined {
        return modelState.parsedModelRoot?.individualRiskCategories[this.categoryId];
    }

    // Get tracking info (requires modelState.parsedModelRoot)
    getRiskTracking(): RiskTracking | undefined {
        return modelState.parsedModelRoot?.riskTracking[this.syntheticId];
    }

     getRiskTrackingStatusDefaultingUnchecked(): RiskStatus {
        return this.getRiskTracking()?.status ?? RiskStatus.Unchecked;
    }

     isRiskTracked(): boolean {
        return !!modelState.parsedModelRoot?.riskTracking[this.syntheticId];
    }

    // Method to create a shallow clone (deep copy for category is handled in Go version, maybe less critical here if category is looked up)
    clone(): Risk {
         // Create a new Risk instance with the same properties
         return new Risk(
             this.categoryId,
             this.severity,
             this.exploitationLikelihood,
             this.exploitationImpact,
             this.title,
             this.syntheticId, // Note: Cloning might require generating a NEW synthetic ID if it's meant to be a distinct instance
             this.dataBreachProbability,
             [...this.dataBreachTechnicalAssetIDs], // Shallow copy array
             this.mostRelevantDataAssetId,
             this.mostRelevantTechnicalAssetId,
             this.mostRelevantTrustBoundaryId,
             this.mostRelevantSharedRuntimeId,
             this.mostRelevantCommunicationLinkId
         );
    }

    // Structure for Marshaling (closer to Go's RiskForMarshaling)
    // This isn't strictly needed if direct serialization of Risk class is acceptable
    // but provided for closer parity.
    toJSON(): object {
        const category = this.getCategory();
        return {
            category: category ? { // Marshal category details if found
                id: category.id,
                title: category.title,
                description: category.description,
                impact: category.impact,
                asvs: category.asvs,
                cheat_sheet: category.cheatSheet,
                action: category.action,
                mitigation: category.mitigation,
                check: category.check,
                detection_logic: category.detectionLogic,
                risk_assessment: category.riskAssessment,
                false_positives: category.falsePositives,
                function: category.function,
                stride: category.stride,
                model_failure_possible_reason: category.modelFailurePossibleReason,
                cwe: category.cwe,
            } : this.categoryId, // Fallback to just ID if category not found
            risk_status: this.getRiskTrackingStatusDefaultingUnchecked(),
            severity: this.severity,
            exploitation_likelihood: this.exploitationLikelihood,
            exploitation_impact: this.exploitationImpact,
            title: this.title,
            synthetic_id: this.syntheticId,
            most_relevant_data_asset: this.mostRelevantDataAssetId,
            most_relevant_technical_asset: this.mostRelevantTechnicalAssetId,
            most_relevant_trust_boundary: this.mostRelevantTrustBoundaryId,
            most_relevant_shared_runtime: this.mostRelevantSharedRuntimeId,
            most_relevant_communication_link: this.mostRelevantCommunicationLinkId,
            data_breach_probability: this.dataBreachProbability,
            data_breach_technical_assets: this.dataBreachTechnicalAssetIDs,
        };
    }
}


export interface RiskTracking {
    syntheticRiskId: string; // Link back to the Risk
    justification: string;
    ticket: string;
    checkedBy: string;
    status: RiskStatus;
    date: Date; // Use Date object
}

export interface ParsedModel {
    author: Author;
    title: string;
    date: Date;
    managementSummaryComment: string;
    businessOverview: Overview;
    technicalOverview: Overview;
    businessCriticality: Criticality;
    securityRequirements: Record<string, string>;
    questions: Record<string, string>;
    abuseCases: Record<string, string>;
    tagsAvailable: string[];
    dataAssets: Record<string, DataAsset>;
    technicalAssets: Record<string, TechnicalAsset>;
    trustBoundaries: Record<string, TrustBoundary>;
    sharedRuntimes: Record<string, SharedRuntime>;
    individualRiskCategories: Record<string, RiskCategory>; // Parsed categories
    riskTracking: Record<string, RiskTracking>; // Keyed by synthetic risk ID
    diagramTweakNodesep: number;
    diagramTweakRanksep: number;
    diagramTweakEdgeLayout: string;
    diagramTweakSuppressEdgeLabels: boolean;
    diagramTweakLayoutLeftToRight: boolean;
    diagramTweakInvisibleConnectionsBetweenAssets: string[];
    diagramTweakSameRankAssets: string[];
}

// === Model Macros Stuff ===

export interface MacroDetails {
	id: string;
    title: string;
    description: string;
}

export interface MacroQuestion {
	id: string; // Empty string means no more questions
    title: string;
    description: string;
	possibleAnswers?: string[];
	multiSelect: boolean;
	defaultAnswer: string;
}

export const NO_MORE_QUESTIONS_ID = "";

export function noMoreQuestions(): MacroQuestion {
	return {
		id: NO_MORE_QUESTIONS_ID,
		title:           "",
		description:     "",
		possibleAnswers: undefined,
		multiSelect:     false,
		defaultAnswer:   "",
	};
}

export function isNoMoreQuestions(question: MacroQuestion): boolean {
	return question.id === NO_MORE_QUESTIONS_ID;
}

export function isMacroQuestionValueConstrained(question: MacroQuestion): boolean {
	return !!question.possibleAnswers && question.possibleAnswers.length > 0;
}

export function isMacroQuestionMatchingValueConstraint(question: MacroQuestion, answer: string): boolean {
    if (isMacroQuestionValueConstrained(question)) {
        const lowerAnswer = answer.toLowerCase();
		return question.possibleAnswers!.some(val => val.toLowerCase() === lowerAnswer);
	}
	return true; // Not constrained, so any answer matches
}


// === Sorting Functions ===

export function getSortedTechnicalAssetIDs(): string[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    return Object.keys(modelState.parsedModelRoot.technicalAssets).sort();
}

export function getTagsActuallyUsed(): string[] {
    if (!modelState.parsedModelRoot?.tagsAvailable) return [];
    return modelState.parsedModelRoot.tagsAvailable.filter(tag =>
        getTechnicalAssetsTaggedWithAny(tag).length > 0 ||
        getCommunicationLinksTaggedWithAny(tag).length > 0 ||
        getDataAssetsTaggedWithAny(tag).length > 0 ||
        getTrustBoundariesTaggedWithAny(tag).length > 0 ||
        getSharedRuntimesTaggedWithAny(tag).length > 0
    );
}

export function getSortedKeysOfIndividualRiskCategories(): string[] {
    if (!modelState.parsedModelRoot?.individualRiskCategories) return [];
    return Object.keys(modelState.parsedModelRoot.individualRiskCategories).sort();
}

export function getSortedKeysOfSecurityRequirements(): string[] {
     if (!modelState.parsedModelRoot?.securityRequirements) return [];
    return Object.keys(modelState.parsedModelRoot.securityRequirements).sort();
}

export function getSortedKeysOfAbuseCases(): string[] {
    if (!modelState.parsedModelRoot?.abuseCases) return [];
    return Object.keys(modelState.parsedModelRoot.abuseCases).sort();
}

export function getSortedKeysOfQuestions(): string[] {
    if (!modelState.parsedModelRoot?.questions) return [];
    return Object.keys(modelState.parsedModelRoot.questions).sort();
}

export function getSortedKeysOfDataAssets(): string[] {
     if (!modelState.parsedModelRoot?.dataAssets) return [];
    return Object.keys(modelState.parsedModelRoot.dataAssets).sort();
}

export function getSortedKeysOfTechnicalAssets(): string[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    return Object.keys(modelState.parsedModelRoot.technicalAssets).sort();
}

export function getSortedKeysOfTrustBoundaries(): string[] {
     if (!modelState.parsedModelRoot?.trustBoundaries) return [];
    return Object.keys(modelState.parsedModelRoot.trustBoundaries).sort();
}

export function getSortedKeysOfSharedRuntime(): string[] {
    if (!modelState.parsedModelRoot?.sharedRuntimes) return [];
    return Object.keys(modelState.parsedModelRoot.sharedRuntimes).sort();
}


// --- Get Assets/Links/Etc by Tag ---

export function getTechnicalAssetsTaggedWithAny(...tags: string[]): TechnicalAsset[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    return Object.values(modelState.parsedModelRoot.technicalAssets)
           .filter(asset => asset.isTaggedWithAny(...tags));
}

export function getCommunicationLinksTaggedWithAny(...tags: string[]): CommunicationLink[] {
     if (!modelState.communicationLinks) return [];
    return Object.values(modelState.communicationLinks)
           .filter(link => link.isTaggedWithAny(...tags));
}

export function getDataAssetsTaggedWithAny(...tags: string[]): DataAsset[] {
     if (!modelState.parsedModelRoot?.dataAssets) return [];
    return Object.values(modelState.parsedModelRoot.dataAssets)
           .filter(asset => asset.isTaggedWithAny(...tags));
}

export function getTrustBoundariesTaggedWithAny(...tags: string[]): TrustBoundary[] {
    if (!modelState.parsedModelRoot?.trustBoundaries) return [];
    return Object.values(modelState.parsedModelRoot.trustBoundaries)
           .filter(boundary => boundary.isTaggedWithAny(...tags));
}

export function getSharedRuntimesTaggedWithAny(...tags: string[]): SharedRuntime[] {
    if (!modelState.parsedModelRoot?.sharedRuntimes) return [];
    return Object.values(modelState.parsedModelRoot.sharedRuntimes)
           .filter(runtime => runtime.isTaggedWithAny(...tags));
}

// --- Sort Implementations (Comparison Functions) ---

export function sortByTechnicalAssetTitle(a: TechnicalAsset, b: TechnicalAsset): number {
    return a.title.localeCompare(b.title);
}

export function sortByDataAssetTitle(a: DataAsset, b: DataAsset): number {
    return a.title.localeCompare(b.title);
}

export function sortByTrustBoundaryTitle(a: TrustBoundary, b: TrustBoundary): number {
    return a.title.localeCompare(b.title);
}

export function sortBySharedRuntimeTitle(a: SharedRuntime, b: SharedRuntime): number {
    return a.title.localeCompare(b.title);
}

export function sortByTechnicalCommunicationLinkTitle(a: CommunicationLink, b: CommunicationLink): number {
    // Assuming title is descriptive enough for sorting; adjust if ID or other props are better
    return a.title.localeCompare(b.title);
}
export function sortByTechnicalCommunicationLinkId(a: CommunicationLink, b: CommunicationLink): number {
    return a.id.localeCompare(b.id);
}

export function sortByTechnicalAssetRiskSeverityAndTitleStillAtRisk(a: TechnicalAsset, b: TechnicalAsset): number {
    // Handle OutOfScope first
    if (a.outOfScope && !b.outOfScope) return 1; // a comes after b
    if (!a.outOfScope && b.outOfScope) return -1; // a comes before b
    if (a.outOfScope && b.outOfScope) return sortByTechnicalAssetTitle(a, b); // Sort by title if both out of scope

    const risksLeft = reduceToOnlyStillAtRisk(a.getGeneratedRisks());
    const risksRight = reduceToOnlyStillAtRisk(b.getGeneratedRisks());
    const highestSeverityLeft = getHighestSeverityStillAtRisk(risksLeft);
    const highestSeverityRight = getHighestSeverityStillAtRisk(risksRight);

    // Compare severity levels (higher severity comes first)
    // Enum string comparison works if order is correct (Critical > High > ...)
    if (highestSeverityLeft !== highestSeverityRight) {
        return highestSeverityRight.localeCompare(highestSeverityLeft); // Reversed compare for descending
    }

    // If severity is the same, handle cases where one has risks and the other doesn't
    if (risksLeft.length > 0 && risksRight.length === 0) return -1; // a (with risks) comes before b (no risks)
    if (risksLeft.length === 0 && risksRight.length > 0) return 1; // a (no risks) comes after b (with risks)

    // If severity and risk presence are the same, sort by title
    return sortByTechnicalAssetTitle(a, b);
}


export function sortByTechnicalAssetRAAAndTitle(a: TechnicalAsset, b: TechnicalAsset): number {
    if (a.raa !== b.raa) {
        return b.raa - a.raa; // Higher RAA comes first
    }
    return sortByTechnicalAssetTitle(a, b);
}

export function sortByDataAssetDataBreachProbabilityAndTitleStillAtRisk(a: DataAsset, b: DataAsset): number {
     const probLeft = a.getIdentifiedDataBreachProbabilityStillAtRisk();
     const probRight = b.getIdentifiedDataBreachProbabilityStillAtRisk();
     const risksLeft = a.getIdentifiedDataBreachProbabilityRisksStillAtRisk();
     const risksRight = b.getIdentifiedDataBreachProbabilityRisksStillAtRisk();

     // Compare probability (higher comes first)
     // Enum string comparison works if order is correct (Probable > Possible > ...)
     if (probLeft !== probRight) {
         return probRight.localeCompare(probLeft); // Reversed compare for descending
     }

      // If probability is the same, handle cases where one has risks and the other doesn't
     if (risksLeft.length > 0 && risksRight.length === 0) return -1; // a (with risks) comes before b (no risks)
     if (risksLeft.length === 0 && risksRight.length > 0) return 1; // a (no risks) comes after b (with risks)

     // If probability and risk presence are the same, sort by title
     return sortByDataAssetTitle(a, b);
}

export function sortByDataAssetDataBreachProbabilityAndTitle(a: DataAsset, b: DataAsset): number {
    // NOTE: Go code uses the StillAtRisk sort logic here too. Replicating that.
    // If a different sort is needed for ALL probabilities, implement it separately.
     return sortByDataAssetDataBreachProbabilityAndTitleStillAtRisk(a, b);
}

export function sortByRiskSeverity(a: Risk, b: Risk): number {
     // Compare severity (higher first)
     if (a.severity !== b.severity) {
         return b.severity.localeCompare(a.severity); // Reversed for descending
     }

     // Compare status (lower status index first - Unchecked < InDiscussion < ...)
     const statusLeft = a.getRiskTrackingStatusDefaultingUnchecked();
     const statusRight = b.getRiskTrackingStatusDefaultingUnchecked();
     if (statusLeft !== statusRight) {
          // Need a way to compare enum order numerically or define order explicitly
          const statusOrder = Object.values(RiskStatus);
          return statusOrder.indexOf(statusLeft) - statusOrder.indexOf(statusRight);
     }

      // Compare impact (higher first)
      if (a.exploitationImpact !== b.exploitationImpact) {
         return getRiskExploitationImpactWeight(b.exploitationImpact) - getRiskExploitationImpactWeight(a.exploitationImpact);
     }

      // Compare likelihood (higher first)
      if (a.exploitationLikelihood !== b.exploitationLikelihood) {
          return getRiskExploitationLikelihoodWeight(b.exploitationLikelihood) - getRiskExploitationLikelihoodWeight(a.exploitationLikelihood);
      }

     // Compare title (alphabetical)
     return a.title.localeCompare(b.title);
}

export function sortByRiskCategoryTitle(a: RiskCategory, b: RiskCategory): number {
    return a.title.localeCompare(b.title);
}

export function sortByRiskCategoryHighestContainingRiskSeveritySortStillAtRisk(a: RiskCategory, b: RiskCategory): number {
    const risksLeft = reduceToOnlyStillAtRisk(modelState.generatedRisksByCategory.get(a) || []);
    const risksRight = reduceToOnlyStillAtRisk(modelState.generatedRisksByCategory.get(b) || []);
    const highestLeft = getHighestSeverityStillAtRisk(risksLeft);
    const highestRight = getHighestSeverityStillAtRisk(risksRight);

    if (highestLeft !== highestRight) {
        return highestRight.localeCompare(highestLeft); // Descending severity
    }

    if (risksLeft.length > 0 && risksRight.length === 0) return -1;
    if (risksLeft.length === 0 && risksRight.length > 0) return 1;

    return sortByRiskCategoryTitle(a, b);
}


// --- Get Sorted Asset Collections ---

export function getSortedTechnicalAssetsByTitle(): TechnicalAsset[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.technicalAssets);
    assets.sort(sortByTechnicalAssetTitle);
    return assets;
}

export function getSortedDataAssetsByTitle(): DataAsset[] {
     if (!modelState.parsedModelRoot?.dataAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.dataAssets);
    assets.sort(sortByDataAssetTitle);
    return assets;
}

export function getSortedTrustBoundariesByTitle(): TrustBoundary[] {
    if (!modelState.parsedModelRoot?.trustBoundaries) return [];
    const boundaries = Object.values(modelState.parsedModelRoot.trustBoundaries);
    boundaries.sort(sortByTrustBoundaryTitle);
    return boundaries;
}

export function getSortedSharedRuntimesByTitle(): SharedRuntime[] {
     if (!modelState.parsedModelRoot?.sharedRuntimes) return [];
    const runtimes = Object.values(modelState.parsedModelRoot.sharedRuntimes);
    runtimes.sort(sortBySharedRuntimeTitle);
    return runtimes;
}


export function getSortedTechnicalAssetsByRiskSeverityAndTitle(): TechnicalAsset[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.technicalAssets);
    // The Go code uses the "StillAtRisk" sorting logic here.
    assets.sort(sortByTechnicalAssetRiskSeverityAndTitleStillAtRisk);
    return assets;
}


export function getSortedTechnicalAssetsByRAAAndTitle(): TechnicalAsset[] {
     if (!modelState.parsedModelRoot?.technicalAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.technicalAssets);
    assets.sort(sortByTechnicalAssetRAAAndTitle);
    return assets;
}

export function getSortedDataAssetsByDataBreachProbabilityAndTitleStillAtRisk(): DataAsset[] {
    if (!modelState.parsedModelRoot?.dataAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.dataAssets);
    assets.sort(sortByDataAssetDataBreachProbabilityAndTitleStillAtRisk);
    return assets;
}

export function getSortedDataAssetsByDataBreachProbabilityAndTitle(): DataAsset[] {
    // Go code uses StillAtRisk logic here too
     if (!modelState.parsedModelRoot?.dataAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.dataAssets);
    assets.sort(sortByDataAssetDataBreachProbabilityAndTitle); // Uses the same comparison fn as StillAtRisk version
    return assets;
}

export function getOutOfScopeTechnicalAssets(): TechnicalAsset[] {
     if (!modelState.parsedModelRoot?.technicalAssets) return [];
    const assets = Object.values(modelState.parsedModelRoot.technicalAssets)
           .filter(asset => asset.outOfScope);
    assets.sort(sortByTechnicalAssetTitle);
    return assets;
}

export function getInScopeTechnicalAssets(): TechnicalAsset[] {
    if (!modelState.parsedModelRoot?.technicalAssets) return [];
    return Object.values(modelState.parsedModelRoot.technicalAssets)
           .filter(asset => !asset.outOfScope);
}

export function getQuestionsUnanswered(): number {
    if (!modelState.parsedModelRoot?.questions) return 0;
    return Object.values(modelState.parsedModelRoot.questions)
           .filter(answer => !answer?.trim())
           .length;
}


// === Risk Calculation and Filtering ===

export function CalculateSeverity(likelihood: RiskExploitationLikelihood, impact: RiskExploitationImpact): RiskSeverity {
    const result = getRiskExploitationLikelihoodWeight(likelihood) * getRiskExploitationImpactWeight(impact);
    if (result <= 1) return RiskSeverity.Low;
    if (result <= 3) return RiskSeverity.Medium;
    if (result <= 8) return RiskSeverity.Elevated;
    if (result <= 12) return RiskSeverity.High;
    return RiskSeverity.Critical;
}

export function getSortedRiskCategories(): RiskCategory[] {
    const categories = Array.from(modelState.generatedRisksByCategory.keys());
    categories.sort(sortByRiskCategoryHighestContainingRiskSeveritySortStillAtRisk);
    return categories;
}

export function getSortedRisksOfCategory(category: RiskCategory): Risk[] {
    const risks = modelState.generatedRisksByCategory.get(category) || [];
    // Create a copy before sorting to avoid modifying the original map entry
    const sortedRisks = [...risks];
    sortedRisks.sort(sortByRiskSeverity);
    return sortedRisks;
}

export function getTotalRiskCount(): number {
    let count = 0;
    for (const risks of modelState.generatedRisksByCategory.values()) {
        count += risks.length;
    }
    return count;
    // Alternative using the bySyntheticId map:
    // return Object.keys(modelState.generatedRisksBySyntheticId).length;
}

export function getAllRisks(): Risk[] {
    // Use the synthetic ID map for a flat list
    return Object.values(modelState.generatedRisksBySyntheticId);
}

export function flattenRiskMap(risksByCat: Map<RiskCategory, Risk[]>): Risk[] {
    const result: Risk[] = [];
    for (const risks of risksByCat.values()) {
        result.push(...risks);
    }
    return result;
}

// --- Filtering Functions ---

export function filterRisks(predicate: (risk: Risk) => boolean): Risk[] {
    return getAllRisks().filter(predicate);
}

export function getFilteredByStillAtRisk(): Risk[] {
    return filterRisks(risk => isRiskStatusStillAtRisk(risk.getRiskTrackingStatusDefaultingUnchecked()));
}

export function getFilteredByRiskTrackingUnchecked(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Unchecked);
}
export function getFilteredByRiskTrackingInDiscussion(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.InDiscussion);
}
export function getFilteredByRiskTrackingAccepted(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Accepted);
}
export function getFilteredByRiskTrackingInProgress(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.InProgress);
}
export function getFilteredByRiskTrackingMitigated(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Mitigated);
}
export function getFilteredByRiskTrackingFalsePositive(): Risk[] {
     return filterRisks(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.FalsePositive);
}

export function getFilteredByOnlyCriticalRisks(): Risk[] {
    return filterRisks(risk => risk.severity === RiskSeverity.Critical);
}
export function getFilteredByOnlyHighRisks(): Risk[] {
     return filterRisks(risk => risk.severity === RiskSeverity.High);
}
export function getFilteredByOnlyElevatedRisks(): Risk[] {
     return filterRisks(risk => risk.severity === RiskSeverity.Elevated);
}
export function getFilteredByOnlyMediumRisks(): Risk[] {
     return filterRisks(risk => risk.severity === RiskSeverity.Medium);
}
export function getFilteredByOnlyLowRisks(): Risk[] {
     return filterRisks(risk => risk.severity === RiskSeverity.Low);
}

export function getFilteredByOnlyBusinessSide(): Risk[] {
    return filterRisks(risk => risk.getCategory()?.function === RiskFunction.BusinessSide);
}
export function getFilteredByOnlyArchitecture(): Risk[] {
     return filterRisks(risk => risk.getCategory()?.function === RiskFunction.Architecture);
}
export function getFilteredByOnlyDevelopment(): Risk[] {
     return filterRisks(risk => risk.getCategory()?.function === RiskFunction.Development);
}
export function getFilteredByOnlyOperation(): Risk[] {
     return filterRisks(risk => risk.getCategory()?.function === RiskFunction.Operations);
}

export function filterByModelFailures(risksByCat: Map<RiskCategory, Risk[]>): Map<RiskCategory, Risk[]> {
    const result = new Map<RiskCategory, Risk[]>();
    for (const [riskCat, risks] of risksByCat.entries()) {
        if (riskCat.modelFailurePossibleReason) {
            result.set(riskCat, risks);
        }
    }
    return result;
}


// --- Reducing Functions (operate on existing slices) ---

export function reduceToOnlyStillAtRisk(risks: Risk[]): Risk[] {
    return risks.filter(risk => isRiskStatusStillAtRisk(risk.getRiskTrackingStatusDefaultingUnchecked()));
}

export function reduceToOnlyRiskTrackingUnchecked(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Unchecked);
}
export function reduceToOnlyRiskTrackingInDiscussion(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.InDiscussion);
}
export function reduceToOnlyRiskTrackingAccepted(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Accepted);
}
export function reduceToOnlyRiskTrackingInProgress(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.InProgress);
}
export function reduceToOnlyRiskTrackingMitigated(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.Mitigated);
}
export function reduceToOnlyRiskTrackingFalsePositive(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.getRiskTrackingStatusDefaultingUnchecked() === RiskStatus.FalsePositive);
}

export function reduceToOnlyCriticalRisk(risks: Risk[]): Risk[] {
     return risks.filter(risk => risk.severity === RiskSeverity.Critical);
}
export function reduceToOnlyHighRisk(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.severity === RiskSeverity.High);
}
export function reduceToOnlyElevatedRisk(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.severity === RiskSeverity.Elevated);
}
export function reduceToOnlyMediumRisk(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.severity === RiskSeverity.Medium);
}
export function reduceToOnlyLowRisk(risks: Risk[]): Risk[] {
    return risks.filter(risk => risk.severity === RiskSeverity.Low);
}


// --- Risk Statistics ---

export interface RiskStatistics {
    // risks[severity][status] = count
    risks: Record<RiskSeverity, Record<RiskStatus, number>>;
}

export function getOverallRiskStatistics(): RiskStatistics {
    const stats: RiskStatistics = {
        risks: {
            [RiskSeverity.Critical]: { [RiskStatus.Unchecked]: 0, [RiskStatus.InDiscussion]: 0, [RiskStatus.Accepted]: 0, [RiskStatus.InProgress]: 0, [RiskStatus.Mitigated]: 0, [RiskStatus.FalsePositive]: 0 },
            [RiskSeverity.High]: { [RiskStatus.Unchecked]: 0, [RiskStatus.InDiscussion]: 0, [RiskStatus.Accepted]: 0, [RiskStatus.InProgress]: 0, [RiskStatus.Mitigated]: 0, [RiskStatus.FalsePositive]: 0 },
            [RiskSeverity.Elevated]: { [RiskStatus.Unchecked]: 0, [RiskStatus.InDiscussion]: 0, [RiskStatus.Accepted]: 0, [RiskStatus.InProgress]: 0, [RiskStatus.Mitigated]: 0, [RiskStatus.FalsePositive]: 0 },
            [RiskSeverity.Medium]: { [RiskStatus.Unchecked]: 0, [RiskStatus.InDiscussion]: 0, [RiskStatus.Accepted]: 0, [RiskStatus.InProgress]: 0, [RiskStatus.Mitigated]: 0, [RiskStatus.FalsePositive]: 0 },
            [RiskSeverity.Low]: { [RiskStatus.Unchecked]: 0, [RiskStatus.InDiscussion]: 0, [RiskStatus.Accepted]: 0, [RiskStatus.InProgress]: 0, [RiskStatus.Mitigated]: 0, [RiskStatus.FalsePositive]: 0 },
        },
    };

    for (const risk of getAllRisks()) {
        const status = risk.getRiskTrackingStatusDefaultingUnchecked();
        if (stats.risks[risk.severity]) { // Type guard
            stats.risks[risk.severity][status]++;
        }
    }
    return stats;
}


// --- Risk Utility Functions ---

export function getHighestSeverity(risks: Risk[]): RiskSeverity {
    if (risks.length === 0) return RiskSeverity.Low; // Or perhaps handle differently?
    // Sort severity values based on desired order
    const severityOrder = [RiskSeverity.Low, RiskSeverity.Medium, RiskSeverity.Elevated, RiskSeverity.High, RiskSeverity.Critical];
    let highest = RiskSeverity.Low;
    for (const risk of risks) {
        if (severityOrder.indexOf(risk.severity) > severityOrder.indexOf(highest)) {
            highest = risk.severity;
        }
    }
    return highest;
}

export function getHighestSeverityStillAtRisk(risks: Risk[]): RiskSeverity {
     return getHighestSeverity(reduceToOnlyStillAtRisk(risks));
}

export function getHighestExploitationLikelihood(risks: Risk[]): RiskExploitationLikelihood {
    if (risks.length === 0) return RiskExploitationLikelihood.Unlikely;
    const likelihoodOrder = [RiskExploitationLikelihood.Unlikely, RiskExploitationLikelihood.Likely, RiskExploitationLikelihood.VeryLikely, RiskExploitationLikelihood.Frequent];
    let highest = RiskExploitationLikelihood.Unlikely;
    for (const risk of risks) {
        if (likelihoodOrder.indexOf(risk.exploitationLikelihood) > likelihoodOrder.indexOf(highest)) {
            highest = risk.exploitationLikelihood;
        }
    }
    return highest;
}

export function getHighestExploitationImpact(risks: Risk[]): RiskExploitationImpact {
    if (risks.length === 0) return RiskExploitationImpact.Low;
    const impactOrder = [RiskExploitationImpact.Low, RiskExploitationImpact.Medium, RiskExploitationImpact.High, RiskExploitationImpact.VeryHigh];
    let highest = RiskExploitationImpact.Low;
    for (const risk of risks) {
        if (impactOrder.indexOf(risk.exploitationImpact) > impactOrder.indexOf(highest)) {
            highest = risk.exploitationImpact;
        }
    }
    return highest;
}

// --- Misc ---
// Function to check if two assets share the same top-level network trust boundary
export function isSharingSameParentTrustBoundary(assetA: TechnicalAsset, assetB: TechnicalAsset): boolean {
    const boundaryA = assetA.getTrustBoundary();
    const boundaryB = assetB.getTrustBoundary();

    if (!boundaryA && !boundaryB) return true; // Both outside any boundary
    if (!boundaryA || !boundaryB) return false; // One inside, one outside

    if (boundaryA.id === boundaryB.id) return true; // Directly in the same boundary

    // Check ancestor boundaries
    const ancestorsA = new Set(boundaryA.getAllParentTrustBoundaryIDs());
    const ancestorsB = boundaryB.getAllParentTrustBoundaryIDs();

    return ancestorsB.some(idB => ancestorsA.has(idB));
}
