export function restartWasm() {
    window.initModelState();
}
// Function to check if an ID already exists in the graph's model
function checkIdExists(graph, id) {
  // Assuming a method to check ID exists in your structure, you can modify this according to your application's logic
  var exists = graph.model.threagile.getIn(['technical_assets', id, 'id']);
  return !!exists; // Convert to boolean
}
export function generateRandomId(prefix, totalLength) {
  let randomPart = '';
  while (randomPart.length + prefix.length < totalLength) {
    randomPart += Math.random().toString(36).substr(2);
  }
  return prefix + randomPart.substring(0, totalLength - prefix.length);
}
export function generateUniqueTrustkeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('Trust-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
export function generateUniqueCommkeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('Com-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
export function generateUniqueTrustId(graph) {
  var newId;
  do {
      newId = generateRandomId('tr-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
export function generateUniquedataId(graph) {
  var newId;
  do {
      newId = generateRandomId('da-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
// Function to generate a unique ID
export function generateUniqueId(graph) {
  var newId;
  do {
    newId = generateRandomId('ta-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}

export function generateUniquekey(graph) {
  var newId;
  do {
    newId = generateRandomId('key-' ,15); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}

export function generateUniquekeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('DATA-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
export function createSection(title) {
  var section = document.createElement("div");

  section.style.padding = "6px 0px 6px 0px";
  section.style.marginTop = "8px";
  section.style.borderTop = "1px solid rgb(192, 192, 192)";
  section.innerHTML = title;
  section.style.whiteSpace = "nowrap";
  section.style.overflow = "hidden";
  section.style.width = "200px";
  section.style.fontWeight = "bold";
  return section;
}
export function createCustomOption(self, parameter) {
  return function () {
    // Getting the selected cells
    var cells = self.editorUi.editor.graph.getSelectionCells();
    if (cells != null && cells.length > 0) {
      // Selecting the current cell
      var cell = self.editorUi.editor.graph.getSelectionCell();
      if(cell.technicalAsset=== undefined)
      {
        return undefined
      }
      else{
        return self.editorUi.editor.graph.model.threagile.getIn(["technical_assets", cell.technicalAsset.key,parameter]);
      }
    }
    return false;
  };
}
// Function to set a custom option
export function setCustomOption(self, parameter) {
  return function (checked) {
    // Getting the selected cells
    var cells = self.editorUi.editor.graph.getSelectionCells();
    if (cells != null && cells.length > 0) {
      // Selecting the current cell
      var cell = self.editorUi.editor.graph.getSelectionCell();
      
      const path = ["technical_assets", cell.technicalAsset.key, parameter];
 
      self.editorUi.editor.graph.model.threagile.setIn(path, checked);
     
    
    }
  };
}

