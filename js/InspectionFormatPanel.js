import {BaseFormatPanel} from './BaseFormatPanel.js';
import  {
    createSection,
    generateUniquekey,
    generateUniqueId
    }
from './Utils.js';


export const InspectionFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(InspectionFormatPanel, BaseFormatPanel);

InspectionFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  let self = this;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();
  let yaml = "";
  let cellsBegin =
    self.editorUi && self.editorUi.editor && self.editorUi.editor.graph
      ? self.editorUi.editor.graph.getSelectionCells()
      : null;
  let cellBegin = cellsBegin && cellsBegin.length > 0 ? cellsBegin[0] : null;
  

  const undefinedAsset = cellsBegin[0].technicalAsset === undefined 

  
  var technicalAssetId = !undefinedAsset
                               ? cellsBegin[0].technicalAsset 
                               : generateUniquekey(graph);


if (undefinedAsset)
{
    const path = ['technical_assets', technicalAssetId];
    const uniqueID = generateUniqueId(graph);
    if (!graph.model.threagile.hasIn(path)) {
      const assetProperties = {
        id: uniqueID,
        description: "Tech Asset",
        type: 'external-entity',
        usage: 'business',
        used_as_client_by_human: false,
        out_of_scope: false,
        justification_out_of_scope: 'Owned and managed by enduser customer',
        size: 'component',
        technology: 'browser',
        machine: 'physical',
        encryption: 'none',
        owner: 'Customer',
        confidentiality: 'internal',
        integrity: 'operational',
        availability: 'operational',
        justification_cia_rating: 'The client used by the customer to access the system.',
        multi_tenant: false,
        redundant: false,
        custom_developed_parts: false
    };
    Object.keys(assetProperties).forEach(property => {
      graph.model.threagile.setIn([...path, property], assetProperties[property]);
  });
 
    let cells = self.editorUi.editor.graph.getSelectionCells();
    let cell = cells && cells.length > 0 ? cells[0] : null;
    
    if (!cell.technicalAsset) { // Check if technicalAsset does not exist
      cell.technicalAsset = {}; // Initialize it as an empty object
      cell.technicalAsset["id"] = uniqueID ;
      cell.technicalAsset["key"] = technicalAssetId;
 
    }
     

    }
    if(graph.model.threagile.hasIn(['technical_assets','__DELETE_ME__',] )){
      graph.model.threagile.deleteIn(['technical_assets','__DELETE_ME__'])
    }

    let cells = self.editorUi.editor.graph.getSelectionCells();
    let cell = cells && cells.length > 0 ? cells[0] : null;
    let model = self.editorUi.editor.graph.model;
    model.beginUpdate();
      try {
        model.setValue(cell, technicalAssetId);
        self.editorUi.editor.graph.refresh(cell);
        self.editorUi.editor.graph.refresh();
      } finally {
        model.endUpdate();
      }
    
}

let start, end;

// Start timing
start = performance.now();

// Serialize the object to a string
let threagileString = graph.model.threagile.toString();

// End timing and calculate the duration
end = performance.now();
console.log('toString() time: ' + (end - start) + ' ms');

// Start timing again
start = performance.now();

// Parse the string with your custom function
let parsedString = window.parseModelViaString(threagileString);

// End timing and calculate the duration
end = performance.now();
console.log('parseModelViaString() time: ' + (end - start) + ' ms');

// Start timing again
start = performance.now();

if(!parsedString.technicalAssets && parsedString.includes("$$__ERROR__$$"))
{

  let errorMessage = parsedString.split("$$__ERROR__$$")[1];  // Extract the error message

  Swal.fire({
      title: '<span style="color: #333; font-family: Arial, sans-serif;">Error Detected!</span>',
      html: `<span style="font-family: Arial, sans-serif;">An error occurred while parsing the JSON object:<br/><strong>Error:</strong> ${errorMessage}</span>`,
      icon: 'error',
      iconColor: '#555',
      confirmButtonText: 'Close',
      confirmButtonColor: '#aaa',
      confirmButtonAriaLabel: 'Close the dialog',
      buttonsStyling: false,
      customClass: {
          confirmButton: 'custom-confirm-button-style',
          popup: 'custom-popup-style'
      },
      background: '#f0f0f0',  // Lighter background color
      backdrop: 'rgba(50, 50, 50, 0.4)',  // Less intense backdrop color
      didRender: function() {
          // Create styles for the custom classes dynamically
          const styleTag = document.createElement('style');
          styleTag.innerHTML = `
              .custom-confirm-button-style {
                  background-color: #aaa;  // More neutral button color
                  color: #fff;
                  border: none;
                  border-radius: 5px;
                  padding: 10px 20px;
                  font-size: 16px;
                  transition: background-color 0.3s ease;
              }
              .custom-confirm-button-style:hover {
                  background-color: #999;  // Darker hover effect
              }
              .custom-popup-style {
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  border-radius: 8px;
              }
          `;
          document.head.appendChild(styleTag);
      }
  });
}
      let jsonObj = (parsedString);

      // End timing and calculate the duration
      end = performance.now();
      console.log('JSON.parse() time: ' + (end - start) + ' ms');
      window.applyRAAJS();
      yaml = (window.applyRiskGenerationJS());

      let span = document.createElement("span");
      span.innerHTML = "<b>Relative Attacker Attractivness:</b> ";
      this.container.appendChild(span);
      let listContainer = document.createElement("div");
      listContainer.style.maxWidth = "400px";
      listContainer.style.margin = "0 auto";

      var list = document.createElement("ul");
      list.style.listStyleType = "none";
      list.style.padding = "0";

      var items = [];

      for (let i = 0; i < items.length; i++) {
        listItem.textContent = items[i];
        listItem.style.display = "flex";
        listItem.style.alignItems = "center";
        listItem.style.padding = "8px";
        listItem.style.borderBottom = "1px solid #ccc";

        let xButton = document.createElement("button");
        xButton.innerHTML =
          '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEV7mr3///+wksspAAAAAnRSTlP/AOW3MEoAAAAdSURBVAgdY9jXwCDDwNDRwHCwgeExmASygSL7GgB12QiqNHZZIwAAAABJRU5ErkJggg==" alt="X">';
        xButton.style.marginLeft = "auto";
        xButton.style.padding = "5px";
        xButton.style.backgroundColor = "transparent";
        xButton.style.border = "none";
        xButton.style.cursor = "pointer";

        listItem.appendChild(xButton);

        list.appendChild(listItem);
      }
function interpolateColorForRisks(minColor, maxColor, minVal, maxVal, val) {
    // Normalize the value between 0 and 1
    var step = (val - minVal) / (maxVal - minVal);
    step = Math.max(0, Math.min(1, step));
    
    // Use more muted colors
    const lowRiskColor = [76, 175, 80];    // Muted green
    const medRiskColor = [255, 152, 0];    // Muted amber/orange
    const highRiskColor = [183, 28, 28];   // Deeper red
    
    let red, green, blue;
    
    if (step < 0.5) {
        // Interpolate between low and medium
        const normalizedStep = step * 2;
        red = Math.round(lowRiskColor[0] + normalizedStep * (medRiskColor[0] - lowRiskColor[0]));
        green = Math.round(lowRiskColor[1] + normalizedStep * (medRiskColor[1] - lowRiskColor[1]));
        blue = Math.round(lowRiskColor[2] + normalizedStep * (medRiskColor[2] - lowRiskColor[2]));
    } else {
        // Interpolate between medium and high
        const normalizedStep = (step - 0.5) * 2;
        red = Math.round(medRiskColor[0] + normalizedStep * (highRiskColor[0] - medRiskColor[0]));
        green = Math.round(medRiskColor[1] + normalizedStep * (highRiskColor[1] - medRiskColor[1]));
        blue = Math.round(medRiskColor[2] + normalizedStep * (highRiskColor[2] - medRiskColor[2]));
    }
    
    return `rgb(${red}, ${green}, ${blue})`;
}
    
    
    function mapRiskLevel(value, category) {
      const mappings = {
          'severity': {
              'low': 1,
              'medium': 2,
              'elevated': 3,
              'high': 4,
              'critical': 5
          },
          'impact': {
              'low': 1,
              'medium': 2,
              'high': 3,
              'very-high': 4
          },
          'likelihood': {
              'unlikely': 1,
              'likely': 3,
              'very-likely': 4,
              'frequent': 5
          },
          'probability': {
              'improbable': 1,
              'possible': 2,
              'probable': 3
          }
      };
  
      return mappings[category][value.toLowerCase().replace('-', '')] || 0;
  }
  
    

      const lowRiskColor = [0, 255, 0]; // Green
      const highRiskColor = [255, 0, 0]; // Red
      
      if (
        yaml != "" &&
        technicalAssetId != "" &&
        technicalAssetId !== undefined
      ) {
        let filteredArray = [];
        // Gauge
        let gaugeElement = document.createElement("div");
        gaugeElement.id = "gaugeElement";
        gaugeElement.style.width = "234px";
        gaugeElement.style.height = "130px";

        this.container.appendChild(gaugeElement);
        
        if (typeof technicalAssetId === 'object' && technicalAssetId !== null) {
          technicalAssetId = technicalAssetId.key;
        }
        

        let id = graph.model.threagile.getIn(['technical_assets', technicalAssetId, "id"]);
        if (id === undefined)
        {
          const technicalAsset = graph.model.threagile.getIn(['technical_assets', technicalAssetId]);
          if(graph.model.threagile.getIn(['technical_assets', technicalAssetId, "id"]) === undefined)
          {
              let threat = self.editorUi.editor.graph.model.threagile.getIn(['technical_assets', technicalAssetId]);
              if (typeof threat.toJSON === 'function') {
                threat= threat.toJSON();
              }
 
            id = threat.id;
          }
          else {
            id = technicalAsset ? technicalAsset.title : undefined; 
          }
        }
        let RAA = jsonObj.technicalAssets[id].raa;
        let gauge = new JustGage({
          id: "gaugeElement",
          value: RAA == 1 ? 0: RAA,
          min: 0,
          max: 100,
          decimals: 2,
          gaugeWidthScale: 0.6,
        });
        for (const riskArray of yaml.values()) {
            // Iterate through each individual risk object in the current array
            for (const risk of riskArray) {
                // Check if the risk object exists and has a syntheticId property
                if (risk && risk.syntheticId && typeof risk.syntheticId === 'string') {
                    // Perform the check using the risk object's syntheticId
                    if (risk.syntheticId.includes(id)) {
                        filteredArray.push(risk); // Add the matching risk object
                    }
                } else {
                    // Optional: Log if a risk object is malformed
                    // console.warn("Encountered invalid risk object structure:", risk);
                }
            }
        }
        for (let jsonData in filteredArray) {
          let value = filteredArray[jsonData];
          let riskScore = 0;

          riskScore += mapRiskLevel(value.severity, 'severity');
          riskScore += mapRiskLevel(value.exploitationImpact, 'impact');
          riskScore += mapRiskLevel(value.exploitationLikelihood, 'likelihood');
          riskScore *= mapRiskLevel(value.dataBreachProbability, 'probability');
          let maxRiskScore = (5 + 4 + 5) * 3; // Severity + Impact + Likelihood, multiplied by Probability
      
          let regex = /<b>(.*?)<\/b>/i;
          let match = regex.exec(filteredArray[jsonData].title);
          let property = "";
          if (match && match[1]) {
            property = match[1];
          }
          let clonedMenu = this.addInspectionMenu(
            this.createPanel(),
            filteredArray[jsonData]
          );
          clonedMenu.id = property;
          var listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.flexDirection = "column";
          listItem.style.padding = "8px";
          listItem.style.borderBottom = "1px solid #ccc";
          let initialColor = interpolateColorForRisks(lowRiskColor, highRiskColor, 0, 25, riskScore);
          listItem.style.backgroundColor = initialColor;
          listItem.dataset.initialColor = initialColor;
          listItem.metaData = value;

          let parentNode = clonedMenu.childNodes[0];
          for (var key in value) {
            if (value.hasOwnProperty(key)) {
              var childNode = value[key];
              for (var i = 0; i < parentNode.childNodes.length; i++) {
                    var currentChildNode = parentNode.childNodes[i];
                            if (currentChildNode.nodeType === Node.ELEMENT_NODE) {
                        if (currentChildNode.id && currentChildNode.id.startsWith("exploitation_")) {
                            console.log('Original ID:', currentChildNode.id); // Optional: log original ID
                            currentChildNode.id = currentChildNode.id.substring("exploitation_".length);
                            console.log('Updated ID:', currentChildNode.id); // Optional: log updated ID
                        }
                        if (currentChildNode.children.length > 0){
                        let exploit_prefix= "exploitation_"+ currentChildNode.children[0].textContent;
                        let data_breach_prefix= "data_breach_"+ currentChildNode.children[0].textContent;

                         if (currentChildNode.children[0].textContent === key ||  exploit_prefix === key || data_breach_prefix == key) {
                            if (currentChildNode.children.length > 1 && currentChildNode.childNodes.length > 0) {
                                let nextChildNode = currentChildNode.children[1].children[0];
        
                                for (let i = 0; i < nextChildNode.options.length; i++) {
                                  if (nextChildNode.options[i].value === childNode) {
                                      nextChildNode.selectedIndex = i;
                                      break;
                                  }
                              }
                              }
                              }
                        }
                    }
                }
            }
        }
        
          let textContainer = document.createElement("div");
          textContainer.style.display = "flex";
          textContainer.style.alignItems = "center";
          textContainer.style.marginBottom = "8px";
          let arrowIcon = document.createElement("img");
          textContainer.style.color = "black";  // Assuming white text for contrast
          textContainer.style.fontWeight = "bold";  // Make the font bold
          arrowIcon.src =
            " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
          arrowIcon.style.width = "15px";
          arrowIcon.style.height = "15px";
          arrowIcon.style.marginRight = "5px";
          let dataText = document.createElement("div");
          dataText.textContent = property;

          arrowIcon.style.transform = "rotate(270deg)";
          textContainer.appendChild(arrowIcon);
          textContainer.appendChild(dataText);

          textContainer.appendChild(dataText);
          let current = { visible: false };
            
          
          if (current.visible) {
            listItem.style.backgroundColor = "";
            arrowIcon.style.transform = "rotate(270deg)";
            clonedMenu.style.display = "block";
          } else {
            listItem.style.backgroundColor =  listItem.dataset.initialColor;
            arrowIcon.style.transform = "rotate(90deg)";
            clonedMenu.style.display = "none";
          }

          listItem.appendChild(textContainer);
          listItem.appendChild(clonedMenu);
          function toggleContent() {

            if (!current.visible) {
              console.log('Expanding: Removing background color');
              listItem.style.backgroundColor = "";  
              arrowIcon.style.transform = "rotate(270deg)";
              clonedMenu.style.display = "block";
              listItem.focus(); 
            } else {
              console.log('Collapsing: Setting background color to', listItem.dataset.initialColor);
              listItem.style.backgroundColor = listItem.dataset.initialColor;  
              
              arrowIcon.style.transform = "rotate(90deg)";
              clonedMenu.style.display = "none";
            }
            current.visible = !current.visible;
          }
          arrowIcon.addEventListener("click", toggleContent);
          dataText.addEventListener("click", toggleContent);
          listItem.setAttribute('tabindex', '0');  
          // Global or higher scoped variable to keep track of highlighted cells
          if(self.editorUi.editor.graph.highlightedCells===undefined){
            self.editorUi.editor.graph.highlightedCells= [];
          }

          function handleFocusIn() {
            console.log('Item focused');
            listItem.style.outline = '2px solid blue';
            const separators = /[@><]/;

            function findCommunicationLinkName(communicationLink, graphJson) {
              const { source, target } = (communicationLink);
          
              const technicalAssets = graphJson.technical_assets;
                  // Iterate over the keys of the technical assets to find the correct asset
              for (let key in technicalAssets) {
                if (technicalAssets[key].id === source) {
                    sourceAsset = technicalAssets[key];
                    break; // Exit the loop once the matching asset is found
                }
            }

            if (!sourceAsset) {
                return null;
            }

            // Variable to store the found communication link
            let matchingLink = null;

            // Iterate over the keys of the communication links to find the matching link
            for (let key in sourceAsset.communication_links) {
                if (sourceAsset.communication_links[key].target === target) {
                    matchingLink = sourceAsset.communication_links[key];
                    break; // Exit the loop once the matching link is found
                }
            }       
              if (matchingLink) {
                  return matchingLink;
              } else {
                  return null;
              }
          }
          

          function extractComponents(link) {
            let separatorIndex = link.indexOf('>'); // Find the index of the first '>'
            if (separatorIndex === -1) {
                return null; // Return null if '>' is not found
            }
        
            // Extract everything before and after the first '>'
            let source = link.substring(0, separatorIndex);
            let target = link.substring(separatorIndex + 1);
        
            return {
                source: source,
                target: target
            };
        }
        

            const elements = listItem.metaData.synthetic_id.split(separators);
            const comm = listItem.metaData.most_relevant_communication_link;
            const components = extractComponents(comm);
            let communicationLinkName;
            if(components!= null)
            {
              let threat = self.editorUi.editor.graph.model.threagile;
              if (typeof threat.toJSON === 'function') {
                threat= threat.toJSON();
              }
              communicationLinkName = findCommunicationLinkName(components, threat);
            }
            var model = graph.getModel();  
            var allCells = model.cells;   

            
            function highlightCell(cell) {
              var graph = this.editorUi.editor.graph;
              let highlight = new mxCellHighlight(graph, '#FF0000', 8); // Increased width to 8
              highlight.opacity = 90; // Optional: Set opacity to 90% for stronger visual impact
              highlight.highlight(graph.view.getState(cell)); // Apply highlight to the cell state
      
             
                  highlight.highlight(graph.view.getState(cell)); // Apply highlight to the cell state
              
          
              if (!graph.highlightedCells) {
                  graph.highlightedCells = []; // Initialize if not already set
              }
              graph.highlightedCells.push(highlight); // Keep track of highlighted cells
          }
          
          self.editorUi.editor.graph.model.beginUpdate();
            for (var key in allCells) {
              if (allCells.hasOwnProperty(key)) {
                var cell = allCells[key];  // Get the cell object

                if (communicationLinkName && model.isEdge(cell)) {
                  

                  let object = cell.communicationAsset;
                  if (typeof object.toJSON === 'function') {
                    object = object.toJSON();
                  }
                  if (communicationLinkName.description === object.description && communicationLinkName.target ===object.target  ) {
                     highlightCell(cell);
                  }
                } else if (model.isVertex(cell)) {
                  var style = cell.getStyle();
                  if (style && !style.includes('shape=rectangle')) {
                    var technicalAssetId = cell.technicalAsset.id;
                    if (elements.includes(technicalAssetId)) {
                      highlightCell(cell);
                    }
                  }
                }
              }
            }
            self.editorUi.editor.graph.model.endUpdate();
          }

          function handleFocusOut() {
            console.log('Item focus out');
            listItem.style.outline = 'none';
            let highlightedCells = self.editorUi.editor.graph.highlightedCells;
            // Function to remove highlight from a cell
            function removeHighlight(cell) {
              cell.destroy();
            }

            self.editorUi.editor.graph.model.beginUpdate();
            highlightedCells.forEach(cell => {
              removeHighlight(cell);
            });
            self.editorUi.editor.graph.model.endUpdate();

            // Clear the array after removing highlights
            highlightedCells = [];
          }
  
          listItem.addEventListener('focusin', handleFocusIn);
          listItem.addEventListener('focusout', handleFocusOut);
  
          list.appendChild(listItem);
        }
      }

      let generalHeader = document.createElement("div");
      generalHeader.innerHTML = "Risks:";
      generalHeader.style.padding = "10px 0px 6px 0px";
      generalHeader.style.whiteSpace = "nowrap";
      generalHeader.style.overflow = "hidden";
      generalHeader.style.width = "200px";
      generalHeader.style.fontWeight = "bold";
      this.container.appendChild(generalHeader);

      listContainer.appendChild(list);
      this.container.appendChild(listContainer);

      let listContainer2 = document.createElement("div");
      listContainer2.style.maxWidth = "400px";
      listContainer2.style.margin = "0 auto";

      let list2 = document.createElement("ul");
      list2.style.listStyleType = "none";
      list2.style.padding = "0";

      let riskTracking = document.createElement("div");
      riskTracking.innerHTML = "RisksTracking:";
      riskTracking.style.padding = "10px 0px 6px 0px";
      riskTracking.style.whiteSpace = "nowrap";
      riskTracking.style.overflow = "hidden";
      riskTracking.style.width = "200px";
      riskTracking.style.fontWeight = "bold";
      this.container.appendChild(riskTracking);

      listContainer2.appendChild(list2);
      this.container.appendChild(listContainer2);

      if (yaml != "") {
        let cellsBegin = self.editorUi.editor.graph.getSelectionCells();
        let cellBegin =
          cellsBegin && cellsBegin.length > 0 ? cellsBegin[0] : null;

        let technicalAssetId = cellBegin.technicalAsset["id"];
        let filteredArray = [];

        for (var i = 0; i < yaml.length; i++) {
          let obj = yaml[i];
          if (obj.synthetic_id.includes(technicalAssetId)) {
            filteredArray.push(obj);
          }
        }
        for (let jsonData in filteredArray) {
          let value = filteredArray[jsonData];

          let regex = /<b>(.*?)<\/b>/i;
          let match = regex.exec(filteredArray[jsonData].title);
          let property = "";
          if (match && match[1]) {
            property = match[1];
          }
          let clonedMenu = this.addInspectionMenu2(
            this.createPanel(),
            filteredArray[jsonData]
          );
          clonedMenu.id = property;
          let listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.flexDirection = "column";
          listItem.style.padding = "8px";
          listItem.style.borderBottom = "1px solid #ccc";
          let parentNode = clonedMenu.childNodes[0];
          for (var key in value) {
            if (value.hasOwnProperty(key)) {
              var childNode = value[key];

              for (var i = 0; i < parentNode.childNodes.length; i++) {
                var currentChildNode = parentNode.childNodes[i];

                if (
                  currentChildNode.nodeType === Node.ELEMENT_NODE &&
                  currentChildNode.children.length > 0 &&
                  currentChildNode.children[0].textContent === key
                ) {
                  if (
                    currentChildNode.children.length > 1 &&
                    currentChildNode.childNodes.length > 0
                  ) {
                    let nextChildNode =
                      currentChildNode.children[1].children[0];

                    if (nextChildNode.nodeName === "SELECT") {
                      nextChildNode.selectedIndex = childNode;
                    }
                  }
                }
              }
            }
          }
          let textContainer = document.createElement("div");
          textContainer.style.display = "flex";
          textContainer.style.alignItems = "center";
          textContainer.style.marginBottom = "8px";
          let arrowIcon = document.createElement("img");
          arrowIcon.src =
            " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
          arrowIcon.style.width = "15px";
          arrowIcon.style.height = "15px";
          arrowIcon.style.marginRight = "5px";
          let dataText = document.createElement("div");
          dataText.textContent = property;

          arrowIcon.style.transform = "rotate(270deg)";
          textContainer.appendChild(arrowIcon);
          textContainer.appendChild(dataText);

          textContainer.appendChild(dataText);
          let current = false;
     
          let state = current;
          if (state) {
            listItem.style.backgroundColor = "";
            arrowIcon.style.transform = "rotate(270deg)";
            clonedMenu.style.display = "block";
          } else {
            listItem.style.backgroundColor = "lightgray";
            arrowIcon.style.transform = "rotate(90deg)";
            clonedMenu.style.display = "none";
          }

          listItem.appendChild(textContainer);
          listItem.appendChild(clonedMenu);
          function toggleContent() {
            let state = current;
            current = !current;
            if (!state) {
              listItem.style.backgroundColor = "";
              arrowIcon.style.transform = "rotate(270deg)";
              clonedMenu.style.display = "block";
            } else {
              listItem.style.backgroundColor = "lightgray";
              arrowIcon.style.transform = "rotate(90deg)";
              clonedMenu.style.display = "none";
            }
          }
          arrowIcon.addEventListener("click", toggleContent);
          dataText.addEventListener("click", toggleContent);

          list2.appendChild(listItem);
        }
      }
    
};
InspectionFormatPanel.prototype.addInspectionFormatMenuDynamic = function (
  container,
  graph,
  yaml
) {
  var self = this;
  let jsonContainer = document.createElement("div");
  let cellsBegin = self.editorUi.editor.graph.getSelectionCells();
  let cellBegin = cellsBegin && cellsBegin.length > 0 ? cellsBegin[0] : null;

  let technicalAssetId = cellBegin.technicalAsset["id"];
  var filteredArray = [];

  for (var i = 0; i < yaml.length; i++) {
    var obj = yaml[i];
    if (obj.synthetic_id.includes(technicalAssetId)) {
      filteredArray.push(obj);
    }
  }
  for (let jsonData in filteredArray) {
    for (let key in filteredArray[jsonData]) {
      let value = filteredArray[jsonData][key];

      let propertyName = document.createElement("span");
      propertyName.innerHTML = key;
      propertyName.style.width = "100px";
      propertyName.style.marginRight = "10px";

      let propertyValue = document.createElement("span");
      propertyValue.innerHTML = value;

      jsonContainer.appendChild(propertyName);
      jsonContainer.appendChild(propertyValue);
      jsonContainer.appendChild(document.createElement("br"));
    }
    container.appendChild(jsonContainer);
  }

  // Add line break
  // Add Properties section
  var propertiesSection = createSection("Properties");
  container.appendChild(propertiesSection);

  var typeProperties = {
    id: {
      description: "ID",
      type: "button",
      tooltip: "The unique identifier for the element",
      defaultValue: "E.g. Element1",
    },
    description: {
      description: "Description",
      type: "button",
      tooltip: "Provide a brief description of the element",
      defaultValue: "E.g. This element is responsible for...",
    },
    usage: {
      description: "Usage",
      type: "select",
      options: ["business", "devops"],
      tooltip:
        "Indicates whether the element is used for business or devops purposes",
      defaultValue: "business",
    },
    tags: {
      description: "Tags",
      type: "array",
      uniqueItems: true,
      items: {
        type: "button",
      },
      tooltip: "Provide tags to help categorize the element",
      defaultValue: "E.g. Tag1",
    },
    origin: {
      description: "Origin",
      type: "button",
      tooltip: "Specifies the origin of the element",
      defaultValue: "E.g. Internal Development",
    },
    owner: {
      description: "Owner",
      type: "button",
      tooltip: "Specifies the owner of the element",
      defaultValue: "E.g. Marketing Team",
    },
    quantity: {
      description: "Quantity",
      type: "select",
      options: ["very-few", "few", "many", "very-many"],
      tooltip: "Specifies the quantity of the element",
      defaultValue: "few",
    },
    confidentiality: {
      description: "Confidentiality",
      type: "select",
      options: [
        "public",
        "internal",
        "restricted",
        "confidential",
        "strictly-confidential",
      ],
      tooltip: "Specifies the level of confidentiality of the element",
      defaultValue: "internal",
    },
    integrity: {
      description: "Integrity",
      type: "select",
      options: [
        "archive",
        "operational",
        "important",
        "critical",
        "mission-critical",
      ],
      tooltip: "Specifies the level of integrity of the element",
      defaultValue: "operational",
    },
    availability: {
      description: "Availability",
      type: "select",
      options: [
        "archive",
        "operational",
        "important",
        "critical",
        "mission-critical",
      ],
      tooltip: "Specifies the level of availability of the element",
      defaultValue: "operational",
    },
    justification_cia_rating: {
      description: "Justification of the rating",
      type: "button",
      tooltip:
        "Justify the confidentiality, integrity, and availability rating",
      defaultValue: "E.g. This rating is due to...",
    },
  };
  var customListener = {
    install: function (apply) {
      this.listener = function () {};
    },
    destroy: function () {},
  };

  var self = this;

  var typePropertiesMap = {};
  for (let property in typeProperties) {
    var typeItem = document.createElement("li");
    typeItem.style.display = "flex";
    typeItem.style.alignItems = "baseline";
    typeItem.style.marginBottom = "8px";

    var propertyName = document.createElement("span");
    propertyName.innerHTML = property;
    propertyName.style.width = "100px";
    propertyName.style.marginRight = "10px";

    var propertyType = typeProperties[property].type;

    if (propertyType === "select") {
      const propertySelect = property;
      typeItem.appendChild(propertyName);
      var selectContainer = document.createElement("div");
      selectContainer.style.display = "flex";
      selectContainer.style.alignItems = "center";
      selectContainer.style.marginLeft = "auto";

      var selectDropdown = document.createElement("select");
      selectDropdown.style.width = "100px";
      selectDropdown.title = typeProperties[property].tooltip;
      selectContainer.appendChild(selectDropdown);

      var options = typeProperties[property].options;
      for (var i = 0; i < options.length; i++) {
        var option = document.createElement("option");
        option.value = options[i];
        option.text = options[i];
        selectDropdown.appendChild(option);
      }

      var createChangeListener = function (selectDropdown, property) {
        var self = this.editorUi;
        return function (evt) {
          var dataAssetId =
          evt.target.parentNode.parentNode.parentNode.parentNode.textContent.split(':')[0];
          let dataAsset = graph.model.threagile.getIn(["data_assets",dataAssetId]);
          let current = dataAsset;
          var newValue = selectDropdown.value;
          currentValue = newValue;
          if (!current[property]) {
            current[property] = "";
          }
          if (newValue != null) {
            current[property] = newValue;
          }
        };
      }.bind(this);

      mxEvent.addListener(
        selectDropdown,
        "change",
        createChangeListener(selectDropdown, property)
      );

      typeItem.appendChild(selectContainer);
    } else if (propertyType === "checkbox") {
      let optionElement = this.createOption(
        property,
        createCustomOption(self, property),
        setCustomOption(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;
      container.appendChild(optionElement);
    } else if (propertyType === "button") {
      let functionName =
        "editData" + property.charAt(0).toUpperCase() + property.slice(1);
      let button = mxUtils.button(
        property,
        mxUtils.bind(this, function (evt) {
          var dataAssetId =
          evt.target.parentNode.parentNode.parentNode.parentNode.textContent.split(':')[0];

          let current = graph.model.threagile.getIn(["data_assets",dataAssetId]);


          if (!current[property]) {
            current[property] = typeProperties[property].defaultValue;
          }

          var dataValue = current[property];

          var dlg = new TextareaDialog(
            this.editorUi,
            property + ":",
            dataValue,
            function (newValue) {
              if (newValue != null) {
                current[property] = newValue;
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
    }
    propertiesSection.appendChild(typeItem);
  }
  /*
  let inputElement = document.createElement("input");
  inputElement.placeholder = "Enter your tags and press Enter";
  propertiesSection.appendChild(inputElement);
  var tagify = new Tagify(inputElement);
  */
  return container;
};


InspectionFormatPanel.prototype.addInspectionMenu2 = function (
  container,
  value
) {
  let self = this;

  var propertiesSection = createSection("risk_identified:");
  container.appendChild(propertiesSection);

  let typeProperties = {
    status: {
      description: "Status",
      type: "select",
      options: [
        "unchecked",
        "in-discussion",
        "accepted",
        "in-progress",
        "mitigated",
        "false-positive",
      ],
      tooltip:
        "The status indicates the current stage of processing for the risk.",
      defaultValue: "unchecked",
    },
    justification: {
      description: "Justification",
      type: "button",
      defaultValue: "",
      tooltip:
        "The justification describes why the risk is considered relevant or explains the reasoning behind specific actions taken.",
    },
    ticket: {
      description: "Ticket",
      type: "button",
      defaultValue: "",
      tooltip:
        "The ticket refers to the associated issue tracking system where additional details or activities related to the risk can be recorded.",
    },
    date: {
      description: "Date",
      type: "button",
      format: "date",
      defaultValue: "",
      tooltip: "The date indicates when the risk was captured or last updated.",
    },
    checked_by: {
      description: "Checked by",
      type: "button",
      defaultValue: "",
      tooltip:
        "The 'Checked by' field specifies the individual or team responsible for verifying the risk mitigation measures.",
    },
  };

  var customListener = {
    install: function (apply) {
      this.listener = function () {};
    },
    destroy: function () {},
  };

  var typePropertiesMap = {};
  for (let property in typeProperties) {
    var typeItem = document.createElement("li");
    typeItem.style.display = "flex";
    typeItem.style.alignItems = "baseline";
    typeItem.style.marginBottom = "8px";

    var propertyName = document.createElement("span");
    propertyName.innerHTML = property;
    propertyName.style.width = "100px";
    propertyName.style.marginRight = "10px";
    propertyName.innerHTML = property.replace(
      /exploitation_|data_breach_/g,
      ""
    );

    var propertyType = typeProperties[property].type;

    if (propertyType === "select") {
      const propertySelect = property;
      typeItem.appendChild(propertyName);

      var selectContainer = document.createElement("div");
      selectContainer.style.display = "flex";
      selectContainer.style.alignItems = "center";
      selectContainer.style.marginLeft = "auto";

      var selectDropdown = document.createElement("select");
      selectDropdown.style.width = "100px";
      selectDropdown.title = typeProperties[property].tooltip;

      var options = typeProperties[property].options;
      for (var i = 0; i < options.length; i++) {
        var option = document.createElement("option");
        option.value = options[i];
        option.text = options[i];
        selectDropdown.appendChild(option);
      }

      selectContainer.appendChild(selectDropdown);

      var createChangeListener = function (selectDropdown, property) {
        var self = this.editorUi;
        return function (evt) {
          
          let str = evt.target.parentNode.parentNode.parentNode.parentNode.textContent;
          str = str.slice(0, str.indexOf(":"));
          
          var newValue = selectDropdown.value;
          currentValue = newValue;

          let current = self.graph.model.threagile.getIn(["data_assets", str]);
          if (!current) {
            self.graph.model.threagile.setIn(["data_assets", str, property], "")
            
          }
          if (newValue != null) {
            self.graph.model.threagile.setIn(["data_assets", str, property], newValue)
          }
        };
      }.bind(this);

      mxEvent.addListener(
        selectDropdown,
        "change",
        createChangeListener(selectDropdown, property)
      );

      typeItem.appendChild(selectContainer);
    } else if (propertyType === "checkbox") {
      let optionElement = this.createOption(
        property,
        createCustomOption(self, property),
        setCustomOption(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;
      container.appendChild(optionElement);
    } else if (propertyType === "button") {
      let functionName =
        "editData" + property.charAt(0).toUpperCase() + property.slice(1);
      let button = mxUtils.button(
        property,
        mxUtils.bind(this, function (evt) {
          var menuId = evt.target.parentNode.parentNode.parentNode.id;
          current = value;

          if (!current[property]) {
            current[property] = typeProperties[property].defaultValue;
          }

          var dataValue = current[property];

          var dlg = new TextareaDialog(
            this.editorUi,
            property + ":",
            dataValue,
            function (newValue) {
              if (newValue != null) {
                current[property] = newValue;
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
    }
    propertiesSection.appendChild(typeItem);
  }
  return container;
};

InspectionFormatPanel.prototype.addInspectionMenu = function (
  container,
  value
) {
  let self = this;
  var propertiesSection = createSection("risk_identified:");
  container.appendChild(propertiesSection);

  let typeProperties = {
    severity: {
      description: "Severity",
      type: "select",
      options: ["low", "medium", "elevated", "high", "critical"],
      tooltip: "Specifies the severity level",
      defaultValue: "low",
    },
    exploitation_likelihood: {
      description: "Exploitation Likelihood",
      type: "select",
      options: ["unlikely", "likely", "very-likely", "frequent"],
      tooltip: "Specifies the likelihood of exploitation",
      defaultValue: "unlikely",
    },
    exploitation_impact: {
      description: "Exploitation Impact",
      type: "select",
      options: ["low", "medium", "high", "very-high"],
      tooltip: "Specifies the impact of exploitation",
      defaultValue: "low",
    },
    data_breach_probability: {
      description: "Data Breach Probability",
      type: "select",
      options: ["improbable", "possible", "probable"],
      tooltip: "Specifies the probability of a data breach",
      defaultValue: "improbable",
    },
    data_breach_technical_assets: {
      description: "Data Breach Technical Assets",
      type: "array",
      uniqueItems: true,
      items: {
        type: "button",
      },
      tooltip: "List of technical asset IDs which might have data breach",
      defaultValue: [],
    },
    most_relevant_data_asset: {
      description: "Most Relevant Data Asset",
      type: "button",
      tooltip: "Specifies the most relevant data asset",
      defaultValue: "",
    },
    most_relevant_technical_asset: {
      description: "Most Relevant Technical Asset",
      type: "button",
      tooltip: "Specifies the most relevant technical asset",
      defaultValue: "",
    },
    most_relevant_communication_link: {
      description: "Most Relevant Communication Link",
      type: "button",
      tooltip: "Specifies the most relevant communication link",
      defaultValue: "",
    },
    most_relevant_trust_boundary: {
      description: "Most Relevant Trust Boundary",
      type: "button",
      tooltip: "Specifies the most relevant trust boundary",
      defaultValue: "",
    },
    most_relevant_shared_runtime: {
      description: "Most Relevant Shared Runtime",
      type: "button",
      tooltip: "Specifies the most relevant shared runtime",
      defaultValue: "",
    },
  };
  var customListener = {
    install: function (apply) {
      this.listener = function () {};
    },
    destroy: function () {},
  };

  var typePropertiesMap = {};
  for (let property in typeProperties) {
    var typeItem = document.createElement("li");
    typeItem.style.display = "flex";
    typeItem.style.alignItems = "baseline";
    typeItem.style.marginBottom = "8px";

    var propertyName = document.createElement("span");
    propertyName.innerHTML = property;
    propertyName.style.width = "100px";
    propertyName.style.marginRight = "10px";
    propertyName.innerHTML = property.replace(
      /exploitation_|data_breach_/g,
      ""
    );

    var propertyType = typeProperties[property].type;

    if (propertyType === "select") {
      const propertySelect = property;
      typeItem.appendChild(propertyName);

      var selectContainer = document.createElement("div");
      selectContainer.style.display = "flex";
      selectContainer.style.alignItems = "center";
      selectContainer.style.marginLeft = "auto";

      var selectDropdown = document.createElement("select");
      selectDropdown.style.width = "100px";
      selectDropdown.title = typeProperties[property].tooltip;

      var options = typeProperties[property].options;
      for (var i = 0; i < options.length; i++) {
        var option = document.createElement("option");
        option.value = options[i];
        option.text = options[i];
        selectDropdown.appendChild(option);
      }

      selectContainer.appendChild(selectDropdown);

      var createChangeListener = function (selectDropdown, property) {
        var self = this.editorUi;
        return function (evt) {
          var menuId =
            evt.target.parentNode.parentNode.parentNode.parentNode.id;
          var newValue = selectDropdown.value;
          currentValue = newValue;

          let current = value;
          if (!current[property]) {
            current[property] = "";
          }
          if (newValue != null) {
            current[property] = newValue;
          }
        };
      }.bind(this);

      mxEvent.addListener(
        selectDropdown,
        "change",
        createChangeListener(selectDropdown, property)
      );

      typeItem.appendChild(selectContainer);
    } else if (propertyType === "checkbox") {
      let optionElement = this.createOption(
        property,
        createCustomOption(self, property),
        setCustomOption(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;
      container.appendChild(optionElement);
    } else if (propertyType === "button") {
      let functionName =
        "editData" + property.charAt(0).toUpperCase() + property.slice(1);
      let button = mxUtils.button(
        property,
        mxUtils.bind(this, function (evt) {
          var menuId = evt.target.parentNode.parentNode.parentNode.id;
          current = value;

          if (!current[property]) {
            current[property] = typeProperties[property].defaultValue;
          }

          var dataValue = current[property];

          var dlg = new TextareaDialog(
            this.editorUi,
            property + ":",
            dataValue,
            function (newValue) {
              if (newValue != null) {
                current[property] = newValue;
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
    }
    propertiesSection.appendChild(typeItem);
  }
  /*
  // Create a new input element
  let inputElement = document.createElement("input");
  inputElement.placeholder = "Enter your tags and press Enter";
  // Append it to body (or any other container)
  propertiesSection.appendChild(inputElement);
  var tagify = new Tagify(inputElement);
  //
*/
  return container;
};

