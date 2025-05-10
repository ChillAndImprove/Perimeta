import {BaseFormatPanel} from './BaseFormatPanel.js';
import  {createSection,restartWasm,generateUniquekeyData} from './Utils.js';

export const CommunicationFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(CommunicationFormatPanel, BaseFormatPanel);
CommunicationFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  this.container.appendChild(
    this.addCommunicationMenuDynamic(this.createPanel())
  );
};

CommunicationFormatPanel.prototype.addCommunicationMenuDynamic = function (
  container
) {
  let self = this;
  // Add Type properties
  var typeProperties = {
    key: {
      description: "key",
      type: "button",
      tooltip: "The identifier for the yaml element",
      defaultValue: "<Your title>",
      section: "General",

    },
    target: {
      description: "target",
      type: "button",
      section: "General",
      tooltip: "",
      defaultValue: "<Your ID>",
    },

    description: {
      description: "Description",
      type: "button",
      tooltip: "Provide a brief description of the component.",
      defaultValue: "<Your Description>",
      section: "General",
    },
    protocol: {
      description: "Protocol",
      type: "select",
      options: [
        {
          group: "Web Protocols",
          options: [
            "http",
            "https",
            "ws",
            "wss",
            "reverse-proxy-web-protocol",
            "reverse-proxy-web-protocol-encrypted",
          ],
        },
        {
          group: "Database Protocols",
          options: [
            "jdbc",
            "jdbc-encrypted",
            "odbc",
            "odbc-encrypted",
            "sql-access-protocol",
            "sql-access-protocol-encrypted",
            "nosql-access-protocol",
            "nosql-access-protocol-encrypted",
          ],
        },
        {
          group: "General Protocols",
          options: [
            "unknown-protocol",
            "mqtt",
            "binary",
            "binary-encrypted",
            "text",
            "text-encrypted",
            "ssh",
            "ssh-tunnel",
          ],
        },
        {
          group: "Mail Protocols",
          options: [
            "smtp",
            "smtp-encrypted",
            "pop3",
            "pop3-encrypted",
            "imap",
            "imap-encrypted",
          ],
        },
        {
          group: "File Transfer Protocols",
          options: [
            "ftp",
            "ftps",
            "sftp",
            "scp",
            "nfs",
            "smb",
            "smb-encrypted",
            "local-file-access",
          ],
        },
        {
          group: "Various Protocols",
          options: [
            "ldap",
            "ldaps",
            "jms",
            "nrpe",
            "xmpp",
            "iiop",
            "iiop-encrypted",
            "jrmp",
            "jrmp-encrypted",
            "in-process-library-call",
            "container-spawning",
          ],
        },
      ],
      section: "Properties",
      defaultValue: 0,
    },
    authentication: {
      description: "Authentication",
      type: "select",
      options: [
        {
          group: "Authentication Types",
          options: [
            "none",
            "credentials",
            "session-id",
            "token",
            "client-certificate",
            "two-factor",
            "externalized",
          ],
          defaultValue: "none",
        },
      ],
      tooltip: "Select the authentication method for the component.",
      section: "Properties",
      defaultValue: 0,
    },
    authorization: {
      description: "Authorization",
      type: "select",
      options: [
        {
          group: "Authorization Types",
          options: ["none", "technical-user", "enduser-identity-propagation"],
          defaultValue: "none",
        },
      ],
      tooltip: "Select the authorization level for the component.",
      section: "Properties",
      defaultValue: 0,
    },
    usage: {
      description: "Usage",
      type: "select",
      options: [
        {
          group: "Usage Type",
          options: ["business", "devops"],
          defaultValue: "business",
        },
      ],
      tooltip: "Select the usage type of the component.",
      section: "Properties",
      defaultValue: 0,
    },
    tags: {
      description: "Tags",
      type: "array",
      uniqueItems: true,
      items: {
        type: "button",
      },
      tooltip: "Add any tags associated with the component.",
      defaultValue: [],
      section: "Properties",
    },
    vpn: {
      description: "VPN",
      type: "checkbox",
      tooltip: "Check if the component is accessed over VPN.",
      defaultValue: false,
      section: "Properties",
    },
    ip_filtered: {
      description: "IP filtered",
      type: "checkbox",
      tooltip: "Check if the component is IP filtered.",
      defaultValue: false,
      section: "Properties",
    },
    readonly: {
      description: "Readonly",
      type: "checkbox",
      tooltip: "Check if the component is readonly.",
      defaultValue: false,
      section: "Properties",
    },
  };
  {


    let cell = self.editorUi.editor.graph.getSelectionCell();
    cell.source = self.editorUi.editor.graph.model.getTerminal(cell,true);
    cell.target = self.editorUi.editor.graph.model.getTerminal(cell,false);
    let idtarget =  self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.target.technicalAsset.key,"id"]);

    if (!cell.communicationAsset)
    {
      {
        let comId = generateUniqueCommkeyData(self.editorUi.editor.graph);

        const communicationLinkProperties = {
        
          target: idtarget,
          description: "your description",
          protocol: "http",
          authentication: "none",
          authorization: "none",
          tags: [],
          vpn: false,
          ip_filtered: false,
          readonly: false,
          usage: "business",
          data_assets_sent: [],
          data_assets_received: [],
      };
      const path = ['technical_assets', cell.source.technicalAsset.key, 'communication_links',comId];
       Object.keys(communicationLinkProperties).forEach(property => {
        self.editorUi.editor.graph.model.threagile.setIn([...path, property], communicationLinkProperties[property]);
    });
      cell.communicationAsset = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.source.technicalAsset.key,"communication_links",comId]);
      cell.communicationAssetKey = comId;
    }
      }
  }

  var customListener = {
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
    }
    let typeItem = document.createElement("li");
    typeItem.style.display = "flex";
    typeItem.style.alignItems = "baseline";
    typeItem.style.marginBottom = "8px";

    let propertyName = document.createElement("span");
    propertyName.innerHTML = property;
    propertyName.style.width = "100px";
    propertyName.style.marginRight = "10px";

    let propertyType = typeProperties[property].type;

    if (propertyType === "select") {
      const propertySelect = property;
      typeItem.appendChild(propertyName);
      let selectContainer = document.createElement("div");
      selectContainer.style.display = "flex";
      selectContainer.style.alignItems = "center";
      selectContainer.style.marginLeft = "auto";
      let selectDropdown = document.createElement("select");
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
      let cell = self.editorUi.editor.graph.getSelectionCell();
      let commAsset;
      if (typeof cell.communicationAsset.toJSON === 'function') {
        commAsset = cell.communicationAsset.toJSON();
    } else {
      commAsset = cell.communicationAsset;
    }
      if (
        commAsset[propertySelect]
      ) {
        selectDropdown.value = commAsset[propertySelect];
      }
      let createChangeListener = function (selectDropdown, propertySelect) {
        return function (evt) {
          var vals = selectDropdown.value;
          if (vals != null) {
               self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", cell.source.technicalAsset.key,"communication_links", cell.communicationAssetKey, propertySelect], selectDropdown.value);
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
      
      
      function createCustomOptionCommunicationLink(self, parameter) {
        return function () {
          var cells = self.editorUi.editor.graph.getSelectionCells();
          if (cells != null && cells.length > 0) {  
            let cell = self.editorUi.editor.graph.getSelectionCell();
            return self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.source.technicalAsset.key,"communication_links",cell.communicationAssetKey, parameter]);
          }

        };
      }
                                                       
      // Function to set a custom option
      function setCustomOptionCommunicationLink(self, parameter) {
        return function (checked) {
          
          var cells = self.editorUi.editor.graph.getSelectionCells();
          if (cells != null && cells.length > 0) {
            let cell = self.editorUi.editor.graph.getSelectionCell();
          self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", cell.source.technicalAsset.key,"communication_links", cell.communicationAssetKey, parameter],checked);
          }
          
          
        };
      }

      

      let optionElement = this.createOption(
        property,
        createCustomOptionCommunicationLink(self, property),
        setCustomOptionCommunicationLink(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;

      sections[sectionName].appendChild(optionElement);
    } else if (propertyType === "button") {

       

      let button = mxUtils.button(
        property,
        mxUtils.bind(this, function (evt) {
          
          let cell = self.editorUi.editor.graph.getSelectionCell();
          let commAsset =self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.source.technicalAsset.key,"communication_links",cell.communicationAssetKey]);
            if (typeof cell.communicationAsset.toJSON === 'function') {
              commAsset = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.source.technicalAsset.key,"communication_links",cell.communicationAssetKey]).toJSON();
            }

          let dataValue =
            cell && commAsset[property]
              ? commAsset[property]
              : typeProperties[property].defaultValue;
            if(property=="key")
            {
              dataValue = cell.communicationAssetKey;
            }
          var dlg = new TextareaDialog(
            this.editorUi,
            property + ":",
            dataValue,
            function (newValue) {
              if (newValue != null) {
                if (cell) {
                  if (property === "Id") {
                    var adjustedValue = newValue
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;");
                    let model = self.editorUi.editor.graph.model;
                    model.beginUpdate();
                    try {
                      model.setValue(cell, adjustedValue);

                      self.editorUi.editor.graph.refresh(cell);

                      self.editorUi.editor.graph.refresh();
                    } finally {
                      model.endUpdate();
                    }
                  }
                    if(property == "key")
                    {


                      restartWasm();
                      let oldassetPath = ["technical_assets", cell.source.technicalAsset.key,"communication_links",cell.communicationAssetKey];
                      let object = JSON.parse(JSON.stringify(self.editorUi.editor.graph.model.threagile.getIn(oldassetPath)));
                      self.editorUi.editor.graph.model.threagile.deleteIn(oldassetPath);
                      cell.communicationAssetKey=newValue;

                      let newassetPath        = ["technical_assets", cell.source.technicalAsset.key,"communication_links", cell.communicationAssetKey];
                      self.editorUi.editor.graph.model.threagile.setIn(newassetPath, object);
                      cell.communicationAsset = self.editorUi.editor.graph.model.threagile.getIn(newassetPath);
                      let restoreIntegrity    = self.editorUi.editor.graph.model.threagile.toString();
                      self.editorUi.editor.graph.model.threagile =  YAML.parseDocument(restoreIntegrity);
                    }else{
                     self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", cell.source.technicalAsset.key,"communication_links",cell.communicationAssetKey, property], newValue);
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
          if(property == "target")
          {
          dlg.textarea.readOnly = true;
          dlg.textarea.style.backgroundColor = "#f3f3f3"; // Light grey background
          dlg.textarea.style.color = "#686868"; // Dimmed text color
          dlg.textarea.style.border = "1px solid #ccc"; // Less pronounced border
        }
        })
      );
      button.title = typeProperties[property].tooltip;
      button.style.width = "200px";
      typeItem.appendChild(button);
      sections[sectionName].appendChild(typeItem);
    }
  }
  for (let sectionName in sections) {
    container.appendChild(sections[sectionName]);
  }
  let tmpData = self.editorUi.editor.graph.model.threagile.getIn(["data_assets"]);
  var diagramData = tmpData===  undefined ?[]: tmpData;
  if(typeof diagramData.toJSON === 'function') {
    diagramData= diagramData.toJSON();
    }
   
  let idsData = [];
  Object.keys(diagramData).forEach(function (property) {
      idsData.push(property);
    });
  

  let inputElement = document.createElement("input");
  inputElement.id = "data_send_tagify";
  inputElement.placeholder = "Data sent";
  let cells = self.editorUi.editor.graph.getSelectionCells();
  let cell = cells && cells.length > 0 ? cells[0] : null;

  let sentSection = createSection("Data Sent:");

  sentSection.appendChild(document.createElement("br"));
  let commAsset =cell.communicationAsset;
                  if (typeof cell.communicationAsset.toJSON === 'function') {
                commAsset = cell.communicationAsset.toJSON();
  }
  if (
    cell &&
    commAsset.data_assets_sent
  ) {
    let matches = [];
    inputElement.value = commAsset.data_assets_sent;
    for (let key in diagramData) {
      if (diagramData.hasOwnProperty(key)) {
        let item = diagramData[key];
        for (let id of commAsset.data_assets_sent) {
          if (item.id === id) {
            matches.push(key);  
            break; 
          }
        }
      }
    }
      inputElement.value = matches;
  } // Append it to body (or any other container)
  sentSection.appendChild(inputElement);
  
  let tinput = document.querySelector('input[name="input-custom-dropdown"]');
    // init Tagify script on the above inputs
  let tagify1 = new Tagify(inputElement, {
      whitelist: idsData,
      dropdown: {
        maxItems: 100, 
        classname: "tags-look", // <- custom classname for this dropdown, so it could be targeted
        enabled: 0, // <- show suggestions on focus
        closeOnSelect: false, // <- do not hide the suggestions dropdown once an item has been selected
      },
    });
    function addComSent(e){
      let dataId= diagramData[e.detail.data.value].id;
      commAsset.data_assets_sent.push(dataId);
      self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", self.editorUi.editor.graph.getSelectionCells()[0].source.technicalAsset.key,"communication_links",cell.communicationAssetKey, "data_assets_sent"],commAsset.data_assets_sent );

    }
    function removeComSent(e){
      let dataId= diagramData[e.detail.data.value].id;
      commAsset.data_assets_sent = commAsset.data_assets_sent.filter(asset => asset !== dataId);
      self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", self.editorUi.editor.graph.getSelectionCells()[0].source.technicalAsset.key,"communication_links",cell.communicationAssetKey, "data_assets_sent"],commAsset.data_assets_sent );

    }
    tagify1.on("add", addComSent).on("remove", removeComSent);
  container.appendChild(sentSection);
  let inputElement2 = document.createElement("input");
  inputElement.id = "receivedtagifyid";

  inputElement2.placeholder = "Data received";
  let receivedSecion = createSection("Data Received:");

  receivedSecion.appendChild(document.createElement("br"));
  if (
    cell &&
    commAsset.data_assets_received
  ) {
    let matches = [];
    for (let key in diagramData) {
      if (diagramData.hasOwnProperty(key)) {
        let item = diagramData[key];
        for (let id of commAsset.data_assets_received) {
          if (item.id === id) {
            matches.push(key);  
            break; 
          }
        }
      }
    }
      inputElement2.value = matches;
  } 
  receivedSecion.appendChild(inputElement2);
  let tinput2 = document.querySelector('input[name="input-custom-dropdown"]');
  let tagify2 = new Tagify(inputElement2, {
      whitelist: idsData,
      dropdown: {
        maxItems: 20, // <- mixumum allowed rendered suggestions
        classname: "tags-look", // <- custom classname for this dropdown, so it could be targeted
        enabled: 0, // <- show suggestions on focus
        closeOnSelect: false, // <- do not hide the suggestions dropdown once an item has been selected
      },
    });
    function addComReceived(e){
      let dataId= diagramData[e.detail.data.value].id;
      commAsset.data_assets_received.push(dataId);
      self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", self.editorUi.editor.graph.getSelectionCells()[0].source.technicalAsset.key,"communication_links",cell.communicationAssetKey,"data_assets_received"],commAsset.data_assets_received );
    }
    function removeComReceived(e){
      let dataId= diagramData[e.detail.data.value].id;
    commAsset.data_assets_received = commAsset.data_assets_received.filter(asset => asset !== dataId);
      self.editorUi.editor.graph.model.threagile.setIn(["technical_assets", self.editorUi.editor.graph.getSelectionCells()[0].source.technicalAsset.key,"communication_links",cell.communicationAssetKey,"data_assets_received"],commAsset.data_assets_received );

    }
 tagify2.DOM.scope.addEventListener('click', () => {
      // Manually focus the internal input element
      tagify2.DOM.input.focus();
  });
  tagify2.on("add", addComReceived).on("remove", removeComReceived);
  container.appendChild(receivedSecion);
  return container;
};



