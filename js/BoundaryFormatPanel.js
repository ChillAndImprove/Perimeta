import {BaseFormatPanel} from './BaseFormatPanel.js';
import  {createSection, restartWasm,generateUniquekeyData} from './Utils.js';

export const BoundaryFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(BoundaryFormatPanel, BaseFormatPanel);
BoundaryFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  this.container.appendChild(
    this.addBoundaryMenuDynamic(this.createPanel(), graph)
  );
};


BoundaryFormatPanel.prototype.addBoundaryMenuDynamic = function (
  container,
  graph
) {
  var self = this;
  
  var typeProperties = {
    key: {
    description: "key",
    type: "button",
    tooltip: "The identifier for the yaml element",
    defaultValue: "<Your title>",
    section: "General"
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
      tooltip: "Provide a brief description of the trust boundary. ",
      defaultValue: "",
    },
    type: {
      description: "Type",
      type: "select",
      options: [
        {
          group: "Category 1",
          options: [
            "network-on-prem",
            "network-dedicated-hoster",
            "network-virtual-lan",
            "network-cloud-provider",
            "network-cloud-security-group",
            "network-policy-namespace-isolation",
            "execution-environment",
          ],
          defaultValue: "external-entity",
        },
      ],
      section: "Properties",
      tooltip: "",
    },
  };
  let cell = self.editorUi.editor.graph.getSelectionCell();

  if (
    cell &&
    !cell.trust_boundarieskey
  ) {
    
    cell.trust_boundarieskey = generateUniqueTrustkeyData(self.editorUi.editor.graph);
    const trustBoundary = {
      id: generateUniqueTrustId(self.editorUi.editor.graph), 
      description: "Boundary protecting critical internal services.",
      type: "network-cloud-provider",
      tags:[],
      technical_assets_inside: [],
      trust_boundaries_nested: []
  };
  const path = ['trust_boundaries', cell.trust_boundarieskey];
  Object.keys(trustBoundary).forEach(property => {
       self.editorUi.editor.graph.model.threagile.setIn([...path, property], trustBoundary[property]);
    });
  }
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
      if (
        cell &&
        cell.trust_boundarieskey &&
        self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries",cell.trust_boundarieskey, propertySelect])
      ) {
        selectDropdown.value= self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries",cell.trust_boundarieskey, propertySelect])
      }
      let createChangeListener = function (selectDropdown, propertySelect) {
        return function (evt) {
          var vals = selectDropdown.value;

          if (vals != null) {
            self.editorUi.editor.graph.model.threagile.setIn(["trust_boundaries",cell.trust_boundarieskey, propertySelect], vals);
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
      function createCustomOptionTrust(self, parameter) {
        return function () {
          var cells = self.editorUi.editor.graph.getSelectionCells();
          if (cells != null && cells.length > 0) {  
            let cell = self.editorUi.editor.graph.getSelectionCell();
            return self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries", cell.trust_boundarieskey,parameter]);
          }
        };
      }
                                                       
      function setCustomOptionTrust(self, parameter) {
        return function (checked) {
      
          var cells = self.editorUi.editor.graph.getSelectionCells();
          if (cells != null && cells.length > 0) {
            let cell = self.editorUi.editor.graph.getSelectionCell();
          self.editorUi.editor.graph.model.threagile.setIn(["trust_boundaries", cell.trust_boundarieskey,parameter],checked);
          }
        };
      }
      
      let optionElement = this.createOption(
        property,
        createCustomOptionTrust(self, property),
        setCustomOptionTrust(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;

      sections[sectionName].appendChild(optionElement);
    } else if (propertyType === "button") {
      let button = mxUtils.button(
        property,
        mxUtils.bind(this, function (evt) {
          let cells = self.editorUi.editor.graph.getSelectionCells();
          let cell = cells && cells.length > 0 ? cells[0] : null;
          let dataValue =
            cell && cell.trust_boundarieskey &&         self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries",cell.trust_boundarieskey, property])
            
              ? self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries",cell.trust_boundarieskey, property])
              : typeProperties[property].defaultValue;
          if(property == "key")
          {
            dataValue=cell.trust_boundarieskey;
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
                  if(property== "key")
                  {
                    restartWasm();
                    let oldassetPath = ["trust_boundaries", cell.trust_boundarieskey];
                    let object = JSON.parse(JSON.stringify(self.editorUi.editor.graph.model.threagile.getIn(oldassetPath)));
                    self.editorUi.editor.graph.model.threagile.deleteIn(oldassetPath);
                    cell.trust_boundarieskey=newValue;

                    let newassetPath        = ["trust_boundaries", cell.trust_boundarieskey];
                    let objectNode = self.editorUi.editor.graph.model.threagile.createNode(object); 
                    self.editorUi.editor.graph.model.threagile.setIn(newassetPath, objectNode);
                    //let restoreIntegrity    = self.editorUi.editor.graph.model.threagile.toString();
                    //self.editorUi.editor.graph.model.threagile =  YAML.parseDocument(restoreIntegrity); 
                  }
                  else{
                    self.editorUi.editor.graph.model.threagile.setIn(["trust_boundaries", cell.trust_boundarieskey,property],newValue);  
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

  if (cell.isVertex()) {
    var cellGeometry = cell.getGeometry();

    if (cellGeometry != null) {
      var cellX = cellGeometry.x;
      var cellY = cellGeometry.y;
      var cellWidth = cellGeometry.width;
      var cellHeight = cellGeometry.height;

      var tableContainer = document.createElement("div");
      tableContainer.style.maxWidth = "300px";

      var table = document.createElement("table");
      table.id = "TrustBoundaryTechnicalAssetsInside";
      table.style.borderCollapse = "collapse";
      table.style.width = "90%";
      table.style.tableLayout = "fixed";

      var headerRow = document.createElement("tr");
      var headerCell = document.createElement("th");
      headerCell.textContent = "Technical Assets Inside:";
      headerCell.style.border = "1px solid #ccc";
      headerCell.style.padding = "8px";
      headerCell.style.backgroundColor = "#f0f0f0";
      headerCell.style.textAlign = "left";
      headerCell.colSpan = 2;
      headerRow.appendChild(headerCell);
      table.appendChild(headerRow);

      var vertices = graph.getChildVertices(graph.getDefaultParent());

      function isVertexInsideAnyRectangle(vertex, rectangles) {
        var vertexGeometry = vertex.getGeometry();
        for (let i = 0; i < rectangles.length; i++) {
          let rectangle = rectangles[i];
          let rectangleGeometry = rectangle.getGeometry();

          if (
            vertexGeometry.x >= rectangleGeometry.x &&
            vertexGeometry.y >= rectangleGeometry.y &&
            vertexGeometry.x + vertexGeometry.width <=
              rectangleGeometry.x + rectangleGeometry.width &&
            vertexGeometry.y + vertexGeometry.height <=
              rectangleGeometry.y + rectangleGeometry.height
          ) {
            return true;
          }
        }
        return false;
      }

      var innerRectangles = vertices.filter(function (vertex) {
        var vertexGeometry = vertex.getGeometry();
        var style = graph.getModel().getStyle(vertex);
        return (
          vertexGeometry != null &&
          vertex !== cell &&
          (style.includes("rounded=1") ||
            style.includes("rounded=0") ||
            style.includes("shape=rectangle")) &&
          vertexGeometry.x >= cellX &&
          vertexGeometry.y >= cellY &&
          vertexGeometry.x + vertexGeometry.width <= cellX + cellWidth &&
          vertexGeometry.y + vertexGeometry.height <= cellY + cellHeight
        );
      });
      var technicalAssetsArray = [];
      vertices.forEach(function (vertex) {
        var vertexGeometry = vertex.getGeometry();
        

        var style = graph.getModel().getStyle(vertex);
        if (
          vertexGeometry != null &&
          vertex !== cell &&
          !(
            style.includes("rounded=1") ||
            style.includes("rounded=0") ||
            style.includes("shape=rectangle")
          ) &&
          vertexGeometry.x >= cellX &&
          vertexGeometry.y >= cellY &&
          vertexGeometry.x + vertexGeometry.width <= cellX + cellWidth &&
          vertexGeometry.y + vertexGeometry.height <= cellY + cellHeight &&
          !isVertexInsideAnyRectangle(vertex, innerRectangles)
        ) {
          addVertexToTable(vertex);
        }
      });
      self.editorUi.editor.graph.model.threagile.setIn(["trust_boundaries",cell.trust_boundarieskey, "technical_assets_inside"], technicalAssetsArray);
      
      function addVertexToTable(vertex) {
        var row = document.createElement("tr");
        var cellValue = document.createElement("td");
        cellValue.textContent = vertex.getValue();
        cellValue.style.padding = "8px";
        cellValue.style.width = "200px";
        row.appendChild(cellValue);
        let id = self.editorUi.editor.graph.model.threagile.getIn(["technical_assets",cellValue.textContent,"id"])
        technicalAssetsArray.push(id);
        table.appendChild(row);
      }
      tableContainer.appendChild(table);
      container.appendChild(tableContainer);
    }
  }
  var nestedTableContainer = document.createElement("div");
  nestedTableContainer.style.maxWidth = "300px";
  nestedTableContainer.id = "TrustBoundaryNestedID";
  var nestedTable = document.createElement("table");
  nestedTable.style.borderCollapse = "collapse";
  nestedTable.style.width = "90%";
  nestedTable.style.tableLayout = "fixed";

  var nestedHeaderRow = document.createElement("tr");
  var nestedHeaderCell = document.createElement("th");
  nestedHeaderCell.textContent = "Trust boundaries nested:";
  nestedHeaderCell.style.border = "1px solid #ccc";
  nestedHeaderCell.style.padding = "8px";
  nestedHeaderCell.style.backgroundColor = "#f0f0f0";
  nestedHeaderCell.style.textAlign = "left";
  nestedHeaderCell.colSpan = 2;
  nestedHeaderRow.appendChild(nestedHeaderCell);
  nestedTable.appendChild(nestedHeaderRow);
  var rectanglesArray= [];

  innerRectangles.forEach(function (rectangle) {
    
    var row = document.createElement("tr");
    var cellValue = document.createElement("td");
    cellValue.textContent = rectangle.getValue();
    cellValue.style.padding = "8px";
    cellValue.style.width = "200px";
    cellValue.style.boxSizing = "border-box";
    row.appendChild(cellValue);
    let id = self.editorUi.editor.graph.model.threagile.getIn(["trust_boundaries",cellValue.textContent,"id"])
    rectanglesArray.push(id);
    nestedTable.appendChild(row);
  });
  self.editorUi.editor.graph.model.threagile.setIn(["trust_boundaries",cell.trust_boundarieskey, "trust_boundaries_nested"], rectanglesArray);
    

  nestedTableContainer.appendChild(nestedTable);

  // Zum Beispiel an den Body-Element:
  container.appendChild(nestedTableContainer);
  return container;
};

