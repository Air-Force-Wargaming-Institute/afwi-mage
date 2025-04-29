from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Model for listing wargames (basic info)
class WargameBuildListItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    createdAt: Optional[str] = None
    modifiedAt: Optional[str] = None

# Full model reflecting the data structure in wargame-build-plan.md
class GeneralConfig(BaseModel):
    supportingDocuments: List[Dict[str, Any]] = []

class DiplomacyConfig(BaseModel):
    objectives: List[str] = []
    posture: str = ''
    keyInitiatives: str = ''
    prioritiesMatrix: str = ''
    redLines: str = ''
    treatyObligations: str = ''
    diplomaticResources: str = ''
    specialConsiderations: str = ''

class InformationConfig(BaseModel):
    objectives: List[str] = []
    propagandaThemes: str = ''
    cyberTargets: str = ''
    strategicCommunicationFramework: str = ''
    intelCollectionPriorities: str = ''
    disinformationResilience: str = ''
    mediaLandscapeControl: str = ''
    specialConsiderations: str = ''

class DomainPosture(BaseModel):
    land: str = ''
    sea: str = ''
    air: str = ''
    cyber: str = ''
    space: str = ''

class MilitaryConfig(BaseModel):
    objectives: List[str] = []
    alertLevel: str = ''
    doctrine: str = '' # Text summary
    doctrineFiles: List[Dict[str, Any]] = []
    forceStructureReadiness: str = ''
    escalationLadder: str = ''
    decisionMakingProtocol: str = ''
    forceProjectionCapabilities: str = ''
    defenseIndustrialCapacity: str = ''
    domainPosture: DomainPosture = Field(default_factory=DomainPosture)
    specialConsiderations: str = ''

class EconomicConfig(BaseModel):
    objectives: List[str] = []
    tradeFocus: str = ''
    resourceDeps: str = ''
    sanctionsPolicy: str = ''
    economicWarfareTools: str = ''
    criticalInfrastructureResilience: str = ''
    strategicResourceAccess: str = ''
    financialSystemLeverage: str = ''
    technologyTransferControls: str = ''
    specialConsiderations: str = ''

class EnabledFieldsConfig(BaseModel):
    supportingDocuments: Optional[bool] = True

class EnabledFieldsDiplomacy(BaseModel):
    objectives: Optional[bool] = True
    posture: Optional[bool] = True
    keyInitiatives: Optional[bool] = True
    prioritiesMatrix: Optional[bool] = True
    redLines: Optional[bool] = True
    treatyObligations: Optional[bool] = True
    diplomaticResources: Optional[bool] = True
    specialConsiderations: Optional[bool] = True

class EnabledFieldsInformation(BaseModel):
    objectives: Optional[bool] = True
    propagandaThemes: Optional[bool] = True
    cyberTargets: Optional[bool] = True
    strategicCommunicationFramework: Optional[bool] = True
    intelCollectionPriorities: Optional[bool] = True
    disinformationResilience: Optional[bool] = True
    mediaLandscapeControl: Optional[bool] = True
    specialConsiderations: Optional[bool] = True

class EnabledFieldsDomainPosture(BaseModel):
    land: Optional[bool] = True
    sea: Optional[bool] = True
    air: Optional[bool] = True
    cyber: Optional[bool] = True
    space: Optional[bool] = True

class EnabledFieldsMilitary(BaseModel):
    objectives: Optional[bool] = True
    alertLevel: Optional[bool] = True
    doctrine: Optional[bool] = True
    forceStructureReadiness: Optional[bool] = True
    escalationLadder: Optional[bool] = True
    decisionMakingProtocol: Optional[bool] = True
    forceProjectionCapabilities: Optional[bool] = True
    defenseIndustrialCapacity: Optional[bool] = True
    domainPosture: EnabledFieldsDomainPosture = Field(default_factory=EnabledFieldsDomainPosture)
    specialConsiderations: Optional[bool] = True

class EnabledFieldsEconomic(BaseModel):
    objectives: Optional[bool] = True
    tradeFocus: Optional[bool] = True
    resourceDeps: Optional[bool] = True
    sanctionsPolicy: Optional[bool] = True
    economicWarfareTools: Optional[bool] = True
    criticalInfrastructureResilience: Optional[bool] = True
    strategicResourceAccess: Optional[bool] = True
    financialSystemLeverage: Optional[bool] = True
    technologyTransferControls: Optional[bool] = True
    specialConsiderations: Optional[bool] = True

class EnabledFields(BaseModel):
    generalConfig: EnabledFieldsConfig = Field(default_factory=EnabledFieldsConfig)
    diplomacy: EnabledFieldsDiplomacy = Field(default_factory=EnabledFieldsDiplomacy)
    information: EnabledFieldsInformation = Field(default_factory=EnabledFieldsInformation)
    military: EnabledFieldsMilitary = Field(default_factory=EnabledFieldsMilitary)
    economic: EnabledFieldsEconomic = Field(default_factory=EnabledFieldsEconomic)

class ConfigData(BaseModel):
    generalConfig: GeneralConfig = Field(default_factory=GeneralConfig)
    diplomacy: DiplomacyConfig = Field(default_factory=DiplomacyConfig)
    information: InformationConfig = Field(default_factory=InformationConfig)
    military: MilitaryConfig = Field(default_factory=MilitaryConfig)
    economic: EconomicConfig = Field(default_factory=EconomicConfig)
    approvedFields: Dict[str, bool] = {}
    enabledFields: EnabledFields = Field(default_factory=EnabledFields)

class ActivatedEntity(BaseModel):
    entityId: str
    entityName: str
    entityType: str # "nation" | "organization"
    isConfigured: bool = False
    isCustom: bool = False
    configData: ConfigData = Field(default_factory=ConfigData)

class CustomEntity(BaseModel):
    entityId: str
    entityName: str
    entityType: str # "nation" | "organization"
    isCustom: bool = True

class NationRelationship(BaseModel):
    type: str # "ally" | "partner" | "neutral" | "adversary" | "enemy"
    notes: Optional[str] = None

class ConflictTheaterSide(BaseModel):
    id: str # "side1" | "side2"
    leadNationId: Optional[str] = None
    supportingNationIds: List[str] = []
    colorCode: Optional[str] = None

class ConflictTheater(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    sides: List[ConflictTheaterSide] = []

class WargameBuild(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    designer: Optional[str] = None
    securityClassification: Optional[str] = None
    roadToWar: Optional[str] = None
    researchObjectives: List[str] = []
    numberOfIterations: Optional[int] = 5
    numberOfMoves: Optional[int] = 10
    timeHorizon: Optional[str] = None
    wargameStartDate: Optional[str] = None
    selectedVectorstore: Optional[str] = None
    selectedDatabase: Optional[str] = None
    approvedFields: Dict[str, bool] = {}
    activatedEntities: List[ActivatedEntity] = []
    customEntities: List[CustomEntity] = []
    nationRelationships: Dict[str, NationRelationship] = {}
    conflictTheaters: List[ConflictTheater] = []
    createdAt: Optional[str] = None
    modifiedAt: Optional[str] = None
    lastExecuted: Optional[str] = None

# Model for the request body when creating a wargame (minimal)
class WargameCreatePayload(BaseModel):
    name: str # Ensure name is required
    description: Optional[str] = None
    # Allow potentially passing other initial fields if needed
    # class Config:
    #     extra = 'allow' 