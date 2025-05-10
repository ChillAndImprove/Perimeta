import {BaseFormatPanel} from './BaseFormatPanel.js';
import  {
    createSection,
    restartWasm,
    generateUniquekeyData,
    generateRandomId,
    generateUniquedataId
} from './Utils.js';


export const DiagramFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(DiagramFormatPanel, BaseFormatPanel);

DiagramFormatPanel.prototype.init = function () {
/**
 * Removes occurrences of a specific ID from a collection (JS Array or YAML Sequence).
 * Uses eemeli/yaml methods (.get, .delete) for YAML Sequences, accessing the .value
 * property of Scalar nodes for comparison. Modifies the collection IN PLACE.
 *
 * @param {Array|object} arr - The collection to modify (original JS Array or YAML Sequence object from the model).
 * @param {string} idToRemove - The ID string value to search for and remove.
 * @param {string} path - The location of this collection in the model (for logging).
 */
function removeIdFromArray(arr, idToRemove, path) {
    // 1. Handle null or undefined input
    if (!arr) {
        // console.log(`    Skipping removal for path "${path}": Collection is null or undefined.`);
        return;
    }

    let removed = false;

    // 2. Handle standard JavaScript Arrays (assuming direct string values)
    if (Array.isArray(arr)) {
        // console.log(`    Checking JS Array at path "${path}" for removal of "${idToRemove}"`);
        // Iterate backwards to safely remove elements using splice
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] === idToRemove) {
                console.log(`      Removing ID at ${path}[${i}]: "${idToRemove}" (JS Array)`);
                arr.splice(i, 1); // Remove element at index i
                removed = true;
            }
        }
    }
    // 3. Handle YAML Sequences (using eemeli/yaml API)
    //    Check for properties/methods typical of YAMLSeq from 'yaml' library.
    else if (typeof arr.get === 'function' && typeof arr.delete === 'function' && Array.isArray(arr.items)) {
        // console.log(`    Checking YAML Sequence at path "${path}" for removal of "${idToRemove}"`);
        // Iterate backwards to safely remove elements using .delete(index)
        // Use the length of the underlying items array for the loop boundary
        for (let i = arr.items.length - 1; i >= 0; i--) {
            // Use .get(index) to retrieve the *Node object* or value
            const currentNodeOrValue = arr.get(i);

            // Determine the actual value to compare
            // Check if it's a Node with a 'value' property (like Scalar) or just the value itself
            let currentValue;
            if (currentNodeOrValue && typeof currentNodeOrValue === 'object' && currentNodeOrValue.hasOwnProperty('value')) {
                // It's likely a Scalar or similar Node from 'yaml'
                 currentValue = currentNodeOrValue.value;
                 // Ensure we are comparing against the actual value, not the Node itself
                 // The original code had a potential bug here: it compared currentNode === oldId
                 // which might fail if currentNode is a Scalar object. It should have been currentNode.value === oldId
            } else {
                // It might be a direct value if the sequence holds primitives directly
                // or if .get() resolved the node to its value automatically in some cases.
                currentValue = currentNodeOrValue;
            }


            // Compare the determined value with the ID to remove
            if (currentValue === idToRemove) {
                console.log(`      Removing ID at ${path}[${i}]: Value "${idToRemove}" (YAML Seq)`);

                // Use .delete(index) to remove the item from the YAML sequence IN PLACE.
                arr.delete(i);
                removed = true;
            }
        }
    }
     // 4. Handle other potential collection types (add specific checks if needed)
     //    Attempting generic sequence removal if API matches
     else if (typeof arr.get === 'function' && typeof arr.delete === 'function' && typeof arr.size === 'number') {
         console.warn(`    Path "${path}": Attempting removal in map-like sequence for "${idToRemove}". Logic assumes sequence behavior.`);
          // Iterate backwards assuming sequence-like indexing
          // Note: .size might not reflect indices directly if keys aren't 0..N-1
          // This part is heuristic and might fail depending on the actual object type.
          // A more robust solution would require knowing the exact type or structure.
          // We'll iterate based on presumed indices up to size - 1 if possible,
          // but a safer approach might be needed. Let's stick to the known .items.length if available,
          // otherwise this branch might be unreliable for removal.
          // *Correction*: The original logic checked arr.items.length. If that's not present, iterating
          // based on .size for deletion by index is risky. Let's refine this branch.
          // *Revision*: If it has get/delete/size but not items, it's less likely a standard sequence.
          // Maybe iterate keys if possible? Or just log a more specific warning.
          // Let's keep the warning strong and avoid potentially incorrect deletions.
         console.warn(`    Path "${path}": Encountered map-like structure with get/delete/size but no 'items' array. Cannot reliably perform indexed removal. Skipping removal for this specific type.`);
         // Removed the potentially incorrect backwards loop for this case.
     }
    // 5. Log if type is unsupported
    else {
        console.warn(`    Skipping removal for path "${path}": Unsupported collection type or structure for removal. Type: ${typeof arr}`, arr);
        return;
    }

    // Optional: Log if no changes were made
    // if (!removed) {
    //     console.log(`    No instances of "${idToRemove}" found to remove in ${path}`);
    // }
}
/**
 * Removes all known references to a data asset ID from relevant arrays/sequences
 * throughout the Threagile model.
 * Handles technical assets (processed/stored data), top-level communication links (sent/received data),
 * and nested communication links (sent/received data). Modifies the model IN PLACE.
 * NOTE: Does not currently modify risk_tracking entries.
 *
 * @param {object} model - The parsed Threagile model object (likely a YAML Document or YAMLMap).
 * @param {string} idToRemove - The data asset ID to remove from arrays/sequences.
 */
function removeReferences(model, idToRemove) {
    console.log(`>>> Starting reference removal for Data Asset ID: ${idToRemove}`);

    // Helper to check if a value is a YAML Sequence or JS Array we can work with
    const isProcessableArray = (val) => {
        // Check for standard JS Array
        if (Array.isArray(val)) {
            return true;
        }
        // Check for eemeli/yaml Sequence (needs .get and .delete)
        if (val && typeof val.get === 'function' && typeof val.delete === 'function' && Array.isArray(val.items)) {
            return true;
        }
        return false;
    };

    // --- 1. Process Technical Assets ---
    if (model.has("technical_assets")) {
        const techAssetsYAML = model.get("technical_assets"); // Get the YAMLMap/Object

        // Check if it's iterable (might be null or not the expected type)
        if (techAssetsYAML && typeof techAssetsYAML.toJSON === 'function') {
            const techAssetsJS = techAssetsYAML.toJSON(); // Convert to plain JS for iteration keys

            Object.keys(techAssetsJS).forEach(assetKey => { // Iterate using keys from JS version
                console.log(`  Checking Technical Asset: [${assetKey}] for removal of "${idToRemove}"`);
                const assetYAML = techAssetsYAML.get(assetKey); // <<< Get the ORIGINAL YAML object for this asset

                if (!assetYAML) {
                     console.warn(`    Skipping asset [${assetKey}]: Could not retrieve original YAML object.`);
                     return; // Continue to next asset key
                }

                // 1a. Check data processed/stored (pass the original YAML sequence/array)
                if (assetYAML.has("data_assets_processed")) {
                    const processedSeq = assetYAML.get("data_assets_processed");
                    if (isProcessableArray(processedSeq)) {
                        // Use removeIdFromArray instead of updateIdInArray
                        removeIdFromArray(processedSeq, idToRemove, `technical_assets[${assetKey}].data_assets_processed`);
                    } else if (processedSeq) {
                        console.warn(`    Skipping removal in technical_assets[${assetKey}].data_assets_processed: Not a processable array/sequence.`);
                    }
                }
                if (assetYAML.has("data_assets_stored")) {
                     const storedSeq = assetYAML.get("data_assets_stored");
                     if (isProcessableArray(storedSeq)) {
                         // Use removeIdFromArray instead of updateIdInArray
                         removeIdFromArray(storedSeq, idToRemove, `technical_assets[${assetKey}].data_assets_stored`);
                     } else if (storedSeq) {
                        console.warn(`    Skipping removal in technical_assets[${assetKey}].data_assets_stored: Not a processable array/sequence.`);
                     }
                }

                // 1b. Check nested communication links
                if (assetYAML.has("communication_links")) {
                    const nestedCommLinksYAML = assetYAML.get("communication_links"); // Original YAML Map/Object for links

                    if (nestedCommLinksYAML && typeof nestedCommLinksYAML.toJSON === 'function') {
                        const nestedCommLinksJS = nestedCommLinksYAML.toJSON(); // JS version for keys
                         console.log(`    Checking Nested Communication Links within [${assetKey}] for removal of "${idToRemove}"...`);

                        Object.keys(nestedCommLinksJS).forEach(linkKey => {
                             console.log(`      Checking Nested Link: [${linkKey}]`);
                             const linkYAML = nestedCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                             if (!linkYAML) {
                                console.warn(`      Skipping nested link [${linkKey}]: Could not retrieve original YAML object.`);
                                return; // Continue to next link key
                             }

                             if (linkYAML.has("data_assets_sent")) {
                                 const sentSeq = linkYAML.get("data_assets_sent");
                                 if (isProcessableArray(sentSeq)) {
                                     // Use removeIdFromArray
                                     removeIdFromArray(sentSeq, idToRemove, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_sent`);
                                 } else if (sentSeq) {
                                    console.warn(`      Skipping removal in ...communication_links[${linkKey}].data_assets_sent: Not a processable array/sequence.`);
                                 }
                             }
                             if (linkYAML.has("data_assets_received")) {
                                 const receivedSeq = linkYAML.get("data_assets_received");
                                  if (isProcessableArray(receivedSeq)) {
                                     // Use removeIdFromArray
                                     removeIdFromArray(receivedSeq, idToRemove, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_received`);
                                  } else if (receivedSeq) {
                                     console.warn(`      Skipping removal in ...communication_links[${linkKey}].data_assets_received: Not a processable array/sequence.`);
                                  }
                             }
                        });
                    }
                }
            });
        } else {
             console.warn(`Could not iterate over 'technical_assets' for removal: Not a recognized YAML collection or is null.`);
        }
    } else {
        console.log("  No 'technical_assets' section found, skipping removal within.");
    }

    // --- 2. Process TOP-LEVEL Communication Links ---
    if (model.has("communication_links")) {
        const topLevelCommLinksYAML = model.get("communication_links"); // YAML Map/Object

        if (topLevelCommLinksYAML && typeof topLevelCommLinksYAML.toJSON === 'function') {
             const topLevelCommLinksJS = topLevelCommLinksYAML.toJSON(); // JS version for keys
             console.log(`  Checking Top-Level Communication Links for removal of "${idToRemove}"...`);

             Object.keys(topLevelCommLinksJS).forEach(linkKey => {
                 console.log(`    Checking Top-Level Link: [${linkKey}]`);
                 const linkYAML = topLevelCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                  if (!linkYAML) {
                    console.warn(`    Skipping top-level link [${linkKey}]: Could not retrieve original YAML object.`);
                    return; // Continue to next link key
                  }

                 if (linkYAML.has("data_assets_sent")) {
                     const sentSeq = linkYAML.get("data_assets_sent");
                     if (isProcessableArray(sentSeq)) {
                         // Use removeIdFromArray
                         removeIdFromArray(sentSeq, idToRemove, `communication_links[${linkKey}].data_assets_sent`);
                     } else if (sentSeq) {
                        console.warn(`    Skipping removal in communication_links[${linkKey}].data_assets_sent: Not a processable array/sequence.`);
                     }
                 }
                 if (linkYAML.has("data_assets_received")) {
                      const receivedSeq = linkYAML.get("data_assets_received");
                      if (isProcessableArray(receivedSeq)) {
                         // Use removeIdFromArray
                         removeIdFromArray(receivedSeq, idToRemove, `communication_links[${linkKey}].data_assets_received`);
                      } else if (receivedSeq) {
                         console.warn(`    Skipping removal in communication_links[${linkKey}].data_assets_received: Not a processable array/sequence.`);
                      }
                 }
             });
        } else {
             console.warn(`Could not iterate over 'communication_links' for removal: Not a recognized YAML collection or is null.`);
        }
    } else {
        console.log("  No top-level 'communication_links' section found, skipping removal within.");
    }

    // --- 3. Process Risk Tracking ---
    if (model.has("risk_tracking")) {
        console.log(`  Checking 'risk_tracking': Removal logic for risk keys containing "${idToRemove}" is NOT IMPLEMENTED.`);
        // NOTE: Removing items from risk_tracking might require different logic,
        // e.g., removing entire key-value pairs if the key contains the ID.
        // This is more complex than removing an ID from a list of strings.
        // const riskTrackingYAML = model.get("risk_tracking");
        // if (riskTrackingYAML && typeof riskTrackingYAML.toJSON === 'function') {
        //     // Implement logic here if needed, e.g., iterate keys and check if idToRemove is part of the key string.
        //     // Be careful: Removing items from a map while iterating requires care.
        // }
    } else {
        console.log("  No 'risk_tracking' section found.");
    }

    console.log(`>>> Reference removal finished for ID: ${idToRemove}`);
}
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  var listContainer = document.createElement("div");
  listContainer.style.maxWidth = "400px";
  listContainer.style.margin = "0 auto";

  var list = document.createElement("ul");
  list.style.listStyleType = "none";
  list.style.padding = "0";
  list.id = 'threagileDataAssetList';


  var items = [];

  for (var i = 0; i < items.length; i++) {
    var listItem = document.createElement("li");
    listItem.textContent = items[i];
    listItem.style.display = "flex";
    listItem.style.alignItems = "center";
    listItem.style.padding = "8px";
    listItem.style.borderBottom = "1px solid #ccc";

    var xButton = document.createElement("button");
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

if (
    typeof graph.model.threagile.getIn(["data_assets"]) !== "undefined" &&
    typeof this.editorUi.editor.graph.model.threagile.getIn(["data_assets"]) !==
      "undefined"
  ) {
    let data_assets_map = graph.model.threagile.getIn(["data_assets"]).toJSON();

    function interpolateColorForRisks(minColor, maxColor, minVal, maxVal, val) {
      function interpolate(start, end, step) {
          return start + (end - start) * step;
      }
  
      // Ensure the value is within the range defined by minVal and maxVal
      var step = (val - minVal) / (maxVal - minVal);
      step = Math.max(0, Math.min(1, step)); // Clamp the step to the range [0, 1]
  
      var red = interpolate(minColor[0], maxColor[0], step);
      var green = interpolate(minColor[1], maxColor[1], step);
      var blue = interpolate(minColor[2], maxColor[2], step);
  
      // Modify green to decrease as risk increases, enhancing the red
      if (step > 0.5) { 
          green *= (1 - step * 2);  // Accelerate green reduction in the upper half of the range
      }
  
      // Construct RGB color string
      return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
  }
  
  
  function mapRiskLevel(value, category) {
    const mappings = {
        'quantity': {
            'very-few': 1,
            'few': 2,
            'many': 3,
            'very-many': 4
        },
        'confidentiality': {
            'public': 1,
            'internal': 2,
            'restricted': 3,
            'confidential': 4,
            'strictly-confidential':5
        },
        'integrity': {
            'archive': 1,
            'operational': 2,
            'important': 3,
            'critical': 4,
            'mission-critical':5
        },
        'availability': {
            'archive': 1,
            'operational': 2,
            'important': 3,
            'critical':4,
            'mission-critical':5
        }
    };

    // Normalize input, remove hyphens and lowercase, then find the value based on the category
    return mappings[category][value.toLowerCase().replace('-', '')] || 0;
}

  

    const lowRiskColor = [0, 255, 0]; // Green
    const highRiskColor = [255, 0, 0]; // Red
    

    Object.entries(data_assets_map).forEach(([property, value]) => {
      let data_asset = this.editorUi.editor.graph.model.threagile.getIn(["data_assets", property]);
        
        
        var clonedMenu = this.addDataMenu(this.createPanel(), property);
        let orginalProperty = property; 
        property = property +":";
        clonedMenu.id = property;
        var listItem = document.createElement("li");  
        listItem.style.display = "flex";
        listItem.style.flexDirection = "column";
        listItem.style.padding = "8px";
        listItem.style.borderBottom = "1px solid #ccc";
        listItem.dataset.visible = "false"; 
        var parentNode = clonedMenu.childNodes[0];
        let riskScore = 0;
        console.log(value.quantity);

        console.log(value.confidentiality);
        console.log(value.integrity);

        console.log(value.availability);
        
        if(value.quantity!== undefined)
          riskScore *= mapRiskLevel(value.quantity, 'quantity');
        if(value.confidentiality!== undefined)
          riskScore += mapRiskLevel(value.confidentiality, 'confidentiality');
        if(value.integrity!== undefined)
          riskScore += mapRiskLevel(value.integrity, 'integrity');
        if(value.availability!== undefined)
          riskScore *= mapRiskLevel(value.availability, 'availability');
        for (var key in value) {
          if (value.hasOwnProperty(key)) {
            var childNode = value[key];
            
            for (var i = 0; i < parentNode.childNodes.length; i++) {
              var currentChildNode = parentNode.childNodes[i];
              if (currentChildNode.nodeName === "INPUT") {
                // Check if the input is possibly enhanced by Tagify
                if ('__tagify' in currentChildNode) {
                  let tags = graph.model.threagile.getIn(["data_assets", orginalProperty , "tags"]) || [];
                  //currentChildNode.__tagify.addTags(Array.from(tags));
                }
              }
              else{
              if (
                currentChildNode.nodeType === Node.ELEMENT_NODE &&
                currentChildNode.children.length > 0 &&
                currentChildNode.children[0].textContent === key
              ) {
                
                if (
                  currentChildNode.children.length > 1 &&
                  currentChildNode.childNodes.length > 0
                ) {
                  let nextChildNode = currentChildNode.children[1].children[0];

                  if (nextChildNode.nodeName === "SELECT") {
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
        var textContainer = document.createElement("div");
        textContainer.style.display = "flex";
        textContainer.style.alignItems = "center";
        textContainer.style.marginBottom = "8px";
        textContainer.style.color = "black";  
        textContainer.style.fontWeight = "bold";  // Make the font bold

        let arrowIcon = document.createElement("img");
        arrowIcon.src =
          " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
        arrowIcon.style.width = "15px";
        arrowIcon.style.height = "15px";
        arrowIcon.style.marginRight = "5px";

        arrowIcon.style.transform = "rotate(270deg)";
        textContainer.insertBefore(arrowIcon, dataText);

        var dataText = document.createElement("div");
        dataText.textContent = property;

        var xButton = document.createElement("button");
        xButton.innerHTML =
          '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEV7mr3///+wksspAAAAAnRSTlP/AOW3MEoAAAAdSURBVAgdY9jXwCDDwNDRwHCwgeExmASygSL7GgB12QiqNHZZIwAAAABJRU5ErkJggg==" alt="X">';
        xButton.style.marginLeft = "auto";
        xButton.style.padding = "5px";
        xButton.style.backgroundColor = "transparent";
        xButton.style.border = "none";
        xButton.style.cursor = "pointer";
        xButton.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent event bubbling if necessary

            // --- 1. Identify item to delete ---
            const dataAssetKeyToDelete = clonedMenu.id.slice(0, -1);
            const uiListItem = xButton.parentNode.parentNode; // The <li> or equivalent UI element
            const uiList = uiListItem.parentNode; // The <ul> or equivalent UI element
            const model = graph.model; // Get the Threagile model object
            const dataAssetIdToDeleteID = model.threagile.getIn(["data_assets",dataAssetKeyToDelete],true).toJSON().id;
            if (!model || !model.threagile) { // Ensure model and its data exist
                console.error("Threagile model data not found!");
                Swal.fire({
                     title: 'Error',
                     text: 'Could not find Threagile model data to perform deletion.',
                     icon: 'error'
                });
                return; // Stop if model data is missing
            }

            // --- 2. Find Direct Dependencies (Simplified: Data Assets using '<<') ---
            const dependents = [];
            const dataAssets = model.threagile.toJSON().data_assets || {}; // Access data within the model structure

            for (const assetId in dataAssets) {
                if (assetId === dataAssetKeyToDelete) continue; // Skip self

                const asset = dataAssets[assetId];
                // Check for '<<' anchor reference (string or object format)
                if (asset && asset['<<']) {
                    let referencedId = '';
                    if (typeof asset['<<'] === 'string') {
                        referencedId = asset['<<'];
                    } else if (typeof asset['<<'] === 'object' && asset['<<'] !== null && asset['<<'].id) {
                        referencedId = asset['<<'].id;
                    }

                    if (referencedId === dataAssetIdToDeleteID) {
                        dependents.push({
                            id: assetId,
                            type: 'data_assets',
                            // Attempt to get a user-friendly name
                            name: asset.description || assetId
                        });
                    }
                }
            }

            // --- 3. Perform Deletion (Directly or after Confirmation) ---

            // Function to perform the actual deletion of one item (model + diagramData)
            const performSingleDeletion = (itemId, itemType, diagramKey) => {
                console.log(`Attempting to delete ${itemType}: ${itemId} (UI key: ${diagramKey})`);
                let modelDeleted = false;
                let uiDeleted = false;
                const model = graph.model; // Reference the graph model

                try {
                    // --- Delete from Threagile model data ---
                    const modelPath = [itemType, itemId];
                    if (model.threagile.hasIn(modelPath)) {
                        if (model.threagile.deleteIn) {
                            model.threagile.deleteIn(modelPath);
                            console.log(`  Successfully deleted from model: ${modelPath.join('.')}`);
                            modelDeleted = true;
                        } else {
                            console.error(`  Cannot delete from model: 'deleteIn' method not available.`);
                            // Optionally: Fallback or throw error if deleteIn is crucial
                        }
                    } else {
                        console.warn(`  Skipping model deletion: ${itemId} not found in ${itemType}. It might have been deleted already.`);
                        modelDeleted = true; // Consider it 'successfully' deleted from model perspective if not found
                    }

                    // --- Delete from diagram data if a key is provided ---
                    // (Keep this if you store extra info in diagramData)
                    if (diagramKey && graph.model.diagramData && graph.model.diagramData[diagramKey]) {
                        console.log(`  Deleting ${diagramKey} from diagramData`);
                        delete graph.model.diagramData[diagramKey];
                    }

                    // --- UI Deletion (Remove the <li>) ---
                    const listContainer = document.getElementById('threagileDataAssetList'); // Find the <ul> using its ID
                    if (!listContainer) {
                         console.error("  Cannot remove UI element: Could not find the list container with id='threagileDataAssetList'.");
                         // Cannot proceed with UI deletion if the list isn't found
                    } else {
                        let listItemToRemove = null;
                        // Iterate through the <li> children of the list
                        const listItems = listContainer.getElementsByTagName('li');
                        for (let i = 0; i < listItems.length; i++) {
                            const li = listItems[i];
                            // Check if the <li> has at least two children (header div, form div)
                            // and if the second child's ID matches the diagramKey (e.g., "AssetName:")
                            if (li.children.length > 1 && li.children[1] && li.children[1].id === diagramKey) {
                                listItemToRemove = li;
                                break; // Found the correct <li>
                            }
                        }

                        if (listItemToRemove) {
                            listContainer.removeChild(listItemToRemove);
                            console.log(`  Successfully removed UI list item (<li>) associated with key: ${diagramKey}`);
                            uiDeleted = true;
                        } else {
                            console.warn(`  Could not find the UI list item (<li>) to remove for key: ${diagramKey}. It might have been removed already or the structure is incorrect.`);
                            // It's often okay if the UI element is already gone.
                        }
                    }

                    // IMPORTANT: Add graph element removal if needed
                    // If the data asset corresponds to a visual cell on the main graph canvas:
                    // let cellsToRemove = graph.getCellsBySpecificId(itemId); // Implement this function based on how you map model IDs to graph cells
                    // if (cellsToRemove && cellsToRemove.length > 0) {
                    //     graph.removeCells(cellsToRemove);
                    //     console.log(`  Removed associated graph cell(s) for ${itemId}`);
                    // }

                } catch (error) {
                    console.error(`Error during deletion process for ${itemType} ${itemId}:`, error);
                    Swal.fire('Deletion Error', `Failed to fully delete ${itemId}. Check console for details.`, 'error');
                } finally {
                    // Optional: Log completion status
                    if (modelDeleted && uiDeleted) {
                         console.log(`Deletion process completed successfully for ${itemId}.`);
                         // No explicit full refresh needed here.
                    } else {
                         console.warn(`Deletion process for ${itemId} might be incomplete (Model Deleted: ${modelDeleted}, UI Deleted: ${uiDeleted}).`);
                         // Consider if a full refresh is needed ONLY if deletion partially failed
                         // and might leave the UI inconsistent with the model.
                         // this.format.refresh(); // Generally avoid this unless necessary
                    }
                }
            };


            if (dependents.length > 0) {
                // --- Dependencies Found: Show Confirmation Dialog ---
                const dependentNames = dependents.map(item => `- ${item.name} (Data Asset)`).join('<br/>');
                const message = `The data asset "<b>${dataAssetKeyToDelete}</b>" is used as an anchor (<code><<</code>) by the following data assets:<br/><br/>${dependentNames}<br/><br/>How do you want to proceed?`;

                Swal.fire({
                    title: 'Confirm Deletion',
                    html: message,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Delete Item + Dependents', // Button for deleting all
                    confirmButtonColor: '#d33', // Red for destructive action
                    cancelButtonText: 'Cancel',
                    showDenyButton: true, // Add a third button
                    denyButtonText: 'Delete Item Only(May break graph)', // Button for deleting just the target
                    denyButtonColor: '#ffae42', // Orange/Yellow for caution

                    // Add custom styling similar to your example if desired
                     buttonsStyling: false,
                     customClass: {
                         confirmButton: 'swal-confirm-button-style', // Red button
                         denyButton: 'swal-deny-button-style',     // Orange button
                         cancelButton: 'swal-cancel-button-style',  // Default/grey button
                         popup: 'custom-popup-style' // Your existing popup style
                     },
                     didRender: () => {
                         // Ensure styles are present or add them dynamically
                         if (!document.getElementById('swal-custom-button-styles')) {
                             const styleTag = document.createElement('style');
                             styleTag.id = 'swal-custom-button-styles';
                             styleTag.innerHTML = `
                                 .swal-confirm-button-style, .swal-deny-button-style, .swal-cancel-button-style {
                                     color: #fff;
                                     border: none;
                                     border-radius: 5px;
                                     padding: 10px 20px;
                                     font-size: 14px;
                                     margin: 5px;
                                     transition: background-color 0.3s ease;
                                 }
                                 .swal-confirm-button-style { background-color: #d33; } /* Red */
                                 .swal-confirm-button-style:hover { background-color: #c82333; }
                                 .swal-deny-button-style { background-color: #ffae42; } /* Orange */
                                 .swal-deny-button-style:hover { background-color: #f49d2c; }
                                 .swal-cancel-button-style { background-color: #aaa; } /* Grey */
                                 .swal-cancel-button-style:hover { background-color: #999; }
                                 .custom-popup-style {
                                     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                     border-radius: 8px;
                                     background: #f0f0f0; /* Your background */
                                 }
                             `;
                             document.head.appendChild(styleTag);
                         }
                     }

                }).then((result) => {
                    if (result.isConfirmed) {
                        // --- User chose "Delete Item and Dependents" ---
                        console.log("User chose to DELETE ALL (item and dependents).");

                        removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                        // Delete dependent items first
                        dependents.forEach(item => {
                            // For dependents, we usually only delete from the model.
                            // The diagramData key might not be easily derivable.
                            // We also assume dependents don't have their own UI list items to remove here.
                            performSingleDeletion(item.id, item.type, null); // No specific diagram key, no UI list item removal
                        });

                        // Now delete the original item (model + diagramData)
                        performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                        // Update UI for the original item
                        console.log(`Data asset ${dataAssetKeyToDelete} and its dependents deleted.`);

                    } else if (result.isDenied) {
                         // --- User chose "Delete Item Only" ---
                         console.log("User chose to DELETE ITEM ONLY.");

                        removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                         // Delete only the original item (model + diagramData)
                         performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                         console.log(`Data asset ${dataAssetKeyToDelete} deleted. Dependents were NOT deleted.`);

                    } else { // result.isDismissed (Cancel or clicked outside)
                        console.log("User cancelled deletion.");
                        // Do nothing
                    }
                });

            } else {
                // --- No Dependencies Found: Delete Directly ---
                console.log(`No dependencies found for ${dataAssetKeyToDelete}. Deleting directly.`);

                // Delete the item (model + diagramData)
                performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                // Update UI
                console.log(`Data asset ${dataAssetKeyToDelete} deleted.`);
            }
             // Optional: Trigger a model update/refresh event if your application uses one
             // graph.model.fireEvent(new mxEventObject(mxEvent.CHANGE)); // Example for mxGraph
        });

        textContainer.appendChild(dataText);
        textContainer.appendChild(xButton);
        let initialColor = interpolateColorForRisks(lowRiskColor, highRiskColor, 0, 25, riskScore);

     
        if (listItem.dataset.visible === "true") {
          listItem.style.backgroundColor = "";
          arrowIcon.style.transform = "rotate(270deg)";
          xButton.style.display = "inline-block";
          clonedMenu.style.display = "block";
        } else {
          //listItem.style.backgroundColor = "lightgray";
          listItem.style.backgroundColor = initialColor;
          listItem.dataset.initialColor = initialColor;
          arrowIcon.style.transform = "rotate(90deg)";
          xButton.style.display = "none";
          clonedMenu.style.display = "none";
        }

        listItem.appendChild(textContainer);
        listItem.appendChild(clonedMenu);
        function toggleContent() {
          let isVisible = listItem.dataset.visible === "true";
          listItem.dataset.visible = !isVisible; 
          if (!isVisible) {
              listItem.style.backgroundColor = "";
              arrowIcon.style.transform = "rotate(270deg)";
              xButton.style.display = "inline-block";
              clonedMenu.style.display = "block";
          } else {
            listItem.style.backgroundColor = initialColor;
            listItem.dataset.initialColor = initialColor;
              arrowIcon.style.transform = "rotate(90deg)";
              xButton.style.display = "none";
              clonedMenu.style.display = "none";
          }
      }
        arrowIcon.addEventListener("click", toggleContent);
        dataText.addEventListener("click", toggleContent);

        list.appendChild(listItem);
      }
      );
  }
  var generalHeader = document.createElement("div");
  generalHeader.innerHTML = "Data:";
  generalHeader.style.padding = "10px 0px 6px 0px";
  generalHeader.style.whiteSpace = "nowrap";
  generalHeader.style.overflow = "hidden";
  generalHeader.style.width = "200px";
  generalHeader.style.fontWeight = "bold";
  
  this.container.appendChild(generalHeader);

  var addButton = mxUtils.button(
    "Add Data Asset", // Changed from "+" to more descriptive text
    mxUtils.bind(this, function (evt) {
        this.editorUi.actions
            .get("addDataAssets")
            .funct(list, this.addDataMenu(this.createPanel()));
    })
);
addButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-database-fill" viewBox="0 0 16 16">
  <path d="M3 2a7 7 0 0 0 10 0v1c0 .542-.229 1.04-.61 1.465C11.105 5.352 9.342 6 8 6c-1.342 0-3.105-.648-4.39-1.535A2.877 2.877 0 0 1 3 3V2zm0 3c0 .542.229 1.04.61 1.465C4.895 7.352 6.658 8 8 8c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 5V4c-1.285.887-3.048 1.535-4.39 1.535C7.658 5.535 5.895 4.887 4.61 4A2.877 2.877 0 0 1 3 4v1zm0 2c0 .542.229 1.04.61 1.465C4.895 9.352 6.658 10 8 10c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 8V7c-1.285.887-3.048 1.535-4.39 1.535C7.658 8.535 5.895 7.887 4.61 7A2.877 2.877 0 0 1 3 7v1zm0 2c0 .542.229 1.04.61 1.465C4.895 11.352 6.658 12 8 12c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 10V9c-1.285.887-3.048 1.535-4.39 1.535C7.658 10.535 5.895 9.887 4.61 9A2.877 2.877 0 0 1 3 9v1zm0 2c0 .542.229 1.04.61 1.465C4.895 13.352 6.658 14 8 14c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 12v1a7 7 0 0 1-10 0v-1z"/>
</svg> Add Data Asset`;
addButton.style.cssText = `
    margin: 0 auto;
    display: block;
    margin-top: 8px;
    padding: 8px 12px;
    background-color: #4CAF50; // More vibrant color
    color: #fff;
    border: none;
    border-radius: 5px; // Rounded corners
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); // Subtle shadow
    transition: background-color 0.3s; // Smooth transition for hover effect
`;
addButton.setAttribute("aria-label", "Add data assets"); // Accessibility improvement

// Adding hover effect
addButton.onmouseover = function() {
    this.style.backgroundColor = "#45a049"; // Darker shade on hover
};
addButton.onmouseout = function() {
    this.style.backgroundColor = "#4CAF50"; // Original color on mouse out
};
  
  // Elemente zum Listenelement hinzufügen
  listContainer.appendChild(list);
  listContainer.appendChild(addButton);

  // Den Listenelement zum Body-Element des Dokuments hinzufügen
  this.container.appendChild(listContainer);
  var styleHeader = document.createElement("div");
  styleHeader.innerHTML = "Style:";
  styleHeader.style.padding = "10px 0px 6px 0px";
  styleHeader.style.whiteSpace = "nowrap";
  styleHeader.style.overflow = "hidden";
  styleHeader.style.width = "200px";
  styleHeader.style.fontWeight = "bold";
  this.container.appendChild(styleHeader);
  if (graph.isEnabled()) {
    this.container.appendChild(this.addOptions(this.createPanel()));
    this.container.appendChild(this.addPaperSize(this.createPanel()));
    this.container.appendChild(this.addStyleOps(this.createPanel()));
  }
  let self = this;
  this.graph = graph;
};

DiagramFormatPanel.prototype.addDataMenu = function (container,UUID = undefined) {

/**
 * Updates occurrences of oldId with newId within a collection (JS Array or YAML Sequence).
 * Uses eemeli/yaml methods (.get, .set) for YAML Sequences, accessing the .value
 * property of Scalar nodes for comparison. Modifies the collection IN PLACE.
 *
 * @param {Array|object} arr - The collection to update (original JS Array or YAML Sequence object from the model).
 * @param {string} oldId - The ID string value to search for.
 * @param {string} newId - The new ID string value to replace with.
 * @param {string} path - The location of this collection in the model (for logging).
 */
function updateIdInArray(arr, oldId, newId, path) {
    // 1. Handle null or undefined input
    if (!arr) {
        // console.log(`    Skipping update for path "${path}": Collection is null or undefined.`);
        return;
    }

    let updated = false;

    // 2. Handle standard JavaScript Arrays (assuming direct string values)
    if (Array.isArray(arr)) {
        // console.log(`    Checking JS Array at path "${path}"`);
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === oldId) {
                console.log(`      Updating ID at ${path}[${i}]: "${oldId}" -> "${newId}" (JS Array)`);
                arr[i] = newId; // Modify standard array directly
                updated = true;
            }
        }
    }
    // 3. Handle YAML Sequences (using eemeli/yaml API)
    //    Check for properties/methods typical of YAMLSeq from 'yaml' library.
    else if (typeof arr.get === 'function' && typeof arr.set === 'function' && Array.isArray(arr.items)) {
         // console.log(`    Checking YAML Sequence at path "${path}"`);
        // Iterate using the length of the underlying items array
        for (let i = 0; i < arr.items.length; i++) {
            // Use .get(index) to retrieve the *Node object* (likely a Scalar) at the index
            const currentNode = arr.get(i);

            // Check if the node exists and if its 'value' property matches the old ID.
            // Scalars store their primitive value in the 'value' property.
            if (currentNode && typeof currentNode !== 'undefined' && currentNode === oldId) {
                console.log(`      Updating ID at ${path}[${i}]: Node value "${oldId}" -> "${newId}" (YAML Seq)`);

                // Use .set(index, newValue) to modify the YAML sequence IN PLACE.
                // The library handles creating the appropriate Scalar node
                // internally when given the new string value 'newId'.
                arr.set(i, newId);
                updated = true;
            }
        }
    }
    // 4. Handle other potential collection types (add specific checks if needed)
    else if (typeof arr.get === 'function' && typeof arr.set === 'function' && typeof arr.size === 'number') {
         console.warn(`    Path "${path}": Encountered map-like sequence, specific update logic may be needed.`);
         // Add specific logic here if this case is relevant and structure is known
         // Might involve checking node.value if .get returns nodes, or direct value if not.
    }
    // 5. Log if type is unsupported
    else {
        console.warn(`    Skipping update for path "${path}": Unsupported collection type or structure. Type: ${typeof arr}`, arr);
        return;
    }

    // Optional: Log if no changes were made
    // if (!updated) {
    //     console.log(`    No updates needed in ${path} for ID "${oldId}"`);
    // }
}

/**
 * Traverses the YAML document/node structure and updates anchor names
 * and the target names referenced by aliases.
 * Relies on specific visitors for Map, Seq, Scalar, Alias.
 * Assumes anchor names directly correspond to the old/new IDs being changed.
 *
 * @param {YAML.Document | YAML.Node} docOrNode - The YAML document or node to traverse.
 * @param {string} oldAnchorName - The anchor name to find and replace (e.g., the old ID).
 * @param {string} newAnchorName - The new anchor name to use (e.g., the new ID).
 * @returns {{anchorUpdated: boolean, aliasesUpdatedCount: number}} - Result object
 */
function updateAnchorsAndAliases(docOrNode, oldAnchorName, newAnchorName) {
    console.log(`>>> Starting anchor/alias update: &${oldAnchorName} / *${oldAnchorName} -> &${newAnchorName} / *${newAnchorName}`);
    let result = {
        anchorUpdated: false,
        aliasesUpdatedCount: 0
    };

    YAML.visit(docOrNode, {
        // Visitor for Map nodes
        Map: (key, node, path) => { // node here SHOULD be a YAMLMap instance
             // Extra check for safety, though likely redundant with specific visitor
            if (!(node instanceof YAML.YAMLMap)) {
                // console.warn(`Map visitor received non-YAMLMap node type: ${node?.constructor?.name}`);
                 return undefined;
            }
             // Check the Map node itself for the anchor
            if (node.anchor === oldAnchorName) {
                const pathStr = path.map(p => p?.key?.toString() ?? p?.value?.toString() ?? '?').join('.');
                console.log(`  Updating anchor definition on Map at path [${pathStr || 'root'}]: &${node.anchor} -> &${newAnchorName}`);
                node.anchor = newAnchorName; // Direct property access
                result.anchorUpdated = true;
                // Don't skip children - a map could contain another anchored item
                // return YAML.visit.SKIP; // Return SKIP only if we are *certain* no nested anchors with the same name exist
            }
            return undefined; // Allow visitor to descend into items
        },
        // Visitor for Sequence nodes
        Seq: (key, node, path) => { // node here SHOULD be a YAMLSeq instance
            if (!(node instanceof YAML.YAMLSeq)) {
                 // console.warn(`Seq visitor received non-YAMLSeq node type: ${node?.constructor?.name}`);
                 return undefined;
            }
             // Check the Sequence node itself for the anchor
             if (node.anchor === oldAnchorName) {
                const pathStr = path.map(p => p?.key?.toString() ?? p?.value?.toString() ?? '?').join('.');
                console.log(`  Updating anchor definition on Sequence at path [${pathStr || 'root'}]: &${node.anchor} -> &${newAnchorName}`);
                node.anchor = newAnchorName; // Direct property access
                result.anchorUpdated = true;
                // return YAML.visit.SKIP; // Don't skip children
            }
             return undefined; // Allow visitor to descend into items
        },
        // Visitor for Scalar nodes
        Scalar: (key, node, path) => { // node here SHOULD be a Scalar instance
             if (!(node instanceof YAML.Scalar)) {
                 // console.warn(`Scalar visitor received non-Scalar node type: ${node?.constructor?.name}`);
                 return undefined;
             }
            // Check the Scalar node itself for the anchor
            if (node.anchor === oldAnchorName) {
                const pathStr = path.map(p => p?.key?.toString() ?? p?.value?.toString() ?? '?').join('.');
                console.log(`  Updating anchor definition on Scalar at path [${pathStr || 'root'}]: &${node.anchor} -> &${newAnchorName}`);
                node.anchor = newAnchorName; // Direct property access
                result.anchorUpdated = true;
                // Scalars have no children to visit, so SKIP is implicit
                // return YAML.visit.SKIP;
            }
             return undefined;
        },

        // Specific visitor for Alias nodes
        Alias: (key, node, path) => { // node here SHOULD be an Alias instance
            if (!(node instanceof YAML.Alias)) {
                 // console.warn(`Alias visitor received non-Alias node type: ${node?.constructor?.name}`);
                 return undefined;
            }
            // Check the source property of the Alias node
            if (node.source === oldAnchorName) {
                const pathStr = path.map(p => p?.key?.toString() ?? p?.value?.toString() ?? '?').join('.');
                console.log(`  Updating alias reference at path [${pathStr || 'root'}]: *${node.source} -> *${newAnchorName}`);
                node.source = newAnchorName; // Direct property access
                result.aliasesUpdatedCount++;
            }
            // Aliases have no children, SKIP is implicit
            // return YAML.visit.SKIP;
             return undefined;
        }
    });

    // Final logging (unchanged from previous versions)
    if (!result.anchorUpdated && result.aliasesUpdatedCount === 0) {
        console.log(`  Note: Anchor '&${oldAnchorName}' definition not found, and no aliases '*${oldAnchorName}' found.`);
    } else {
         if (!result.anchorUpdated) {
             console.log(`  Note: Anchor '&${oldAnchorName}' definition not found or didn't need update.`);
         }
         if (result.aliasesUpdatedCount > 0) {
            console.log(`  Updated ${result.aliasesUpdatedCount} alias(es) referencing '*${oldAnchorName}'.`);
         } else {
            console.log(`  No aliases referencing '*${oldAnchorName}' found.`);
         }
    }
     console.log(`>>> Anchor/alias update finished for ${oldAnchorName}.`);
     return result;
}

/**
 * Updates all known references to a data asset ID throughout the Threagile model.
 * Handles technical assets, top-level communication links, nested communication links,
 * and risk tracking keys, correctly iterating over YAML object structures.
 *
 * @param {object} model - The parsed Threagile model object (likely a YAML Document or YAMLMap).
 * @param {string} oldId - The data asset ID to replace.
 * @param {string} newId - The new data asset ID.
 */
function updateReferences(model, oldId, newId) {
    console.log(`>>> Starting reference update for Data Asset: ${oldId} -> ${newId}`);

    // Helper to check if a value is a YAML Map or Sequence we can work with
    const isYAMLCollection = (val) => val && (typeof val.get === 'function' || Array.isArray(val.items));

    // --- 1. Update Technical Assets ---
    if (model.has("technical_assets")) {
        const techAssetsYAML = model.get("technical_assets"); // Get the YAMLMap/Object

        // Check if it's iterable (might be null or not the expected type)
        if (techAssetsYAML && typeof techAssetsYAML.toJSON === 'function') {
            const techAssetsJS = techAssetsYAML.toJSON(); // Convert to plain JS for iteration keys

            Object.keys(techAssetsJS).forEach(assetKey => { // Iterate using keys from JS version
                console.log(`  Checking Technical Asset: [${assetKey}]`);
                const assetYAML = techAssetsYAML.get(assetKey); // <<< Get the ORIGINAL YAML object for this asset

                if (!assetYAML) {
                     console.warn(`    Skipping asset [${assetKey}]: Could not retrieve original YAML object.`);
                     return; // Continue to next asset key
                }

                // 1a. Check data processed/stored (pass the original YAML sequence/array)
                if (assetYAML.has("data_assets_processed")) {
                    const processedSeq = assetYAML.get("data_assets_processed");
                    if (isYAMLCollection(processedSeq)) {
                        updateIdInArray(processedSeq, oldId, newId, `technical_assets[${assetKey}].data_assets_processed`);
                    }
                }
                if (assetYAML.has("data_assets_stored")) {
                     const storedSeq = assetYAML.get("data_assets_stored");
                     if (isYAMLCollection(storedSeq)) {
                         updateIdInArray(storedSeq, oldId, newId, `technical_assets[${assetKey}].data_assets_stored`);
                     }
                }

                // 1b. Check nested communication links
                if (assetYAML.has("communication_links")) {
                    const nestedCommLinksYAML = assetYAML.get("communication_links"); // Original YAML Map/Object for links

                    if (nestedCommLinksYAML && typeof nestedCommLinksYAML.toJSON === 'function') {
                        const nestedCommLinksJS = nestedCommLinksYAML.toJSON(); // JS version for keys
                         console.log(`    Checking Nested Communication Links within [${assetKey}]...`);

                        Object.keys(nestedCommLinksJS).forEach(linkKey => {
                             console.log(`      Checking Nested Link: [${linkKey}]`);
                             const linkYAML = nestedCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                             if (!linkYAML) {
                                console.warn(`      Skipping nested link [${linkKey}]: Could not retrieve original YAML object.`);
                                return; // Continue to next link key
                             }

                             if (linkYAML.has("data_assets_sent")) {
                                 const sentSeq = linkYAML.get("data_assets_sent");
                                 if (isYAMLCollection(sentSeq)) {
                                     updateIdInArray(sentSeq, oldId, newId, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_sent`);
                                 }
                             }
                             if (linkYAML.has("data_assets_received")) {
                                 const receivedSeq = linkYAML.get("data_assets_received");
                                  if (isYAMLCollection(receivedSeq)) {
                                     updateIdInArray(receivedSeq, oldId, newId, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_received`);
                                  }
                             }
                        });
                    }
                }
            });
        } else {
             console.warn("Could not iterate over 'technical_assets': Not a recognized YAML collection or is null.");
        }
    } else {
        console.log("  No 'technical_assets' section found.");
    }

    // --- 2. Update TOP-LEVEL Communication Links ---
    if (model.has("communication_links")) {
        const topLevelCommLinksYAML = model.get("communication_links"); // YAML Map/Object

        if (topLevelCommLinksYAML && typeof topLevelCommLinksYAML.toJSON === 'function') {
             const topLevelCommLinksJS = topLevelCommLinksYAML.toJSON(); // JS version for keys
             console.log(`  Checking Top-Level Communication Links...`);

             Object.keys(topLevelCommLinksJS).forEach(linkKey => {
                 console.log(`    Checking Top-Level Link: [${linkKey}]`);
                 const linkYAML = topLevelCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                  if (!linkYAML) {
                    console.warn(`    Skipping top-level link [${linkKey}]: Could not retrieve original YAML object.`);
                    return; // Continue to next link key
                  }

                 if (linkYAML.has("data_assets_sent")) {
                     const sentSeq = linkYAML.get("data_assets_sent");
                     if (isYAMLCollection(sentSeq)) {
                         updateIdInArray(sentSeq, oldId, newId, `communication_links[${linkKey}].data_assets_sent`);
                     }
                 }
                 if (linkYAML.has("data_assets_received")) {
                      const receivedSeq = linkYAML.get("data_assets_received");
                      if (isYAMLCollection(receivedSeq)) {
                         updateIdInArray(receivedSeq, oldId, newId, `communication_links[${linkKey}].data_assets_received`);
                      }
                 }
             });
        } else {
             console.warn("Could not iterate over 'communication_links': Not a recognized YAML collection or is null.");
        }
    } else {
        console.log("  No top-level 'communication_links' section found.");
    }

    // --- 3. Update Risk Tracking Keys ---
    if (model.has("risk_tracking")) {
        console.log("  Checking 'risk_tracking' keys...");
    } else {
        console.log("  No 'risk_tracking' section found.");
    }

    console.log(`>>> Reference update finished for ${oldId} -> ${newId}`);
}
/**
 * Renames a key within a YAMLMap node inside a YAML Document by replacing the key node.
 * Assumes the key is a simple Scalar node.
 * Designed for browser environments where YAML is loaded as a module.
 *
 * @param {YAML.Document} doc The YAML Document object.
 * @param {Array<string|number>} mapPath Path to the target YAMLMap within the document (e.g., ['data_assets']).
 * @param {string} oldKey The current string value of the key to rename.
 * @param {string} newKey The desired new string value for the key.
 * @param {object} YAML The imported YAML library object (must be passed in).
 * @returns {boolean} True if the key was successfully renamed, false otherwise.
 */
function renameYamlMapKey(doc, mapPath, oldKey, newKey, YAML) {
    // --- Basic Input Validation ---
    if (!YAML || typeof YAML.isMap !== 'function') {
        console.error("Error: Valid YAML library object must be provided as the fifth argument.");
        return false;
    }
    if (!doc || typeof doc.getIn !== 'function' || typeof doc.createNode !== 'function') { // Added createNode check
        console.error("Error: Invalid YAML Document object provided (first argument). Must have getIn and createNode methods.");
        return false;
    }
    if (!Array.isArray(mapPath)) {
        console.error("Error: mapPath (second argument) must be an array.");
        return false;
    }
    if (typeof oldKey !== 'string' || oldKey === '') {
        console.error("Error: oldKey (third argument) must be a non-empty string.");
        return false;
    }
    if (typeof newKey !== 'string' || newKey === '') {
        console.error("Error: newKey (fourth argument) must be a non-empty string.");
        return false;
    }
     if (oldKey === newKey) {
         console.warn("Warning: oldKey and newKey are the same. No rename needed.");
         return true;
    }

    // --- Get the Target Map Node ---
    const targetMap = doc.getIn(mapPath, true); // true -> get the Node

    // --- Validate the Target Node ---
    if (!targetMap) {
        console.error(`Error: Could not find a node at path: [${mapPath.join(', ')}]`);
        return false;
    }
    if (!YAML.isMap(targetMap)) {
        const type = targetMap?.constructor?.name ?? typeof targetMap;
        console.error(`Error: The node at path [${mapPath.join(', ')}] is not a YAMLMap. Found type: ${type}`);
        return false;
    }

    // --- Check if the New Key Already Exists ---
    // Note: This check might be less reliable if keys are complex nodes,
    // but should work for simple scalar keys compared against strings.
    if (targetMap.has(newKey)) {
        console.warn(`Warning: The new key "${newKey}" already exists in the map at path [${mapPath.join(', ')}]. Renaming aborted.`);
        return false;
    }

    // --- Find and Rename the Key ---
    let foundAndRenamed = false;
    for (let i = 0; i < targetMap.items.length; i++) {
        const pair = targetMap.items[i]; // Pair { key: Node, value: Node }

        // Check if the key exists, is a Scalar, and its value matches the oldKey
        if (pair.key && YAML.isScalar(pair.key) && pair.key.value === oldKey) {

            // --- THIS IS THE MODIFIED RENAMING STEP ---
            // 1. Create a *new* Scalar node for the new key string.
            //    Using doc.createNode ensures it belongs to the document's context.
            const newKeyNode = doc.createNode(newKey);

            // 2. Replace the *entire* key node within the Pair object.
            pair.key = newKeyNode;
            // --- RENAMING DONE ---

            console.log(`Successfully replaced key node "${oldKey}" with new key node "${newKey}" in map at path [${mapPath.join(', ')}].`);
            foundAndRenamed = true;
            break; // Exit loop
        }
    }

    // --- Report if the Key Wasn't Found ---
    if (!foundAndRenamed) {
        console.warn(`Warning: Key "${oldKey}" was not found in the map at path [${mapPath.join(', ')}].`);
        return false;
    }

    return true; // Indicate success
}

  var self = this;
  let uniqueID;
  if(UUID == undefined){
    uniqueID= generateUniquekeyData(self.editorUi.editor.graph);
  }
  else{
    uniqueID=UUID;
  }
    container.setAttribute('data-info', uniqueID);
  // Add line break
  // Add Properties section
  var propertiesSection = createSection("Properties");
  container.appendChild(propertiesSection);

  var typeProperties = {
    key: {
      description: "key",
      type: "button",
      tooltip: "The identifier for the yaml element",
      defaultValue: "<Your title>",
    },
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
            let textContentData = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode.textContent;
            let dataAssetName = textContentData.substring(0, textContentData.indexOf(":"));
            var newValue = selectDropdown.value;
            //currentValue = newValue;

            self.editor.graph.model.threagile.setIn(["data_assets",dataAssetName, property],newValue);
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
          mxUtils.bind(this, (function(p) { // p captures the current property
            return function(evt) {
              let str = evt.target.parentNode.parentNode.parentNode.parentNode.textContent;
              str = str.slice(0, str.indexOf(":"));
              let current = self.graph.model.threagile.getIn(["data_assets", str, p]);
              
              var dataValue;
              if (p === "key") {
                dataValue = str;
              } else {  
                if (!current) {
                  self.graph.model.threagile.setIn(["data_assets", str, p], typeProperties[p].defaultValue);
                }
                dataValue = current ? self.graph.model.threagile.getIn(["data_assets", str, p]) : undefined; // Ensure you use the correct reference
              }
          
              var dlg = new TextareaDialog(
                this.editorUi,
                p + ":",
                dataValue,
                function (newValue) {
                  if (newValue != null) {
                    if (p === "key") {
                        
                        /*
                        let oldassetPath = ["data_assets", uniqueID];
                        let id =self.editorUi.editor.graph.model.threagile.getIn(oldassetPath).toJSON().id;
                        let object = JSON.parse(JSON.stringify(self.editorUi.editor.graph.model.threagile.getIn(oldassetPath)));
                        self.editorUi.editor.graph.model.threagile.deleteIn(oldassetPath);
                        let newassetPath = ["data_assets", newValue];
                        self.editorUi.editor.graph.model.threagile.setIn(newassetPath, object);
                        let restoreIntegrity = self.editorUi.editor.graph.model.threagile.toString();
                        self.editorUi.editor.graph.model.threagile =  YAML.parseDocument(restoreIntegrity);

                        */
                        let doc = self.editorUi.editor.graph.model.threagile;


                        let dataAssetsPath = ['data_assets'];

                        const dataAssetsMap = doc.getIn(dataAssetsPath, true); // true -> get the Node
                        if (doc && typeof doc.getIn === 'function') {

                        // Call the renaming function, passing the required arguments INCLUDING the YAML object
                        const success = renameYamlMapKey(doc, dataAssetsPath, uniqueID, newValue, YAML);

                            if (success) {
                                console.log("Rename successful. Updated YAML document:");
                                console.log(doc.toString()); // Use toString() to see the updated YAML string
                                // You might need to update your UI or save the changes here
                            } else {
                                console.log("Rename failed. Check warnings/errors above.");
                            }

                        } else {
                            console.error("The 'doc' object is not a valid YAML Document.");
                        }

                        restartWasm();
                        let targetElement = evt.target.parentNode.parentNode.parentNode.parentNode;
                        const graphvar = self.editorUi.editor.graph;
                        // Start a change transaction
                        graphvar.model.beginUpdate();
                        try {
                            const v1 =        graphvar.insertVertex(      graphvar.getDefaultParent(),
                              null,
                              "",
                              0,
                              0,
                              10,
                              10,
                              "s");
                            
                            graphvar.removeCells([v1]);
                        } finally {
                            graphvar.model.endUpdate();
                        }

                        graphvar.refresh(); 
                    }else if(p === "id")
                    {

                     let id = self.graph.model.threagile.getIn(["data_assets", str, p], newValue).toJSON();

                     self.graph.model.threagile.setIn(["data_assets", str, p], newValue);
                      updateReferences(self.editorUi.editor.graph.model.threagile, id, newValue);
                    }
                      else {
                          self.graph.model.threagile.setIn(["data_assets", str, p], newValue);
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
            };
          })(property)) // Pass the current property to the IIFE
        );
      
        button.title = typeProperties[property].tooltip;
        button.style.width = "200px";
        typeItem.appendChild(button);
      }
      propertiesSection.appendChild(typeItem);
      
    }
    let inputElement = document.createElement("input");

    inputElement.value = "";
    
    inputElement.placeholder = "Enter your tags and press Enter";
    propertiesSection.appendChild(inputElement);
    
    let tags =self.editorUi.editor.graph.model.threagile.getIn(["tags"]); 
    let t_available;
    let threagileData = self.editorUi.editor.graph.model.threagile.getIn(["tags_available"]);
    
    if (typeof threagileData.toJSON === 'function') {
        t_available = threagileData.toJSON();
    } else {
        t_available = Array.from(threagileData);
    }
    let tagsAsset = self.editorUi.editor.graph.model.threagile.getIn(["data_assets", uniqueID, "tags"]);
  
    inputElement.value =tagsAsset != undefined ? Array.from(tagsAsset): [];   
    let t = new Tagify(inputElement, {
      whitelist: typeof self.editorUi.editor.graph.model.threagile.getIn(["tags_available"]).toJSON === 'function' 
      ? Array.from(self.editorUi.editor.graph.model.threagile.getIn(["tags_available"]).toJSON()) 
      :  Array.from(self.editorUi.editor.graph.model.threagile.getIn(["tags_available"])),      
      editTags: false,
      dropdown: {
        maxItems: 100, 
        classname: "tags-look", 
        enabled: 0, 
        closeOnSelect: true, 
      },
    });
    
    t.on('add', onAddThreagileTag) 
    .on('remove', onRemoveThreagileTag);
  
    function onAddThreagileTag(e){
      const model = self.editorUi.editor.graph.model.threagile;
      let str;
      if(e.detail.tagify.DOM.input.parentNode.parentNode.parentNode.parentNode== null)
      { 
        str = e.detail.tagify.DOM.input.parentNode.parentNode.parentNode.id
      }
      else{
        str = e.detail.tagify.DOM.input.parentNode.parentNode.parentNode.parentNode.textContent;
      }
       str = str.slice(0, str.indexOf(":"));
      let threagileTags;
      let threagileData = self.editorUi.editor.graph.model.threagile.getIn(["tags_available"]);
      if (typeof threagileData.toJSON === 'function') {
        threagileTags = threagileData.toJSON();
      } else {
        threagileTags = Array.from(threagileData);
      }
      
      if (!(threagileTags instanceof Set)) {
        if (threagileTags) {
          var threagileTagsSet = new Set();
          if (Array.isArray(threagileTags)) {
            for (const tag of threagileTags) {
              threagileTagsSet.add(tag);
            }
          } else {
            threagileTagsSet = new Set([threagileTags]);
          }
        } else {
          threagileTagsSet = new Set();
        }
      }
      let old = threagileTagsSet.size;
      threagileTagsSet.add(e.detail.data.value);
      if(old != threagileTagsSet.size)
      {                                
        restartWasm();
      }
      model.setIn(["tags_available"], threagileTagsSet);
      let dataAssetTags = new Set(model.getIn(["data_assets", str, "tags"]));
     
      if (!(dataAssetTags instanceof Set)) {
        let tempSet;
        
        if (dataAssetTags) {
          tempSet = new Set();
          
          if (Array.isArray(dataAssetTags)) {
            for (const tag of dataAssetTags) {
              tempSet.add(tag);
            }
          } else {
            tempSet.add(dataAssetTags);
          }
          
          dataAssetTags = tempSet;
        } else {
          dataAssetTags = new Set();
        }

      }
      dataAssetTags.add(e.detail.data.value);


      model.setIn(["data_assets", str, "tags"], dataAssetTags);
      
    }

    
    
      function onRemoveThreagileTag(e){
        const model = self.editorUi.editor.graph.model.threagile;
        let threagileTags = model.getIn(["tags_available"]);
        let str = e.detail.tagify.DOM.input.parentNode.parentNode.parentNode.parentNode.textContent;
        str = str.slice(0, str.indexOf(":"));
        
        let dataAssetTag = model.getIn(["data_assets",str, "tags"]) || [];
        if (!(dataAssetTag instanceof Set)) {
          let tempSet;
          
          if (dataAssetTag) {
            tempSet = new Set();
            
            if (Array.isArray(dataAssetTag)) {
              for (const tag of dataAssetTag) {
                tempSet.add(tag);
              }
            } else {
              tempSet.add(dataAssetTag);
            }
            
            dataAssetTag = tempSet;
          } else {
            dataAssetTag = new Set();
          }
  
        }

        dataAssetTag.delete(e.detail.data.value);
        model.setIn(["data_assets",str, dataAssetTag]);
        //model.setIn(["tags_available"], threagileTags);
    }

    return container;
  };

/**
 * Adds the label menu items to the given menu and parent.
 */
/**
 * Switch to disable page view.
 */
DiagramFormatPanel.showPageView = true;

/**
 * Specifies if the background image option should be shown. Default is true.
 */
DiagramFormatPanel.prototype.showBackgroundImageOption = true;

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.init = function () {
/**
 * Removes occurrences of a specific ID from a collection (JS Array or YAML Sequence).
 * Uses eemeli/yaml methods (.get, .delete) for YAML Sequences, accessing the .value
 * property of Scalar nodes for comparison. Modifies the collection IN PLACE.
 *
 * @param {Array|object} arr - The collection to modify (original JS Array or YAML Sequence object from the model).
 * @param {string} idToRemove - The ID string value to search for and remove.
 * @param {string} path - The location of this collection in the model (for logging).
 */
function removeIdFromArray(arr, idToRemove, path) {
    // 1. Handle null or undefined input
    if (!arr) {
        // console.log(`    Skipping removal for path "${path}": Collection is null or undefined.`);
        return;
    }

    let removed = false;

    // 2. Handle standard JavaScript Arrays (assuming direct string values)
    if (Array.isArray(arr)) {
        // console.log(`    Checking JS Array at path "${path}" for removal of "${idToRemove}"`);
        // Iterate backwards to safely remove elements using splice
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] === idToRemove) {
                console.log(`      Removing ID at ${path}[${i}]: "${idToRemove}" (JS Array)`);
                arr.splice(i, 1); // Remove element at index i
                removed = true;
            }
        }
    }
    // 3. Handle YAML Sequences (using eemeli/yaml API)
    //    Check for properties/methods typical of YAMLSeq from 'yaml' library.
    else if (typeof arr.get === 'function' && typeof arr.delete === 'function' && Array.isArray(arr.items)) {
        // console.log(`    Checking YAML Sequence at path "${path}" for removal of "${idToRemove}"`);
        // Iterate backwards to safely remove elements using .delete(index)
        // Use the length of the underlying items array for the loop boundary
        for (let i = arr.items.length - 1; i >= 0; i--) {
            // Use .get(index) to retrieve the *Node object* or value
            const currentNodeOrValue = arr.get(i);

            // Determine the actual value to compare
            // Check if it's a Node with a 'value' property (like Scalar) or just the value itself
            let currentValue;
            if (currentNodeOrValue && typeof currentNodeOrValue === 'object' && currentNodeOrValue.hasOwnProperty('value')) {
                // It's likely a Scalar or similar Node from 'yaml'
                 currentValue = currentNodeOrValue.value;
                 // Ensure we are comparing against the actual value, not the Node itself
                 // The original code had a potential bug here: it compared currentNode === oldId
                 // which might fail if currentNode is a Scalar object. It should have been currentNode.value === oldId
            } else {
                // It might be a direct value if the sequence holds primitives directly
                // or if .get() resolved the node to its value automatically in some cases.
                currentValue = currentNodeOrValue;
            }


            // Compare the determined value with the ID to remove
            if (currentValue === idToRemove) {
                console.log(`      Removing ID at ${path}[${i}]: Value "${idToRemove}" (YAML Seq)`);

                // Use .delete(index) to remove the item from the YAML sequence IN PLACE.
                arr.delete(i);
                removed = true;
            }
        }
    }
     // 4. Handle other potential collection types (add specific checks if needed)
     //    Attempting generic sequence removal if API matches
     else if (typeof arr.get === 'function' && typeof arr.delete === 'function' && typeof arr.size === 'number') {
         console.warn(`    Path "${path}": Attempting removal in map-like sequence for "${idToRemove}". Logic assumes sequence behavior.`);
          // Iterate backwards assuming sequence-like indexing
          // Note: .size might not reflect indices directly if keys aren't 0..N-1
          // This part is heuristic and might fail depending on the actual object type.
          // A more robust solution would require knowing the exact type or structure.
          // We'll iterate based on presumed indices up to size - 1 if possible,
          // but a safer approach might be needed. Let's stick to the known .items.length if available,
          // otherwise this branch might be unreliable for removal.
          // *Correction*: The original logic checked arr.items.length. If that's not present, iterating
          // based on .size for deletion by index is risky. Let's refine this branch.
          // *Revision*: If it has get/delete/size but not items, it's less likely a standard sequence.
          // Maybe iterate keys if possible? Or just log a more specific warning.
          // Let's keep the warning strong and avoid potentially incorrect deletions.
         console.warn(`    Path "${path}": Encountered map-like structure with get/delete/size but no 'items' array. Cannot reliably perform indexed removal. Skipping removal for this specific type.`);
         // Removed the potentially incorrect backwards loop for this case.
     }
    // 5. Log if type is unsupported
    else {
        console.warn(`    Skipping removal for path "${path}": Unsupported collection type or structure for removal. Type: ${typeof arr}`, arr);
        return;
    }

    // Optional: Log if no changes were made
    // if (!removed) {
    //     console.log(`    No instances of "${idToRemove}" found to remove in ${path}`);
    // }
}
/**
 * Removes all known references to a data asset ID from relevant arrays/sequences
 * throughout the Threagile model.
 * Handles technical assets (processed/stored data), top-level communication links (sent/received data),
 * and nested communication links (sent/received data). Modifies the model IN PLACE.
 * NOTE: Does not currently modify risk_tracking entries.
 *
 * @param {object} model - The parsed Threagile model object (likely a YAML Document or YAMLMap).
 * @param {string} idToRemove - The data asset ID to remove from arrays/sequences.
 */
function removeReferences(model, idToRemove) {
    console.log(`>>> Starting reference removal for Data Asset ID: ${idToRemove}`);

    // Helper to check if a value is a YAML Sequence or JS Array we can work with
    const isProcessableArray = (val) => {
        // Check for standard JS Array
        if (Array.isArray(val)) {
            return true;
        }
        // Check for eemeli/yaml Sequence (needs .get and .delete)
        if (val && typeof val.get === 'function' && typeof val.delete === 'function' && Array.isArray(val.items)) {
            return true;
        }
        return false;
    };

    // --- 1. Process Technical Assets ---
    if (model.has("technical_assets")) {
        const techAssetsYAML = model.get("technical_assets"); // Get the YAMLMap/Object

        // Check if it's iterable (might be null or not the expected type)
        if (techAssetsYAML && typeof techAssetsYAML.toJSON === 'function') {
            const techAssetsJS = techAssetsYAML.toJSON(); // Convert to plain JS for iteration keys

            Object.keys(techAssetsJS).forEach(assetKey => { // Iterate using keys from JS version
                console.log(`  Checking Technical Asset: [${assetKey}] for removal of "${idToRemove}"`);
                const assetYAML = techAssetsYAML.get(assetKey); // <<< Get the ORIGINAL YAML object for this asset

                if (!assetYAML) {
                     console.warn(`    Skipping asset [${assetKey}]: Could not retrieve original YAML object.`);
                     return; // Continue to next asset key
                }

                // 1a. Check data processed/stored (pass the original YAML sequence/array)
                if (assetYAML.has("data_assets_processed")) {
                    const processedSeq = assetYAML.get("data_assets_processed");
                    if (isProcessableArray(processedSeq)) {
                        // Use removeIdFromArray instead of updateIdInArray
                        removeIdFromArray(processedSeq, idToRemove, `technical_assets[${assetKey}].data_assets_processed`);
                    } else if (processedSeq) {
                        console.warn(`    Skipping removal in technical_assets[${assetKey}].data_assets_processed: Not a processable array/sequence.`);
                    }
                }
                if (assetYAML.has("data_assets_stored")) {
                     const storedSeq = assetYAML.get("data_assets_stored");
                     if (isProcessableArray(storedSeq)) {
                         // Use removeIdFromArray instead of updateIdInArray
                         removeIdFromArray(storedSeq, idToRemove, `technical_assets[${assetKey}].data_assets_stored`);
                     } else if (storedSeq) {
                        console.warn(`    Skipping removal in technical_assets[${assetKey}].data_assets_stored: Not a processable array/sequence.`);
                     }
                }

                // 1b. Check nested communication links
                if (assetYAML.has("communication_links")) {
                    const nestedCommLinksYAML = assetYAML.get("communication_links"); // Original YAML Map/Object for links

                    if (nestedCommLinksYAML && typeof nestedCommLinksYAML.toJSON === 'function') {
                        const nestedCommLinksJS = nestedCommLinksYAML.toJSON(); // JS version for keys
                         console.log(`    Checking Nested Communication Links within [${assetKey}] for removal of "${idToRemove}"...`);

                        Object.keys(nestedCommLinksJS).forEach(linkKey => {
                             console.log(`      Checking Nested Link: [${linkKey}]`);
                             const linkYAML = nestedCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                             if (!linkYAML) {
                                console.warn(`      Skipping nested link [${linkKey}]: Could not retrieve original YAML object.`);
                                return; // Continue to next link key
                             }

                             if (linkYAML.has("data_assets_sent")) {
                                 const sentSeq = linkYAML.get("data_assets_sent");
                                 if (isProcessableArray(sentSeq)) {
                                     // Use removeIdFromArray
                                     removeIdFromArray(sentSeq, idToRemove, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_sent`);
                                 } else if (sentSeq) {
                                    console.warn(`      Skipping removal in ...communication_links[${linkKey}].data_assets_sent: Not a processable array/sequence.`);
                                 }
                             }
                             if (linkYAML.has("data_assets_received")) {
                                 const receivedSeq = linkYAML.get("data_assets_received");
                                  if (isProcessableArray(receivedSeq)) {
                                     // Use removeIdFromArray
                                     removeIdFromArray(receivedSeq, idToRemove, `technical_assets[${assetKey}].communication_links[${linkKey}].data_assets_received`);
                                  } else if (receivedSeq) {
                                     console.warn(`      Skipping removal in ...communication_links[${linkKey}].data_assets_received: Not a processable array/sequence.`);
                                  }
                             }
                        });
                    }
                }
            });
        } else {
             console.warn(`Could not iterate over 'technical_assets' for removal: Not a recognized YAML collection or is null.`);
        }
    } else {
        console.log("  No 'technical_assets' section found, skipping removal within.");
    }

    // --- 2. Process TOP-LEVEL Communication Links ---
    if (model.has("communication_links")) {
        const topLevelCommLinksYAML = model.get("communication_links"); // YAML Map/Object

        if (topLevelCommLinksYAML && typeof topLevelCommLinksYAML.toJSON === 'function') {
             const topLevelCommLinksJS = topLevelCommLinksYAML.toJSON(); // JS version for keys
             console.log(`  Checking Top-Level Communication Links for removal of "${idToRemove}"...`);

             Object.keys(topLevelCommLinksJS).forEach(linkKey => {
                 console.log(`    Checking Top-Level Link: [${linkKey}]`);
                 const linkYAML = topLevelCommLinksYAML.get(linkKey); // <<< Get ORIGINAL YAML Link object

                  if (!linkYAML) {
                    console.warn(`    Skipping top-level link [${linkKey}]: Could not retrieve original YAML object.`);
                    return; // Continue to next link key
                  }

                 if (linkYAML.has("data_assets_sent")) {
                     const sentSeq = linkYAML.get("data_assets_sent");
                     if (isProcessableArray(sentSeq)) {
                         // Use removeIdFromArray
                         removeIdFromArray(sentSeq, idToRemove, `communication_links[${linkKey}].data_assets_sent`);
                     } else if (sentSeq) {
                        console.warn(`    Skipping removal in communication_links[${linkKey}].data_assets_sent: Not a processable array/sequence.`);
                     }
                 }
                 if (linkYAML.has("data_assets_received")) {
                      const receivedSeq = linkYAML.get("data_assets_received");
                      if (isProcessableArray(receivedSeq)) {
                         // Use removeIdFromArray
                         removeIdFromArray(receivedSeq, idToRemove, `communication_links[${linkKey}].data_assets_received`);
                      } else if (receivedSeq) {
                         console.warn(`    Skipping removal in communication_links[${linkKey}].data_assets_received: Not a processable array/sequence.`);
                      }
                 }
             });
        } else {
             console.warn(`Could not iterate over 'communication_links' for removal: Not a recognized YAML collection or is null.`);
        }
    } else {
        console.log("  No top-level 'communication_links' section found, skipping removal within.");
    }

    // --- 3. Process Risk Tracking ---
    if (model.has("risk_tracking")) {
        console.log(`  Checking 'risk_tracking': Removal logic for risk keys containing "${idToRemove}" is NOT IMPLEMENTED.`);
        // NOTE: Removing items from risk_tracking might require different logic,
        // e.g., removing entire key-value pairs if the key contains the ID.
        // This is more complex than removing an ID from a list of strings.
        // const riskTrackingYAML = model.get("risk_tracking");
        // if (riskTrackingYAML && typeof riskTrackingYAML.toJSON === 'function') {
        //     // Implement logic here if needed, e.g., iterate keys and check if idToRemove is part of the key string.
        //     // Be careful: Removing items from a map while iterating requires care.
        // }
    } else {
        console.log("  No 'risk_tracking' section found.");
    }

    console.log(`>>> Reference removal finished for ID: ${idToRemove}`);
}
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  var listContainer = document.createElement("div");
  listContainer.style.maxWidth = "400px";
  listContainer.style.margin = "0 auto";

  var list = document.createElement("ul");
  list.style.listStyleType = "none";
  list.style.padding = "0";
  list.id = 'threagileDataAssetList';


  var items = [];

  for (var i = 0; i < items.length; i++) {
    var listItem = document.createElement("li");
    listItem.textContent = items[i];
    listItem.style.display = "flex";
    listItem.style.alignItems = "center";
    listItem.style.padding = "8px";
    listItem.style.borderBottom = "1px solid #ccc";

    var xButton = document.createElement("button");
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

if (
    typeof graph.model.threagile.getIn(["data_assets"]) !== "undefined" &&
    typeof this.editorUi.editor.graph.model.threagile.getIn(["data_assets"]) !==
      "undefined"
  ) {
    let data_assets_map = graph.model.threagile.getIn(["data_assets"]).toJSON();

    function interpolateColorForRisks(minColor, maxColor, minVal, maxVal, val) {
      function interpolate(start, end, step) {
          return start + (end - start) * step;
      }
  
      // Ensure the value is within the range defined by minVal and maxVal
      var step = (val - minVal) / (maxVal - minVal);
      step = Math.max(0, Math.min(1, step)); // Clamp the step to the range [0, 1]
  
      var red = interpolate(minColor[0], maxColor[0], step);
      var green = interpolate(minColor[1], maxColor[1], step);
      var blue = interpolate(minColor[2], maxColor[2], step);
  
      // Modify green to decrease as risk increases, enhancing the red
      if (step > 0.5) { 
          green *= (1 - step * 2);  // Accelerate green reduction in the upper half of the range
      }
  
      // Construct RGB color string
      return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
  }
  
  
  function mapRiskLevel(value, category) {
    const mappings = {
        'quantity': {
            'very-few': 1,
            'few': 2,
            'many': 3,
            'very-many': 4
        },
        'confidentiality': {
            'public': 1,
            'internal': 2,
            'restricted': 3,
            'confidential': 4,
            'strictly-confidential':5
        },
        'integrity': {
            'archive': 1,
            'operational': 2,
            'important': 3,
            'critical': 4,
            'mission-critical':5
        },
        'availability': {
            'archive': 1,
            'operational': 2,
            'important': 3,
            'critical':4,
            'mission-critical':5
        }
    };

    // Normalize input, remove hyphens and lowercase, then find the value based on the category
    return mappings[category][value.toLowerCase().replace('-', '')] || 0;
}

  

    const lowRiskColor = [0, 255, 0]; // Green
    const highRiskColor = [255, 0, 0]; // Red
    

    Object.entries(data_assets_map).forEach(([property, value]) => {
      let data_asset = this.editorUi.editor.graph.model.threagile.getIn(["data_assets", property]);
        
        
        var clonedMenu = this.addDataMenu(this.createPanel(), property);
        let orginalProperty = property; 
        property = property +":";
        clonedMenu.id = property;
        var listItem = document.createElement("li");  
        listItem.style.display = "flex";
        listItem.style.flexDirection = "column";
        listItem.style.padding = "8px";
        listItem.style.borderBottom = "1px solid #ccc";
        listItem.dataset.visible = "false"; 
        var parentNode = clonedMenu.childNodes[0];
        let riskScore = 0;
        console.log(value.quantity);

        console.log(value.confidentiality);
        console.log(value.integrity);

        console.log(value.availability);
        
        if(value.quantity!== undefined)
          riskScore *= mapRiskLevel(value.quantity, 'quantity');
        if(value.confidentiality!== undefined)
          riskScore += mapRiskLevel(value.confidentiality, 'confidentiality');
        if(value.integrity!== undefined)
          riskScore += mapRiskLevel(value.integrity, 'integrity');
        if(value.availability!== undefined)
          riskScore *= mapRiskLevel(value.availability, 'availability');
        for (var key in value) {
          if (value.hasOwnProperty(key)) {
            var childNode = value[key];
            
            for (var i = 0; i < parentNode.childNodes.length; i++) {
              var currentChildNode = parentNode.childNodes[i];
              if (currentChildNode.nodeName === "INPUT") {
                // Check if the input is possibly enhanced by Tagify
                if ('__tagify' in currentChildNode) {
                  let tags = graph.model.threagile.getIn(["data_assets", orginalProperty , "tags"]) || [];
                  //currentChildNode.__tagify.addTags(Array.from(tags));
                }
              }
              else{
              if (
                currentChildNode.nodeType === Node.ELEMENT_NODE &&
                currentChildNode.children.length > 0 &&
                currentChildNode.children[0].textContent === key
              ) {
                
                if (
                  currentChildNode.children.length > 1 &&
                  currentChildNode.childNodes.length > 0
                ) {
                  let nextChildNode = currentChildNode.children[1].children[0];

                  if (nextChildNode.nodeName === "SELECT") {
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
        var textContainer = document.createElement("div");
        textContainer.style.display = "flex";
        textContainer.style.alignItems = "center";
        textContainer.style.marginBottom = "8px";
        textContainer.style.color = "black";  
        textContainer.style.fontWeight = "bold";  // Make the font bold

        let arrowIcon = document.createElement("img");
        arrowIcon.src =
          " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
        arrowIcon.style.width = "15px";
        arrowIcon.style.height = "15px";
        arrowIcon.style.marginRight = "5px";

        arrowIcon.style.transform = "rotate(270deg)";
        textContainer.insertBefore(arrowIcon, dataText);

        var dataText = document.createElement("div");
        dataText.textContent = property;

        var xButton = document.createElement("button");
        xButton.innerHTML =
          '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEV7mr3///+wksspAAAAAnRSTlP/AOW3MEoAAAAdSURBVAgdY9jXwCDDwNDRwHCwgeExmASygSL7GgB12QiqNHZZIwAAAABJRU5ErkJggg==" alt="X">';
        xButton.style.marginLeft = "auto";
        xButton.style.padding = "5px";
        xButton.style.backgroundColor = "transparent";
        xButton.style.border = "none";
        xButton.style.cursor = "pointer";
        xButton.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent event bubbling if necessary

            // --- 1. Identify item to delete ---
            const dataAssetKeyToDelete = clonedMenu.id.slice(0, -1);
            const uiListItem = xButton.parentNode.parentNode; // The <li> or equivalent UI element
            const uiList = uiListItem.parentNode; // The <ul> or equivalent UI element
            const model = graph.model; // Get the Threagile model object
            const dataAssetIdToDeleteID = model.threagile.getIn(["data_assets",dataAssetKeyToDelete],true).toJSON().id;
            if (!model || !model.threagile) { // Ensure model and its data exist
                console.error("Threagile model data not found!");
                Swal.fire({
                     title: 'Error',
                     text: 'Could not find Threagile model data to perform deletion.',
                     icon: 'error'
                });
                return; // Stop if model data is missing
            }

            // --- 2. Find Direct Dependencies (Simplified: Data Assets using '<<') ---
            const dependents = [];
            const dataAssets = model.threagile.toJSON().data_assets || {}; // Access data within the model structure

            for (const assetId in dataAssets) {
                if (assetId === dataAssetKeyToDelete) continue; // Skip self

                const asset = dataAssets[assetId];
                // Check for '<<' anchor reference (string or object format)
                if (asset && asset['<<']) {
                    let referencedId = '';
                    if (typeof asset['<<'] === 'string') {
                        referencedId = asset['<<'];
                    } else if (typeof asset['<<'] === 'object' && asset['<<'] !== null && asset['<<'].id) {
                        referencedId = asset['<<'].id;
                    }

                    if (referencedId === dataAssetIdToDeleteID) {
                        dependents.push({
                            id: assetId,
                            type: 'data_assets',
                            // Attempt to get a user-friendly name
                            name: asset.description || assetId
                        });
                    }
                }
            }

            // --- 3. Perform Deletion (Directly or after Confirmation) ---

            // Function to perform the actual deletion of one item (model + diagramData)
            const performSingleDeletion = (itemId, itemType, diagramKey) => {
                console.log(`Attempting to delete ${itemType}: ${itemId} (UI key: ${diagramKey})`);
                let modelDeleted = false;
                let uiDeleted = false;
                const model = graph.model; // Reference the graph model

                try {
                    // --- Delete from Threagile model data ---
                    const modelPath = [itemType, itemId];
                    if (model.threagile.hasIn(modelPath)) {
                        if (model.threagile.deleteIn) {
                            model.threagile.deleteIn(modelPath);
                            console.log(`  Successfully deleted from model: ${modelPath.join('.')}`);
                            modelDeleted = true;
                        } else {
                            console.error(`  Cannot delete from model: 'deleteIn' method not available.`);
                            // Optionally: Fallback or throw error if deleteIn is crucial
                        }
                    } else {
                        console.warn(`  Skipping model deletion: ${itemId} not found in ${itemType}. It might have been deleted already.`);
                        modelDeleted = true; // Consider it 'successfully' deleted from model perspective if not found
                    }

                    // --- Delete from diagram data if a key is provided ---
                    // (Keep this if you store extra info in diagramData)
                    if (diagramKey && graph.model.diagramData && graph.model.diagramData[diagramKey]) {
                        console.log(`  Deleting ${diagramKey} from diagramData`);
                        delete graph.model.diagramData[diagramKey];
                    }

                    // --- UI Deletion (Remove the <li>) ---
                    const listContainer = document.getElementById('threagileDataAssetList'); // Find the <ul> using its ID
                    if (!listContainer) {
                         console.error("  Cannot remove UI element: Could not find the list container with id='threagileDataAssetList'.");
                         // Cannot proceed with UI deletion if the list isn't found
                    } else {
                        let listItemToRemove = null;
                        // Iterate through the <li> children of the list
                        const listItems = listContainer.getElementsByTagName('li');
                        for (let i = 0; i < listItems.length; i++) {
                            const li = listItems[i];
                            // Check if the <li> has at least two children (header div, form div)
                            // and if the second child's ID matches the diagramKey (e.g., "AssetName:")
                            if (li.children.length > 1 && li.children[1] && li.children[1].id === diagramKey) {
                                listItemToRemove = li;
                                break; // Found the correct <li>
                            }
                        }

                        if (listItemToRemove) {
                            listContainer.removeChild(listItemToRemove);
                            console.log(`  Successfully removed UI list item (<li>) associated with key: ${diagramKey}`);
                            uiDeleted = true;
                        } else {
                            console.warn(`  Could not find the UI list item (<li>) to remove for key: ${diagramKey}. It might have been removed already or the structure is incorrect.`);
                            // It's often okay if the UI element is already gone.
                        }
                    }

                    // IMPORTANT: Add graph element removal if needed
                    // If the data asset corresponds to a visual cell on the main graph canvas:
                    // let cellsToRemove = graph.getCellsBySpecificId(itemId); // Implement this function based on how you map model IDs to graph cells
                    // if (cellsToRemove && cellsToRemove.length > 0) {
                    //     graph.removeCells(cellsToRemove);
                    //     console.log(`  Removed associated graph cell(s) for ${itemId}`);
                    // }

                } catch (error) {
                    console.error(`Error during deletion process for ${itemType} ${itemId}:`, error);
                    Swal.fire('Deletion Error', `Failed to fully delete ${itemId}. Check console for details.`, 'error');
                } finally {
                    // Optional: Log completion status
                    if (modelDeleted && uiDeleted) {
                         console.log(`Deletion process completed successfully for ${itemId}.`);
                         // No explicit full refresh needed here.
                    } else {
                         console.warn(`Deletion process for ${itemId} might be incomplete (Model Deleted: ${modelDeleted}, UI Deleted: ${uiDeleted}).`);
                         // Consider if a full refresh is needed ONLY if deletion partially failed
                         // and might leave the UI inconsistent with the model.
                         // this.format.refresh(); // Generally avoid this unless necessary
                    }
                }
            };


            if (dependents.length > 0) {
                // --- Dependencies Found: Show Confirmation Dialog ---
                const dependentNames = dependents.map(item => `- ${item.name} (Data Asset)`).join('<br/>');
                const message = `The data asset "<b>${dataAssetKeyToDelete}</b>" is used as an anchor (<code><<</code>) by the following data assets:<br/><br/>${dependentNames}<br/><br/>How do you want to proceed?`;

                Swal.fire({
                    title: 'Confirm Deletion',
                    html: message,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Delete Item + Dependents', // Button for deleting all
                    confirmButtonColor: '#d33', // Red for destructive action
                    cancelButtonText: 'Cancel',
                    showDenyButton: true, // Add a third button
                    denyButtonText: 'Delete Item Only(May break graph)', // Button for deleting just the target
                    denyButtonColor: '#ffae42', // Orange/Yellow for caution

                    // Add custom styling similar to your example if desired
                     buttonsStyling: false,
                     customClass: {
                         confirmButton: 'swal-confirm-button-style', // Red button
                         denyButton: 'swal-deny-button-style',     // Orange button
                         cancelButton: 'swal-cancel-button-style',  // Default/grey button
                         popup: 'custom-popup-style' // Your existing popup style
                     },
                     didRender: () => {
                         // Ensure styles are present or add them dynamically
                         if (!document.getElementById('swal-custom-button-styles')) {
                             const styleTag = document.createElement('style');
                             styleTag.id = 'swal-custom-button-styles';
                             styleTag.innerHTML = `
                                 .swal-confirm-button-style, .swal-deny-button-style, .swal-cancel-button-style {
                                     color: #fff;
                                     border: none;
                                     border-radius: 5px;
                                     padding: 10px 20px;
                                     font-size: 14px;
                                     margin: 5px;
                                     transition: background-color 0.3s ease;
                                 }
                                 .swal-confirm-button-style { background-color: #d33; } /* Red */
                                 .swal-confirm-button-style:hover { background-color: #c82333; }
                                 .swal-deny-button-style { background-color: #ffae42; } /* Orange */
                                 .swal-deny-button-style:hover { background-color: #f49d2c; }
                                 .swal-cancel-button-style { background-color: #aaa; } /* Grey */
                                 .swal-cancel-button-style:hover { background-color: #999; }
                                 .custom-popup-style {
                                     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                     border-radius: 8px;
                                     background: #f0f0f0; /* Your background */
                                 }
                             `;
                             document.head.appendChild(styleTag);
                         }
                     }

                }).then((result) => {
                    if (result.isConfirmed) {
                        // --- User chose "Delete Item and Dependents" ---
                        console.log("User chose to DELETE ALL (item and dependents).");

                        removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                        // Delete dependent items first
                        dependents.forEach(item => {
                            // For dependents, we usually only delete from the model.
                            // The diagramData key might not be easily derivable.
                            // We also assume dependents don't have their own UI list items to remove here.
                            performSingleDeletion(item.id, item.type, null); // No specific diagram key, no UI list item removal
                        });

                        // Now delete the original item (model + diagramData)
                        performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                        // Update UI for the original item
                        console.log(`Data asset ${dataAssetKeyToDelete} and its dependents deleted.`);

                    } else if (result.isDenied) {
                         // --- User chose "Delete Item Only" ---
                         console.log("User chose to DELETE ITEM ONLY.");

                        removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                         // Delete only the original item (model + diagramData)
                         performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                         console.log(`Data asset ${dataAssetKeyToDelete} deleted. Dependents were NOT deleted.`);

                    } else { // result.isDismissed (Cancel or clicked outside)
                        console.log("User cancelled deletion.");
                        // Do nothing
                    }
                });

            } else {
                // --- No Dependencies Found: Delete Directly ---
                console.log(`No dependencies found for ${dataAssetKeyToDelete}. Deleting directly.`);

                // Delete the item (model + diagramData)
                performSingleDeletion(dataAssetKeyToDelete, 'data_assets', clonedMenu.id);

                removeReferences(graph.model.threagile, dataAssetIdToDeleteID);
                // Update UI
                console.log(`Data asset ${dataAssetKeyToDelete} deleted.`);
            }
             // Optional: Trigger a model update/refresh event if your application uses one
             // graph.model.fireEvent(new mxEventObject(mxEvent.CHANGE)); // Example for mxGraph
        });

        textContainer.appendChild(dataText);
        textContainer.appendChild(xButton);
        let initialColor = interpolateColorForRisks(lowRiskColor, highRiskColor, 0, 25, riskScore);

     
        if (listItem.dataset.visible === "true") {
          listItem.style.backgroundColor = "";
          arrowIcon.style.transform = "rotate(270deg)";
          xButton.style.display = "inline-block";
          clonedMenu.style.display = "block";
        } else {
          //listItem.style.backgroundColor = "lightgray";
          listItem.style.backgroundColor = initialColor;
          listItem.dataset.initialColor = initialColor;
          arrowIcon.style.transform = "rotate(90deg)";
          xButton.style.display = "none";
          clonedMenu.style.display = "none";
        }

        listItem.appendChild(textContainer);
        listItem.appendChild(clonedMenu);
        function toggleContent() {
          let isVisible = listItem.dataset.visible === "true";
          listItem.dataset.visible = !isVisible; 
          if (!isVisible) {
              listItem.style.backgroundColor = "";
              arrowIcon.style.transform = "rotate(270deg)";
              xButton.style.display = "inline-block";
              clonedMenu.style.display = "block";
          } else {
            listItem.style.backgroundColor = initialColor;
            listItem.dataset.initialColor = initialColor;
              arrowIcon.style.transform = "rotate(90deg)";
              xButton.style.display = "none";
              clonedMenu.style.display = "none";
          }
      }
        arrowIcon.addEventListener("click", toggleContent);
        dataText.addEventListener("click", toggleContent);

        list.appendChild(listItem);
      }
      );
  }
  var generalHeader = document.createElement("div");
  generalHeader.innerHTML = "Data:";
  generalHeader.style.padding = "10px 0px 6px 0px";
  generalHeader.style.whiteSpace = "nowrap";
  generalHeader.style.overflow = "hidden";
  generalHeader.style.width = "200px";
  generalHeader.style.fontWeight = "bold";
  
  this.container.appendChild(generalHeader);

  var addButton = mxUtils.button(
    "Add Data Asset", // Changed from "+" to more descriptive text
    mxUtils.bind(this, function (evt) {
        this.editorUi.actions
            .get("addDataAssets")
            .funct(list, this.addDataMenu(this.createPanel()));
    })
);
addButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-database-fill" viewBox="0 0 16 16">
  <path d="M3 2a7 7 0 0 0 10 0v1c0 .542-.229 1.04-.61 1.465C11.105 5.352 9.342 6 8 6c-1.342 0-3.105-.648-4.39-1.535A2.877 2.877 0 0 1 3 3V2zm0 3c0 .542.229 1.04.61 1.465C4.895 7.352 6.658 8 8 8c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 5V4c-1.285.887-3.048 1.535-4.39 1.535C7.658 5.535 5.895 4.887 4.61 4A2.877 2.877 0 0 1 3 4v1zm0 2c0 .542.229 1.04.61 1.465C4.895 9.352 6.658 10 8 10c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 8V7c-1.285.887-3.048 1.535-4.39 1.535C7.658 8.535 5.895 7.887 4.61 7A2.877 2.877 0 0 1 3 7v1zm0 2c0 .542.229 1.04.61 1.465C4.895 11.352 6.658 12 8 12c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 10V9c-1.285.887-3.048 1.535-4.39 1.535C7.658 10.535 5.895 9.887 4.61 9A2.877 2.877 0 0 1 3 9v1zm0 2c0 .542.229 1.04.61 1.465C4.895 13.352 6.658 14 8 14c1.342 0 3.105-.648 4.39-1.535A2.877 2.877 0 0 0 13 12v1a7 7 0 0 1-10 0v-1z"/>
</svg> Add Data Asset`;
addButton.style.cssText = `
    margin: 0 auto;
    display: block;
    margin-top: 8px;
    padding: 8px 12px;
    background-color: #4CAF50; // More vibrant color
    color: #fff;
    border: none;
    border-radius: 5px; // Rounded corners
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); // Subtle shadow
    transition: background-color 0.3s; // Smooth transition for hover effect
`;
addButton.setAttribute("aria-label", "Add data assets"); // Accessibility improvement

// Adding hover effect
addButton.onmouseover = function() {
    this.style.backgroundColor = "#45a049"; // Darker shade on hover
};
addButton.onmouseout = function() {
    this.style.backgroundColor = "#4CAF50"; // Original color on mouse out
};
  
  // Elemente zum Listenelement hinzufügen
  listContainer.appendChild(list);
  listContainer.appendChild(addButton);

  // Den Listenelement zum Body-Element des Dokuments hinzufügen
  this.container.appendChild(listContainer);
  var styleHeader = document.createElement("div");
  styleHeader.innerHTML = "Style:";
  styleHeader.style.padding = "10px 0px 6px 0px";
  styleHeader.style.whiteSpace = "nowrap";
  styleHeader.style.overflow = "hidden";
  styleHeader.style.width = "200px";
  styleHeader.style.fontWeight = "bold";
  this.container.appendChild(styleHeader);
  if (graph.isEnabled()) {
    this.container.appendChild(this.addOptions(this.createPanel()));
    this.container.appendChild(this.addPaperSize(this.createPanel()));
    this.container.appendChild(this.addStyleOps(this.createPanel()));
  }
  let self = this;
  this.graph = graph;
};
/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.addView = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  div.appendChild(this.createTitle(mxResources.get("view")));

  // Grid
  this.addGridOption(div);

  // Page View
  if (DiagramFormatPanel.showPageView) {
    div.appendChild(
      this.createOption(
        mxResources.get("pageView"),
        function () {
          return graph.pageVisible;
        },
        function (checked) {
          ui.actions.get("pageView").funct();
        },
        {
          install: function (apply) {
            this.listener = function () {
              apply(graph.pageVisible);
            };

            ui.addListener("pageViewChanged", this.listener);
          },
          destroy: function () {
            ui.removeListener(this.listener);
          },
        }
      )
    );
  }

  if (graph.isEnabled()) {
    // Background
    var bg = this.createColorOption(
      mxResources.get("background"),
      function () {
        return graph.background;
      },
      function (color) {
        var change = new ChangePageSetup(ui, color);
        change.ignoreImage = true;

        graph.model.execute(change);
      },
      "#ffffff",
      {
        install: function (apply) {
          this.listener = function () {
            apply(graph.background);
          };

          ui.addListener("backgroundColorChanged", this.listener);
        },
        destroy: function () {
          ui.removeListener(this.listener);
        },
      }
    );

    if (this.showBackgroundImageOption) {
      var btn = mxUtils.button(mxResources.get("image"), function (evt) {
        ui.showBackgroundImageDialog(null, ui.editor.graph.backgroundImage);
        mxEvent.consume(evt);
      });

      btn.style.position = "absolute";
      btn.className = "geColorBtn";
      btn.style.marginTop = "-4px";
      btn.style.paddingBottom =
        document.documentMode == 11 || mxClient.IS_MT ? "0px" : "2px";
      btn.style.height = "22px";
      btn.style.right = mxClient.IS_QUIRKS ? "52px" : "72px";
      btn.style.width = "56px";
      bg.appendChild(btn);
    }

    div.appendChild(bg);
  }

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.addOptions = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  div.appendChild(this.createTitle(mxResources.get("options")));

  if (graph.isEnabled()) {
    // Connection arrows
    div.appendChild(
      this.createOption(
        mxResources.get("connectionArrows"),
        function () {
          return graph.connectionArrowsEnabled;
        },
        function (checked) {
          ui.actions.get("connectionArrows").funct();
        },
        {
          install: function (apply) {
            this.listener = function () {
              apply(graph.connectionArrowsEnabled);
            };

            ui.addListener("connectionArrowsChanged", this.listener);
          },
          destroy: function () {
            ui.removeListener(this.listener);
          },
        }
      )
    );

    // Connection points
    div.appendChild(
      this.createOption(
        mxResources.get("connectionPoints"),
        function () {
          return graph.connectionHandler.isEnabled();
        },
        function (checked) {
          ui.actions.get("connectionPoints").funct();
        },
        {
          install: function (apply) {
            this.listener = function () {
              apply(graph.connectionHandler.isEnabled());
            };

            ui.addListener("connectionPointsChanged", this.listener);
          },
          destroy: function () {
            ui.removeListener(this.listener);
          },
        }
      )
    );

    // Guides
    div.appendChild(
      this.createOption(
        mxResources.get("guides"),
        function () {
          return graph.graphHandler.guidesEnabled;
        },
        function (checked) {
          ui.actions.get("guides").funct();
        },
        {
          install: function (apply) {
            this.listener = function () {
              apply(graph.graphHandler.guidesEnabled);
            };

            ui.addListener("guidesEnabledChanged", this.listener);
          },
          destroy: function () {
            ui.removeListener(this.listener);
          },
        }
      )
    );
  }
  let optionFlow = this.createOption(
    "FlowPipe Animation",
    function () {
      return graph.floweffect;
    },
    function (checked) {
      graph.floweffect = !graph.floweffect;
      if (graph.floweffect) {
        cells = graph.getVerticesAndEdges(false, true);
        cells.forEach((cell) => {
          if (cell.isEdge() && cell.source != null && cell.target != null) {
            // Add a delay to allow the edge state to be updated
            let state = graph.view.getState(cell);
            if (state) {
              setTimeout(() => {
                let pathNodes = state.shape.node.getElementsByTagName("path");
                if (pathNodes.length >= 2) {
                  pathNodes[0].removeAttribute("visibility");
                  pathNodes[0].setAttribute("stroke-width", "6");
                  pathNodes[0].setAttribute("stroke", "lightGray");
                  pathNodes[1].setAttribute("class", "pipeFlowAnimation");
                }
              }, 0);
            }
          }
        });
      } else {
        var cells = graph.getVerticesAndEdges(false, true);
        cells.forEach((cell) => {
          if (cell.isEdge() && cell.source != null && cell.target != null) {
            let state = graph.view.getState(cell);
            if (state) {
              let pathNodes = state.shape.node.getElementsByTagName("path");
              if (pathNodes.length >= 2) {
                pathNodes[0].setAttribute("visibility", "hidden");
                pathNodes[0].removeAttribute("stroke-width");
                pathNodes[0].removeAttribute("stroke");
                pathNodes[1].removeAttribute("class");
              }
            }
          }
        });
      }
    },
    {
      install: function (apply) {},
      destroy: function () {},
    }
  );
  div.appendChild(optionFlow);
  return div;
};

/**
 *
 */
DiagramFormatPanel.prototype.addGridOption = function (container) {
  var fPanel = this;
  var ui = this.editorUi;
  var graph = ui.editor.graph;

  var input = document.createElement("input");
  input.style.position = "absolute";
  input.style.textAlign = "right";
  input.style.width = "38px";
  input.value = this.inUnit(graph.getGridSize()) + " " + this.getUnit();

  var stepper = this.createStepper(
    input,
    update,
    this.getUnitStep(),
    null,
    null,
    null,
    this.isFloatUnit()
  );
  input.style.display = graph.isGridEnabled() ? "" : "none";
  stepper.style.display = input.style.display;

  mxEvent.addListener(input, "keydown", function (e) {
    if (e.keyCode == 13) {
      graph.container.focus();
      mxEvent.consume(e);
    } else if (e.keyCode == 27) {
      input.value = graph.getGridSize();
      graph.container.focus();
      mxEvent.consume(e);
    }
  });

  function update(evt) {
    var value = fPanel.isFloatUnit()
      ? parseFloat(input.value)
      : parseInt(input.value);
    value = fPanel.fromUnit(
      Math.max(fPanel.inUnit(1), isNaN(value) ? fPanel.inUnit(10) : value)
    );

    if (value != graph.getGridSize()) {
      graph.setGridSize(value);
    }

    input.value = fPanel.inUnit(value) + " " + fPanel.getUnit();
    mxEvent.consume(evt);
  }

  mxEvent.addListener(input, "blur", update);
  mxEvent.addListener(input, "change", update);

  var unitChangeListener = function (sender, evt) {
    input.value = fPanel.inUnit(graph.getGridSize()) + " " + fPanel.getUnit();
    fPanel.format.refresh();
  };

  graph.view.addListener("unitChanged", unitChangeListener);
  this.listeners.push({
    destroy: function () {
      graph.view.removeListener(unitChangeListener);
    },
  });

  if (mxClient.IS_SVG) {
    input.style.marginTop = "-2px";
    input.style.right = "84px";
    stepper.style.marginTop = "-16px";
    stepper.style.right = "72px";

    var panel = this.createColorOption(
      mxResources.get("grid"),
      function () {
        var color = graph.view.gridColor;

        return graph.isGridEnabled() ? color : null;
      },
      function (color) {
        var enabled = graph.isGridEnabled();

        if (color == mxConstants.NONE) {
          graph.setGridEnabled(false);
        } else {
          graph.setGridEnabled(true);
          ui.setGridColor(color);
        }

        input.style.display = graph.isGridEnabled() ? "" : "none";
        stepper.style.display = input.style.display;

        if (enabled != graph.isGridEnabled()) {
          ui.fireEvent(new mxEventObject("gridEnabledChanged"));
        }
      },
      "#e0e0e0",
      {
        install: function (apply) {
          this.listener = function () {
            apply(graph.isGridEnabled() ? graph.view.gridColor : null);
          };

          ui.addListener("gridColorChanged", this.listener);
          ui.addListener("gridEnabledChanged", this.listener);
        },
        destroy: function () {
          ui.removeListener(this.listener);
        },
      }
    );

    panel.appendChild(input);
    panel.appendChild(stepper);
    container.appendChild(panel);
  } else {
    input.style.marginTop = "2px";
    input.style.right = "32px";
    stepper.style.marginTop = "2px";
    stepper.style.right = "20px";

    container.appendChild(input);
    container.appendChild(stepper);

    container.appendChild(
      this.createOption(
        mxResources.get("grid"),
        function () {
          return graph.isGridEnabled();
        },
        function (checked) {
          graph.setGridEnabled(checked);

          if (graph.isGridEnabled()) {
            graph.view.gridColor = "#e0e0e0";
          }

          ui.fireEvent(new mxEventObject("gridEnabledChanged"));
        },
        {
          install: function (apply) {
            this.listener = function () {
              input.style.display = graph.isGridEnabled() ? "" : "none";
              stepper.style.display = input.style.display;

              apply(graph.isGridEnabled());
            };

            ui.addListener("gridEnabledChanged", this.listener);
          },
          destroy: function () {
            ui.removeListener(this.listener);
          },
        }
      )
    );
  }
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.addDocumentProperties = function (div) {
  // Hook for subclassers
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  div.appendChild(this.createTitle(mxResources.get("options")));

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.addPaperSize = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  div.appendChild(this.createTitle(mxResources.get("paperSize")));

  var accessor = PageSetupDialog.addPageFormatPanel(
    div,
    "formatpanel",
    graph.pageFormat,
    function (pageFormat) {
      if (
        graph.pageFormat == null ||
        graph.pageFormat.width != pageFormat.width ||
        graph.pageFormat.height != pageFormat.height
      ) {
        var change = new ChangePageSetup(ui, null, null, pageFormat);
        change.ignoreColor = true;
        change.ignoreImage = true;

        graph.model.execute(change);
      }
    }
  );

  this.addKeyHandler(accessor.widthInput, function () {
    accessor.set(graph.pageFormat);
  });
  this.addKeyHandler(accessor.heightInput, function () {
    accessor.set(graph.pageFormat);
  });

  var listener = function () {
    accessor.set(graph.pageFormat);
  };

  ui.addListener("pageFormatChanged", listener);
  this.listeners.push({
    destroy: function () {
      ui.removeListener(listener);
    },
  });

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.addStyleOps = function (div) {
  var btn = mxUtils.button(
    mxResources.get("editData"),
    mxUtils.bind(this, function (evt) {
      this.editorUi.actions.get("editData").funct();
    })
  );

  btn.setAttribute(
    "title",
    mxResources.get("editData") +
      " (" +
      this.editorUi.actions.get("editData").shortcut +
      ")"
  );
  btn.style.width = "202px";
  btn.style.marginBottom = "2px";
  div.appendChild(btn);

  mxUtils.br(div);

  btn = mxUtils.button(
    mxResources.get("clearDefaultStyle"),
    mxUtils.bind(this, function (evt) {
      this.editorUi.actions.get("clearDefaultStyle").funct();
    })
  );

  btn.setAttribute(
    "title",
    mxResources.get("clearDefaultStyle") +
      " (" +
      this.editorUi.actions.get("clearDefaultStyle").shortcut +
      ")"
  );
  btn.style.width = "202px";
  div.appendChild(btn);

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel.prototype.destroy = function () {
  BaseFormatPanel.prototype.destroy.apply(this, arguments);

  if (this.gridEnabledListener) {
    this.editorUi.removeListener(this.gridEnabledListener);
    this.gridEnabledListener = null;
  }
};

