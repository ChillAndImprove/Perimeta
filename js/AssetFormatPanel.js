import {BaseFormatPanel} from './BaseFormatPanel.js';
import  {
    createSection,
    createCustomOption,
    setCustomOption,
    restartWasm,
    generateUniquekeyData
}
from './Utils.js';

export const AssetFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(AssetFormatPanel, BaseFormatPanel);
/**
 *
 */
AssetFormatPanel.prototype.defaultStrokeColor = "black";

/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  this.container.appendChild(this.addThreagileMenu(this.createPanel()));
};
AssetFormatPanel.prototype.addThreagileMenu = function (container) {
  let self = this;
  
  let main = document.createElement("div");
  main.id = 'threagile-asset-main-container'; 
  var typeProperties = {
    key: {
      description: "key",
      type: "button",
      section: "General",
      tooltip: " ",
      defaultValue: "<Your Title>",
    },
    
    id: {
      description: "Id",
      type: "button",
      section: "General",
      tooltip: "All id attribute values must be unique ",
      defaultValue: "<Your ID>",
    },
    description: {
      description: "Description",
      type: "button",
      section: "General",
      tooltip: "Provide a brief description of the technology asset. ",
      defaultValue:
        "Tech Asset",
    },
    type: {
      description: "Type",
      defaultValue: 0,
      type: "select",
      options: [
        {
          group: "Category 1",
          options: ["external-entity", "process", "datastore"],
          defaultValue: "external-entity",
        },
      ],
      section: "Properties",
      tooltip:
        "Select the 'Type' for your threat model component. 'external-entity' represents an outside actor or system, 'process' indicates an operational component, and 'datastore' refers to data storage within the system.",
    },
    technology: {
      description: "Technologies",
      defaultValue: 0,
      type: "select",
      defaultValue: "unknown-technology",
      options: [
        {
          group: "Unknown Technology",
          options: ["unknown-technology"],
        },
        {
          group: "Client System",
          options: ["client-system", "desktop", "mobile-app", "devops-client"],
        },
        {
          group: "Web-related",
          options: [
            "browser",
            "web-server",
            "web-application",
            "reverse-proxy",
            "load-balancer",
          ],
        },
        {
          group: "Development-related",
          options: [
            "code-inspection-platform",
            "build-pipeline",
            "artifact-registry",
            "sourcecode-repository",
          ],
        },
        {
          group: "Infrastructure-related",
          options: [
            "file-server",
            "local-file-system",
            "database",
            "ldap-server",
            "container-platform",
            "mainframe",
            "block-storage",
          ],
        },
        {
          group: "Web Services",
          options: ["web-service-rest", "web-service-soap"],
        },
        {
          group: "Content Management",
          options: ["cms"],
        },
        {
          group: "Enterprise related",
          options: ["erp"],
        },
        {
          group: "Security-related",
          options: [
            "identity-provider",
            "identity-store-ldap",
            "identity-store-database",
            "vault",
            "hsm",
            "waf",
            "ids",
            "ips",
          ],
        },
        {
          group: "Tools and Utilities",
          options: ["tool", "cli"],
        },
        {
          group: "Message and Processing",
          options: [
            "message-queue",
            "stream-processing",
            "batch-processing",
            "event-listener",
          ],
        },
        {
          group: "Networking:",
          options: ["gateway", "service-mesh"],
        },
        {
          group: "Date-related",
          options: ["data-lake"],
        },
        {
          group: "Reporting and Analytics",
          options: ["report-engine", "ai"],
        },
        {
          group: "Monitoring",
          options: ["monitoring"],
        },
        {
          group: "Search-related",
          options: ["search-index", "search-engine"],
        },
        {
          group: "Other",
          options: [
            "application-server",
            "ejb",
            "service-registry",
            "task",
            "function",
            "iot-device",
            "data-lake",
            "mail-server",
            "scheduler",
            "library",
          ],
        },
      ],
      section: "Properties",
      tooltip:
        "The 'Technologies' field allows you to classify your components based on the underlying technologies ",
    },
    size: {
      description: "Size",
      type: "select",
      defaultValue: "system",
      options: [
        {
          group: "Category 1",
          options: ["system", "service", "application", "component"],
        },
      ],
      section: "Properties",
      tooltip:
        "The 'Size' option classifies the component based on its scope in your system hierarchy - 'system' for a whole system, 'service' for an individual service, 'application' for a specific application, and 'component' for smaller, constituent parts.",
    },
    machine: {
      description: "Machine",
      type: "select",
      defaultValue: 0,
      options: [
        {
          group: "Category 1",
          options: ["physical", "virtual", "container", "serverless"],
        },
      ],
      section: "Properties",
      tooltip:
        "The 'Machine' option indicates the infrastructure type of your component - 'physical' for traditional hardware, 'virtual' for virtualized environments, 'container' for containerized applications, and 'serverless' for serverless architectures.",
    },
    encryption: {
      description: "Encryption",
      type: "select",
      defaultValue: 0,
      options: [
        {
          group: "Category 1",
          options: [
            "none",
            "data-with-symmetric-shared-key",
            "data-with-asymmetric-shared-key",
            "data-with-enduser-individual-key",
          ],
        },
      ],
      section: "Properties",
      tooltip:
        "The 'Encryption' option specifies the type of encryption used for your data - 'none' for no encryption, 'data-with-symmetric-shared-key' for symmetric encryption, 'data-with-asymmetric-shared-key' for asymmetric encryption, and 'data-with-enduser-individual-key' for encryption with unique keys per end user.",
    },
    owner: {
      description: "Owner",
      type: "button",
      section: "Properties",
      defaultValue: "<Captain Awesome>",
      tooltip:
        "The 'Owner' field designates the individual or the entity that has administrative authority or control over the component.",
    },
    internet: {
      defaultValue: "false",
      description: "Internet",
      type: "checkbox",
      section: "Properties",
      tooltip:
        "The 'Internet' field indicates whether the component is connected to the internet or not.",
    },
    confidentiality: {
      section: "CIA",
      description: "Confidentility",
      type: "select",
      options: [
        {
          group: "Category 1",
          options: [
            "public",
            "internal",
            "restricted",
            "confidential",
            "strictly-confidential",
          ],
        },
      ],
      defaultValue: 0,
      tooltip:
        "Confidentiality: refers to the practice of keeping sensitive information private and secure from unauthorized access. This ensures that only authorized individuals can view the sensitive data.",
    },
    integrity: {
      section: "CIA",
      description: "Integritity",
      type: "select",
      options: [
        {
          group: "Category 1",
          options: [
            "archive",
            "operational",
            "important",
            "critical",
            "mission-critical",
          ],
        },
      ],
      defaultValue: 0,
      tooltip:
        "Integrity: refers to the assurance that the information is trustworthy and accurate. It ensures that the data has not been improperly modified, whether intentionally or accidentally, and remains consistent and accurate in its intended lifecycle.",
    },
    availability: {
      section: "CIA",
      description: "Availiablity",
      type: "select",
      options: [
        {
          group: "Category 1",
          options: [
            "archive",
            "operational",
            "important",
            "critical",
            "mission-critical",
          ],
        },
      ],
      defaultValue: 0,
      tooltip:
        "Availability: refers to the guarantee that information and resources are accessible to authorized individuals when needed. This ensures that systems, applications, and data are always up and running, reducing downtime and providing reliable access to necessary information.",
    },
    usage: {
      section: "Utilization",
      description: "Usage",
      type: "select",
      options: [
        {
          group: "Category 1",
          options: ["business", "devops"],
        },
      ],
      defaultValue: 0,
      tooltip: "Select the main usage category of this resource.",
    },

    used_as_client_by_human: {
      defaultValue: "false",
      description: "Used as client by human",
      type: "checkbox",
      section: "Utilization",
      tooltip: "Check this if the resource is directly used by a human client.",
    },
    multi_tenant: {
      defaultValue: "false",
      description: "Multi tenant",
      type: "checkbox",
      section: "Utilization",
      tooltip:
        "Check this if the resource is designed to serve multiple users in a multi-tenant environment.",
    },
    redundant: {
      defaultValue: "false",
      description: "redundant",
      type: "checkbox",
      section: "Utilization",
      tooltip:
        "Check this if the resource has redundancy features to prevent failure or data loss.",
    },
    custom_developed_parts: {
      defaultValue: "false",
      description: "Custom Developed parts",
      type: "checkbox",
      section: "Utilization",
      tooltip:
        "Check this if the resource includes parts that were custom developed.",
    },
    out_of_scope: {
      defaultValue: "false",
      description: "Out of Scope",
      type: "checkbox",
      section: "Utilization",
      tooltip:
        "Check this if the resource is out of the scope of your threat model analysis.",
    },
    justification_out_of_scope: {
      description: "Justification out of Scope",
      type: "button",
      section: "Utilization",
      defaultValue:
        "The 'XYZ' component is considered out of scope for the current threat model analysis due to its limited interaction with critical system functions. Additionally, it has recently undergone a comprehensive security audit and vulnerabilities identified have been addressed, reducing its overall risk level.",
      tooltip:
        "Provide justification if the resource is marked as out of scope.",
   },
    tags: {
      description: "Tags",
      type: "array", // Special type for Tagify handling
      section: "Properties", // Or "General" or a new "Categorization" section
      tooltip: "Add tags to categorize this technical asset. New tags will be added to the global list.",
      defaultValue: [],
    },

  };
  let customListener = {
    install: function (apply) {
      this.listener = function () {};
    },
    destroy: function () {},
  };

  let sections = {};
  for (let property in typeProperties) {
    let sectionName = typeProperties[property].section;
    if (!sections[sectionName]) {
      sections[sectionName] = createSection(sectionName);
      let sectionIdName = sectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); // Sanitize
      sections[sectionName].id = `threagile-asset-section-${sectionIdName}`;
    }
    let typeItem = document.createElement("li");
    typeItem.style.display = "flex";
    typeItem.style.alignItems = "baseline";
    typeItem.style.marginBottom = "8px";
    typeItem.id = `threagile-asset-item-${property}`; // <<< ID for the LI

    let propertyName = document.createElement("span");
    propertyName.innerHTML = property;
    propertyName.style.width = "100px";
    propertyName.style.marginRight = "10px";
    propertyName.id = `threagile-asset-item-span-${property}`; // <<< ID for the LI
    let propertyType = typeProperties[property].type;

    if (propertyType === "select") {
      const propertySelect = property;
      typeItem.appendChild(propertyName);
      let selectContainer = document.createElement("div");
      selectContainer.style.display = "flex";
      selectContainer.style.alignItems = "center";
      selectContainer.style.marginLeft = "auto";
      let selectDropdown = document.createElement("select");
      selectDropdown.id = `threagile-asset-select-${property}`;
      selectDropdown.style.width = "100px";
      selectDropdown.title = typeProperties[property].tooltip;
      selectContainer.appendChild(selectDropdown);

      let optionGroups = typeProperties[property].options;
      for (var i = 0; i < optionGroups.length; i++) {
        let optgroup = document.createElement("optgroup");
        optgroup.label = optionGroups[i].group;
        let options = optionGroups[i].options;
        for (let j = 0; j < options.length; j++) {
          let option = document.createElement("option");
          option.value = options[j];
          option.text = options[j];
          optgroup.appendChild(option);
        }
        selectDropdown.appendChild(optgroup);
      }


      if(self.editorUi.editor.graph.getSelectionCell().technicalAsset !== undefined)
     {
      let assetId = self.editorUi.editor.graph.getSelectionCell().technicalAsset.key;
      let assetInAst = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId]);

      if (assetInAst && self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId,propertySelect])) {
          selectDropdown.value = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId,propertySelect]);
      } 
     } 
    

let createChangeListener = function (selectDropdown, propertySelect) {
    return function (evt) {
        var vals = selectDropdown.value;

        if (vals != null) {
            var assetId = self.editorUi.editor.graph.getSelectionCell().technicalAsset;
            if (assetId) {
                let assetPath = ["technical_assets", assetId.key, propertySelect];
                self.editorUi.editor.graph.model.threagile.setIn(assetPath, selectDropdown.value);
            }
        }
        mxEvent.consume(evt);
    };
}; 
      mxEvent.addListener(
        selectDropdown,
        "change",
        createChangeListener(selectDropdown, propertySelect)
      );
      typeItem.appendChild(selectContainer);
      sections[sectionName].appendChild(typeItem);
    } else if (propertyType === "checkbox") {
     let optionElement = this.createOption(
         typeProperties[property].description, // Use description for label text
         createCustomOption(self, property),
         setCustomOption(self, property),
         customListener
     );
     let checkboxInput = optionElement.querySelector('input[type="checkbox"]');
     if (checkboxInput) {
         checkboxInput.id = `threagile-asset-checkbox-${property}`; // <<< ADDED ID
         checkboxInput.title = typeProperties[property].tooltip;

         // Optionally associate the label/span if needed for accessibility/testing
         let labelSpan = optionElement.querySelector('span');
         if (labelSpan) {
            labelSpan.setAttribute('for', checkboxInput.id); // Works best if span is changed to <label> in createOption
         }
     }
      sections[sectionName].appendChild(optionElement);
    } else if (propertyType === "button") {
    let button = mxUtils.button(
    property,
    mxUtils.bind(this, function (evt) {
       
      let assetId = self.editorUi.editor.graph.getSelectionCell().technicalAsset;
      let assetInAst = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId.key]);
      let assetInAstValue = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId.key,property]);

      let dataValue = assetInAst && assetInAstValue ? assetInAstValue : typeProperties[property].defaultValue;

      if (property == "key")
        {
        dataValue = self.editorUi.editor.graph.getSelectionCell().technicalAsset.key;          
        }
       
        var dlg = new TextareaDialog(
            this.editorUi,
            property + ":",
            dataValue,
            function (newValue) {
                if (newValue != null) {
                    if (assetId) {
                            var adjustedValue = newValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                            let model = self.editorUi.editor.graph.model;
                            model.beginUpdate();
                            let cell = self.editorUi.editor.graph.getSelectionCell();

                            try {
                              if (property === 'id') {
                                var validIdSyntax = /^[a-zA-Z0-9\-]+$/;
                                if (!validIdSyntax.test(newValue)) {
                                    alert('Invalid ID format. Only alphanumeric characters and dashes are allowed.');
                                    return;
                                  }
                                  

                            }
                            else if(property== "key")
                              {
                                restartWasm();
                                let oldassetPath = ["technical_assets", assetId.key];
                                let cell = self.editorUi.editor.graph.getSelectionCell();
                                let edges = self.editorUi.editor.graph.getEdges(cell, null, false, true, true);
                                let object = JSON.parse(JSON.stringify(self.editorUi.editor.graph.model.threagile.getIn(oldassetPath)));
                                self.editorUi.editor.graph.model.threagile.deleteIn(oldassetPath);
                                cell.technicalAsset.key=adjustedValue;



                                let newassetPath = ["technical_assets", assetId.key];
                                self.editorUi.editor.graph.model.threagile.setIn(newassetPath, object);
                                cell.value= adjustedValue;
                                let restoreIntegrity = self.editorUi.editor.graph.model.threagile.toString();
                                self.editorUi.editor.graph.model.threagile =  YAML.parseDocument(restoreIntegrity);
                                edges.forEach(function (edge) {
                                let newassetPathCom = ["technical_assets", assetId.key, "communication_links", edge.communicationAssetKey];
                                    edge.communicationAsset= self.editorUi.editor.graph.model.threagile.getIn(newassetPathCom);

                                });


                              }else{
                                let assetPath = ["technical_assets", assetId.key,property];
                                self.editorUi.editor.graph.model.threagile.setIn(assetPath, adjustedValue);
                              }
                              
                                self.editorUi.editor.graph.refresh(cell);

                                self.editorUi.editor.graph.refresh();
                            } finally {
                                model.endUpdate();
                            }
                    }
                }
            },
            null,
            null,
            400,
            220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);
        dlg.init();
                    try {
                        if (dlg.textarea) {
                            // Add a dynamic ID based on the property being edited
                            let textareaId = `threagile-dialog-${property}-textarea`;
                            dlg.textarea.id = textareaId;
                            console.log(`Added ID to textarea: ${textareaId}`);
                        } else {
                            console.warn(`Could not find dlg.textarea for property '${property}'.`);
                        }
                    } catch (e) {
                         console.error("Error adding ID to dialog textarea:", e);
                    }
                    // --- *** END TEXTAREA ID *** ---


                    // --- *** ADD IDs TO DIALOG BUTTONS *** ---
                    try {
                        // ... (existing code to find buttons and add IDs) ...
                        let buttonContainer = dlg.container.querySelector('.geDialogButtons');
                        let buttons = buttonContainer ? buttonContainer.querySelectorAll('button') : dlg.container.querySelectorAll('button');
                        if (buttons && buttons.length > 0) {
                            const applyText = mxResources.get('apply') || 'Apply';
                            const cancelText = mxResources.get('cancel') || 'Cancel';
                            let applyFound = false;
                            let cancelFound = false;
                            buttons.forEach(btn => {
                                if (!applyFound && (btn.textContent.trim() === applyText || btn.textContent.trim() === (mxResources.get('ok') || 'OK'))) {
                                    btn.id = `threagile-dialog-${property}-apply-button`;
                                    applyFound = true;
                                } else if (!cancelFound && btn.textContent.trim() === cancelText) {
                                    btn.id = `threagile-dialog-${property}-cancel-button`;
                                    cancelFound = true;
                                }
                            });
                            // Fallback logic if text match failed...
                        } else {
                             console.warn("Could not find buttons in TextareaDialog container for property:", property);
                        }
                    } catch (e) {
                        console.error("Error adding IDs to dialog buttons:", e);
                    }
        if(property == "id")
          {
          dlg.textarea.readOnly = true;
          dlg.textarea.style.backgroundColor = "#f3f3f3"; // Light grey background
          dlg.textarea.style.color = "#686868"; // Dimmed text color
          dlg.textarea.style.border = "1px solid #ccc"; // Less pronounced border
        }
    })
); 
      button.id = `threagile-asset-button-${property}`;
      button.title = typeProperties[property].tooltip;
      button.style.width = "200px";
      typeItem.appendChild(button);
      sections[sectionName].appendChild(typeItem);
    }
else if (property === "tags" && propertyType === "array") {
      // Specific handling for asset tags
      typeItem.appendChild(propertyName); // Add "Tags" label

      // 1. Create the input element
      let tagInputElement = document.createElement("input");
      tagInputElement.placeholder = "Add tags...";
      // Assign ID and styles before appending if needed, or after, doesn't strictly matter for this fix
      // but good practice to configure before appending if possible or immediately after.

      // 2. Append the input element to its parent list item FIRST
      typeItem.appendChild(tagInputElement);

      // Now proceed with getting assetKey and configuring the input
      let currentSelectedCell = self.editorUi.editor.graph.getSelectionCell();
      let assetKey = currentSelectedCell.technicalAsset?.key;

      if (!assetKey) {
        console.warn("No technical asset selected, cannot initialize tags input for 'tags'.");
        // tagInputElement will remain empty or you can disable it
        let placeholder = document.createElement('span');
        placeholder.textContent = ' (No asset selected)';
        placeholder.style.fontStyle = 'italic';
        placeholder.style.color = '#888';
        // typeItem.appendChild(placeholder); // Already appended tagInputElement, perhaps add to its side
        tagInputElement.style.display = 'none'; // Hide the input
        typeItem.appendChild(placeholder);
        sections[sectionName].appendChild(typeItem);
        continue;
      }

      // Configure the input element that's already in the DOM fragment (typeItem)
      tagInputElement.id = `threagile-asset-tags-input-${assetKey}`; // Unique ID for the input
      tagInputElement.style.flexGrow = "1";


      // Load initial tags for the current asset
      let currentAssetTagsNode = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetKey, "tags"]);
      let initialTagValues = [];
      if (currentAssetTagsNode) {
        initialTagValues = typeof currentAssetTagsNode.toJSON === 'function' ? currentAssetTagsNode.toJSON() : Array.from(currentAssetTagsNode);
      }
      tagInputElement.value = initialTagValues.join(','); // Tagify can take a comma-separated string

      // Load available tags for whitelist/suggestions
      let availableTagsData = self.editorUi.editor.graph.model.threagile.getIn(["tags_available"]);
      let availableTagsWhitelist = [];
      if (availableTagsData) {
        availableTagsWhitelist = typeof availableTagsData.toJSON === 'function' ? availableTagsData.toJSON() : Array.from(availableTagsData);
      }

      // 3. Initialize Tagify on the input element (which is now parented)
      let assetTagify = new Tagify(tagInputElement, {
        whitelist: availableTagsWhitelist,
        enforceWhitelist: false, // Allow creating new tags
        dropdown: {
          maxItems: 100,
          classname: "tags-look",
          enabled: 0, // Show suggestions on input/focus
          closeOnSelect: true,
        },
      });

      // Event handlers remain the same as they correctly use `assetKey` from closure
      function onAddAssetTag(e) {
        const model = self.editorUi.editor.graph.model.threagile;
        const newTagValue = e.detail.data.value;

        // Update global tags_available
        let tagsAvailableNode = model.getIn(["tags_available"]);
        let tagsAvailableSet = new Set(tagsAvailableNode && typeof tagsAvailableNode.toJSON === 'function' ? tagsAvailableNode.toJSON() : (Array.isArray(tagsAvailableNode) ? tagsAvailableNode : []));
        if (!tagsAvailableSet.has(newTagValue)) {
          tagsAvailableSet.add(newTagValue);
          model.setIn(["tags_available"], Array.from(tagsAvailableSet));
          restartWasm(); // If global list change requires this
        }

        // Update asset-specific tags
        let assetTagsNode = model.getIn(["technical_assets", assetKey, "tags"]);
        let assetTagsSet = new Set(assetTagsNode && typeof assetTagsNode.toJSON === 'function' ? assetTagsNode.toJSON() : (Array.isArray(assetTagsNode) ? assetTagsNode : []));
        assetTagsSet.add(newTagValue);
        model.setIn(["technical_assets", assetKey, "tags"], Array.from(assetTagsSet));
      }

      function onRemoveAssetTag(e) {
        const model = self.editorUi.editor.graph.model.threagile;
        const removedTagValue = e.detail.data.value;
        let assetTagsNode = model.getIn(["technical_assets", assetKey, "tags"]);
        let assetTagsSet = new Set(assetTagsNode && typeof assetTagsNode.toJSON === 'function' ? assetTagsNode.toJSON() : (Array.isArray(assetTagsNode) ? assetTagsNode : []));
        if (assetTagsSet.delete(removedTagValue)) {
          model.setIn(["technical_assets", assetKey, "tags"], Array.from(assetTagsSet));
        }
      }

      assetTagify.on('add', onAddAssetTag).on('remove', onRemoveAssetTag);

      // typeItem is already built with propertyName and tagInputElement
      sections[sectionName].appendChild(typeItem);
    }
}
{
}
  let selects = sections.CIA.querySelectorAll("select");
  selects.forEach(function (select) {
    switch (select.value) {
      case "public":
      case "archive":
        select.style.backgroundColor = "#CCFFCC";
        break;
      case "internal":
      case "operational":
        select.style.backgroundColor = "#99FF99";
        break;
      case "restricted":
      case "important":
        select.style.backgroundColor = "#FFCCCC";
        break;
      case "confidential":
      case "critical":
        select.style.backgroundColor = "#FF9999";
        break;
      case "strictly-confidential":
      case "mission-critical":
        select.style.backgroundColor = "#FF6666";
        break;
      default:
        select.style.backgroundColor = "";
    }

    select.addEventListener("change", function () {
      switch (this.value) {
        case "public":
        case "archive":
          this.style.backgroundColor = "#CCFFCC";
          break;
        case "internal":
        case "operational":
          this.style.backgroundColor = "#99FF99";
          break;
        case "restricted":
        case "important":
          this.style.backgroundColor = "#FFCCCC";
          break;
        case "confidential":
        case "critical":
          this.style.backgroundColor = "#FF9999";
          break;
        case "strictly-confidential":
        case "mission-critical":
          this.style.backgroundColor = "#FF6666";
          break;
        default:
          this.style.backgroundColor = "";
      }
    });
    let options = select.querySelectorAll("option");
    options.forEach(function (option) {
      switch (option.value) {
        case "public":
        case "archive":
          option.style.backgroundColor = "#CCFFCC";
          break;
        case "internal":
        case "operational":
          option.style.backgroundColor = "#99FF99";
          break;
        case "restricted":
        case "important":
          option.style.backgroundColor = "#FFCCCC";
          break;
        case "confidential":
        case "critical":
          option.style.backgroundColor = "#FF9999";
          break;
        case "strictly-confidential":
        case "mission-critical":
          option.style.backgroundColor = "#FF6666";
          break;
      }
    });
  });
  for (let sectionName in sections) {
    main.appendChild(sections[sectionName]);
  }
  // Add Cell Value
  {
    let cells = self.editorUi.editor.graph.getSelectionCells();
    let cell = cells && cells.length > 0 ? cells[0] : null;
    if (!cell.getValue()) {
      let model = self.editorUi.editor.graph.model;
      model.beginUpdate();
      try {
        let newStyle = cell.getStyle() + "verticalAlign=top";
        cell.setStyle(newStyle);
        model.setValue(cell, typeProperties["id"].defaultValue);
        self.editorUi.editor.graph.refresh(cell);
        self.editorUi.editor.graph.refresh();
      } finally {
        model.endUpdate();
      }
    }
  }

  let idsData = [];
  // Iterate over the Map and create table rows
  let diagramData = self.editorUi.editor.graph.model.threagile.getIn(["data_assets"]);
  
  if (diagramData) {
    diagramData = self.editorUi.editor.graph.model.threagile.getIn([ "data_assets"]).toJSON();
    Object.keys(diagramData).forEach(function(key) {
      idsData.push(key); 
  });
  }

let assetId = self.editorUi.editor.graph.getSelectionCell().technicalAsset;

console.log(assetId);
let inputElement = document.createElement("input");
inputElement.placeholder = "Data Processed";

let sentSection = createSection("Data Processed:");

sentSection.appendChild(document.createElement("br"));

if(assetId)
{
  let arr = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId.key, "data_assets_processed"]);
  // diagramData has multiple objects those have ids, arr is an arry of ids find the keys of diagramData from the arr ids
  
  if(arr)
    {
      if (typeof arr.toJSON === 'function') {
        arr = arr.toJSON();
    } 
    let matchingKeys = Object.keys(diagramData)
    .filter(key => arr.includes(diagramData[key].id))  // Filter keys where their object's id is in arr
    .map(key => key);  // Map to the keys themselves
    inputElement.value = matchingKeys;
  }
}


//
sentSection.appendChild(inputElement);

let tagify = new Tagify(inputElement, {
  whitelist: idsData,
  editTags: false,
  enforceWhitelist: true,
  dropdown: {
    maxItems: 100, 
    classname: "tags-look", 
    enabled: 0, 
    closeOnSelect: true, 
  },
});


tagify.on('add', onAddTagPro)
      .on('remove', onRemoveTagPro);
main.appendChild(sentSection);

let inputElement2 = document.createElement("input");


let receivedSecion = createSection("Data Stored:");
receivedSecion.id = 'threagile-asset-section-data-stored'; // ID for the section

receivedSecion.appendChild(document.createElement("br"));

if(assetId)
  {
    let arr = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", assetId.key, "data_assets_stored"]);
   
    // diagramData has multiple objects those have ids, arr is an arry of ids find the keys of diagramData from the arr ids
    if(arr)
      {
    
        if (typeof arr.toJSON === 'function') {
          arr = arr.toJSON();
      } 
        let matchingKeys = Object.keys(diagramData)
      .filter(key => arr.includes(diagramData[key].id))  // Filter keys where their object's id is in arr
      .map(key => key);  // Map to the keys themselves
      inputElement2.value = matchingKeys;
    }
  }


receivedSecion.appendChild(inputElement2);

let tagify2 = new Tagify(inputElement2, {
  whitelist: idsData,
  enforceWhitelist: true,
  editTags: false,

  dropdown: {
    maxItems: 100, 
    classname: "tags-look", 
    enabled: 0, 
    closeOnSelect: true, 
  },
});
tagify2.on('add', onAddTagStored)      .on('focus', onTagifyFocusBlur)

      .on('remove', onRemoveTagStored);

//Tagify      
function onAddTagPro(e){
  let proAssetID = self.editorUi.editor.graph.getSelectionCell().technicalAsset;;
  const model = self.editorUi.editor.graph.model.threagile;
  let dataId = model.getIn(["data_assets", e.detail.data.value, "id"]);

  let dataAssetsProcessed = model.getIn(["technical_assets", proAssetID.key, "data_assets_processed"]) || [];
  if (typeof dataAssetsProcessed.toJSON === 'function') {
    dataAssetsProcessed= dataAssetsProcessed.toJSON();
  }
  if (!Array.isArray(dataAssetsProcessed)) {
    dataAssetsProcessed = dataAssetsProcessed ? [dataAssetsProcessed] : [];
  }
  dataAssetsProcessed.push(dataId);
  model.setIn(["technical_assets", proAssetID.key, "data_assets_processed"], dataAssetsProcessed);
}
//Tagify
function onRemoveTagPro(e){
  let proassetKey = self.editorUi.editor.graph.getSelectionCell().technicalAsset;;

  const model = self.editorUi.editor.graph.model.threagile;
  let dataId = model.getIn(["data_assets", e.detail.data.value, "id"]);
  let dataAssetsProcessed = model.getIn(["technical_assets", proassetKey.key, "data_assets_processed"]) || [];
  if (typeof dataAssetsProcessed.toJSON === 'function') {
    dataAssetsProcessed= dataAssetsProcessed.toJSON();
  }
  if (!Array.isArray(dataAssetsProcessed)) {
    dataAssetsProcessed = dataAssetsProcessed ? [dataAssetsProcessed] : [];
  }
  const index = dataAssetsProcessed.indexOf(dataId);
  if (index > -1) {
    dataAssetsProcessed.splice(index, 1);
  }
  model.setIn(["technical_assets", proassetKey.key, "data_assets_processed"], dataAssetsProcessed);
}
//Tagify2
function onRemoveTagStored(e) {
  let id = self.editorUi.editor.graph.getSelectionCell().technicalAsset;;

  const model = self.editorUi.editor.graph.model.threagile;
  let dataId = model.getIn(["data_assets", e.detail.data.value, "id"]);
  let dataAssetsStored = model.getIn(["technical_assets", id.key, "data_assets_stored"]) || [];
  if (typeof dataAssetsStored.toJSON === 'function') {
    dataAssetsStored= dataAssetsStored.toJSON();
  }
  
  if (!Array.isArray(dataAssetsStored)) {
    dataAssetsStored = dataAssetsStored ? [dataAssetsStored] : [];
  }
  const index = dataAssetsStored.indexOf(dataId);
  if (index > -1) {
    dataAssetsStored.splice(index, 1);
  }
  model.setIn(["technical_assets", id.key, "data_assets_stored"], dataAssetsStored);
}


//Tagify2
function onAddTagStored(e) {
  let id = self.editorUi.editor.graph.getSelectionCell().technicalAsset;;

  const model = self.editorUi.editor.graph.model.threagile;
  let dataId = model.getIn(["data_assets", e.detail.data.value, "id"]);
  let dataAssetsStored = model.getIn(["technical_assets", id.key, "data_assets_stored"]) || [];
  if (typeof dataAssetsStored.toJSON === 'function') {
    dataAssetsStored= dataAssetsStored.toJSON();
  }
  if (!Array.isArray(dataAssetsStored)) {
    dataAssetsStored = dataAssetsStored ? [dataAssetsStored] : [];
  }
  dataAssetsStored.push(dataId);
  model.setIn(["technical_assets", id.key, "data_assets_stored"], dataAssetsStored);
}
function onTagifyFocusBlur(e){
  console.log(e.type, "event fired")
}

main.appendChild(receivedSecion);
container.appendChild(main);

return container;
};
/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.addStroke = function (container) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var ss = this.format.getSelectionState();

  container.style.paddingTop = "4px";
  container.style.paddingBottom = "4px";
  container.style.whiteSpace = "normal";

  var colorPanel = document.createElement("div");
  colorPanel.style.fontWeight = "bold";

  if (!ss.stroke) {
    colorPanel.style.display = "none";
  }

  // Adds gradient direction option
  var styleSelect = document.createElement("select");
  styleSelect.style.position = "absolute";
  styleSelect.style.marginTop = "-2px";
  styleSelect.style.right = "72px";
  styleSelect.style.width = "80px";

  var styles = ["sharp", "rounded", "curved"];

  for (var i = 0; i < styles.length; i++) {
    var styleOption = document.createElement("option");
    styleOption.setAttribute("value", styles[i]);
    mxUtils.write(styleOption, mxResources.get(styles[i]));
    styleSelect.appendChild(styleOption);
  }

  mxEvent.addListener(styleSelect, "change", function (evt) {
    graph.getModel().beginUpdate();
    try {
      var keys = [mxConstants.STYLE_ROUNDED, mxConstants.STYLE_CURVED];
      // Default for rounded is 1
      var values = ["0", null];

      if (styleSelect.value == "rounded") {
        values = ["1", null];
      } else if (styleSelect.value == "curved") {
        values = [null, "1"];
      }

      for (var i = 0; i < keys.length; i++) {
        graph.setCellStyles(keys[i], values[i], graph.getSelectionCells());
      }

      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          keys,
          "values",
          values,
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }

    mxEvent.consume(evt);
  });

  // Stops events from bubbling to color option event handler
  mxEvent.addListener(styleSelect, "click", function (evt) {
    mxEvent.consume(evt);
  });

  var strokeKey =
    ss.style.shape == "image"
      ? mxConstants.STYLE_IMAGE_BORDER
      : mxConstants.STYLE_STROKECOLOR;
  var label =
    ss.style.shape == "image"
      ? mxResources.get("border")
      : mxResources.get("line");

  var defs =
    ss.vertices.length >= 1
      ? graph.stylesheet.getDefaultVertexStyle()
      : graph.stylesheet.getDefaultEdgeStyle();
  var lineColor = this.createCellColorOption(
    label,
    strokeKey,
    defs[strokeKey] != null ? defs[strokeKey] : "#000000",
    null,
    mxUtils.bind(this, function (color) {
      graph.updateCellStyles(strokeKey, color, graph.getSelectionCells());
    })
  );

  lineColor.appendChild(styleSelect);
  colorPanel.appendChild(lineColor);

  // Used if only edges selected
  var stylePanel = colorPanel.cloneNode(false);
  stylePanel.style.fontWeight = "normal";
  stylePanel.style.whiteSpace = "nowrap";
  stylePanel.style.position = "relative";
  stylePanel.style.paddingLeft = "16px";
  stylePanel.style.marginBottom = "2px";
  stylePanel.style.marginTop = "2px";
  stylePanel.className = "geToolbarContainer";

  var addItem = mxUtils.bind(
    this,
    function (menu, width, cssName, keys, values) {
      var item = this.editorUi.menus.styleChange(
        menu,
        "",
        keys,
        values,
        "geIcon",
        null
      );

      var pat = document.createElement("div");
      pat.style.width = width + "px";
      pat.style.height = "1px";
      pat.style.borderBottom = "1px " + cssName + " " + this.defaultStrokeColor;
      pat.style.paddingTop = "6px";

      item.firstChild.firstChild.style.padding = "0px 4px 0px 4px";
      item.firstChild.firstChild.style.width = width + "px";
      item.firstChild.firstChild.appendChild(pat);

      return item;
    }
  );

  var pattern = this.editorUi.toolbar.addMenuFunctionInContainer(
    stylePanel,
    "geSprite-orthogonal",
    mxResources.get("pattern"),
    false,
    mxUtils.bind(this, function (menu) {
      addItem(
        menu,
        75,
        "solid",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        [null, null]
      ).setAttribute("title", mxResources.get("solid"));
      addItem(
        menu,
        75,
        "dashed",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", null]
      ).setAttribute("title", mxResources.get("dashed"));
      addItem(
        menu,
        75,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 1"]
      ).setAttribute("title", mxResources.get("dotted") + " (1)");
      addItem(
        menu,
        75,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 2"]
      ).setAttribute("title", mxResources.get("dotted") + " (2)");
      addItem(
        menu,
        75,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 4"]
      ).setAttribute("title", mxResources.get("dotted") + " (3)");
    })
  );

  // Used for mixed selection (vertices and edges)
  var altStylePanel = stylePanel.cloneNode(false);

  var edgeShape = this.editorUi.toolbar.addMenuFunctionInContainer(
    altStylePanel,
    "geSprite-connection",
    mxResources.get("connection"),
    false,
    mxUtils.bind(this, function (menu) {
      this.editorUi.menus
        .styleChange(
          menu,
          "",
          [
            mxConstants.STYLE_SHAPE,
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE,
            "width",
          ],
          [null, null, null, null],
          "geIcon geSprite geSprite-connection",
          null,
          true
        )
        .setAttribute("title", mxResources.get("line"));
      this.editorUi.menus
        .styleChange(
          menu,
          "",
          [
            mxConstants.STYLE_SHAPE,
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE,
            "width",
          ],
          ["link", null, null, null],
          "geIcon geSprite geSprite-linkedge",
          null,
          true
        )
        .setAttribute("title", mxResources.get("link"));
      this.editorUi.menus
        .styleChange(
          menu,
          "",
          [
            mxConstants.STYLE_SHAPE,
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE,
            "width",
          ],
          ["flexArrow", null, null, null],
          "geIcon geSprite geSprite-arrow",
          null,
          true
        )
        .setAttribute("title", mxResources.get("arrow"));
      this.editorUi.menus
        .styleChange(
          menu,
          "",
          [
            mxConstants.STYLE_SHAPE,
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE,
            "width",
          ],
          ["arrow", null, null, null],
          "geIcon geSprite geSprite-simplearrow",
          null,
          true
        )
        .setAttribute("title", mxResources.get("simpleArrow"));
    })
  );

  var altPattern = this.editorUi.toolbar.addMenuFunctionInContainer(
    altStylePanel,
    "geSprite-orthogonal",
    mxResources.get("pattern"),
    false,
    mxUtils.bind(this, function (menu) {
      addItem(
        menu,
        33,
        "solid",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        [null, null]
      ).setAttribute("title", mxResources.get("solid"));
      addItem(
        menu,
        33,
        "dashed",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", null]
      ).setAttribute("title", mxResources.get("dashed"));
      addItem(
        menu,
        33,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 1"]
      ).setAttribute("title", mxResources.get("dotted") + " (1)");
      addItem(
        menu,
        33,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 2"]
      ).setAttribute("title", mxResources.get("dotted") + " (2)");
      addItem(
        menu,
        33,
        "dotted",
        [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
        ["1", "1 4"]
      ).setAttribute("title", mxResources.get("dotted") + " (3)");
    })
  );

  var stylePanel2 = stylePanel.cloneNode(false);

  // Stroke width
  var input = document.createElement("input");
  input.style.textAlign = "right";
  input.style.marginTop = "2px";
  input.style.width = "41px";
  input.setAttribute("title", mxResources.get("linewidth"));

  stylePanel.appendChild(input);

  var altInput = input.cloneNode(true);
  altStylePanel.appendChild(altInput);

  function update(evt) {
    // Maximum stroke width is 999
    var value = parseInt(input.value);
    value = Math.min(999, Math.max(1, isNaN(value) ? 1 : value));

    if (value != mxUtils.getValue(ss.style, mxConstants.STYLE_STROKEWIDTH, 1)) {
      graph.setCellStyles(
        mxConstants.STYLE_STROKEWIDTH,
        value,
        graph.getSelectionCells()
      );
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_STROKEWIDTH],
          "values",
          [value],
          "cells",
          graph.getSelectionCells()
        )
      );
    }

    input.value = value + " pt";
    mxEvent.consume(evt);
  }

  function altUpdate(evt) {
    // Maximum stroke width is 999
    var value = parseInt(altInput.value);
    value = Math.min(999, Math.max(1, isNaN(value) ? 1 : value));

    if (value != mxUtils.getValue(ss.style, mxConstants.STYLE_STROKEWIDTH, 1)) {
      graph.setCellStyles(
        mxConstants.STYLE_STROKEWIDTH,
        value,
        graph.getSelectionCells()
      );
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_STROKEWIDTH],
          "values",
          [value],
          "cells",
          graph.getSelectionCells()
        )
      );
    }

    altInput.value = value + " pt";
    mxEvent.consume(evt);
  }

  var stepper = this.createStepper(input, update, 1, 9);
  stepper.style.display = input.style.display;
  stepper.style.marginTop = "2px";
  stylePanel.appendChild(stepper);

  var altStepper = this.createStepper(altInput, altUpdate, 1, 9);
  altStepper.style.display = altInput.style.display;
  altStepper.style.marginTop = "2px";
  altStylePanel.appendChild(altStepper);

  if (!mxClient.IS_QUIRKS) {
    input.style.position = "absolute";
    input.style.height = "15px";
    input.style.left = "141px";
    stepper.style.left = "190px";

    altInput.style.position = "absolute";
    altInput.style.left = "141px";
    altInput.style.height = "15px";
    altStepper.style.left = "190px";
  } else {
    input.style.height = "17px";
    altInput.style.height = "17px";
  }

  mxEvent.addListener(input, "blur", update);
  mxEvent.addListener(input, "change", update);

  mxEvent.addListener(altInput, "blur", altUpdate);
  mxEvent.addListener(altInput, "change", altUpdate);

  if (mxClient.IS_QUIRKS) {
    mxUtils.br(stylePanel2);
    mxUtils.br(stylePanel2);
  }

  var edgeStyle = this.editorUi.toolbar.addMenuFunctionInContainer(
    stylePanel2,
    "geSprite-orthogonal",
    mxResources.get("waypoints"),
    false,
    mxUtils.bind(this, function (menu) {
      if (ss.style.shape != "arrow") {
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            [null, null, null],
            "geIcon geSprite geSprite-straight",
            null,
            true
          )
          .setAttribute("title", mxResources.get("straight"));
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["orthogonalEdgeStyle", null, null],
            "geIcon geSprite geSprite-orthogonal",
            null,
            true
          )
          .setAttribute("title", mxResources.get("orthogonal"));
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_ELBOW,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["elbowEdgeStyle", null, null, null],
            "geIcon geSprite geSprite-horizontalelbow",
            null,
            true
          )
          .setAttribute("title", mxResources.get("simple"));
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_ELBOW,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["elbowEdgeStyle", "vertical", null, null],
            "geIcon geSprite geSprite-verticalelbow",
            null,
            true
          )
          .setAttribute("title", mxResources.get("simple"));
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_ELBOW,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["isometricEdgeStyle", null, null, null],
            "geIcon geSprite geSprite-horizontalisometric",
            null,
            true
          )
          .setAttribute("title", mxResources.get("isometric"));
        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_ELBOW,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["isometricEdgeStyle", "vertical", null, null],
            "geIcon geSprite geSprite-verticalisometric",
            null,
            true
          )
          .setAttribute("title", mxResources.get("isometric"));

        if (ss.style.shape == "connector") {
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [
                mxConstants.STYLE_EDGE,
                mxConstants.STYLE_CURVED,
                mxConstants.STYLE_NOEDGESTYLE,
              ],
              ["orthogonalEdgeStyle", "1", null],
              "geIcon geSprite geSprite-curved",
              null,
              true
            )
            .setAttribute("title", mxResources.get("curved"));
        }

        this.editorUi.menus
          .edgeStyleChange(
            menu,
            "",
            [
              mxConstants.STYLE_EDGE,
              mxConstants.STYLE_CURVED,
              mxConstants.STYLE_NOEDGESTYLE,
            ],
            ["entityRelationEdgeStyle", null, null],
            "geIcon geSprite geSprite-entity",
            null,
            true
          )
          .setAttribute("title", mxResources.get("entityRelation"));
      }
    })
  );

  var lineStart = this.editorUi.toolbar.addMenuFunctionInContainer(
    stylePanel2,
    "geSprite-startclassic",
    mxResources.get("linestart"),
    false,
    mxUtils.bind(this, function (menu) {
      if (
        ss.style.shape == "connector" ||
        ss.style.shape == "flexArrow" ||
        ss.style.shape == "filledEdge"
      ) {
        var item = this.editorUi.menus.edgeStyleChange(
          menu,
          "",
          [mxConstants.STYLE_STARTARROW, "startFill"],
          [mxConstants.NONE, 0],
          "geIcon",
          null,
          false
        );
        item.setAttribute("title", mxResources.get("none"));
        item.firstChild.firstChild.innerHTML =
          '<font style="font-size:10px;">' +
          mxUtils.htmlEntities(mxResources.get("none")) +
          "</font>";

        if (ss.style.shape == "connector" || ss.style.shape == "filledEdge") {
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_CLASSIC, 1],
              "geIcon geSprite geSprite-startclassic",
              null,
              false
            )
            .setAttribute("title", mxResources.get("classic"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            [mxConstants.ARROW_CLASSIC_THIN, 1],
            "geIcon geSprite geSprite-startclassicthin",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_OPEN, 0],
              "geIcon geSprite geSprite-startopen",
              null,
              false
            )
            .setAttribute("title", mxResources.get("openArrow"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            [mxConstants.ARROW_OPEN_THIN, 0],
            "geIcon geSprite geSprite-startopenthin",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["openAsync", 0],
            "geIcon geSprite geSprite-startopenasync",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_BLOCK, 1],
              "geIcon geSprite geSprite-startblock",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            [mxConstants.ARROW_BLOCK_THIN, 1],
            "geIcon geSprite geSprite-startblockthin",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["async", 1],
            "geIcon geSprite geSprite-startasync",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_OVAL, 1],
              "geIcon geSprite geSprite-startoval",
              null,
              false
            )
            .setAttribute("title", mxResources.get("oval"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_DIAMOND, 1],
              "geIcon geSprite geSprite-startdiamond",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamond"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_DIAMOND_THIN, 1],
              "geIcon geSprite geSprite-startthindiamond",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamondThin"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_CLASSIC, 0],
              "geIcon geSprite geSprite-startclassictrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("classic"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            [mxConstants.ARROW_CLASSIC_THIN, 0],
            "geIcon geSprite geSprite-startclassicthintrans",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_BLOCK, 0],
              "geIcon geSprite geSprite-startblocktrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            [mxConstants.ARROW_BLOCK_THIN, 0],
            "geIcon geSprite geSprite-startblockthintrans",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["async", 0],
            "geIcon geSprite geSprite-startasynctrans",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_OVAL, 0],
              "geIcon geSprite geSprite-startovaltrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("oval"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_DIAMOND, 0],
              "geIcon geSprite geSprite-startdiamondtrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamond"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW, "startFill"],
              [mxConstants.ARROW_DIAMOND_THIN, 0],
              "geIcon geSprite geSprite-startthindiamondtrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamondThin"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["box", 0],
            "geIcon geSprite geSvgSprite geSprite-box",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["halfCircle", 0],
            "geIcon geSprite geSvgSprite geSprite-halfCircle",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["dash", 0],
            "geIcon geSprite geSprite-startdash",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["cross", 0],
            "geIcon geSprite geSprite-startcross",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["circlePlus", 0],
            "geIcon geSprite geSprite-startcircleplus",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["circle", 1],
            "geIcon geSprite geSprite-startcircle",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERone", 0],
            "geIcon geSprite geSprite-starterone",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERmandOne", 0],
            "geIcon geSprite geSprite-starteronetoone",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERmany", 0],
            "geIcon geSprite geSprite-startermany",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERoneToMany", 0],
            "geIcon geSprite geSprite-starteronetomany",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERzeroToOne", 1],
            "geIcon geSprite geSprite-starteroneopt",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_STARTARROW, "startFill"],
            ["ERzeroToMany", 1],
            "geIcon geSprite geSprite-startermanyopt",
            null,
            false
          );
        } else {
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_STARTARROW],
              [mxConstants.ARROW_BLOCK],
              "geIcon geSprite geSprite-startblocktrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
        }
      }
    })
  );

  var lineEnd = this.editorUi.toolbar.addMenuFunctionInContainer(
    stylePanel2,
    "geSprite-endclassic",
    mxResources.get("lineend"),
    false,
    mxUtils.bind(this, function (menu) {
      if (
        ss.style.shape == "connector" ||
        ss.style.shape == "flexArrow" ||
        ss.style.shape == "filledEdge"
      ) {
        var item = this.editorUi.menus.edgeStyleChange(
          menu,
          "",
          [mxConstants.STYLE_ENDARROW, "endFill"],
          [mxConstants.NONE, 0],
          "geIcon",
          null,
          false
        );
        item.setAttribute("title", mxResources.get("none"));
        item.firstChild.firstChild.innerHTML =
          '<font style="font-size:10px;">' +
          mxUtils.htmlEntities(mxResources.get("none")) +
          "</font>";

        if (ss.style.shape == "connector" || ss.style.shape == "filledEdge") {
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_CLASSIC, 1],
              "geIcon geSprite geSprite-endclassic",
              null,
              false
            )
            .setAttribute("title", mxResources.get("classic"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            [mxConstants.ARROW_CLASSIC_THIN, 1],
            "geIcon geSprite geSprite-endclassicthin",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_OPEN, 0],
              "geIcon geSprite geSprite-endopen",
              null,
              false
            )
            .setAttribute("title", mxResources.get("openArrow"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            [mxConstants.ARROW_OPEN_THIN, 0],
            "geIcon geSprite geSprite-endopenthin",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["openAsync", 0],
            "geIcon geSprite geSprite-endopenasync",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_BLOCK, 1],
              "geIcon geSprite geSprite-endblock",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            [mxConstants.ARROW_BLOCK_THIN, 1],
            "geIcon geSprite geSprite-endblockthin",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["async", 1],
            "geIcon geSprite geSprite-endasync",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_OVAL, 1],
              "geIcon geSprite geSprite-endoval",
              null,
              false
            )
            .setAttribute("title", mxResources.get("oval"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_DIAMOND, 1],
              "geIcon geSprite geSprite-enddiamond",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamond"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_DIAMOND_THIN, 1],
              "geIcon geSprite geSprite-endthindiamond",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamondThin"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_CLASSIC, 0],
              "geIcon geSprite geSprite-endclassictrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("classic"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            [mxConstants.ARROW_CLASSIC_THIN, 0],
            "geIcon geSprite geSprite-endclassicthintrans",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_BLOCK, 0],
              "geIcon geSprite geSprite-endblocktrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            [mxConstants.ARROW_BLOCK_THIN, 0],
            "geIcon geSprite geSprite-endblockthintrans",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["async", 0],
            "geIcon geSprite geSprite-endasynctrans",
            null,
            false
          );
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_OVAL, 0],
              "geIcon geSprite geSprite-endovaltrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("oval"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_DIAMOND, 0],
              "geIcon geSprite geSprite-enddiamondtrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamond"));
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW, "endFill"],
              [mxConstants.ARROW_DIAMOND_THIN, 0],
              "geIcon geSprite geSprite-endthindiamondtrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("diamondThin"));
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["box", 0],
            "geIcon geSprite geSvgSprite geFlipSprite geSprite-box",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["halfCircle", 0],
            "geIcon geSprite geSvgSprite geFlipSprite geSprite-halfCircle",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["dash", 0],
            "geIcon geSprite geSprite-enddash",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["cross", 0],
            "geIcon geSprite geSprite-endcross",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["circlePlus", 0],
            "geIcon geSprite geSprite-endcircleplus",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["circle", 1],
            "geIcon geSprite geSprite-endcircle",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERone", 0],
            "geIcon geSprite geSprite-enderone",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERmandOne", 0],
            "geIcon geSprite geSprite-enderonetoone",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERmany", 0],
            "geIcon geSprite geSprite-endermany",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERoneToMany", 0],
            "geIcon geSprite geSprite-enderonetomany",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERzeroToOne", 1],
            "geIcon geSprite geSprite-enderoneopt",
            null,
            false
          );
          this.editorUi.menus.edgeStyleChange(
            menu,
            "",
            [mxConstants.STYLE_ENDARROW, "endFill"],
            ["ERzeroToMany", 1],
            "geIcon geSprite geSprite-endermanyopt",
            null,
            false
          );
        } else {
          this.editorUi.menus
            .edgeStyleChange(
              menu,
              "",
              [mxConstants.STYLE_ENDARROW],
              [mxConstants.ARROW_BLOCK],
              "geIcon geSprite geSprite-endblocktrans",
              null,
              false
            )
            .setAttribute("title", mxResources.get("block"));
        }
      }
    })
  );

  this.addArrow(edgeShape, 8);
  this.addArrow(edgeStyle);
  this.addArrow(lineStart);
  this.addArrow(lineEnd);

  var symbol = this.addArrow(pattern, 9);
  symbol.className = "geIcon";
  symbol.style.width = "auto";

  var altSymbol = this.addArrow(altPattern, 9);
  altSymbol.className = "geIcon";
  altSymbol.style.width = "22px";

  var solid = document.createElement("div");
  solid.style.width = "85px";
  solid.style.height = "1px";
  solid.style.borderBottom = "1px solid " + this.defaultStrokeColor;
  solid.style.marginBottom = "9px";
  symbol.appendChild(solid);

  var altSolid = document.createElement("div");
  altSolid.style.width = "23px";
  altSolid.style.height = "1px";
  altSolid.style.borderBottom = "1px solid " + this.defaultStrokeColor;
  altSolid.style.marginBottom = "9px";
  altSymbol.appendChild(altSolid);

  pattern.style.height = "15px";
  altPattern.style.height = "15px";
  edgeShape.style.height = "15px";
  edgeStyle.style.height = "17px";
  lineStart.style.marginLeft = "3px";
  lineStart.style.height = "17px";
  lineEnd.style.marginLeft = "3px";
  lineEnd.style.height = "17px";

  container.appendChild(colorPanel);
  container.appendChild(altStylePanel);
  container.appendChild(stylePanel);

  var arrowPanel = stylePanel.cloneNode(false);
  arrowPanel.style.paddingBottom = "6px";
  arrowPanel.style.paddingTop = "4px";
  arrowPanel.style.fontWeight = "normal";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.marginLeft = "3px";
  span.style.marginBottom = "12px";
  span.style.marginTop = "2px";
  span.style.fontWeight = "normal";
  span.style.width = "76px";

  mxUtils.write(span, mxResources.get("lineend"));
  arrowPanel.appendChild(span);

  var endSpacingUpdate, endSizeUpdate;
  var endSpacing = this.addUnitInput(arrowPanel, "pt", 74, 33, function () {
    endSpacingUpdate.apply(this, arguments);
  });
  var endSize = this.addUnitInput(arrowPanel, "pt", 20, 33, function () {
    endSizeUpdate.apply(this, arguments);
  });

  mxUtils.br(arrowPanel);

  var spacer = document.createElement("div");
  spacer.style.height = "8px";
  arrowPanel.appendChild(spacer);

  span = span.cloneNode(false);
  mxUtils.write(span, mxResources.get("linestart"));
  arrowPanel.appendChild(span);

  var startSpacingUpdate, startSizeUpdate;
  var startSpacing = this.addUnitInput(arrowPanel, "pt", 74, 33, function () {
    startSpacingUpdate.apply(this, arguments);
  });
  var startSize = this.addUnitInput(arrowPanel, "pt", 20, 33, function () {
    startSizeUpdate.apply(this, arguments);
  });

  mxUtils.br(arrowPanel);
  this.addLabel(arrowPanel, mxResources.get("spacing"), 74, 50);
  this.addLabel(arrowPanel, mxResources.get("size"), 20, 50);
  mxUtils.br(arrowPanel);

  var perimeterPanel = colorPanel.cloneNode(false);
  perimeterPanel.style.fontWeight = "normal";
  perimeterPanel.style.position = "relative";
  perimeterPanel.style.paddingLeft = "16px";
  perimeterPanel.style.marginBottom = "2px";
  perimeterPanel.style.marginTop = "6px";
  perimeterPanel.style.borderWidth = "0px";
  perimeterPanel.style.paddingBottom = "18px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.marginLeft = "3px";
  span.style.marginBottom = "12px";
  span.style.marginTop = "1px";
  span.style.fontWeight = "normal";
  span.style.width = "120px";
  mxUtils.write(span, mxResources.get("perimeter"));
  perimeterPanel.appendChild(span);

  var perimeterUpdate;
  var perimeterSpacing = this.addUnitInput(
    perimeterPanel,
    "pt",
    20,
    41,
    function () {
      perimeterUpdate.apply(this, arguments);
    }
  );

  if (ss.edges.length == graph.getSelectionCount()) {
    container.appendChild(stylePanel2);

    if (mxClient.IS_QUIRKS) {
      mxUtils.br(container);
      mxUtils.br(container);
    }

    container.appendChild(arrowPanel);
  } else if (ss.vertices.length == graph.getSelectionCount()) {
    if (mxClient.IS_QUIRKS) {
      mxUtils.br(container);
    }

    container.appendChild(perimeterPanel);
  }

  var listener = mxUtils.bind(this, function (sender, evt, force) {
    ss = this.format.getSelectionState();
    var color = mxUtils.getValue(ss.style, strokeKey, null);

    if (force || document.activeElement != input) {
      var tmp = parseInt(
        mxUtils.getValue(ss.style, mxConstants.STYLE_STROKEWIDTH, 1)
      );
      input.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != altInput) {
      var tmp = parseInt(
        mxUtils.getValue(ss.style, mxConstants.STYLE_STROKEWIDTH, 1)
      );
      altInput.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    styleSelect.style.visibility =
      ss.style.shape == "connector" || ss.style.shape == "filledEdge"
        ? ""
        : "hidden";

    if (mxUtils.getValue(ss.style, mxConstants.STYLE_CURVED, null) == "1") {
      styleSelect.value = "curved";
    } else if (
      mxUtils.getValue(ss.style, mxConstants.STYLE_ROUNDED, null) == "1"
    ) {
      styleSelect.value = "rounded";
    }

    if (mxUtils.getValue(ss.style, mxConstants.STYLE_DASHED, null) == "1") {
      if (
        mxUtils.getValue(ss.style, mxConstants.STYLE_DASH_PATTERN, null) == null
      ) {
        solid.style.borderBottom = "1px dashed " + this.defaultStrokeColor;
      } else {
        solid.style.borderBottom = "1px dotted " + this.defaultStrokeColor;
      }
    } else {
      solid.style.borderBottom = "1px solid " + this.defaultStrokeColor;
    }

    altSolid.style.borderBottom = solid.style.borderBottom;

    // Updates toolbar icon for edge style
    var edgeStyleDiv = edgeStyle.getElementsByTagName("div")[0];

    if (edgeStyleDiv != null) {
      var es = mxUtils.getValue(ss.style, mxConstants.STYLE_EDGE, null);

      if (
        mxUtils.getValue(ss.style, mxConstants.STYLE_NOEDGESTYLE, null) == "1"
      ) {
        es = null;
      }

      if (
        es == "orthogonalEdgeStyle" &&
        mxUtils.getValue(ss.style, mxConstants.STYLE_CURVED, null) == "1"
      ) {
        edgeStyleDiv.className = "geSprite geSprite-curved";
      } else if (es == "straight" || es == "none" || es == null) {
        edgeStyleDiv.className = "geSprite geSprite-straight";
      } else if (es == "entityRelationEdgeStyle") {
        edgeStyleDiv.className = "geSprite geSprite-entity";
      } else if (es == "elbowEdgeStyle") {
        edgeStyleDiv.className =
          "geSprite " +
          (mxUtils.getValue(ss.style, mxConstants.STYLE_ELBOW, null) ==
          "vertical"
            ? "geSprite-verticalelbow"
            : "geSprite-horizontalelbow");
      } else if (es == "isometricEdgeStyle") {
        edgeStyleDiv.className =
          "geSprite " +
          (mxUtils.getValue(ss.style, mxConstants.STYLE_ELBOW, null) ==
          "vertical"
            ? "geSprite-verticalisometric"
            : "geSprite-horizontalisometric");
      } else {
        edgeStyleDiv.className = "geSprite geSprite-orthogonal";
      }
    }

    // Updates icon for edge shape
    var edgeShapeDiv = edgeShape.getElementsByTagName("div")[0];

    if (edgeShapeDiv != null) {
      if (ss.style.shape == "link") {
        edgeShapeDiv.className = "geSprite geSprite-linkedge";
      } else if (ss.style.shape == "flexArrow") {
        edgeShapeDiv.className = "geSprite geSprite-arrow";
      } else if (ss.style.shape == "arrow") {
        edgeShapeDiv.className = "geSprite geSprite-simplearrow";
      } else {
        edgeShapeDiv.className = "geSprite geSprite-connection";
      }
    }

    if (ss.edges.length == graph.getSelectionCount()) {
      altStylePanel.style.display = "";
      stylePanel.style.display = "none";
    } else {
      altStylePanel.style.display = "none";
      stylePanel.style.display = "";
    }

    function updateArrow(marker, fill, elt, prefix) {
      var markerDiv = elt.getElementsByTagName("div")[0];

      if (markerDiv != null) {
        markerDiv.className = ui.getCssClassForMarker(
          prefix,
          ss.style.shape,
          marker,
          fill
        );

        if (markerDiv.className == "geSprite geSprite-noarrow") {
          markerDiv.innerHTML = mxUtils.htmlEntities(mxResources.get("none"));
          markerDiv.style.backgroundImage = "none";
          markerDiv.style.verticalAlign = "top";
          markerDiv.style.marginTop = "5px";
          markerDiv.style.fontSize = "10px";
          markerDiv.style.filter = "none";
          markerDiv.style.color = this.defaultStrokeColor;
          markerDiv.nextSibling.style.marginTop = "0px";
        }
      }

      return markerDiv;
    }

    var sourceDiv = updateArrow(
      mxUtils.getValue(ss.style, mxConstants.STYLE_STARTARROW, null),
      mxUtils.getValue(ss.style, "startFill", "1"),
      lineStart,
      "start"
    );
    var targetDiv = updateArrow(
      mxUtils.getValue(ss.style, mxConstants.STYLE_ENDARROW, null),
      mxUtils.getValue(ss.style, "endFill", "1"),
      lineEnd,
      "end"
    );

    // Special cases for markers
    if (sourceDiv != null && targetDiv != null) {
      if (ss.style.shape == "arrow") {
        sourceDiv.className = "geSprite geSprite-noarrow";
        targetDiv.className = "geSprite geSprite-endblocktrans";
      } else if (ss.style.shape == "link") {
        sourceDiv.className = "geSprite geSprite-noarrow";
        targetDiv.className = "geSprite geSprite-noarrow";
      }
    }

    mxUtils.setOpacity(edgeStyle, ss.style.shape == "arrow" ? 30 : 100);

    if (
      ss.style.shape != "connector" &&
      ss.style.shape != "flexArrow" &&
      ss.style.shape != "filledEdge"
    ) {
      mxUtils.setOpacity(lineStart, 30);
      mxUtils.setOpacity(lineEnd, 30);
    } else {
      mxUtils.setOpacity(lineStart, 100);
      mxUtils.setOpacity(lineEnd, 100);
    }

    if (force || document.activeElement != startSize) {
      var tmp = parseInt(
        mxUtils.getValue(
          ss.style,
          mxConstants.STYLE_STARTSIZE,
          mxConstants.DEFAULT_MARKERSIZE
        )
      );
      startSize.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != startSpacing) {
      var tmp = parseInt(
        mxUtils.getValue(
          ss.style,
          mxConstants.STYLE_SOURCE_PERIMETER_SPACING,
          0
        )
      );
      startSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != endSize) {
      var tmp = parseInt(
        mxUtils.getValue(
          ss.style,
          mxConstants.STYLE_ENDSIZE,
          mxConstants.DEFAULT_MARKERSIZE
        )
      );
      endSize.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != startSpacing) {
      var tmp = parseInt(
        mxUtils.getValue(
          ss.style,
          mxConstants.STYLE_TARGET_PERIMETER_SPACING,
          0
        )
      );
      endSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != perimeterSpacing) {
      var tmp = parseInt(
        mxUtils.getValue(ss.style, mxConstants.STYLE_PERIMETER_SPACING, 0)
      );
      perimeterSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }
  });

  startSizeUpdate = this.installInputHandler(
    startSize,
    mxConstants.STYLE_STARTSIZE,
    mxConstants.DEFAULT_MARKERSIZE,
    0,
    999,
    " pt"
  );
  startSpacingUpdate = this.installInputHandler(
    startSpacing,
    mxConstants.STYLE_SOURCE_PERIMETER_SPACING,
    0,
    -999,
    999,
    " pt"
  );
  endSizeUpdate = this.installInputHandler(
    endSize,
    mxConstants.STYLE_ENDSIZE,
    mxConstants.DEFAULT_MARKERSIZE,
    0,
    999,
    " pt"
  );
  endSpacingUpdate = this.installInputHandler(
    endSpacing,
    mxConstants.STYLE_TARGET_PERIMETER_SPACING,
    0,
    -999,
    999,
    " pt"
  );
  perimeterUpdate = this.installInputHandler(
    perimeterSpacing,
    mxConstants.STYLE_PERIMETER_SPACING,
    0,
    0,
    999,
    " pt"
  );

  this.addKeyHandler(input, listener);
  this.addKeyHandler(startSize, listener);
  this.addKeyHandler(startSpacing, listener);
  this.addKeyHandler(endSize, listener);
  this.addKeyHandler(endSpacing, listener);
  this.addKeyHandler(perimeterSpacing, listener);

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();

  return container;
};

/**
 * Adds UI for configuring line jumps.
 */
AssetFormatPanel.prototype.addLineJumps = function (container) {
  var ss = this.format.getSelectionState();

  if (
    Graph.lineJumpsEnabled &&
    ss.edges.length > 0 &&
    ss.vertices.length == 0 &&
    ss.lineJumps
  ) {
    container.style.padding = "8px 0px 24px 18px";

    var ui = this.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;

    var span = document.createElement("div");
    span.style.position = "absolute";
    span.style.fontWeight = "bold";
    span.style.width = "80px";

    mxUtils.write(span, mxResources.get("lineJumps"));
    container.appendChild(span);

    var styleSelect = document.createElement("select");
    styleSelect.style.position = "absolute";
    styleSelect.style.marginTop = "-2px";
    styleSelect.style.right = "76px";
    styleSelect.style.width = "62px";

    var styles = ["none", "arc", "gap", "sharp"];

    for (var i = 0; i < styles.length; i++) {
      var styleOption = document.createElement("option");
      styleOption.setAttribute("value", styles[i]);
      mxUtils.write(styleOption, mxResources.get(styles[i]));
      styleSelect.appendChild(styleOption);
    }

    mxEvent.addListener(styleSelect, "change", function (evt) {
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(
          "jumpStyle",
          styleSelect.value,
          graph.getSelectionCells()
        );
        ui.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            ["jumpStyle"],
            "values",
            [styleSelect.value],
            "cells",
            graph.getSelectionCells()
          )
        );
      } finally {
        graph.getModel().endUpdate();
      }

      mxEvent.consume(evt);
    });

    // Stops events from bubbling to color option event handler
    mxEvent.addListener(styleSelect, "click", function (evt) {
      mxEvent.consume(evt);
    });

    container.appendChild(styleSelect);

    var jumpSizeUpdate;

    var jumpSize = this.addUnitInput(container, "pt", 22, 33, function () {
      jumpSizeUpdate.apply(this, arguments);
    });

    jumpSizeUpdate = this.installInputHandler(
      jumpSize,
      "jumpSize",
      Graph.defaultJumpSize,
      0,
      999,
      " pt"
    );

    var listener = mxUtils.bind(this, function (sender, evt, force) {
      ss = this.format.getSelectionState();
      styleSelect.value = mxUtils.getValue(ss.style, "jumpStyle", "none");

      if (force || document.activeElement != jumpSize) {
        var tmp = parseInt(
          mxUtils.getValue(ss.style, "jumpSize", Graph.defaultJumpSize)
        );
        jumpSize.value = isNaN(tmp) ? "" : tmp + " pt";
      }
    });

    this.addKeyHandler(jumpSize, listener);

    graph.getModel().addListener(mxEvent.CHANGE, listener);
    this.listeners.push({
      destroy: function () {
        graph.getModel().removeListener(listener);
      },
    });
    listener();
  } else {
    container.style.display = "none";
  }

  return container;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.addEffects = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  div.style.paddingTop = "0px";
  div.style.paddingBottom = "2px";

  var table = document.createElement("table");

  if (mxClient.IS_QUIRKS) {
    table.style.fontSize = "1em";
  }

  table.style.width = "100%";
  table.style.fontWeight = "bold";
  table.style.paddingRight = "20px";
  var tbody = document.createElement("tbody");
  var row = document.createElement("tr");
  row.style.padding = "0px";
  var left = document.createElement("td");
  left.style.padding = "0px";
  left.style.width = "50%";
  left.setAttribute("valign", "top");

  var right = left.cloneNode(true);
  right.style.paddingLeft = "8px";
  row.appendChild(left);
  row.appendChild(right);
  tbody.appendChild(row);
  table.appendChild(tbody);
  div.appendChild(table);

  var current = left;
  var count = 0;

  var addOption = mxUtils.bind(this, function (label, key, defaultValue) {
    var opt = this.createCellOption(label, key, defaultValue);
    opt.style.width = "100%";
    current.appendChild(opt);
    current = current == left ? right : left;
    count++;
  });

  var listener = mxUtils.bind(this, function (sender, evt, force) {
    ss = this.format.getSelectionState();

    left.innerHTML = "";
    right.innerHTML = "";
    current = left;

    if (ss.rounded) {
      addOption(mxResources.get("rounded"), mxConstants.STYLE_ROUNDED, 0);
    }

    if (ss.style.shape == "swimlane") {
      addOption(mxResources.get("divider"), "swimlaneLine", 1);
    }

    if (!ss.containsImage) {
      addOption(mxResources.get("shadow"), mxConstants.STYLE_SHADOW, 0);
    }

    if (ss.glass) {
      addOption(mxResources.get("glass"), mxConstants.STYLE_GLASS, 0);
    }

    addOption(mxResources.get("sketch"), "sketch", 0);
  });

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.addStyleOps = function (div) {
  div.style.paddingTop = "10px";
  div.style.paddingBottom = "10px";

  var btn = mxUtils.button(
    mxResources.get("setAsDefaultStyle"),
    mxUtils.bind(this, function (evt) {
      this.editorUi.actions.get("setAsDefaultStyle").funct();
    })
  );

  btn.setAttribute(
    "title",
    mxResources.get("setAsDefaultStyle") +
      " (" +
      this.editorUi.actions.get("setAsDefaultStyle").shortcut +
      ")"
  );
  btn.style.width = "202px";
  div.appendChild(btn);

  return div;
};
/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.addFill = function (container) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var ss = this.format.getSelectionState();
  container.style.paddingTop = "6px";
  container.style.paddingBottom = "6px";

  // Adds gradient direction option
  var gradientSelect = document.createElement("select");
  gradientSelect.style.position = "absolute";
  gradientSelect.style.marginTop = "-2px";
  gradientSelect.style.right = mxClient.IS_QUIRKS ? "52px" : "72px";
  gradientSelect.style.width = "70px";

  var fillStyleSelect = gradientSelect.cloneNode(false);

  // Stops events from bubbling to color option event handler
  mxEvent.addListener(gradientSelect, "click", function (evt) {
    mxEvent.consume(evt);
  });
  mxEvent.addListener(fillStyleSelect, "click", function (evt) {
    mxEvent.consume(evt);
  });

  var defs =
    ss.vertices.length >= 1
      ? graph.stylesheet.getDefaultVertexStyle()
      : graph.stylesheet.getDefaultEdgeStyle();
  var gradientPanel = this.createCellColorOption(
    mxResources.get("gradient"),
    mxConstants.STYLE_GRADIENTCOLOR,
    defs[mxConstants.STYLE_GRADIENTCOLOR] != null
      ? defs[mxConstants.STYLE_GRADIENTCOLOR]
      : "#ffffff",
    function (color) {
      if (color == null || color == mxConstants.NONE) {
        gradientSelect.style.display = "none";
      } else {
        gradientSelect.style.display = "";
      }
    },
    function (color) {
      graph.updateCellStyles(
        mxConstants.STYLE_GRADIENTCOLOR,
        color,
        graph.getSelectionCells()
      );
    }
  );

  var fillKey =
    ss.style.shape == "image"
      ? mxConstants.STYLE_IMAGE_BACKGROUND
      : mxConstants.STYLE_FILLCOLOR;
  var label =
    ss.style.shape == "image"
      ? mxResources.get("background")
      : mxResources.get("fill");

  var defs =
    ss.vertices.length >= 1
      ? graph.stylesheet.getDefaultVertexStyle()
      : graph.stylesheet.getDefaultEdgeStyle();
  var fillPanel = this.createCellColorOption(
    label,
    fillKey,
    defs[fillKey] != null ? defs[fillKey] : "#ffffff",
    null,
    mxUtils.bind(this, function (color) {
      graph.updateCellStyles(fillKey, color, graph.getSelectionCells());
    })
  );
  fillPanel.style.fontWeight = "bold";

  var tmpColor = mxUtils.getValue(ss.style, fillKey, null);
  gradientPanel.style.display =
    tmpColor != null &&
    tmpColor != mxConstants.NONE &&
    ss.fill &&
    ss.style.shape != "image"
      ? ""
      : "none";

  var directions = [
    mxConstants.DIRECTION_NORTH,
    mxConstants.DIRECTION_EAST,
    mxConstants.DIRECTION_SOUTH,
    mxConstants.DIRECTION_WEST,
  ];

  for (var i = 0; i < directions.length; i++) {
    var gradientOption = document.createElement("option");
    gradientOption.setAttribute("value", directions[i]);
    mxUtils.write(gradientOption, mxResources.get(directions[i]));
    gradientSelect.appendChild(gradientOption);
  }

  gradientPanel.appendChild(gradientSelect);

  for (var i = 0; i < Editor.roughFillStyles.length; i++) {
    var fillStyleOption = document.createElement("option");
    fillStyleOption.setAttribute("value", Editor.roughFillStyles[i].val);
    mxUtils.write(fillStyleOption, Editor.roughFillStyles[i].dispName);
    fillStyleSelect.appendChild(fillStyleOption);
  }

  fillPanel.appendChild(fillStyleSelect);

  var listener = mxUtils.bind(this, function () {
    ss = this.format.getSelectionState();
    var value = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_GRADIENT_DIRECTION,
      mxConstants.DIRECTION_SOUTH
    );
    var fillStyle = mxUtils.getValue(ss.style, "fillStyle", "auto");

    // Handles empty string which is not allowed as a value
    if (value == "") {
      value = mxConstants.DIRECTION_SOUTH;
    }

    gradientSelect.value = value;
    fillStyleSelect.value = fillStyle;
    container.style.display = ss.fill ? "" : "none";

    var fillColor = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_FILLCOLOR,
      null
    );

    if (
      !ss.fill ||
      ss.containsImage ||
      fillColor == null ||
      fillColor == mxConstants.NONE ||
      ss.style.shape == "filledEdge"
    ) {
      fillStyleSelect.style.display = "none";
      gradientPanel.style.display = "none";
    } else {
      fillStyleSelect.style.display = ss.style.sketch == "1" ? "" : "none";
      gradientPanel.style.display =
        ss.style.sketch != "1" || fillStyle == "solid" || fillStyle == "auto"
          ? ""
          : "none";
    }
  });

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();

  mxEvent.addListener(gradientSelect, "change", function (evt) {
    graph.setCellStyles(
      mxConstants.STYLE_GRADIENT_DIRECTION,
      gradientSelect.value,
      graph.getSelectionCells()
    );
    mxEvent.consume(evt);
  });

  mxEvent.addListener(fillStyleSelect, "change", function (evt) {
    graph.setCellStyles(
      "fillStyle",
      fillStyleSelect.value,
      graph.getSelectionCells()
    );
    mxEvent.consume(evt);
  });

  container.appendChild(fillPanel);
  container.appendChild(gradientPanel);

  // Adds custom colors
  var custom = this.getCustomColors();

  for (var i = 0; i < custom.length; i++) {
    container.appendChild(
      this.createCellColorOption(
        custom[i].title,
        custom[i].key,
        custom[i].defaultValue
      )
    );
  }

  return container;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
AssetFormatPanel.prototype.getCustomColors = function () {
  var ss = this.format.getSelectionState();
  var result = [];

  if (ss.style.shape == "swimlane" || ss.style.shape == "table") {
    result.push({
      title: mxResources.get("laneColor"),
      key: "swimlaneFillColor",
      defaultValue: "#ffffff",
    });
  }

  return result;
};



