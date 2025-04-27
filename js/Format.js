/**
 * Copyright (c) 2006-2012, JGraph Ltd
 */
Format = function (editorUi, container) {
  window.editorUi = editorUi;
  this.editorUi = editorUi;
  this.container = container;
  let threagileInit = `
threagile_version: 1.0.0
business_criticality: important # values: archive, operational, important, critical, mission-critical

tags_available:
  - linux
  - apache
  - mysql
  - jboss
  - keycloak
  - jenkins
  - git
  - oracle
  - some-erp
  - vmware
  - aws
  - aws:ec2
  - aws:s3
`;

  let wow = YAML.parse(threagileInit);
  let wow2 = YAML.parseDocument(threagileInit);
  this.editorUi.editor.graph.model.threagile =
    YAML.parseDocument(threagileInit);

  instantiateWasm();
};


function restartWasm() {
  // Reset or create a new Go instance if needed
  go = new Go();
  instantiateWasm();
}

var go = new Go();

function instantiateWasm() {
  WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
      go.run(result.instance);
      window.editorUi.editor.graph.model.wasmInstance = result.instance;
  }).catch(err => console.error("Wasm instantiation failed:", err));
}

/**
 * Returns information about the current selection.
 */
Format.prototype.labelIndex = 0;

/**
 * Returns information about the current selection.
 */
Format.prototype.diagramIndex = 0;

/**
 * Returns information about the current selection.
 */
Format.prototype.currentIndex = 0;

/**
 * Returns information about the current selection.
 */
Format.prototype.showCloseButton = true;

/**
 * Background color for inactive tabs.
 */
Format.prototype.inactiveTabBackgroundColor = "#f1f3f4";

/**
 * Background color for inactive tabs.
 */
Format.prototype.roundableShapes = [
  "label",
  "rectangle",
  "internalStorage",
  "corner",
  "parallelogram",
  "swimlane",
  "triangle",
  "trapezoid",
  "ext",
  "step",
  "tee",
  "process",
  "link",
  "rhombus",
  "offPageConnector",
  "loopLimit",
  "hexagon",
  "manualInput",
  "card",
  "curlyBracket",
  "singleArrow",
  "callout",
  "doubleArrow",
  "flexArrow",
  "umlLifeline",
];

/**
 * Adds the label menu items to the given menu and parent.
 */
Format.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  graph.connectionHandler.createTarget = true;

  graph.connectionHandler.connect = function (source, target, evt, dropTarget) {
    if (
      !graph.getModel().isVertex(source) ||
      !graph.getModel().isVertex(target)
    ) {
      return null;
    }

    return mxConnectionHandler.prototype.connect.apply(this, arguments);
  };
  graph.connectionHandler.isConnectableCell = function (cell) {
    return graph.getModel().isVertex(cell);
  };

  graph.connectionHandler.isValidSource = function (cell) {
    return graph.getModel().isVertex(cell);
  };

  graph.connectionHandler.isValidTarget = function (cell) {
    return graph.getModel().isVertex(cell);
  };
  graph.connectionHandler.getEdgeValidationError = function (
    source,
    target,
    existingEdge
  ) {
    if (graph.getModel().isEdge(source) && graph.getModel().isEdge(target)) {
      return "Edges cannot be connected to other edges.";
    }

    return "";
  };
  this.update = mxUtils.bind(this, function (sender, evt) {
    this.clearSelectionState();
    this.refresh();
  });

  graph.getSelectionModel().addListener(mxEvent.CHANGE, this.update);
  graph.addListener(mxEvent.EDITING_STARTED, this.update);
  graph.addListener(mxEvent.EDITING_STOPPED, this.update);
  graph.getModel().addListener(mxEvent.CHANGE, this.update);
  graph.addListener(
    mxEvent.ROOT,
    mxUtils.bind(this, function () {
      this.refresh();
    })
  );

  ui.addListener(
    "styleChanged",
    mxUtils.bind(this, function (sender, evt) {
      this.refresh();
    })
  );

  editor.addListener(
    "autosaveChanged",
    mxUtils.bind(this, function () {
      this.refresh();
    })
  );

  this.refresh();
};

/**
 * Returns information about the current selection.
 */
Format.prototype.clearSelectionState = function () {
  this.selectionState = null;
};

/**
 * Returns information about the current selection.
 */
Format.prototype.getSelectionState = function () {
  if (this.selectionState == null) {
    this.selectionState = this.createSelectionState();
  }

  return this.selectionState;
};

/**
 * Returns information about the current selection.
 */
Format.prototype.createSelectionState = function () {
  var cells = this.editorUi.editor.graph.getSelectionCells();
  var result = this.initSelectionState();

  for (var i = 0; i < cells.length; i++) {
    this.updateSelectionStateForCell(result, cells[i], cells);
  }

  return result;
};

/**
 * Returns information about the current selection.
 */
Format.prototype.initSelectionState = function () {
  return {
    vertices: [],
    edges: [],
    x: null,
    y: null,
    width: null,
    height: null,
    style: {},
    containsImage: false,
    containsLabel: false,
    fill: true,
    glass: true,
    rounded: true,
    autoSize: false,
    image: true,
    shadow: true,
    lineJumps: true,
    resizable: true,
    table: false,
    cell: false,
    row: false,
    movable: true,
    rotatable: true,
    stroke: true,
  };
};

/**
 * Returns information about the current selection.
 */
Format.prototype.updateSelectionStateForCell = function (result, cell, cells) {
  var graph = this.editorUi.editor.graph;

  if (graph.getModel().isVertex(cell)) {
    result.resizable = result.resizable && graph.isCellResizable(cell);
    result.rotatable = result.rotatable && graph.isCellRotatable(cell);
    result.movable =
      result.movable &&
      graph.isCellMovable(cell) &&
      !graph.isTableRow(cell) &&
      !graph.isTableCell(cell);
    result.table = result.table || graph.isTable(cell);
    result.cell = result.cell || graph.isTableCell(cell);
    result.row = result.row || graph.isTableRow(cell);
    result.vertices.push(cell);
    var geo = graph.getCellGeometry(cell);

    if (geo != null) {
      if (geo.width > 0) {
        if (result.width == null) {
          result.width = geo.width;
        } else if (result.width != geo.width) {
          result.width = "";
        }
      } else {
        result.containsLabel = true;
      }

      if (geo.height > 0) {
        if (result.height == null) {
          result.height = geo.height;
        } else if (result.height != geo.height) {
          result.height = "";
        }
      } else {
        result.containsLabel = true;
      }

      if (!geo.relative || geo.offset != null) {
        var x = geo.relative ? geo.offset.x : geo.x;
        var y = geo.relative ? geo.offset.y : geo.y;

        if (result.x == null) {
          result.x = x;
        } else if (result.x != x) {
          result.x = "";
        }

        if (result.y == null) {
          result.y = y;
        } else if (result.y != y) {
          result.y = "";
        }
      }
    }
  } else if (graph.getModel().isEdge(cell)) {
    result.edges.push(cell);
    result.resizable = false;
    result.rotatable = false;
    result.movable = false;
  }

  var state = graph.view.getState(cell);

  if (state != null) {
    result.autoSize = result.autoSize || this.isAutoSizeState(state);
    result.glass = result.glass && this.isGlassState(state);
    result.rounded = result.rounded && this.isRoundedState(state);
    result.lineJumps = result.lineJumps && this.isLineJumpState(state);
    result.image = result.image && this.isImageState(state);
    result.shadow = result.shadow && this.isShadowState(state);
    result.fill = result.fill && this.isFillState(state);
    result.stroke = result.stroke && this.isStrokeState(state);

    var shape = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);
    result.containsImage = result.containsImage || shape == "image";

    for (var key in state.style) {
      var value = state.style[key];

      if (value != null) {
        if (result.style[key] == null) {
          result.style[key] = value;
        } else if (result.style[key] != value) {
          result.style[key] = "";
        }
      }
    }
  }
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isFillState = function (state) {
  return (
    !this.isSpecialColor(state.style[mxConstants.STYLE_FILLCOLOR]) &&
    (state.view.graph.model.isVertex(state.cell) ||
      mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null) == "arrow" ||
      mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null) ==
        "filledEdge" ||
      mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null) ==
        "flexArrow")
  );
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isStrokeState = function (state) {
  return !this.isSpecialColor(state.style[mxConstants.STYLE_STROKECOLOR]);
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isSpecialColor = function (color) {
  return (
    mxUtils.indexOf(
      [
        mxConstants.STYLE_STROKECOLOR,
        mxConstants.STYLE_FILLCOLOR,
        "inherit",
        "swimlane",
        "indicated",
      ],
      color
    ) >= 0
  );
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isGlassState = function (state) {
  var shape = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);

  return (
    shape == "label" ||
    shape == "rectangle" ||
    shape == "internalStorage" ||
    shape == "ext" ||
    shape == "umlLifeline" ||
    shape == "swimlane" ||
    shape == "process"
  );
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isRoundedState = function (state) {
  return state.shape != null
    ? state.shape.isRoundable()
    : mxUtils.indexOf(
        this.roundableShapes,
        mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null)
      ) >= 0;
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isLineJumpState = function (state) {
  var shape = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);
  var curved = mxUtils.getValue(state.style, mxConstants.STYLE_CURVED, false);

  return !curved && (shape == "connector" || shape == "filledEdge");
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isAutoSizeState = function (state) {
  return mxUtils.getValue(state.style, mxConstants.STYLE_AUTOSIZE, null) == "1";
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isImageState = function (state) {
  var shape = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);

  return shape == "label" || shape == "image";
};

/**
 * Returns information about the current selection.
 */
Format.prototype.isShadowState = function (state) {
  var shape = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);

  return shape != "image";
};

/**
 * Adds the label menu items to the given menu and parent.
 */
Format.prototype.clear = function () {
  this.container.innerHTML = "";

  // Destroy existing panels
  if (this.panels != null) {
    for (var i = 0; i < this.panels.length; i++) {
      this.panels[i].destroy();
    }
  }

  this.panels = [];
};
function isTrustBoundaries(cell) {
  return (
    cell.style.includes("rounded=0") ||
    cell.style.includes("rounded=1") ||
    cell.style.includes("shape=rectangle")
  );
}
/**
 * Adds the label menu items to the given menu and parent.
 */
Format.prototype.refresh = function () {
  // Performance tweak: No refresh needed if not visible
  if (this.container.style.width == "0px") {
    return;
  }

  this.clear();
  var ui = this.editorUi;
  var graph = ui.editor.graph;

  var div = document.createElement("div");
  div.style.whiteSpace = "nowrap";
  div.style.color = "rgb(112, 112, 112)";
  div.style.textAlign = "left";
  div.style.cursor = "default";

  var label = document.createElement("div");
  label.className = "geFormatSection";
  label.style.textAlign = "center";
  label.style.fontWeight = "bold";
  label.style.paddingTop = "8px";
  label.style.fontSize = "13px";
  label.style.borderWidth = "0px 0px 1px 1px";
  label.style.borderStyle = "solid";
  label.style.display = mxClient.IS_QUIRKS ? "inline" : "inline-block";
  label.style.height = mxClient.IS_QUIRKS ? "34px" : "25px";
  label.style.overflow = "hidden";
  label.style.width = "100%";
  this.container.appendChild(div);

  // Prevents text selection
  mxEvent.addListener(
    label,
    mxClient.IS_POINTER ? "pointerdown" : "mousedown",
    mxUtils.bind(this, function (evt) {
      evt.preventDefault();
    })
  );

  var containsLabel = this.getSelectionState().containsLabel;
  var currentLabel = null;
  var currentPanel = null;

  var addClickHandler = mxUtils.bind(this, function (elt, panel, index) {
    var clickHandler = mxUtils.bind(this, function (evt) {
      var cell = graph.getSelectionCell();
      if (currentLabel != elt) {
        if (containsLabel) {
          this.labelIndex = index;
        } else if (graph.isSelectionEmpty()) {
          this.diagramIndex = index;
        } else if (cell != null && cell.isEdge()) {
        } else {
          this.currentIndex = index;
        }

        if (currentLabel != null) {
          currentLabel.style.backgroundColor = this.inactiveTabBackgroundColor;
          currentLabel.style.borderBottomWidth = "1px";
        }

        currentLabel = elt;
        currentLabel.style.backgroundColor = "";
        currentLabel.style.borderBottomWidth = "0px";

        if (currentPanel != panel) {
          if (currentPanel != null) {
            currentPanel.style.display = "none";
          }

          currentPanel = panel;
          currentPanel.style.display = "";
        }
      }
    });

    mxEvent.addListener(elt, "click", clickHandler);

    // Prevents text selection
    mxEvent.addListener(
      elt,
      mxClient.IS_POINTER ? "pointerdown" : "mousedown",
      mxUtils.bind(this, function (evt) {
        evt.preventDefault();
      })
    );

    if (
      index ==
      (containsLabel
        ? this.labelIndex
        : graph.isSelectionEmpty()
        ? this.diagramIndex
        : this.currentIndex)
    ) {
      // Invokes handler directly as a workaround for no click on DIV in KHTML.
      clickHandler();
    }
  });

  var idx = 0;

  var cell = graph.getSelectionCell();

  if (graph.isSelectionEmpty()) {
    mxUtils.write(label, mxResources.get("diagram"));
    label.style.borderLeftWidth = "0px";

    div.appendChild(label);
    let diagramPanel = div.cloneNode(false);
    this.panels.push(new DiagramFormatPanel(this, ui, diagramPanel));
    this.container.appendChild(diagramPanel);

    if (Editor.styles != null) {
      diagramPanel.style.display = "none";
      label.style.width = this.showCloseButton ? "106px" : "50%";
      label.style.cursor = "pointer";
      label.style.backgroundColor = this.inactiveTabBackgroundColor;

      var label2 = label.cloneNode(false);
      label2.style.borderLeftWidth = "1px";
      label2.style.borderRightWidth = "1px";
      label2.style.backgroundColor = this.inactiveTabBackgroundColor;

      addClickHandler(label, diagramPanel, idx++);

      let stylePanel = div.cloneNode(false);
      stylePanel.style.display = "none";
      mxUtils.write(label2, mxResources.get("style"));
      div.appendChild(label2);
      this.panels.push(new DiagramStylePanel(this, ui, stylePanel));
      this.container.appendChild(stylePanel);

      addClickHandler(label2, stylePanel, idx++);
    }
    // Adds button to hide the format panel since
    // people don't seem to find the toolbar button
    // and the menu item in the format menu
    if (this.showCloseButton) {
      var label2 = label.cloneNode(false);
      label2.style.borderLeftWidth = "1px";
      label2.style.borderRightWidth = "1px";
      label2.style.borderBottomWidth = "1px";
      label2.style.backgroundColor = this.inactiveTabBackgroundColor;
      label2.style.position = "absolute";
      label2.style.right = "0px";
      label2.style.top = "0px";
      label2.style.width = "25px";

      var img = document.createElement("img");
      img.setAttribute("border", "0");
      img.setAttribute("src", Dialog.prototype.closeImage);
      img.setAttribute("title", mxResources.get("hide"));
      img.style.position = "absolute";
      img.style.display = "block";
      img.style.right = "0px";
      img.style.top = "8px";
      img.style.cursor = "pointer";
      img.style.marginTop = "1px";
      img.style.marginRight = "6px";
      img.style.border = "1px solid transparent";
      img.style.padding = "1px";
      img.style.opacity = 0.5;
      label2.appendChild(img);

      mxEvent.addListener(img, "click", function () {
        ui.actions.get("formatPanel").funct();
      });

      div.appendChild(label2);
    }
  } else if (
    cell != null &&
    graph.getSelectionCell().isVertex() &&
    isTrustBoundaries(graph.getSelectionCell())
  ) {
    label.style.backgroundColor = this.inactiveTabBackgroundColor;
    label.style.borderLeftWidth = "1px";
    label.style.cursor = "pointer";
    label.style.width = containsLabel ? "50%" : "33.3%";
    var label2 = label.cloneNode(false);
    var label3 = label2.cloneNode(false);

    // Workaround for ignored background in IE
    label2.style.backgroundColor = this.inactiveTabBackgroundColor;
    label3.style.backgroundColor = this.inactiveTabBackgroundColor;

    // Style
    if (containsLabel) {
      label2.style.borderLeftWidth = "0px";
    } else {
      label.style.borderLeftWidth = "0px";
      mxUtils.write(label, "Boundary");
      div.appendChild(label);

      var stylePanel = div.cloneNode(false);
      stylePanel.style.display = "none";
      this.panels.push(new BoundaryFormatPanel(this, ui, stylePanel));
      this.container.appendChild(stylePanel);

      addClickHandler(label, stylePanel, idx++);
    }

    // Text
    mxUtils.write(label2, mxResources.get("text"));
    div.appendChild(label2);

    let textPanel = div.cloneNode(false);
    textPanel.style.display = "none";
    this.panels.push(new TextFormatPanel(this, ui, textPanel));
    this.container.appendChild(textPanel);

    // Arrange
    mxUtils.write(label3, mxResources.get("arrange"));
    div.appendChild(label3);

    let arrangePanel = div.cloneNode(false);
    arrangePanel.style.display = "none";
    this.panels.push(new ArrangePanel(this, ui, arrangePanel));
    //Style
    var stylePanel = div.cloneNode(false);
    stylePanel.style.display = "none";
    this.panels.push(new StyleFormatPanel(this, ui, arrangePanel));

    this.container.appendChild(arrangePanel);

    addClickHandler(label2, textPanel, idx++);
    addClickHandler(label3, arrangePanel, idx++);
  } else if (cell != null && cell.isEdge()) {
    label.style.backgroundColor = this.inactiveTabBackgroundColor;
    label.style.borderLeftWidth = "1px";
    label.style.cursor = "pointer";
    label.style.width = containsLabel ? "50%" : "33.3%";
    let label2 = label.cloneNode(false);
    let label3 = label2.cloneNode(false);

    // Workaround for ignored background in IE
    label2.style.backgroundColor = this.inactiveTabBackgroundColor;
    label3.style.backgroundColor = this.inactiveTabBackgroundColor;

    // Style
    if (containsLabel) {
      label2.style.borderLeftWidth = "0px";
    } else {
      label.style.borderLeftWidth = "0px";
      mxUtils.write(label, "Exchange");
      div.appendChild(label);

      var stylePanel = div.cloneNode(false);
      stylePanel.style.display = "none";
      this.panels.push(new CommunicationFormatPanel(this, ui, stylePanel));
      this.container.appendChild(stylePanel);

      addClickHandler(label, stylePanel, idx++);
    }

    // Text
    mxUtils.write(label2, mxResources.get("text"));
    div.appendChild(label2);

    var textPanel = div.cloneNode(false);
    textPanel.style.display = "none";
    this.panels.push(new TextFormatPanel(this, ui, textPanel));
    this.container.appendChild(textPanel);

    // Arrange
    mxUtils.write(label3, mxResources.get("arrange"));
    div.appendChild(label3);

    var arrangePanel = div.cloneNode(false);
    arrangePanel.style.display = "none";
    this.panels.push(new ArrangePanel(this, ui, arrangePanel));
    //Style
    var stylePanel = div.cloneNode(false);
    stylePanel.style.display = "none";
    this.panels.push(new StyleFormatPanel(this, ui, arrangePanel));

    this.container.appendChild(arrangePanel);

    addClickHandler(label2, textPanel, idx++);
    addClickHandler(label3, arrangePanel, idx++);
  } else if (graph.isEditing()) {
    mxUtils.write(label, mxResources.get("text"));
    div.appendChild(label);
    this.panels.push(new TextFormatPanel(this, ui, div));
  } else {
    label.style.backgroundColor = this.inactiveTabBackgroundColor;
    label.style.borderLeftWidth = "1px";
    label.style.cursor = "pointer";
    label.style.width = containsLabel ? "50%" : "33.3%";
    let label2 = label.cloneNode(false);
    let label3 = label2.cloneNode(false);
    let label4 = label.cloneNode(false);
    // Workaround for ignored background in IE
    label2.style.backgroundColor = this.inactiveTabBackgroundColor;
    label3.style.backgroundColor = this.inactiveTabBackgroundColor;
    label4.style.backgroundColor = this.inactiveTabBackgroundColor;

    // Style
    if (containsLabel) {
      label4.style.borderLeftWidth = "0px";
    } else {
      label4.style.borderLeftWidth = "0px";
      mxUtils.write(label4, "Asset");
      div.appendChild(label4);

      let stylePanel = div.cloneNode(false);
      stylePanel.style.display = "none";
      this.panels.push(new AssetFormatPanel(this, ui, stylePanel));
      this.container.appendChild(stylePanel);

      addClickHandler(label4, stylePanel, idx++);
    }

    // Text
    mxUtils.write(label2, "Inspection");
    div.appendChild(label2);
    //

    var textPanel = div.cloneNode(false);
    textPanel.style.display = "none";
    this.container.appendChild(textPanel);
    this.panels.push(new InspectionFormatPanel(this, ui, textPanel));
    // Arrange
    mxUtils.write(label3, mxResources.get("arrange"));
    div.appendChild(label3);

    var arrangePanel = div.cloneNode(false);
    arrangePanel.style.display = "none";
    this.panels.push(new ArrangePanel(this, ui, arrangePanel));
    //Style
    var stylePanel = div.cloneNode(false);
    stylePanel.style.display = "none";
    this.panels.push(new StyleFormatPanel(this, ui, arrangePanel));
    this.panels.push(new TextFormatPanel(this, ui, arrangePanel));
    this.container.appendChild(arrangePanel);

    addClickHandler(label2, textPanel, idx++);
    addClickHandler(label3, arrangePanel, idx++);
  }
};

/**
 * Base class for format panels.
 */
BaseFormatPanel = function (format, editorUi, container) {
  this.format = format;
  this.editorUi = editorUi;
  this.container = container;
  this.listeners = [];
};

/**
 *
 */
BaseFormatPanel.prototype.buttonBackgroundColor = "white";

/**
 * Adds the given color option.
 */
BaseFormatPanel.prototype.getSelectionState = function () {
  var graph = this.editorUi.editor.graph;
  var cells = graph.getSelectionCells();
  var shape = null;

  for (var i = 0; i < cells.length; i++) {
    var state = graph.view.getState(cells[i]);

    if (state != null) {
      var tmp = mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE, null);

      if (tmp != null) {
        if (shape == null) {
          shape = tmp;
        } else if (shape != tmp) {
          return null;
        }
      }
    }
  }

  return shape;
};

/**
 * Install input handler.
 */
BaseFormatPanel.prototype.installInputHandler = function (
  input,
  key,
  defaultValue,
  min,
  max,
  unit,
  textEditFallback,
  isFloat
) {
  unit = unit != null ? unit : "";
  isFloat = isFloat != null ? isFloat : false;

  var ui = this.editorUi;
  var graph = ui.editor.graph;

  min = min != null ? min : 1;
  max = max != null ? max : 999;

  var selState = null;
  var updating = false;

  var update = mxUtils.bind(this, function (evt) {
    var value = isFloat ? parseFloat(input.value) : parseInt(input.value);

    // Special case: angle mod 360
    if (!isNaN(value) && key == mxConstants.STYLE_ROTATION) {
      // Workaround for decimal rounding errors in floats is to
      // use integer and round all numbers to two decimal point
      value = mxUtils.mod(Math.round(value * 100), 36000) / 100;
    }

    value = Math.min(max, Math.max(min, isNaN(value) ? defaultValue : value));

    if (graph.cellEditor.isContentEditing() && textEditFallback) {
      if (!updating) {
        updating = true;

        if (selState != null) {
          graph.cellEditor.restoreSelection(selState);
          selState = null;
        }

        textEditFallback(value);
        input.value = value + unit;

        // Restore focus and selection in input
        updating = false;
      }
    } else if (
      value !=
      mxUtils.getValue(this.format.getSelectionState().style, key, defaultValue)
    ) {
      if (graph.isEditing()) {
        graph.stopEditing(true);
      }

      graph.getModel().beginUpdate();
      try {
        var cells = graph.getSelectionCells();
        graph.setCellStyles(key, value, cells);

        // Handles special case for fontSize where HTML labels are parsed and updated
        if (key == mxConstants.STYLE_FONTSIZE) {
          graph.updateLabelElements(graph.getSelectionCells(), function (elt) {
            elt.style.fontSize = value + "px";
            elt.removeAttribute("size");
          });
        }

        for (var i = 0; i < cells.length; i++) {
          if (graph.model.getChildCount(cells[i]) == 0) {
            graph.autoSizeCell(cells[i], false);
          }
        }

        ui.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            [key],
            "values",
            [value],
            "cells",
            cells
          )
        );
      } finally {
        graph.getModel().endUpdate();
      }
    }

    input.value = value + unit;
    mxEvent.consume(evt);
  });

  if (textEditFallback && graph.cellEditor.isContentEditing()) {
    // KNOWN: Arrow up/down clear selection text in quirks/IE 8
    // Text size via arrow button limits to 16 in IE11. Why?
    mxEvent.addListener(input, "mousedown", function () {
      if (document.activeElement == graph.cellEditor.textarea) {
        selState = graph.cellEditor.saveSelection();
      }
    });

    mxEvent.addListener(input, "touchstart", function () {
      if (document.activeElement == graph.cellEditor.textarea) {
        selState = graph.cellEditor.saveSelection();
      }
    });
  }

  mxEvent.addListener(input, "change", update);
  mxEvent.addListener(input, "blur", update);

  return update;
};

/**
 * Adds the given option.
 */
BaseFormatPanel.prototype.createPanel = function () {
  var div = document.createElement("div");
  div.className = "geFormatSection";
  div.style.padding = "12px 0px 12px 18px";

  return div;
};

/**
 * Adds the given option.
 */
BaseFormatPanel.prototype.createTitle = function (title) {
  var div = document.createElement("div");
  div.style.padding = "0px 0px 6px 0px";
  div.style.whiteSpace = "nowrap";
  div.style.overflow = "hidden";
  div.style.width = "200px";
  div.style.fontWeight = "bold";
  mxUtils.write(div, title);

  return div;
};

/**
 *
 */
BaseFormatPanel.prototype.createStepper = function (
  input,
  update,
  step,
  height,
  disableFocus,
  defaultValue,
  isFloat
) {
  step = step != null ? step : 1;
  height = height != null ? height : 8;

  if (mxClient.IS_QUIRKS) {
    height = height - 2;
  } else if (mxClient.IS_MT || document.documentMode >= 8) {
    height = height + 1;
  }

  var stepper = document.createElement("div");
  mxUtils.setPrefixedStyle(stepper.style, "borderRadius", "3px");
  stepper.style.border = "1px solid rgb(192, 192, 192)";
  stepper.style.position = "absolute";

  var up = document.createElement("div");
  up.style.borderBottom = "1px solid rgb(192, 192, 192)";
  up.style.position = "relative";
  up.style.height = height + "px";
  up.style.width = "10px";
  up.className = "geBtnUp";
  stepper.appendChild(up);

  var down = up.cloneNode(false);
  down.style.border = "none";
  down.style.height = height + "px";
  down.className = "geBtnDown";
  stepper.appendChild(down);

  mxEvent.addListener(down, "click", function (evt) {
    if (input.value == "") {
      input.value = defaultValue || "2";
    }

    var val = isFloat ? parseFloat(input.value) : parseInt(input.value);

    if (!isNaN(val)) {
      input.value = val - step;

      if (update != null) {
        update(evt);
      }
    }

    mxEvent.consume(evt);
  });

  mxEvent.addListener(up, "click", function (evt) {
    if (input.value == "") {
      input.value = defaultValue || "0";
    }

    var val = isFloat ? parseFloat(input.value) : parseInt(input.value);

    if (!isNaN(val)) {
      input.value = val + step;

      if (update != null) {
        update(evt);
      }
    }

    mxEvent.consume(evt);
  });

  // Disables transfer of focus to DIV but also :active CSS
  // so it's only used for fontSize where the focus should
  // stay on the selected text, but not for any other input.
  if (disableFocus) {
    var currentSelection = null;

    mxEvent.addGestureListeners(
      stepper,
      function (evt) {
        // Workaround for lost current selection in page because of focus in IE
        if (mxClient.IS_QUIRKS || document.documentMode == 8) {
          currentSelection = document.selection.createRange();
        }

        mxEvent.consume(evt);
      },
      null,
      function (evt) {
        // Workaround for lost current selection in page because of focus in IE
        if (currentSelection != null) {
          try {
            currentSelection.select();
          } catch (e) {
            // ignore
          }

          currentSelection = null;
          mxEvent.consume(evt);
        }
      }
    );
  }

  return stepper;
};

/**
 * Adds the given option.
 */
BaseFormatPanel.prototype.createOption = function (
  label,
  isCheckedFn,
  setCheckedFn,
  listener,
  fn
) {
  var div = document.createElement("div");
  div.style.padding = "6px 0px 1px 0px";
  div.style.whiteSpace = "nowrap";
  div.style.overflow = "hidden";
  div.style.width = "200px";
  div.style.height = mxClient.IS_QUIRKS ? "27px" : "18px";

  var cb = document.createElement("input");
  cb.setAttribute("type", "checkbox");
  cb.style.margin = "0px 6px 0px 0px";
  div.appendChild(cb);

  var span = document.createElement("span");
  span.style.fontWeight = "bold";
  mxUtils.write(span, label);
  div.appendChild(span);

  var applying = false;
  var value = isCheckedFn();

  var apply = function (newValue) {
    if (!applying) {
      applying = true;

      if (newValue) {
        cb.setAttribute("checked", "checked");
        cb.defaultChecked = true;
        cb.checked = true;
      } else {
        cb.removeAttribute("checked");
        cb.defaultChecked = false;
        cb.checked = false;
      }

      if (value != newValue) {
        value = newValue;

        // Checks if the color value needs to be updated in the model
        if (isCheckedFn() != value) {
          setCheckedFn(value);
        }
      }

      applying = false;
    }
  };

  mxEvent.addListener(div, "click", function (evt) {
    if (cb.getAttribute("disabled") != "disabled") {
      // Toggles checkbox state for click on label
      var source = mxEvent.getSource(evt);

      if (source == div || source == span) {
        cb.checked = !cb.checked;
      }

      apply(cb.checked);
    }
  });

  apply(value);

  if (listener != null) {
    listener.install(apply);
    this.listeners.push(listener);
  }

  if (fn != null) {
    fn(div);
  }

  return div;
};

/**
 * The string 'null' means use null in values.
 */
BaseFormatPanel.prototype.createCellOption = function (
  label,
  key,
  defaultValue,
  enabledValue,
  disabledValue,
  fn,
  action,
  stopEditing
) {
  enabledValue =
    enabledValue != null ? (enabledValue == "null" ? null : enabledValue) : "1";
  disabledValue =
    disabledValue != null
      ? disabledValue == "null"
        ? null
        : disabledValue
      : "0";

  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  return this.createOption(
    label,
    function () {
      // Seems to be null sometimes, not sure why...
      var state = graph.view.getState(graph.getSelectionCell());

      if (state != null) {
        return (
          mxUtils.getValue(state.style, key, defaultValue) != disabledValue
        );
      }

      return null;
    },
    function (checked) {
      if (stopEditing) {
        graph.stopEditing();
      }

      if (action != null) {
        action.funct();
      } else {
        graph.getModel().beginUpdate();
        try {
          var value = checked ? enabledValue : disabledValue;
          graph.setCellStyles(key, value, graph.getSelectionCells());

          if (fn != null) {
            fn(graph.getSelectionCells(), value);
          }

          ui.fireEvent(
            new mxEventObject(
              "styleChanged",
              "keys",
              [key],
              "values",
              [value],
              "cells",
              graph.getSelectionCells()
            )
          );
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    {
      install: function (apply) {
        this.listener = function () {
          // Seems to be null sometimes, not sure why...
          var state = graph.view.getState(graph.getSelectionCell());

          if (state != null) {
            apply(
              mxUtils.getValue(state.style, key, defaultValue) != disabledValue
            );
          }
        };

        graph.getModel().addListener(mxEvent.CHANGE, this.listener);
      },
      destroy: function () {
        graph.getModel().removeListener(this.listener);
      },
    }
  );
};

/**
 * Adds the given color option.
 */
BaseFormatPanel.prototype.createColorOption = function (
  label,
  getColorFn,
  setColorFn,
  defaultColor,
  listener,
  callbackFn,
  hideCheckbox
) {
  var div = document.createElement("div");
  div.style.padding = "6px 0px 1px 0px";
  div.style.whiteSpace = "nowrap";
  div.style.overflow = "hidden";
  div.style.width = "200px";
  div.style.height = mxClient.IS_QUIRKS ? "27px" : "18px";

  var cb = document.createElement("input");
  cb.setAttribute("type", "checkbox");
  cb.style.margin = "0px 6px 0px 0px";

  if (!hideCheckbox) {
    div.appendChild(cb);
  }

  var span = document.createElement("span");
  mxUtils.write(span, label);
  div.appendChild(span);

  var value = getColorFn();
  var applying = false;
  var btn = null;

  var apply = function (color, disableUpdate, forceUpdate) {
    if (!applying) {
      applying = true;
      color = /(^#?[a-zA-Z0-9]*$)/.test(color) ? color : defaultColor;
      btn.innerHTML =
        '<div style="width:' +
        (mxClient.IS_QUIRKS ? "30" : "36") +
        "px;height:12px;margin:3px;border:1px solid black;background-color:" +
        mxUtils.htmlEntities(
          color != null && color != mxConstants.NONE ? color : defaultColor
        ) +
        ';"></div>';

      // Fine-tuning in Firefox, quirks mode and IE8 standards
      if (mxClient.IS_QUIRKS || document.documentMode == 8) {
        btn.firstChild.style.margin = "0px";
      }

      if (color != null && color != mxConstants.NONE) {
        cb.setAttribute("checked", "checked");
        cb.defaultChecked = true;
        cb.checked = true;
      } else {
        cb.removeAttribute("checked");
        cb.defaultChecked = false;
        cb.checked = false;
      }

      btn.style.display = cb.checked || hideCheckbox ? "" : "none";

      if (callbackFn != null) {
        callbackFn(color);
      }

      if (!disableUpdate) {
        value = color;

        // Checks if the color value needs to be updated in the model
        if (forceUpdate || hideCheckbox || getColorFn() != value) {
          setColorFn(value);
        }
      }

      applying = false;
    }
  };

  btn = mxUtils.button(
    "",
    mxUtils.bind(this, function (evt) {
      this.editorUi.pickColor(value, function (color) {
        apply(color, null, true);
      });
      mxEvent.consume(evt);
    })
  );

  btn.style.position = "absolute";
  btn.style.marginTop = "-4px";
  btn.style.right = mxClient.IS_QUIRKS ? "0px" : "20px";
  btn.style.height = "22px";
  btn.className = "geColorBtn";
  btn.style.display = cb.checked || hideCheckbox ? "" : "none";
  div.appendChild(btn);

  mxEvent.addListener(div, "click", function (evt) {
    var source = mxEvent.getSource(evt);

    if (source == cb || source.nodeName != "INPUT") {
      // Toggles checkbox state for click on label
      if (source != cb) {
        cb.checked = !cb.checked;
      }

      // Overrides default value with current value to make it easier
      // to restore previous value if the checkbox is clicked twice
      if (
        !cb.checked &&
        value != null &&
        value != mxConstants.NONE &&
        defaultColor != mxConstants.NONE
      ) {
        defaultColor = value;
      }

      apply(cb.checked ? defaultColor : mxConstants.NONE);
    }
  });

  apply(value, true);

  if (listener != null) {
    listener.install(apply);
    this.listeners.push(listener);
  }

  return div;
};

/**
 *
 */
BaseFormatPanel.prototype.createCellColorOption = function (
  label,
  colorKey,
  defaultColor,
  callbackFn,
  setStyleFn
) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  return this.createColorOption(
    label,
    function () {
      // Seems to be null sometimes, not sure why...
      var state = graph.view.getState(graph.getSelectionCell());

      if (state != null) {
        return mxUtils.getValue(state.style, colorKey, null);
      }

      return null;
    },
    function (color) {
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(colorKey, color, graph.getSelectionCells());

        if (setStyleFn != null) {
          setStyleFn(color);
        }

        ui.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            [colorKey],
            "values",
            [color],
            "cells",
            graph.getSelectionCells()
          )
        );
      } finally {
        graph.getModel().endUpdate();
      }
    },
    defaultColor || mxConstants.NONE,
    {
      install: function (apply) {
        this.listener = function () {
          // Seems to be null sometimes, not sure why...
          var state = graph.view.getState(graph.getSelectionCell());

          if (state != null) {
            apply(mxUtils.getValue(state.style, colorKey, null));
          }
        };

        graph.getModel().addListener(mxEvent.CHANGE, this.listener);
      },
      destroy: function () {
        graph.getModel().removeListener(this.listener);
      },
    },
    callbackFn
  );
};

/**
 *
 */
BaseFormatPanel.prototype.addArrow = function (elt, height) {
  height = height != null ? height : 10;

  var arrow = document.createElement("div");
  arrow.style.display = mxClient.IS_QUIRKS ? "inline" : "inline-block";
  arrow.style.padding = "6px";
  arrow.style.paddingRight = "4px";

  var m = 10 - height;

  if (m == 2) {
    arrow.style.paddingTop = 6 + "px";
  } else if (m > 0) {
    arrow.style.paddingTop = 6 - m + "px";
  } else {
    arrow.style.marginTop = "-2px";
  }

  arrow.style.height = height + "px";
  arrow.style.borderLeft = "1px solid #a0a0a0";
  arrow.innerHTML =
    '<img border="0" src="' +
    (mxClient.IS_SVG
      ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHBJREFUeNpidHB2ZyAGsACxDRBPIKCuA6TwCBB/h2rABu4A8SYmKCcXiP/iUFgAxL9gCi8A8SwsirZCMQMTkmANEH9E4v+CmsaArvAdyNFI/FlQ92EoBIE+qCRIUz168DBgsU4OqhinQpgHMABAgAEALY4XLIsJ20oAAAAASUVORK5CYII="
      : IMAGE_PATH + "/dropdown.png") +
    '" style="margin-bottom:4px;">';
  mxUtils.setOpacity(arrow, 70);

  var symbol = elt.getElementsByTagName("div")[0];

  if (symbol != null) {
    symbol.style.paddingRight = "6px";
    symbol.style.marginLeft = "4px";
    symbol.style.marginTop = "-1px";
    symbol.style.display = mxClient.IS_QUIRKS ? "inline" : "inline-block";
    mxUtils.setOpacity(symbol, 60);
  }

  mxUtils.setOpacity(elt, 100);
  elt.style.border = "1px solid #a0a0a0";
  elt.style.backgroundColor = this.buttonBackgroundColor;
  elt.style.backgroundImage = "none";
  elt.style.width = "auto";
  elt.className += " geColorBtn";
  mxUtils.setPrefixedStyle(elt.style, "borderRadius", "3px");

  elt.appendChild(arrow);

  return symbol;
};

/**
 *
 */
BaseFormatPanel.prototype.addUnitInput = function (
  container,
  unit,
  right,
  width,
  update,
  step,
  marginTop,
  disableFocus,
  isFloat
) {
  marginTop = marginTop != null ? marginTop : 0;

  var input = document.createElement("input");
  input.style.position = "absolute";
  input.style.textAlign = "right";
  input.style.marginTop = "-2px";
  input.style.right = right + 12 + "px";
  input.style.width = width + "px";
  container.appendChild(input);

  var stepper = this.createStepper(
    input,
    update,
    step,
    null,
    disableFocus,
    null,
    isFloat
  );
  stepper.style.marginTop = marginTop - 2 + "px";
  stepper.style.right = right + "px";
  container.appendChild(stepper);

  return input;
};

/**
 *
 */
BaseFormatPanel.prototype.createRelativeOption = function (
  label,
  key,
  width,
  handler,
  init
) {
  width = width != null ? width : 44;

  var graph = this.editorUi.editor.graph;
  var div = this.createPanel();
  div.style.paddingTop = "10px";
  div.style.paddingBottom = "10px";
  mxUtils.write(div, label);
  div.style.fontWeight = "bold";

  var update = mxUtils.bind(this, function (evt) {
    if (handler != null) {
      handler(input);
    } else {
      var value = parseInt(input.value);
      value = Math.min(100, Math.max(0, isNaN(value) ? 100 : value));
      var state = graph.view.getState(graph.getSelectionCell());

      if (state != null && value != mxUtils.getValue(state.style, key, 100)) {
        // Removes entry in style (assumes 100 is default for relative values)
        if (value == 100) {
          value = null;
        }

        graph.setCellStyles(key, value, graph.getSelectionCells());
        this.editorUi.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            [key],
            "values",
            [value],
            "cells",
            graph.getSelectionCells()
          )
        );
      }

      input.value = (value != null ? value : "100") + " %";
    }

    mxEvent.consume(evt);
  });

  var input = this.addUnitInput(
    div,
    "%",
    20,
    width,
    update,
    10,
    -15,
    handler != null
  );

  if (key != null) {
    var listener = mxUtils.bind(this, function (sender, evt, force) {
      if (force || input != document.activeElement) {
        var ss = this.format.getSelectionState();
        var tmp = parseInt(mxUtils.getValue(ss.style, key, 100));
        input.value = isNaN(tmp) ? "" : tmp + " %";
      }
    });

    mxEvent.addListener(input, "keydown", function (e) {
      if (e.keyCode == 13) {
        graph.container.focus();
        mxEvent.consume(e);
      } else if (e.keyCode == 27) {
        listener(null, null, true);
        graph.container.focus();
        mxEvent.consume(e);
      }
    });

    graph.getModel().addListener(mxEvent.CHANGE, listener);
    this.listeners.push({
      destroy: function () {
        graph.getModel().removeListener(listener);
      },
    });
    listener();
  }

  mxEvent.addListener(input, "blur", update);
  mxEvent.addListener(input, "change", update);

  if (init != null) {
    init(input);
  }

  return div;
};

/**
 *
 */
BaseFormatPanel.prototype.addLabel = function (div, title, right, width) {
  width = width != null ? width : 61;

  var label = document.createElement("div");
  mxUtils.write(label, title);
  label.style.position = "absolute";
  label.style.right = right + "px";
  label.style.width = width + "px";
  label.style.marginTop = "6px";
  label.style.textAlign = "center";
  div.appendChild(label);
};

/**
 *
 */
BaseFormatPanel.prototype.addKeyHandler = function (input, listener) {
  mxEvent.addListener(
    input,
    "keydown",
    mxUtils.bind(this, function (e) {
      if (e.keyCode == 13) {
        this.editorUi.editor.graph.container.focus();
        mxEvent.consume(e);
      } else if (e.keyCode == 27) {
        if (listener != null) {
          listener(null, null, true);
        }

        this.editorUi.editor.graph.container.focus();
        mxEvent.consume(e);
      }
    })
  );
};

/**
 *
 */
BaseFormatPanel.prototype.styleButtons = function (elts) {
  for (var i = 0; i < elts.length; i++) {
    mxUtils.setPrefixedStyle(elts[i].style, "borderRadius", "3px");
    mxUtils.setOpacity(elts[i], 100);
    elts[i].style.border = "1px solid #a0a0a0";
    elts[i].style.padding = "4px";
    elts[i].style.paddingTop = "3px";
    elts[i].style.paddingRight = "1px";
    elts[i].style.margin = "1px";
    elts[i].style.width = "24px";
    elts[i].style.height = "20px";
    elts[i].className += " geColorBtn";
  }
};

/**
 * Adds the label menu items to the given menu and parent.
 */
BaseFormatPanel.prototype.destroy = function () {
  if (this.listeners != null) {
    for (var i = 0; i < this.listeners.length; i++) {
      this.listeners[i].destroy();
    }

    this.listeners = null;
  }
};

/**
 * Adds the label menu items to the given menu and parent.
 */
ArrangePanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(ArrangePanel, BaseFormatPanel);

/**
 * Adds the label menu items to the given menu and parent.
 */
ArrangePanel.prototype.init = function () {
  var graph = this.editorUi.editor.graph;
  var ss = this.format.getSelectionState();

  this.container.appendChild(this.addLayerOps(this.createPanel()));
  // Special case that adds two panels
  this.addGeometry(this.container);
  this.addEdgeGeometry(this.container);

  if (!ss.containsLabel || ss.edges.length == 0) {
    this.container.appendChild(this.addAngle(this.createPanel()));
  }

  if (
    !ss.containsLabel &&
    ss.edges.length == 0 &&
    ss.style.shape != "rectangle" &&
    ss.style.shape != "label"
  ) {
    this.container.appendChild(this.addFlip(this.createPanel()));
  }

  if (ss.vertices.length > 1) {
    this.container.appendChild(this.addAlign(this.createPanel()));
    this.container.appendChild(this.addDistribute(this.createPanel()));
  }

  if (
    graph.isTable(ss.vertices[0]) ||
    graph.isTableRow(ss.vertices[0]) ||
    graph.isTableCell(ss.vertices[0])
  ) {
    this.container.appendChild(this.addTable(this.createPanel()));
  }

  this.container.appendChild(this.addGroupOps(this.createPanel()));

  if (ss.containsLabel) {
    // Adds functions from hidden style format panel
    var span = document.createElement("div");
    span.style.width = "100%";
    span.style.marginTop = "0px";
    span.style.fontWeight = "bold";
    span.style.padding = "10px 0 0 18px";
    mxUtils.write(span, mxResources.get("style"));
    this.container.appendChild(span);

    new StyleFormatPanel(this.format, this.editorUi, this.container);
  }
};

/**
 *
 */
ArrangePanel.prototype.addTable = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();
  div.style.paddingTop = "6px";
  div.style.paddingBottom = "10px";

  var span = document.createElement("div");
  span.style.marginTop = "2px";
  span.style.marginBottom = "8px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("table"));
  div.appendChild(span);

  var panel = document.createElement("div");
  panel.style.position = "relative";
  panel.style.paddingLeft = "0px";
  panel.style.borderWidth = "0px";
  panel.className = "geToolbarContainer";

  var btns = [
    ui.toolbar.addButton(
      "geSprite-insertcolumnbefore",
      mxResources.get("insertColumnBefore"),
      mxUtils.bind(this, function () {
        try {
          graph.insertTableColumn(ss.vertices[0], true);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
    ui.toolbar.addButton(
      "geSprite-insertcolumnafter",
      mxResources.get("insertColumnAfter"),
      mxUtils.bind(this, function () {
        try {
          graph.insertTableColumn(ss.vertices[0], false);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
    ui.toolbar.addButton(
      "geSprite-deletecolumn",
      mxResources.get("deleteColumn"),
      mxUtils.bind(this, function () {
        try {
          graph.deleteTableColumn(ss.vertices[0]);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
    ui.toolbar.addButton(
      "geSprite-insertrowbefore",
      mxResources.get("insertRowBefore"),
      mxUtils.bind(this, function () {
        try {
          graph.insertTableRow(ss.vertices[0], true);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
    ui.toolbar.addButton(
      "geSprite-insertrowafter",
      mxResources.get("insertRowAfter"),
      mxUtils.bind(this, function () {
        try {
          graph.insertTableRow(ss.vertices[0], false);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
    ui.toolbar.addButton(
      "geSprite-deleterow",
      mxResources.get("deleteRow"),
      mxUtils.bind(this, function () {
        try {
          graph.deleteTableRow(ss.vertices[0]);
        } catch (e) {
          ui.handleError(e);
        }
      }),
      panel
    ),
  ];
  this.styleButtons(btns);
  div.appendChild(panel);
  btns[2].style.marginRight = "9px";

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addLayerOps = function (div) {
  var ui = this.editorUi;

  var btn = mxUtils.button(mxResources.get("toFront"), function (evt) {
    ui.actions.get("toFront").funct();
  });

  btn.setAttribute(
    "title",
    mxResources.get("toFront") +
      " (" +
      this.editorUi.actions.get("toFront").shortcut +
      ")"
  );
  btn.style.width = "100px";
  btn.style.marginRight = "2px";
  div.appendChild(btn);

  var btn = mxUtils.button(mxResources.get("toBack"), function (evt) {
    ui.actions.get("toBack").funct();
  });

  btn.setAttribute(
    "title",
    mxResources.get("toBack") +
      " (" +
      this.editorUi.actions.get("toBack").shortcut +
      ")"
  );
  btn.style.width = "100px";
  div.appendChild(btn);

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addGroupOps = function (div) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var cell = graph.getSelectionCell();
  var ss = this.format.getSelectionState();
  var count = 0;
  var btn = null;

  div.style.paddingTop = "8px";
  div.style.paddingBottom = "6px";

  if (graph.getSelectionCount() > 1) {
    btn = mxUtils.button(mxResources.get("group"), function (evt) {
      ui.actions.get("group").funct();
    });

    btn.setAttribute(
      "title",
      mxResources.get("group") +
        " (" +
        this.editorUi.actions.get("group").shortcut +
        ")"
    );
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);
    count++;
  } else if (
    graph.getSelectionCount() == 1 &&
    !graph.getModel().isEdge(cell) &&
    !graph.isSwimlane(cell) &&
    !graph.isTable(cell) &&
    !ss.row &&
    !ss.cell &&
    graph.getModel().getChildCount(cell) > 0
  ) {
    btn = mxUtils.button(mxResources.get("ungroup"), function (evt) {
      ui.actions.get("ungroup").funct();
    });

    btn.setAttribute(
      "title",
      mxResources.get("ungroup") +
        " (" +
        this.editorUi.actions.get("ungroup").shortcut +
        ")"
    );
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);
    count++;
  }

  if (ss.vertices.length > 0) {
    if (count > 0) {
      mxUtils.br(div);
      count = 0;
    }

    var btn = mxUtils.button(mxResources.get("copySize"), function (evt) {
      ui.actions.get("copySize").funct();
    });

    btn.setAttribute(
      "title",
      mxResources.get("copySize") +
        " (" +
        this.editorUi.actions.get("copySize").shortcut +
        ")"
    );
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";

    div.appendChild(btn);
    count++;

    if (ui.copiedSize != null) {
      var btn2 = mxUtils.button(mxResources.get("pasteSize"), function (evt) {
        ui.actions.get("pasteSize").funct();
      });

      btn2.setAttribute(
        "title",
        mxResources.get("pasteSize") +
          " (" +
          this.editorUi.actions.get("pasteSize").shortcut +
          ")"
      );

      div.appendChild(btn2);
      count++;

      btn.style.width = "100px";
      btn.style.marginBottom = "2px";
      btn2.style.width = "100px";
      btn2.style.marginBottom = "2px";
    }
  }

  if (
    graph.getSelectionCount() == 1 &&
    graph.getModel().isVertex(cell) &&
    !ss.row &&
    !ss.cell &&
    graph.getModel().isVertex(graph.getModel().getParent(cell))
  ) {
    if (count > 0) {
      mxUtils.br(div);
    }

    btn = mxUtils.button(mxResources.get("removeFromGroup"), function (evt) {
      ui.actions.get("removeFromGroup").funct();
    });

    btn.setAttribute("title", mxResources.get("removeFromGroup"));
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);
    count++;
  } else if (graph.getSelectionCount() > 0) {
    if (count > 0) {
      mxUtils.br(div);
    }

    btn = mxUtils.button(
      mxResources.get("clearWaypoints"),
      mxUtils.bind(this, function (evt) {
        this.editorUi.actions.get("clearWaypoints").funct();
      })
    );

    btn.setAttribute(
      "title",
      mxResources.get("clearWaypoints") +
        " (" +
        this.editorUi.actions.get("clearWaypoints").shortcut +
        ")"
    );
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);

    count++;
  }

  if (graph.getSelectionCount() == 1) {
    if (count > 0) {
      mxUtils.br(div);
    }

    btn = mxUtils.button(
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
    btn.style.width = "100px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);
    count++;

    btn = mxUtils.button(
      mxResources.get("editLink"),
      mxUtils.bind(this, function (evt) {
        this.editorUi.actions.get("editLink").funct();
      })
    );

    btn.setAttribute("title", mxResources.get("editLink"));
    btn.style.width = "100px";
    btn.style.marginLeft = "2px";
    btn.style.marginBottom = "2px";
    div.appendChild(btn);
    count++;
  }

  if (count == 0) {
    div.style.display = "none";
  }

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addAlign = function (div) {
  var graph = this.editorUi.editor.graph;
  div.style.paddingTop = "6px";
  div.style.paddingBottom = "12px";
  div.appendChild(this.createTitle(mxResources.get("align")));

  var stylePanel = document.createElement("div");
  stylePanel.style.position = "relative";
  stylePanel.style.paddingLeft = "0px";
  stylePanel.style.borderWidth = "0px";
  stylePanel.className = "geToolbarContainer";

  if (mxClient.IS_QUIRKS) {
    div.style.height = "60px";
  }

  var left = this.editorUi.toolbar.addButton(
    "geSprite-alignleft",
    mxResources.get("left"),
    function () {
      graph.alignCells(mxConstants.ALIGN_LEFT);
    },
    stylePanel
  );
  var center = this.editorUi.toolbar.addButton(
    "geSprite-aligncenter",
    mxResources.get("center"),
    function () {
      graph.alignCells(mxConstants.ALIGN_CENTER);
    },
    stylePanel
  );
  var right = this.editorUi.toolbar.addButton(
    "geSprite-alignright",
    mxResources.get("right"),
    function () {
      graph.alignCells(mxConstants.ALIGN_RIGHT);
    },
    stylePanel
  );

  var top = this.editorUi.toolbar.addButton(
    "geSprite-aligntop",
    mxResources.get("top"),
    function () {
      graph.alignCells(mxConstants.ALIGN_TOP);
    },
    stylePanel
  );
  var middle = this.editorUi.toolbar.addButton(
    "geSprite-alignmiddle",
    mxResources.get("middle"),
    function () {
      graph.alignCells(mxConstants.ALIGN_MIDDLE);
    },
    stylePanel
  );
  var bottom = this.editorUi.toolbar.addButton(
    "geSprite-alignbottom",
    mxResources.get("bottom"),
    function () {
      graph.alignCells(mxConstants.ALIGN_BOTTOM);
    },
    stylePanel
  );

  this.styleButtons([left, center, right, top, middle, bottom]);
  right.style.marginRight = "6px";
  div.appendChild(stylePanel);

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addFlip = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  div.style.paddingTop = "6px";
  div.style.paddingBottom = "10px";

  var span = document.createElement("div");
  span.style.marginTop = "2px";
  span.style.marginBottom = "8px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("flip"));
  div.appendChild(span);

  var btn = mxUtils.button(mxResources.get("horizontal"), function (evt) {
    graph.toggleCellStyles(mxConstants.STYLE_FLIPH, false);
  });

  btn.setAttribute("title", mxResources.get("horizontal"));
  btn.style.width = "100px";
  btn.style.marginRight = "2px";
  div.appendChild(btn);

  var btn = mxUtils.button(mxResources.get("vertical"), function (evt) {
    graph.toggleCellStyles(mxConstants.STYLE_FLIPV, false);
  });

  btn.setAttribute("title", mxResources.get("vertical"));
  btn.style.width = "100px";
  div.appendChild(btn);

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addDistribute = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  div.style.paddingTop = "6px";
  div.style.paddingBottom = "12px";

  div.appendChild(this.createTitle(mxResources.get("distribute")));

  var btn = mxUtils.button(mxResources.get("horizontal"), function (evt) {
    graph.distributeCells(true);
  });

  btn.setAttribute("title", mxResources.get("horizontal"));
  btn.style.width = "100px";
  btn.style.marginRight = "2px";
  div.appendChild(btn);

  var btn = mxUtils.button(mxResources.get("vertical"), function (evt) {
    graph.distributeCells(false);
  });

  btn.setAttribute("title", mxResources.get("vertical"));
  btn.style.width = "100px";
  div.appendChild(btn);

  return div;
};

/**
 *
 */
ArrangePanel.prototype.addAngle = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  div.style.paddingBottom = "8px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";

  var input = null;
  var update = null;
  var btn = null;

  if (ss.rotatable && !ss.table && !ss.row && !ss.cell) {
    mxUtils.write(span, mxResources.get("angle"));
    div.appendChild(span);

    input = this.addUnitInput(div, "°", 20, 44, function () {
      update.apply(this, arguments);
    });

    mxUtils.br(div);
    div.style.paddingTop = "10px";
  } else {
    div.style.paddingTop = "8px";
  }

  if (!ss.containsLabel) {
    var label = mxResources.get("reverse");

    if (ss.vertices.length > 0 && ss.edges.length > 0) {
      label = mxResources.get("turn") + " / " + label;
    } else if (ss.vertices.length > 0) {
      label = mxResources.get("turn");
    }

    btn = mxUtils.button(label, function (evt) {
      ui.actions.get("turn").funct(evt);
    });

    btn.setAttribute(
      "title",
      label + " (" + this.editorUi.actions.get("turn").shortcut + ")"
    );
    btn.style.width = "202px";
    div.appendChild(btn);

    if (input != null) {
      btn.style.marginTop = "8px";
    }
  }

  if (input != null) {
    var listener = mxUtils.bind(this, function (sender, evt, force) {
      if (force || document.activeElement != input) {
        ss = this.format.getSelectionState();
        var tmp = parseFloat(
          mxUtils.getValue(ss.style, mxConstants.STYLE_ROTATION, 0)
        );
        input.value = isNaN(tmp) ? "" : tmp + "°";
      }
    });

    update = this.installInputHandler(
      input,
      mxConstants.STYLE_ROTATION,
      0,
      0,
      360,
      "°",
      null,
      true
    );
    this.addKeyHandler(input, listener);

    graph.getModel().addListener(mxEvent.CHANGE, listener);
    this.listeners.push({
      destroy: function () {
        graph.getModel().removeListener(listener);
      },
    });
    listener();
  }

  return div;
};

BaseFormatPanel.prototype.getUnit = function () {
  var unit = this.editorUi.editor.graph.view.unit;

  switch (unit) {
    case mxConstants.POINTS:
      return "pt";
    case mxConstants.INCHES:
      return '"';
    case mxConstants.MILLIMETERS:
      return "mm";
  }
};

BaseFormatPanel.prototype.inUnit = function (pixels) {
  return this.editorUi.editor.graph.view.formatUnitText(pixels);
};

BaseFormatPanel.prototype.fromUnit = function (value) {
  var unit = this.editorUi.editor.graph.view.unit;

  switch (unit) {
    case mxConstants.POINTS:
      return value;
    case mxConstants.INCHES:
      return value * mxConstants.PIXELS_PER_INCH;
    case mxConstants.MILLIMETERS:
      return value * mxConstants.PIXELS_PER_MM;
  }
};

BaseFormatPanel.prototype.isFloatUnit = function () {
  return this.editorUi.editor.graph.view.unit != mxConstants.POINTS;
};

BaseFormatPanel.prototype.getUnitStep = function () {
  var unit = this.editorUi.editor.graph.view.unit;

  switch (unit) {
    case mxConstants.POINTS:
      return 1;
    case mxConstants.INCHES:
      return 0.1;
    case mxConstants.MILLIMETERS:
      return 0.5;
  }
};

/**
 *
 */
ArrangePanel.prototype.addGeometry = function (container) {
  var panel = this;
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var rect = this.format.getSelectionState();

  var div = this.createPanel();
  div.style.paddingBottom = "8px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "50px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("size"));
  div.appendChild(span);

  var widthUpdate, heightUpdate, leftUpdate, topUpdate;
  var width = this.addUnitInput(
    div,
    this.getUnit(),
    84,
    44,
    function () {
      widthUpdate.apply(this, arguments);
    },
    this.getUnitStep(),
    null,
    null,
    this.isFloatUnit()
  );
  var height = this.addUnitInput(
    div,
    this.getUnit(),
    20,
    44,
    function () {
      heightUpdate.apply(this, arguments);
    },
    this.getUnitStep(),
    null,
    null,
    this.isFloatUnit()
  );

  var autosizeBtn = document.createElement("div");
  autosizeBtn.className = "geSprite geSprite-fit";
  autosizeBtn.setAttribute(
    "title",
    mxResources.get("autosize") +
      " (" +
      this.editorUi.actions.get("autosize").shortcut +
      ")"
  );
  autosizeBtn.style.position = "relative";
  autosizeBtn.style.cursor = "pointer";
  autosizeBtn.style.marginTop = "-3px";
  autosizeBtn.style.border = "0px";
  autosizeBtn.style.left = "42px";
  mxUtils.setOpacity(autosizeBtn, 50);

  mxEvent.addListener(autosizeBtn, "mouseenter", function () {
    mxUtils.setOpacity(autosizeBtn, 100);
  });

  mxEvent.addListener(autosizeBtn, "mouseleave", function () {
    mxUtils.setOpacity(autosizeBtn, 50);
  });

  mxEvent.addListener(autosizeBtn, "click", function () {
    ui.actions.get("autosize").funct();
  });

  div.appendChild(autosizeBtn);

  if (rect.row) {
    width.style.visibility = "hidden";
    width.nextSibling.style.visibility = "hidden";
  } else {
    this.addLabel(div, mxResources.get("width"), 84);
  }

  this.addLabel(div, mxResources.get("height"), 20);
  mxUtils.br(div);

  var wrapper = document.createElement("div");
  wrapper.style.paddingTop = "8px";
  wrapper.style.paddingRight = "20px";
  wrapper.style.whiteSpace = "nowrap";
  wrapper.style.textAlign = "right";
  var opt = this.createCellOption(
    mxResources.get("constrainProportions"),
    mxConstants.STYLE_ASPECT,
    null,
    "fixed",
    "null"
  );
  opt.style.width = "100%";
  wrapper.appendChild(opt);

  if (!rect.cell && !rect.row) {
    div.appendChild(wrapper);
  } else {
    autosizeBtn.style.visibility = "hidden";
  }

  var constrainCheckbox = opt.getElementsByTagName("input")[0];
  this.addKeyHandler(width, listener);
  this.addKeyHandler(height, listener);

  widthUpdate = this.addGeometryHandler(width, function (geo, value, cell) {
    if (graph.isTableCell(cell)) {
      graph.setTableColumnWidth(cell, value - geo.width, true);

      // Blocks processing in caller
      return true;
    } else if (geo.width > 0) {
      var value = Math.max(1, panel.fromUnit(value));

      if (constrainCheckbox.checked) {
        geo.height = Math.round((geo.height * value * 100) / geo.width) / 100;
      }

      geo.width = value;
    }
  });
  heightUpdate = this.addGeometryHandler(height, function (geo, value, cell) {
    if (graph.isTableCell(cell)) {
      cell = graph.model.getParent(cell);
    }

    if (graph.isTableRow(cell)) {
      graph.setTableRowHeight(cell, value - geo.height);

      // Blocks processing in caller
      return true;
    } else if (geo.height > 0) {
      var value = Math.max(1, panel.fromUnit(value));

      if (constrainCheckbox.checked) {
        geo.width = Math.round((geo.width * value * 100) / geo.height) / 100;
      }

      geo.height = value;
    }
  });

  if (rect.resizable || rect.row || rect.cell) {
    container.appendChild(div);
  }

  var div2 = this.createPanel();
  div2.style.paddingBottom = "30px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("position"));
  div2.appendChild(span);

  var left = this.addUnitInput(
    div2,
    this.getUnit(),
    84,
    44,
    function () {
      leftUpdate.apply(this, arguments);
    },
    this.getUnitStep(),
    null,
    null,
    this.isFloatUnit()
  );
  var top = this.addUnitInput(
    div2,
    this.getUnit(),
    20,
    44,
    function () {
      topUpdate.apply(this, arguments);
    },
    this.getUnitStep(),
    null,
    null,
    this.isFloatUnit()
  );

  mxUtils.br(div2);

  this.addLabel(div2, mxResources.get("left"), 84);
  this.addLabel(div2, mxResources.get("top"), 20);

  var listener = mxUtils.bind(this, function (sender, evt, force) {
    rect = this.format.getSelectionState();

    if (
      !rect.containsLabel &&
      rect.vertices.length == graph.getSelectionCount() &&
      rect.width != null &&
      rect.height != null
    ) {
      div.style.display = "";

      if (force || document.activeElement != width) {
        width.value =
          this.inUnit(rect.width) +
          (rect.width == "" ? "" : " " + this.getUnit());
      }

      if (force || document.activeElement != height) {
        height.value =
          this.inUnit(rect.height) +
          (rect.height == "" ? "" : " " + this.getUnit());
      }
    } else {
      div.style.display = "none";
    }

    if (
      rect.vertices.length == graph.getSelectionCount() &&
      rect.x != null &&
      rect.y != null
    ) {
      div2.style.display = "";

      if (force || document.activeElement != left) {
        left.value =
          this.inUnit(rect.x) + (rect.x == "" ? "" : " " + this.getUnit());
      }

      if (force || document.activeElement != top) {
        top.value =
          this.inUnit(rect.y) + (rect.y == "" ? "" : " " + this.getUnit());
      }
    } else {
      div2.style.display = "none";
    }
  });

  this.addKeyHandler(left, listener);
  this.addKeyHandler(top, listener);

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();

  leftUpdate = this.addGeometryHandler(left, function (geo, value) {
    value = panel.fromUnit(value);

    if (geo.relative) {
      geo.offset.x = value;
    } else {
      geo.x = value;
    }
  });
  topUpdate = this.addGeometryHandler(top, function (geo, value) {
    value = panel.fromUnit(value);

    if (geo.relative) {
      geo.offset.y = value;
    } else {
      geo.y = value;
    }
  });

  if (rect.movable) {
    container.appendChild(div2);
  }
};

/**
 *
 */
ArrangePanel.prototype.addGeometryHandler = function (input, fn) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var initialValue = null;
  var panel = this;

  function update(evt) {
    if (input.value != "") {
      var value = parseFloat(input.value);

      if (isNaN(value)) {
        input.value = initialValue + " " + panel.getUnit();
      } else if (value != initialValue) {
        graph.getModel().beginUpdate();
        try {
          var cells = graph.getSelectionCells();

          for (var i = 0; i < cells.length; i++) {
            if (graph.getModel().isVertex(cells[i])) {
              var geo = graph.getCellGeometry(cells[i]);

              if (geo != null) {
                geo = geo.clone();

                if (!fn(geo, value, cells[i])) {
                  var state = graph.view.getState(cells[i]);

                  if (state != null && graph.isRecursiveVertexResize(state)) {
                    graph.resizeChildCells(cells[i], geo);
                  }

                  graph.getModel().setGeometry(cells[i], geo);
                  graph.constrainChildCells(cells[i]);
                }
              }
            }
          }
        } finally {
          graph.getModel().endUpdate();
        }

        initialValue = value;
        input.value = value + " " + panel.getUnit();
      }
    }

    mxEvent.consume(evt);
  }

  mxEvent.addListener(input, "blur", update);
  mxEvent.addListener(input, "change", update);
  mxEvent.addListener(input, "focus", function () {
    initialValue = input.value;
  });

  return update;
};

ArrangePanel.prototype.addEdgeGeometryHandler = function (input, fn) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var initialValue = null;

  function update(evt) {
    if (input.value != "") {
      var value = parseFloat(input.value);

      if (isNaN(value)) {
        input.value = initialValue + " pt";
      } else if (value != initialValue) {
        graph.getModel().beginUpdate();
        try {
          var cells = graph.getSelectionCells();

          for (var i = 0; i < cells.length; i++) {
            if (graph.getModel().isEdge(cells[i])) {
              var geo = graph.getCellGeometry(cells[i]);

              if (geo != null) {
                geo = geo.clone();
                fn(geo, value);

                graph.getModel().setGeometry(cells[i], geo);
              }
            }
          }
        } finally {
          graph.getModel().endUpdate();
        }

        initialValue = value;
        input.value = value + " pt";
      }
    }

    mxEvent.consume(evt);
  }

  mxEvent.addListener(input, "blur", update);
  mxEvent.addListener(input, "change", update);
  mxEvent.addListener(input, "focus", function () {
    initialValue = input.value;
  });

  return update;
};

/**
 *
 */
ArrangePanel.prototype.addEdgeGeometry = function (container) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var rect = this.format.getSelectionState();

  var div = this.createPanel();

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("width"));
  div.appendChild(span);

  var widthUpdate, xtUpdate, ytUpdate, xsUpdate, ysUpdate;
  var width = this.addUnitInput(div, "pt", 20, 44, function () {
    widthUpdate.apply(this, arguments);
  });

  mxUtils.br(div);
  this.addKeyHandler(width, listener);

  function widthUpdate(evt) {
    // Maximum stroke width is 999
    var value = parseInt(width.value);
    value = Math.min(999, Math.max(1, isNaN(value) ? 1 : value));

    if (
      value !=
      mxUtils.getValue(
        rect.style,
        "width",
        mxCellRenderer.defaultShapes["flexArrow"].prototype.defaultWidth
      )
    ) {
      graph.setCellStyles("width", value, graph.getSelectionCells());
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          ["width"],
          "values",
          [value],
          "cells",
          graph.getSelectionCells()
        )
      );
    }

    width.value = value + " pt";
    mxEvent.consume(evt);
  }

  mxEvent.addListener(width, "blur", widthUpdate);
  mxEvent.addListener(width, "change", widthUpdate);

  container.appendChild(div);

  var divs = this.createPanel();
  divs.style.paddingBottom = "30px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, "Start");
  divs.appendChild(span);

  var xs = this.addUnitInput(divs, "pt", 84, 44, function () {
    xsUpdate.apply(this, arguments);
  });
  var ys = this.addUnitInput(divs, "pt", 20, 44, function () {
    ysUpdate.apply(this, arguments);
  });

  mxUtils.br(divs);
  this.addLabel(divs, mxResources.get("left"), 84);
  this.addLabel(divs, mxResources.get("top"), 20);
  container.appendChild(divs);
  this.addKeyHandler(xs, listener);
  this.addKeyHandler(ys, listener);

  var divt = this.createPanel();
  divt.style.paddingBottom = "30px";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, "End");
  divt.appendChild(span);

  var xt = this.addUnitInput(divt, "pt", 84, 44, function () {
    xtUpdate.apply(this, arguments);
  });
  var yt = this.addUnitInput(divt, "pt", 20, 44, function () {
    ytUpdate.apply(this, arguments);
  });

  mxUtils.br(divt);
  this.addLabel(divt, mxResources.get("left"), 84);
  this.addLabel(divt, mxResources.get("top"), 20);
  container.appendChild(divt);
  this.addKeyHandler(xt, listener);
  this.addKeyHandler(yt, listener);

  var listener = mxUtils.bind(this, function (sender, evt, force) {
    rect = this.format.getSelectionState();
    var cell = graph.getSelectionCell();

    if (rect.style.shape == "link" || rect.style.shape == "flexArrow") {
      div.style.display = "";

      if (force || document.activeElement != width) {
        var value = mxUtils.getValue(
          rect.style,
          "width",
          mxCellRenderer.defaultShapes["flexArrow"].prototype.defaultWidth
        );
        width.value = value + " pt";
      }
    } else {
      div.style.display = "none";
    }

    if (graph.getSelectionCount() == 1 && graph.model.isEdge(cell)) {
      var geo = graph.model.getGeometry(cell);

      if (
        geo.sourcePoint != null &&
        graph.model.getTerminal(cell, true) == null
      ) {
        xs.value = geo.sourcePoint.x;
        ys.value = geo.sourcePoint.y;
      } else {
        divs.style.display = "none";
      }

      if (
        geo.targetPoint != null &&
        graph.model.getTerminal(cell, false) == null
      ) {
        xt.value = geo.targetPoint.x;
        yt.value = geo.targetPoint.y;
      } else {
        divt.style.display = "none";
      }
    } else {
      divs.style.display = "none";
      divt.style.display = "none";
    }
  });

  xsUpdate = this.addEdgeGeometryHandler(xs, function (geo, value) {
    geo.sourcePoint.x = value;
  });

  ysUpdate = this.addEdgeGeometryHandler(ys, function (geo, value) {
    geo.sourcePoint.y = value;
  });

  xtUpdate = this.addEdgeGeometryHandler(xt, function (geo, value) {
    geo.targetPoint.x = value;
  });

  ytUpdate = this.addEdgeGeometryHandler(yt, function (geo, value) {
    geo.targetPoint.y = value;
  });

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();
};

/**
 * Adds the label menu items to the given menu and parent.
 */
TextFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(TextFormatPanel, BaseFormatPanel);

/**
 * Adds the label menu items to the given menu and parent.
 */
TextFormatPanel.prototype.init = function () {
  this.container.style.borderBottom = "none";
  this.addFont(this.container);
};

/**
 * Adds the label menu items to the given menu and parent.
 */
TextFormatPanel.prototype.addFont = function (container) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  var title = this.createTitle(mxResources.get("font"));
  title.style.paddingLeft = "18px";
  title.style.paddingTop = "10px";
  title.style.paddingBottom = "6px";
  container.appendChild(title);

  var stylePanel = this.createPanel();
  stylePanel.style.paddingTop = "2px";
  stylePanel.style.paddingBottom = "2px";
  stylePanel.style.position = "relative";
  stylePanel.style.marginLeft = "-2px";
  stylePanel.style.borderWidth = "0px";
  stylePanel.className = "geToolbarContainer";

  if (mxClient.IS_QUIRKS) {
    stylePanel.style.display = "block";
  }

  if (graph.cellEditor.isContentEditing()) {
    var cssPanel = stylePanel.cloneNode();

    var cssMenu = this.editorUi.toolbar.addMenu(
      mxResources.get("style"),
      mxResources.get("style"),
      true,
      "formatBlock",
      cssPanel,
      null,
      true
    );
    cssMenu.style.color = "rgb(112, 112, 112)";
    cssMenu.style.whiteSpace = "nowrap";
    cssMenu.style.overflow = "hidden";
    cssMenu.style.margin = "0px";
    this.addArrow(cssMenu);
    cssMenu.style.width = "192px";
    cssMenu.style.height = "15px";

    var arrow = cssMenu.getElementsByTagName("div")[0];
    arrow.style.cssFloat = "right";
    container.appendChild(cssPanel);
  }

  container.appendChild(stylePanel);

  var colorPanel = this.createPanel();
  colorPanel.style.marginTop = "8px";
  colorPanel.style.borderTop = "1px solid #c0c0c0";
  colorPanel.style.paddingTop = "6px";
  colorPanel.style.paddingBottom = "6px";

  var fontMenu = this.editorUi.toolbar.addMenu(
    "Helvetica",
    mxResources.get("fontFamily"),
    true,
    "fontFamily",
    stylePanel,
    null,
    true
  );
  fontMenu.style.color = "rgb(112, 112, 112)";
  fontMenu.style.whiteSpace = "nowrap";
  fontMenu.style.overflow = "hidden";
  fontMenu.style.margin = "0px";

  this.addArrow(fontMenu);
  fontMenu.style.width = "192px";
  fontMenu.style.height = "15px";

  var stylePanel2 = stylePanel.cloneNode(false);
  stylePanel2.style.marginLeft = "-3px";
  var fontStyleItems = this.editorUi.toolbar.addItems(
    ["bold", "italic", "underline"],
    stylePanel2,
    true
  );
  fontStyleItems[0].setAttribute(
    "title",
    mxResources.get("bold") +
      " (" +
      this.editorUi.actions.get("bold").shortcut +
      ")"
  );
  fontStyleItems[1].setAttribute(
    "title",
    mxResources.get("italic") +
      " (" +
      this.editorUi.actions.get("italic").shortcut +
      ")"
  );
  fontStyleItems[2].setAttribute(
    "title",
    mxResources.get("underline") +
      " (" +
      this.editorUi.actions.get("underline").shortcut +
      ")"
  );

  var verticalItem = this.editorUi.toolbar.addItems(
    ["vertical"],
    stylePanel2,
    true
  )[0];

  if (mxClient.IS_QUIRKS) {
    mxUtils.br(container);
  }

  container.appendChild(stylePanel2);

  this.styleButtons(fontStyleItems);
  this.styleButtons([verticalItem]);

  var stylePanel3 = stylePanel.cloneNode(false);
  stylePanel3.style.marginLeft = "-3px";
  stylePanel3.style.paddingBottom = "0px";

  // Helper function to return a wrapper function does not pass any arguments
  var callFn = function (fn) {
    return function () {
      return fn();
    };
  };

  var left = this.editorUi.toolbar.addButton(
    "geSprite-left",
    mxResources.get("left"),
    graph.cellEditor.isContentEditing()
      ? function (evt) {
          graph.cellEditor.alignText(mxConstants.ALIGN_LEFT, evt);
        }
      : callFn(
          this.editorUi.menus.createStyleChangeFunction(
            [mxConstants.STYLE_ALIGN],
            [mxConstants.ALIGN_LEFT]
          )
        ),
    stylePanel3
  );
  var center = this.editorUi.toolbar.addButton(
    "geSprite-center",
    mxResources.get("center"),
    graph.cellEditor.isContentEditing()
      ? function (evt) {
          graph.cellEditor.alignText(mxConstants.ALIGN_CENTER, evt);
        }
      : callFn(
          this.editorUi.menus.createStyleChangeFunction(
            [mxConstants.STYLE_ALIGN],
            [mxConstants.ALIGN_CENTER]
          )
        ),
    stylePanel3
  );
  var right = this.editorUi.toolbar.addButton(
    "geSprite-right",
    mxResources.get("right"),
    graph.cellEditor.isContentEditing()
      ? function (evt) {
          graph.cellEditor.alignText(mxConstants.ALIGN_RIGHT, evt);
        }
      : callFn(
          this.editorUi.menus.createStyleChangeFunction(
            [mxConstants.STYLE_ALIGN],
            [mxConstants.ALIGN_RIGHT]
          )
        ),
    stylePanel3
  );

  this.styleButtons([left, center, right]);

  // Quick hack for strikethrough
  // TODO: Add translations and toggle state
  if (graph.cellEditor.isContentEditing()) {
    var strike = this.editorUi.toolbar.addButton(
      "geSprite-removeformat",
      mxResources.get("strikethrough"),
      function () {
        document.execCommand("strikeThrough", false, null);
      },
      stylePanel2
    );
    this.styleButtons([strike]);

    strike.firstChild.style.background =
      "url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHBhdGggaWQ9ImEiIGQ9Ik0wIDBoMjR2MjRIMFYweiIvPjwvZGVmcz48Y2xpcFBhdGggaWQ9ImIiPjx1c2UgeGxpbms6aHJlZj0iI2EiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PC9jbGlwUGF0aD48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiMwMTAxMDEiIGQ9Ik03LjI0IDguNzVjLS4yNi0uNDgtLjM5LTEuMDMtLjM5LTEuNjcgMC0uNjEuMTMtMS4xNi40LTEuNjcuMjYtLjUuNjMtLjkzIDEuMTEtMS4yOS40OC0uMzUgMS4wNS0uNjMgMS43LS44My42Ni0uMTkgMS4zOS0uMjkgMi4xOC0uMjkuODEgMCAxLjU0LjExIDIuMjEuMzQuNjYuMjIgMS4yMy41NCAxLjY5Ljk0LjQ3LjQuODMuODggMS4wOCAxLjQzLjI1LjU1LjM4IDEuMTUuMzggMS44MWgtMy4wMWMwLS4zMS0uMDUtLjU5LS4xNS0uODUtLjA5LS4yNy0uMjQtLjQ5LS40NC0uNjgtLjItLjE5LS40NS0uMzMtLjc1LS40NC0uMy0uMS0uNjYtLjE2LTEuMDYtLjE2LS4zOSAwLS43NC4wNC0xLjAzLjEzLS4yOS4wOS0uNTMuMjEtLjcyLjM2LS4xOS4xNi0uMzQuMzQtLjQ0LjU1LS4xLjIxLS4xNS40My0uMTUuNjYgMCAuNDguMjUuODguNzQgMS4yMS4zOC4yNS43Ny40OCAxLjQxLjdINy4zOWMtLjA1LS4wOC0uMTEtLjE3LS4xNS0uMjV6TTIxIDEydi0ySDN2Mmg5LjYyYy4xOC4wNy40LjE0LjU1LjIuMzcuMTcuNjYuMzQuODcuNTEuMjEuMTcuMzUuMzYuNDMuNTcuMDcuMi4xMS40My4xMS42OSAwIC4yMy0uMDUuNDUtLjE0LjY2LS4wOS4yLS4yMy4zOC0uNDIuNTMtLjE5LjE1LS40Mi4yNi0uNzEuMzUtLjI5LjA4LS42My4xMy0xLjAxLjEzLS40MyAwLS44My0uMDQtMS4xOC0uMTNzLS42Ni0uMjMtLjkxLS40MmMtLjI1LS4xOS0uNDUtLjQ0LS41OS0uNzUtLjE0LS4zMS0uMjUtLjc2LS4yNS0xLjIxSDYuNGMwIC41NS4wOCAxLjEzLjI0IDEuNTguMTYuNDUuMzcuODUuNjUgMS4yMS4yOC4zNS42LjY2Ljk4LjkyLjM3LjI2Ljc4LjQ4IDEuMjIuNjUuNDQuMTcuOS4zIDEuMzguMzkuNDguMDguOTYuMTMgMS40NC4xMy44IDAgMS41My0uMDkgMi4xOC0uMjhzMS4yMS0uNDUgMS42Ny0uNzljLjQ2LS4zNC44Mi0uNzcgMS4wNy0xLjI3cy4zOC0xLjA3LjM4LTEuNzFjMC0uNi0uMS0xLjE0LS4zMS0xLjYxLS4wNS0uMTEtLjExLS4yMy0uMTctLjMzSDIxeiIvPjwvc3ZnPg==)";
    strike.firstChild.style.backgroundPosition = "2px 2px";
    strike.firstChild.style.backgroundSize = "18px 18px";

    this.styleButtons([strike]);
  }

  var top = this.editorUi.toolbar.addButton(
    "geSprite-top",
    mxResources.get("top"),
    callFn(
      this.editorUi.menus.createStyleChangeFunction(
        [mxConstants.STYLE_VERTICAL_ALIGN],
        [mxConstants.ALIGN_TOP]
      )
    ),
    stylePanel3
  );
  var middle = this.editorUi.toolbar.addButton(
    "geSprite-middle",
    mxResources.get("middle"),
    callFn(
      this.editorUi.menus.createStyleChangeFunction(
        [mxConstants.STYLE_VERTICAL_ALIGN],
        [mxConstants.ALIGN_MIDDLE]
      )
    ),
    stylePanel3
  );
  var bottom = this.editorUi.toolbar.addButton(
    "geSprite-bottom",
    mxResources.get("bottom"),
    callFn(
      this.editorUi.menus.createStyleChangeFunction(
        [mxConstants.STYLE_VERTICAL_ALIGN],
        [mxConstants.ALIGN_BOTTOM]
      )
    ),
    stylePanel3
  );

  this.styleButtons([top, middle, bottom]);

  if (mxClient.IS_QUIRKS) {
    mxUtils.br(container);
  }

  container.appendChild(stylePanel3);

  // Hack for updating UI state below based on current text selection
  // currentTable is the current selected DOM table updated below
  var sub, sup, full, tableWrapper, currentTable, tableCell, tableRow;

  if (graph.cellEditor.isContentEditing()) {
    top.style.display = "none";
    middle.style.display = "none";
    bottom.style.display = "none";
    verticalItem.style.display = "none";

    full = this.editorUi.toolbar.addButton(
      "geSprite-justifyfull",
      mxResources.get("block"),
      function () {
        if (full.style.opacity == 1) {
          document.execCommand("justifyfull", false, null);
        }
      },
      stylePanel3
    );
    full.style.marginRight = "9px";
    full.style.opacity = 1;

    this.styleButtons([
      full,
      (sub = this.editorUi.toolbar.addButton(
        "geSprite-subscript",
        mxResources.get("subscript") + " (" + Editor.ctrlKey + "+,)",
        function () {
          document.execCommand("subscript", false, null);
        },
        stylePanel3
      )),
      (sup = this.editorUi.toolbar.addButton(
        "geSprite-superscript",
        mxResources.get("superscript") + " (" + Editor.ctrlKey + "+.)",
        function () {
          document.execCommand("superscript", false, null);
        },
        stylePanel3
      )),
    ]);
    sub.style.marginLeft = "9px";

    var tmp = stylePanel3.cloneNode(false);
    tmp.style.paddingTop = "4px";
    var btns = [
      this.editorUi.toolbar.addButton(
        "geSprite-orderedlist",
        mxResources.get("numberedList"),
        function () {
          document.execCommand("insertorderedlist", false, null);
        },
        tmp
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-unorderedlist",
        mxResources.get("bulletedList"),
        function () {
          document.execCommand("insertunorderedlist", false, null);
        },
        tmp
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-outdent",
        mxResources.get("decreaseIndent"),
        function () {
          document.execCommand("outdent", false, null);
        },
        tmp
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-indent",
        mxResources.get("increaseIndent"),
        function () {
          document.execCommand("indent", false, null);
        },
        tmp
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-removeformat",
        mxResources.get("removeFormat"),
        function () {
          document.execCommand("removeformat", false, null);
        },
        tmp
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-code",
        mxResources.get("html"),
        function () {
          graph.cellEditor.toggleViewMode();
        },
        tmp
      ),
    ];
    this.styleButtons(btns);
    btns[btns.length - 2].style.marginLeft = "9px";

    if (mxClient.IS_QUIRKS) {
      mxUtils.br(container);
      tmp.style.height = "40";
    }

    container.appendChild(tmp);
  } else {
    fontStyleItems[2].style.marginRight = "9px";
    right.style.marginRight = "9px";
  }

  // Label position
  var stylePanel4 = stylePanel.cloneNode(false);
  stylePanel4.style.marginLeft = "0px";
  stylePanel4.style.paddingTop = "8px";
  stylePanel4.style.paddingBottom = "4px";
  stylePanel4.style.fontWeight = "normal";

  mxUtils.write(stylePanel4, mxResources.get("position"));

  // Adds label position options
  var positionSelect = document.createElement("select");
  positionSelect.style.position = "absolute";
  positionSelect.style.right = "20px";
  positionSelect.style.width = "97px";
  positionSelect.style.marginTop = "-2px";

  var directions = [
    "topLeft",
    "top",
    "topRight",
    "left",
    "center",
    "right",
    "bottomLeft",
    "bottom",
    "bottomRight",
  ];
  var lset = {
    topLeft: [
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_TOP,
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_BOTTOM,
    ],
    top: [
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_TOP,
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_BOTTOM,
    ],
    topRight: [
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_TOP,
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_BOTTOM,
    ],
    left: [
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_MIDDLE,
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_MIDDLE,
    ],
    center: [
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_MIDDLE,
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_MIDDLE,
    ],
    right: [
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_MIDDLE,
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_MIDDLE,
    ],
    bottomLeft: [
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_BOTTOM,
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_TOP,
    ],
    bottom: [
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_BOTTOM,
      mxConstants.ALIGN_CENTER,
      mxConstants.ALIGN_TOP,
    ],
    bottomRight: [
      mxConstants.ALIGN_RIGHT,
      mxConstants.ALIGN_BOTTOM,
      mxConstants.ALIGN_LEFT,
      mxConstants.ALIGN_TOP,
    ],
  };

  for (var i = 0; i < directions.length; i++) {
    var positionOption = document.createElement("option");
    positionOption.setAttribute("value", directions[i]);
    mxUtils.write(positionOption, mxResources.get(directions[i]));
    positionSelect.appendChild(positionOption);
  }

  stylePanel4.appendChild(positionSelect);

  // Writing direction
  var stylePanel5 = stylePanel.cloneNode(false);
  stylePanel5.style.marginLeft = "0px";
  stylePanel5.style.paddingTop = "4px";
  stylePanel5.style.paddingBottom = "4px";
  stylePanel5.style.fontWeight = "normal";

  mxUtils.write(stylePanel5, mxResources.get("writingDirection"));

  // Adds writing direction options
  // LATER: Handle reselect of same option in all selects (change event
  // is not fired for same option so have opened state on click) and
  // handle multiple different styles for current selection
  var dirSelect = document.createElement("select");
  dirSelect.style.position = "absolute";
  dirSelect.style.right = "20px";
  dirSelect.style.width = "97px";
  dirSelect.style.marginTop = "-2px";

  // NOTE: For automatic we use the value null since automatic
  // requires the text to be non formatted and non-wrapped
  var dirs = ["automatic", "leftToRight", "rightToLeft"];
  var dirSet = {
    automatic: null,
    leftToRight: mxConstants.TEXT_DIRECTION_LTR,
    rightToLeft: mxConstants.TEXT_DIRECTION_RTL,
  };

  for (var i = 0; i < dirs.length; i++) {
    var dirOption = document.createElement("option");
    dirOption.setAttribute("value", dirs[i]);
    mxUtils.write(dirOption, mxResources.get(dirs[i]));
    dirSelect.appendChild(dirOption);
  }

  stylePanel5.appendChild(dirSelect);

  if (!graph.isEditing()) {
    container.appendChild(stylePanel4);

    mxEvent.addListener(positionSelect, "change", function (evt) {
      graph.getModel().beginUpdate();
      try {
        var vals = lset[positionSelect.value];

        if (vals != null) {
          graph.setCellStyles(
            mxConstants.STYLE_LABEL_POSITION,
            vals[0],
            graph.getSelectionCells()
          );
          graph.setCellStyles(
            mxConstants.STYLE_VERTICAL_LABEL_POSITION,
            vals[1],
            graph.getSelectionCells()
          );
          graph.setCellStyles(
            mxConstants.STYLE_ALIGN,
            vals[2],
            graph.getSelectionCells()
          );
          graph.setCellStyles(
            mxConstants.STYLE_VERTICAL_ALIGN,
            vals[3],
            graph.getSelectionCells()
          );
        }
      } finally {
        graph.getModel().endUpdate();
      }

      mxEvent.consume(evt);
    });

    // LATER: Update dir in text editor while editing and update style with label
    // NOTE: The tricky part is handling and passing on the auto value
    container.appendChild(stylePanel5);

    mxEvent.addListener(dirSelect, "change", function (evt) {
      graph.setCellStyles(
        mxConstants.STYLE_TEXT_DIRECTION,
        dirSet[dirSelect.value],
        graph.getSelectionCells()
      );
      mxEvent.consume(evt);
    });
  }

  // Font size
  var input = document.createElement("input");
  input.style.textAlign = "right";
  input.style.marginTop = "4px";

  if (!mxClient.IS_QUIRKS) {
    input.style.position = "absolute";
    input.style.right = "32px";
  }

  input.style.width = "40px";
  input.style.height = mxClient.IS_QUIRKS ? "21px" : "17px";
  stylePanel2.appendChild(input);

  // Workaround for font size 4 if no text is selected is update font size below
  // after first character was entered (as the font element is lazy created)
  var pendingFontSize = null;

  var inputUpdate = this.installInputHandler(
    input,
    mxConstants.STYLE_FONTSIZE,
    Menus.prototype.defaultFontSize,
    1,
    999,
    " pt",
    function (fontSize) {
      // IE does not support containsNode
      // KNOWN: Fixes font size issues but bypasses undo
      if (window.getSelection && !mxClient.IS_IE && !mxClient.IS_IE11) {
        var selection = window.getSelection();
        var container =
          selection.rangeCount > 0
            ? selection.getRangeAt(0).commonAncestorContainer
            : graph.cellEditor.textarea;

        function updateSize(elt, ignoreContains) {
          if (
            graph.cellEditor.textarea != null &&
            elt != graph.cellEditor.textarea &&
            graph.cellEditor.textarea.contains(elt) &&
            (ignoreContains || selection.containsNode(elt, true))
          ) {
            if (elt.nodeName == "FONT") {
              elt.removeAttribute("size");
              elt.style.fontSize = fontSize + "px";
            } else {
              var css = mxUtils.getCurrentStyle(elt);

              if (css.fontSize != fontSize + "px") {
                if (
                  mxUtils.getCurrentStyle(elt.parentNode).fontSize !=
                  fontSize + "px"
                ) {
                  elt.style.fontSize = fontSize + "px";
                } else {
                  elt.style.fontSize = "";
                }
              }
            }
          }
        }

        // Wraps text node or mixed selection with leading text in a font element
        if (
          container == graph.cellEditor.textarea ||
          container.nodeType != mxConstants.NODETYPE_ELEMENT
        ) {
          document.execCommand("fontSize", false, "1");
        }

        if (container != graph.cellEditor.textarea) {
          container = container.parentNode;
        }

        if (
          container != null &&
          container.nodeType == mxConstants.NODETYPE_ELEMENT
        ) {
          var elts = container.getElementsByTagName("*");
          updateSize(container);

          for (var i = 0; i < elts.length; i++) {
            updateSize(elts[i]);
          }
        }

        input.value = fontSize + " pt";
      } else if (window.getSelection || document.selection) {
        // Checks selection
        var par = null;

        if (document.selection) {
          par = document.selection.createRange().parentElement();
        } else {
          var selection = window.getSelection();

          if (selection.rangeCount > 0) {
            par = selection.getRangeAt(0).commonAncestorContainer;
          }
        }

        // Node.contains does not work for text nodes in IE11
        function isOrContains(container, node) {
          while (node != null) {
            if (node === container) {
              return true;
            }

            node = node.parentNode;
          }

          return false;
        }

        if (par != null && isOrContains(graph.cellEditor.textarea, par)) {
          pendingFontSize = fontSize;

          // Workaround for can't set font size in px is to change font size afterwards
          document.execCommand("fontSize", false, "4");
          var elts = graph.cellEditor.textarea.getElementsByTagName("font");

          for (var i = 0; i < elts.length; i++) {
            if (elts[i].getAttribute("size") == "4") {
              elts[i].removeAttribute("size");
              elts[i].style.fontSize = pendingFontSize + "px";

              // Overrides fontSize in input with the one just assigned as a workaround
              // for potential fontSize values of parent elements that don't match
              window.setTimeout(function () {
                input.value = pendingFontSize + " pt";
                pendingFontSize = null;
              }, 0);

              break;
            }
          }
        }
      }
    },
    true
  );

  var stepper = this.createStepper(
    input,
    inputUpdate,
    1,
    10,
    true,
    Menus.prototype.defaultFontSize
  );
  stepper.style.display = input.style.display;
  stepper.style.marginTop = "4px";

  if (!mxClient.IS_QUIRKS) {
    stepper.style.right = "20px";
  }

  stylePanel2.appendChild(stepper);

  var arrow = fontMenu.getElementsByTagName("div")[0];
  arrow.style.cssFloat = "right";

  var bgColorApply = null;
  var currentBgColor = "#ffffff";

  var fontColorApply = null;
  var currentFontColor = "#000000";

  var bgPanel = graph.cellEditor.isContentEditing()
    ? this.createColorOption(
        mxResources.get("backgroundColor"),
        function () {
          return currentBgColor;
        },
        function (color) {
          document.execCommand(
            "backcolor",
            false,
            color != mxConstants.NONE ? color : "transparent"
          );
        },
        "#ffffff",
        {
          install: function (apply) {
            bgColorApply = apply;
          },
          destroy: function () {
            bgColorApply = null;
          },
        },
        null,
        true
      )
    : this.createCellColorOption(
        mxResources.get("backgroundColor"),
        mxConstants.STYLE_LABEL_BACKGROUNDCOLOR,
        "#ffffff",
        null,
        function (color) {
          graph.updateLabelElements(graph.getSelectionCells(), function (elt) {
            elt.style.backgroundColor = null;
          });
        }
      );
  bgPanel.style.fontWeight = "bold";

  var borderPanel = this.createCellColorOption(
    mxResources.get("borderColor"),
    mxConstants.STYLE_LABEL_BORDERCOLOR,
    "#000000"
  );
  borderPanel.style.fontWeight = "bold";

  var defs =
    ss.vertices.length >= 1
      ? graph.stylesheet.getDefaultVertexStyle()
      : graph.stylesheet.getDefaultEdgeStyle();
  var panel = graph.cellEditor.isContentEditing()
    ? this.createColorOption(
        mxResources.get("fontColor"),
        function () {
          return currentFontColor;
        },
        function (color) {
          if (mxClient.IS_FF) {
            // Workaround for Firefox that adds the font element around
            // anchor elements which ignore inherited colors is to move
            // the font element inside anchor elements
            var tmp = graph.cellEditor.textarea.getElementsByTagName("font");
            var oldFonts = [];

            for (var i = 0; i < tmp.length; i++) {
              oldFonts.push({
                node: tmp[i],
                color: tmp[i].getAttribute("color"),
              });
            }

            document.execCommand(
              "forecolor",
              false,
              color != mxConstants.NONE ? color : "transparent"
            );

            // Finds the new or changed font element
            var newFonts =
              graph.cellEditor.textarea.getElementsByTagName("font");

            for (var i = 0; i < newFonts.length; i++) {
              if (
                i >= oldFonts.length ||
                newFonts[i] != oldFonts[i].node ||
                (newFonts[i] == oldFonts[i].node &&
                  newFonts[i].getAttribute("color") != oldFonts[i].color)
              ) {
                var child = newFonts[i].firstChild;

                // Moves the font element to inside the anchor element and adopts all children
                if (
                  child != null &&
                  child.nodeName == "A" &&
                  child.nextSibling == null &&
                  child.firstChild != null
                ) {
                  var parent = newFonts[i].parentNode;
                  parent.insertBefore(child, newFonts[i]);
                  var tmp = child.firstChild;

                  while (tmp != null) {
                    var next = tmp.nextSibling;
                    newFonts[i].appendChild(tmp);
                    tmp = next;
                  }

                  child.appendChild(newFonts[i]);
                }

                break;
              }
            }
          } else {
            document.execCommand(
              "forecolor",
              false,
              color != mxConstants.NONE ? color : "transparent"
            );
          }
        },
        defs[mxConstants.STYLE_FONTCOLOR] != null
          ? defs[mxConstants.STYLE_FONTCOLOR]
          : "#000000",
        {
          install: function (apply) {
            fontColorApply = apply;
          },
          destroy: function () {
            fontColorApply = null;
          },
        },
        null,
        true
      )
    : this.createCellColorOption(
        mxResources.get("fontColor"),
        mxConstants.STYLE_FONTCOLOR,
        defs[mxConstants.STYLE_FONTCOLOR] != null
          ? defs[mxConstants.STYLE_FONTCOLOR]
          : "#000000",
        function (color) {
          if (color == mxConstants.NONE) {
            bgPanel.style.display = "none";
          } else {
            bgPanel.style.display = "";
          }

          borderPanel.style.display = bgPanel.style.display;
        },
        function (color) {
          if (color == mxConstants.NONE) {
            graph.setCellStyles(
              mxConstants.STYLE_NOLABEL,
              "1",
              graph.getSelectionCells()
            );
          } else {
            graph.setCellStyles(
              mxConstants.STYLE_NOLABEL,
              null,
              graph.getSelectionCells()
            );
          }

          graph.updateCellStyles(
            mxConstants.STYLE_FONTCOLOR,
            color,
            graph.getSelectionCells()
          );

          graph.updateLabelElements(graph.getSelectionCells(), function (elt) {
            elt.removeAttribute("color");
            elt.style.color = null;
          });
        }
      );
  panel.style.fontWeight = "bold";

  colorPanel.appendChild(panel);
  colorPanel.appendChild(bgPanel);

  if (!graph.cellEditor.isContentEditing()) {
    colorPanel.appendChild(borderPanel);
  }

  container.appendChild(colorPanel);

  var extraPanel = this.createPanel();
  extraPanel.style.paddingTop = "2px";
  extraPanel.style.paddingBottom = "4px";

  // LATER: Fix toggle using '' instead of 'null'
  var wwOpt = this.createCellOption(
    mxResources.get("wordWrap"),
    mxConstants.STYLE_WHITE_SPACE,
    null,
    "wrap",
    "null",
    null,
    null,
    true
  );
  wwOpt.style.fontWeight = "bold";

  // Word wrap in edge labels only supported via labelWidth style
  if (!ss.containsLabel && !ss.autoSize && ss.edges.length == 0) {
    extraPanel.appendChild(wwOpt);
  }

  // Delegates switch of style to formattedText action as it also convertes newlines
  var htmlOpt = this.createCellOption(
    mxResources.get("formattedText"),
    "html",
    "0",
    null,
    null,
    null,
    ui.actions.get("formattedText")
  );
  htmlOpt.style.fontWeight = "bold";
  extraPanel.appendChild(htmlOpt);

  var spacingPanel = this.createPanel();
  spacingPanel.style.paddingTop = "10px";
  spacingPanel.style.paddingBottom = "28px";
  spacingPanel.style.fontWeight = "normal";

  var span = document.createElement("div");
  span.style.position = "absolute";
  span.style.width = "70px";
  span.style.marginTop = "0px";
  span.style.fontWeight = "bold";
  mxUtils.write(span, mxResources.get("spacing"));
  spacingPanel.appendChild(span);

  var topUpdate, globalUpdate, leftUpdate, bottomUpdate, rightUpdate;
  var topSpacing = this.addUnitInput(spacingPanel, "pt", 91, 44, function () {
    topUpdate.apply(this, arguments);
  });
  var globalSpacing = this.addUnitInput(
    spacingPanel,
    "pt",
    20,
    44,
    function () {
      globalUpdate.apply(this, arguments);
    }
  );

  mxUtils.br(spacingPanel);
  this.addLabel(spacingPanel, mxResources.get("top"), 91);
  this.addLabel(spacingPanel, mxResources.get("global"), 20);
  mxUtils.br(spacingPanel);
  mxUtils.br(spacingPanel);

  var leftSpacing = this.addUnitInput(spacingPanel, "pt", 162, 44, function () {
    leftUpdate.apply(this, arguments);
  });
  var bottomSpacing = this.addUnitInput(
    spacingPanel,
    "pt",
    91,
    44,
    function () {
      bottomUpdate.apply(this, arguments);
    }
  );
  var rightSpacing = this.addUnitInput(spacingPanel, "pt", 20, 44, function () {
    rightUpdate.apply(this, arguments);
  });

  mxUtils.br(spacingPanel);
  this.addLabel(spacingPanel, mxResources.get("left"), 162);
  this.addLabel(spacingPanel, mxResources.get("bottom"), 91);
  this.addLabel(spacingPanel, mxResources.get("right"), 20);

  if (!graph.cellEditor.isContentEditing()) {
    container.appendChild(extraPanel);
    container.appendChild(
      this.createRelativeOption(
        mxResources.get("opacity"),
        mxConstants.STYLE_TEXT_OPACITY
      )
    );
    container.appendChild(spacingPanel);
  } else {
    var selState = null;
    var lineHeightInput = null;

    container.appendChild(
      this.createRelativeOption(
        mxResources.get("lineheight"),
        null,
        null,
        function (input) {
          var value = input.value == "" ? 120 : parseInt(input.value);
          value = Math.max(0, isNaN(value) ? 120 : value);

          if (selState != null) {
            graph.cellEditor.restoreSelection(selState);
            selState = null;
          }

          var selectedElement = graph.getSelectedElement();
          var node = selectedElement;

          while (
            node != null &&
            node.nodeType != mxConstants.NODETYPE_ELEMENT
          ) {
            node = node.parentNode;
          }

          if (
            node != null &&
            node == graph.cellEditor.textarea &&
            graph.cellEditor.textarea.firstChild != null
          ) {
            if (graph.cellEditor.textarea.firstChild.nodeName != "P") {
              graph.cellEditor.textarea.innerHTML =
                "<p>" + graph.cellEditor.textarea.innerHTML + "</p>";
            }

            node = graph.cellEditor.textarea.firstChild;
          }

          if (
            node != null &&
            graph.cellEditor.textarea != null &&
            node != graph.cellEditor.textarea &&
            graph.cellEditor.textarea.contains(node)
          ) {
            node.style.lineHeight = value + "%";
          }

          input.value = value + " %";
        },
        function (input) {
          // Used in CSS handler to update current value
          lineHeightInput = input;

          // KNOWN: Arrow up/down clear selection text in quirks/IE 8
          // Text size via arrow button limits to 16 in IE11. Why?
          mxEvent.addListener(input, "mousedown", function () {
            if (document.activeElement == graph.cellEditor.textarea) {
              selState = graph.cellEditor.saveSelection();
            }
          });

          mxEvent.addListener(input, "touchstart", function () {
            if (document.activeElement == graph.cellEditor.textarea) {
              selState = graph.cellEditor.saveSelection();
            }
          });

          input.value = "120 %";
        }
      )
    );

    var insertPanel = stylePanel.cloneNode(false);
    insertPanel.style.paddingLeft = "0px";
    var insertBtns = this.editorUi.toolbar.addItems(
      ["link", "image"],
      insertPanel,
      true
    );

    var btns = [
      this.editorUi.toolbar.addButton(
        "geSprite-horizontalrule",
        mxResources.get("insertHorizontalRule"),
        function () {
          document.execCommand("inserthorizontalrule", false);
        },
        insertPanel
      ),
      this.editorUi.toolbar.addMenuFunctionInContainer(
        insertPanel,
        "geSprite-table",
        mxResources.get("table"),
        false,
        mxUtils.bind(this, function (menu) {
          this.editorUi.menus.addInsertTableItem(menu);
        })
      ),
    ];
    this.styleButtons(insertBtns);
    this.styleButtons(btns);

    var wrapper2 = this.createPanel();
    wrapper2.style.paddingTop = "10px";
    wrapper2.style.paddingBottom = "10px";
    wrapper2.appendChild(this.createTitle(mxResources.get("insert")));
    wrapper2.appendChild(insertPanel);
    container.appendChild(wrapper2);

    if (mxClient.IS_QUIRKS) {
      wrapper2.style.height = "70";
    }

    var tablePanel = stylePanel.cloneNode(false);
    tablePanel.style.paddingLeft = "0px";

    var btns = [
      this.editorUi.toolbar.addButton(
        "geSprite-insertcolumnbefore",
        mxResources.get("insertColumnBefore"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null) {
              graph.insertColumn(
                currentTable,
                tableCell != null ? tableCell.cellIndex : 0
              );
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-insertcolumnafter",
        mxResources.get("insertColumnAfter"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null) {
              graph.insertColumn(
                currentTable,
                tableCell != null ? tableCell.cellIndex + 1 : -1
              );
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-deletecolumn",
        mxResources.get("deleteColumn"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null && tableCell != null) {
              graph.deleteColumn(currentTable, tableCell.cellIndex);
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-insertrowbefore",
        mxResources.get("insertRowBefore"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null && tableRow != null) {
              graph.insertRow(currentTable, tableRow.sectionRowIndex);
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-insertrowafter",
        mxResources.get("insertRowAfter"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null && tableRow != null) {
              graph.insertRow(currentTable, tableRow.sectionRowIndex + 1);
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-deleterow",
        mxResources.get("deleteRow"),
        mxUtils.bind(this, function () {
          try {
            if (currentTable != null && tableRow != null) {
              graph.deleteRow(currentTable, tableRow.sectionRowIndex);
            }
          } catch (e) {
            this.editorUi.handleError(e);
          }
        }),
        tablePanel
      ),
    ];
    this.styleButtons(btns);
    btns[2].style.marginRight = "9px";

    var wrapper3 = this.createPanel();
    wrapper3.style.paddingTop = "10px";
    wrapper3.style.paddingBottom = "10px";
    wrapper3.appendChild(this.createTitle(mxResources.get("table")));
    wrapper3.appendChild(tablePanel);

    if (mxClient.IS_QUIRKS) {
      mxUtils.br(container);
      wrapper3.style.height = "70";
    }

    var tablePanel2 = stylePanel.cloneNode(false);
    tablePanel2.style.paddingLeft = "0px";

    var btns = [
      this.editorUi.toolbar.addButton(
        "geSprite-strokecolor",
        mxResources.get("borderColor"),
        mxUtils.bind(this, function (evt) {
          if (currentTable != null) {
            // Converts rgb(r,g,b) values
            var color = currentTable.style.borderColor.replace(
              /\brgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
              function ($0, $1, $2, $3) {
                return (
                  "#" +
                  ("0" + Number($1).toString(16)).substr(-2) +
                  ("0" + Number($2).toString(16)).substr(-2) +
                  ("0" + Number($3).toString(16)).substr(-2)
                );
              }
            );
            this.editorUi.pickColor(color, function (newColor) {
              var targetElt =
                tableCell != null && (evt == null || !mxEvent.isShiftDown(evt))
                  ? tableCell
                  : currentTable;

              graph.processElements(targetElt, function (elt) {
                elt.style.border = null;
              });

              if (newColor == null || newColor == mxConstants.NONE) {
                targetElt.removeAttribute("border");
                targetElt.style.border = "";
                targetElt.style.borderCollapse = "";
              } else {
                targetElt.setAttribute("border", "1");
                targetElt.style.border = "1px solid " + newColor;
                targetElt.style.borderCollapse = "collapse";
              }
            });
          }
        }),
        tablePanel2
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-fillcolor",
        mxResources.get("backgroundColor"),
        mxUtils.bind(this, function (evt) {
          // Converts rgb(r,g,b) values
          if (currentTable != null) {
            var color = currentTable.style.backgroundColor.replace(
              /\brgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
              function ($0, $1, $2, $3) {
                return (
                  "#" +
                  ("0" + Number($1).toString(16)).substr(-2) +
                  ("0" + Number($2).toString(16)).substr(-2) +
                  ("0" + Number($3).toString(16)).substr(-2)
                );
              }
            );
            this.editorUi.pickColor(color, function (newColor) {
              var targetElt =
                tableCell != null && (evt == null || !mxEvent.isShiftDown(evt))
                  ? tableCell
                  : currentTable;

              graph.processElements(targetElt, function (elt) {
                elt.style.backgroundColor = null;
              });

              if (newColor == null || newColor == mxConstants.NONE) {
                targetElt.style.backgroundColor = "";
              } else {
                targetElt.style.backgroundColor = newColor;
              }
            });
          }
        }),
        tablePanel2
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-fit",
        mxResources.get("spacing"),
        function () {
          if (currentTable != null) {
            var value = currentTable.getAttribute("cellPadding") || 0;

            var dlg = new FilenameDialog(
              ui,
              value,
              mxResources.get("apply"),
              mxUtils.bind(this, function (newValue) {
                if (newValue != null && newValue.length > 0) {
                  currentTable.setAttribute("cellPadding", newValue);
                } else {
                  currentTable.removeAttribute("cellPadding");
                }
              }),
              mxResources.get("spacing")
            );
            ui.showDialog(dlg.container, 300, 80, true, true);
            dlg.init();
          }
        },
        tablePanel2
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-left",
        mxResources.get("left"),
        function () {
          if (currentTable != null) {
            currentTable.setAttribute("align", "left");
          }
        },
        tablePanel2
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-center",
        mxResources.get("center"),
        function () {
          if (currentTable != null) {
            currentTable.setAttribute("align", "center");
          }
        },
        tablePanel2
      ),
      this.editorUi.toolbar.addButton(
        "geSprite-right",
        mxResources.get("right"),
        function () {
          if (currentTable != null) {
            currentTable.setAttribute("align", "right");
          }
        },
        tablePanel2
      ),
    ];
    this.styleButtons(btns);
    btns[2].style.marginRight = "9px";

    if (mxClient.IS_QUIRKS) {
      mxUtils.br(wrapper3);
      mxUtils.br(wrapper3);
    }

    wrapper3.appendChild(tablePanel2);
    container.appendChild(wrapper3);

    tableWrapper = wrapper3;
  }

  function setSelected(elt, selected) {
    if (mxClient.IS_IE && (mxClient.IS_QUIRKS || document.documentMode < 10)) {
      elt.style.filter = selected
        ? "progid:DXImageTransform.Microsoft.Gradient(" +
          "StartColorStr='#c5ecff', EndColorStr='#87d4fb', GradientType=0)"
        : "";
    } else {
      elt.style.backgroundImage = selected
        ? "linear-gradient(#c5ecff 0px,#87d4fb 100%)"
        : "";
    }
  }

  var listener = mxUtils.bind(this, function (sender, evt, force) {
    ss = this.format.getSelectionState();
    var fontStyle = mxUtils.getValue(ss.style, mxConstants.STYLE_FONTSTYLE, 0);
    setSelected(
      fontStyleItems[0],
      (fontStyle & mxConstants.FONT_BOLD) == mxConstants.FONT_BOLD
    );
    setSelected(
      fontStyleItems[1],
      (fontStyle & mxConstants.FONT_ITALIC) == mxConstants.FONT_ITALIC
    );
    setSelected(
      fontStyleItems[2],
      (fontStyle & mxConstants.FONT_UNDERLINE) == mxConstants.FONT_UNDERLINE
    );
    fontMenu.firstChild.nodeValue = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_FONTFAMILY,
      Menus.prototype.defaultFont
    );

    setSelected(
      verticalItem,
      mxUtils.getValue(ss.style, mxConstants.STYLE_HORIZONTAL, "1") == "0"
    );

    if (force || document.activeElement != input) {
      var tmp = parseFloat(
        mxUtils.getValue(
          ss.style,
          mxConstants.STYLE_FONTSIZE,
          Menus.prototype.defaultFontSize
        )
      );
      input.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    var align = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_ALIGN,
      mxConstants.ALIGN_CENTER
    );
    setSelected(left, align == mxConstants.ALIGN_LEFT);
    setSelected(center, align == mxConstants.ALIGN_CENTER);
    setSelected(right, align == mxConstants.ALIGN_RIGHT);

    var valign = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_VERTICAL_ALIGN,
      mxConstants.ALIGN_MIDDLE
    );
    setSelected(top, valign == mxConstants.ALIGN_TOP);
    setSelected(middle, valign == mxConstants.ALIGN_MIDDLE);
    setSelected(bottom, valign == mxConstants.ALIGN_BOTTOM);

    var pos = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_LABEL_POSITION,
      mxConstants.ALIGN_CENTER
    );
    var vpos = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_VERTICAL_LABEL_POSITION,
      mxConstants.ALIGN_MIDDLE
    );

    if (pos == mxConstants.ALIGN_LEFT && vpos == mxConstants.ALIGN_TOP) {
      positionSelect.value = "topLeft";
    } else if (
      pos == mxConstants.ALIGN_CENTER &&
      vpos == mxConstants.ALIGN_TOP
    ) {
      positionSelect.value = "top";
    } else if (
      pos == mxConstants.ALIGN_RIGHT &&
      vpos == mxConstants.ALIGN_TOP
    ) {
      positionSelect.value = "topRight";
    } else if (
      pos == mxConstants.ALIGN_LEFT &&
      vpos == mxConstants.ALIGN_BOTTOM
    ) {
      positionSelect.value = "bottomLeft";
    } else if (
      pos == mxConstants.ALIGN_CENTER &&
      vpos == mxConstants.ALIGN_BOTTOM
    ) {
      positionSelect.value = "bottom";
    } else if (
      pos == mxConstants.ALIGN_RIGHT &&
      vpos == mxConstants.ALIGN_BOTTOM
    ) {
      positionSelect.value = "bottomRight";
    } else if (pos == mxConstants.ALIGN_LEFT) {
      positionSelect.value = "left";
    } else if (pos == mxConstants.ALIGN_RIGHT) {
      positionSelect.value = "right";
    } else {
      positionSelect.value = "center";
    }

    var dir = mxUtils.getValue(
      ss.style,
      mxConstants.STYLE_TEXT_DIRECTION,
      mxConstants.DEFAULT_TEXT_DIRECTION
    );

    if (dir == mxConstants.TEXT_DIRECTION_RTL) {
      dirSelect.value = "rightToLeft";
    } else if (dir == mxConstants.TEXT_DIRECTION_LTR) {
      dirSelect.value = "leftToRight";
    } else if (dir == mxConstants.TEXT_DIRECTION_AUTO) {
      dirSelect.value = "automatic";
    }

    if (force || document.activeElement != globalSpacing) {
      var tmp = parseFloat(
        mxUtils.getValue(ss.style, mxConstants.STYLE_SPACING, 2)
      );
      globalSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != topSpacing) {
      var tmp = parseFloat(
        mxUtils.getValue(ss.style, mxConstants.STYLE_SPACING_TOP, 0)
      );
      topSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != rightSpacing) {
      var tmp = parseFloat(
        mxUtils.getValue(ss.style, mxConstants.STYLE_SPACING_RIGHT, 0)
      );
      rightSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != bottomSpacing) {
      var tmp = parseFloat(
        mxUtils.getValue(ss.style, mxConstants.STYLE_SPACING_BOTTOM, 0)
      );
      bottomSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }

    if (force || document.activeElement != leftSpacing) {
      var tmp = parseFloat(
        mxUtils.getValue(ss.style, mxConstants.STYLE_SPACING_LEFT, 0)
      );
      leftSpacing.value = isNaN(tmp) ? "" : tmp + " pt";
    }
  });

  globalUpdate = this.installInputHandler(
    globalSpacing,
    mxConstants.STYLE_SPACING,
    2,
    -999,
    999,
    " pt"
  );
  topUpdate = this.installInputHandler(
    topSpacing,
    mxConstants.STYLE_SPACING_TOP,
    0,
    -999,
    999,
    " pt"
  );
  rightUpdate = this.installInputHandler(
    rightSpacing,
    mxConstants.STYLE_SPACING_RIGHT,
    0,
    -999,
    999,
    " pt"
  );
  bottomUpdate = this.installInputHandler(
    bottomSpacing,
    mxConstants.STYLE_SPACING_BOTTOM,
    0,
    -999,
    999,
    " pt"
  );
  leftUpdate = this.installInputHandler(
    leftSpacing,
    mxConstants.STYLE_SPACING_LEFT,
    0,
    -999,
    999,
    " pt"
  );

  this.addKeyHandler(input, listener);
  this.addKeyHandler(globalSpacing, listener);
  this.addKeyHandler(topSpacing, listener);
  this.addKeyHandler(rightSpacing, listener);
  this.addKeyHandler(bottomSpacing, listener);
  this.addKeyHandler(leftSpacing, listener);

  graph.getModel().addListener(mxEvent.CHANGE, listener);
  this.listeners.push({
    destroy: function () {
      graph.getModel().removeListener(listener);
    },
  });
  listener();

  if (graph.cellEditor.isContentEditing()) {
    var updating = false;

    var updateCssHandler = function () {
      if (!updating) {
        updating = true;

        window.setTimeout(function () {
          var node = graph.getSelectedEditingElement();

          if (node != null) {
            function getRelativeLineHeight(fontSize, css, elt) {
              if (elt.style != null && css != null) {
                var lineHeight = css.lineHeight;

                if (
                  elt.style.lineHeight != null &&
                  elt.style.lineHeight.substring(
                    elt.style.lineHeight.length - 1
                  ) == "%"
                ) {
                  return parseInt(elt.style.lineHeight) / 100;
                } else {
                  return lineHeight.substring(lineHeight.length - 2) == "px"
                    ? parseFloat(lineHeight) / fontSize
                    : parseInt(lineHeight);
                }
              } else {
                return "";
              }
            }

            function getAbsoluteFontSize(css) {
              var fontSize = css != null ? css.fontSize : null;

              if (
                fontSize != null &&
                fontSize.substring(fontSize.length - 2) == "px"
              ) {
                return parseFloat(fontSize);
              } else {
                return mxConstants.DEFAULT_FONTSIZE;
              }
            }

            var css = mxUtils.getCurrentStyle(node);
            var fontSize = getAbsoluteFontSize(css);
            var lineHeight = getRelativeLineHeight(fontSize, css, node);

            // Finds common font size
            var elts = node.getElementsByTagName("*");

            // IE does not support containsNode
            if (
              elts.length > 0 &&
              window.getSelection &&
              !mxClient.IS_IE &&
              !mxClient.IS_IE11
            ) {
              var selection = window.getSelection();

              for (var i = 0; i < elts.length; i++) {
                if (selection.containsNode(elts[i], true)) {
                  temp = mxUtils.getCurrentStyle(elts[i]);
                  fontSize = Math.max(getAbsoluteFontSize(temp), fontSize);
                  var lh = getRelativeLineHeight(fontSize, temp, elts[i]);

                  if (lh != lineHeight || isNaN(lh)) {
                    lineHeight = "";
                  }
                }
              }
            }

            function hasParentOrOnlyChild(name) {
              if (
                graph.getParentByName(node, name, graph.cellEditor.textarea) !=
                null
              ) {
                return true;
              } else {
                var child = node;

                while (child != null && child.childNodes.length == 1) {
                  child = child.childNodes[0];

                  if (child.nodeName == name) {
                    return true;
                  }
                }
              }

              return false;
            }

            function isEqualOrPrefixed(str, value) {
              if (str != null && value != null) {
                if (str == value) {
                  return true;
                } else if (str.length > value.length + 1) {
                  return (
                    str.substring(str.length - value.length - 1, str.length) ==
                    "-" + value
                  );
                }
              }

              return false;
            }

            if (css != null) {
              setSelected(
                fontStyleItems[0],
                css.fontWeight == "bold" ||
                  css.fontWeight > 400 ||
                  hasParentOrOnlyChild("B") ||
                  hasParentOrOnlyChild("STRONG")
              );
              setSelected(
                fontStyleItems[1],
                css.fontStyle == "italic" ||
                  hasParentOrOnlyChild("I") ||
                  hasParentOrOnlyChild("EM")
              );
              setSelected(fontStyleItems[2], hasParentOrOnlyChild("U"));
              setSelected(sup, hasParentOrOnlyChild("SUP"));
              setSelected(sub, hasParentOrOnlyChild("SUB"));

              if (!graph.cellEditor.isTableSelected()) {
                var align =
                  graph.cellEditor.align ||
                  mxUtils.getValue(
                    ss.style,
                    mxConstants.STYLE_ALIGN,
                    mxConstants.ALIGN_CENTER
                  );

                if (isEqualOrPrefixed(css.textAlign, "justify")) {
                  setSelected(
                    full,
                    isEqualOrPrefixed(css.textAlign, "justify")
                  );
                  setSelected(left, false);
                  setSelected(center, false);
                  setSelected(right, false);
                } else {
                  setSelected(full, false);
                  setSelected(left, align == mxConstants.ALIGN_LEFT);
                  setSelected(center, align == mxConstants.ALIGN_CENTER);
                  setSelected(right, align == mxConstants.ALIGN_RIGHT);
                }
              } else {
                setSelected(full, isEqualOrPrefixed(css.textAlign, "justify"));
                setSelected(left, isEqualOrPrefixed(css.textAlign, "left"));
                setSelected(center, isEqualOrPrefixed(css.textAlign, "center"));
                setSelected(right, isEqualOrPrefixed(css.textAlign, "right"));
              }

              currentTable = graph.getParentByName(
                node,
                "TABLE",
                graph.cellEditor.textarea
              );
              tableRow =
                currentTable == null
                  ? null
                  : graph.getParentByName(node, "TR", currentTable);
              tableCell =
                currentTable == null
                  ? null
                  : graph.getParentByNames(node, ["TD", "TH"], currentTable);
              tableWrapper.style.display = currentTable != null ? "" : "none";

              if (document.activeElement != input) {
                if (
                  node.nodeName == "FONT" &&
                  node.getAttribute("size") == "4" &&
                  pendingFontSize != null
                ) {
                  node.removeAttribute("size");
                  node.style.fontSize = pendingFontSize + " pt";
                  pendingFontSize = null;
                } else {
                  input.value = isNaN(fontSize) ? "" : fontSize + " pt";
                }

                var lh = parseFloat(lineHeight);

                if (!isNaN(lh)) {
                  lineHeightInput.value = Math.round(lh * 100) + " %";
                } else {
                  lineHeightInput.value = "100 %";
                }
              }

              // Converts rgb(r,g,b) values
              var color = css.color.replace(
                /\brgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
                function ($0, $1, $2, $3) {
                  return (
                    "#" +
                    ("0" + Number($1).toString(16)).substr(-2) +
                    ("0" + Number($2).toString(16)).substr(-2) +
                    ("0" + Number($3).toString(16)).substr(-2)
                  );
                }
              );
              var color2 = css.backgroundColor.replace(
                /\brgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
                function ($0, $1, $2, $3) {
                  return (
                    "#" +
                    ("0" + Number($1).toString(16)).substr(-2) +
                    ("0" + Number($2).toString(16)).substr(-2) +
                    ("0" + Number($3).toString(16)).substr(-2)
                  );
                }
              );

              // Updates the color picker for the current font
              if (fontColorApply != null) {
                if (color.charAt(0) == "#") {
                  currentFontColor = color;
                } else {
                  currentFontColor = "#000000";
                }

                fontColorApply(currentFontColor, true);
              }

              if (bgColorApply != null) {
                if (color2.charAt(0) == "#") {
                  currentBgColor = color2;
                } else {
                  currentBgColor = null;
                }

                bgColorApply(currentBgColor, true);
              }

              // Workaround for firstChild is null or not an object
              // in the log which seems to be IE8- only / 29.01.15
              if (fontMenu.firstChild != null) {
                fontMenu.firstChild.nodeValue = Graph.stripQuotes(
                  css.fontFamily
                );
              }
            }
          }

          updating = false;
        }, 0);
      }
    };

    if (
      mxClient.IS_FF ||
      mxClient.IS_EDGE ||
      mxClient.IS_IE ||
      mxClient.IS_IE11
    ) {
      mxEvent.addListener(
        graph.cellEditor.textarea,
        "DOMSubtreeModified",
        updateCssHandler
      );
    }

    mxEvent.addListener(graph.cellEditor.textarea, "input", updateCssHandler);
    mxEvent.addListener(
      graph.cellEditor.textarea,
      "touchend",
      updateCssHandler
    );
    mxEvent.addListener(graph.cellEditor.textarea, "mouseup", updateCssHandler);
    mxEvent.addListener(graph.cellEditor.textarea, "keyup", updateCssHandler);
    this.listeners.push({
      destroy: function () {
        // No need to remove listener since textarea is destroyed after edit
      },
    });
    updateCssHandler();
  }

  return container;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(StyleFormatPanel, BaseFormatPanel);

/**
 *
 */
StyleFormatPanel.prototype.defaultStrokeColor = "black";

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();

  if (!ss.containsLabel) {
    if (
      ss.containsImage &&
      ss.vertices.length == 1 &&
      ss.style.shape == "image" &&
      ss.style.image != null &&
      ss.style.image.substring(0, 19) == "data:image/svg+xml;"
    ) {
      this.container.appendChild(this.addSvgStyles(this.createPanel()));
    }

    if (!ss.containsImage || ss.style.shape == "image") {
      this.container.appendChild(this.addFill(this.createPanel()));
    }

    this.container.appendChild(this.addStroke(this.createPanel()));
    this.container.appendChild(this.addLineJumps(this.createPanel()));
    var opacityPanel = this.createRelativeOption(
      mxResources.get("opacity"),
      mxConstants.STYLE_OPACITY,
      41
    );
    opacityPanel.style.paddingTop = "8px";
    opacityPanel.style.paddingBottom = "8px";
    this.container.appendChild(opacityPanel);
    this.container.appendChild(this.addEffects(this.createPanel()));
  }

  var opsPanel = this.addEditOps(this.createPanel());

  if (opsPanel.firstChild != null) {
    mxUtils.br(opsPanel);
  }

  this.container.appendChild(this.addStyleOps(opsPanel));
};

/**
 * Use browser for parsing CSS.
 */
StyleFormatPanel.prototype.getCssRules = function (css) {
  var doc = document.implementation.createHTMLDocument("");
  var styleElement = document.createElement("style");

  mxUtils.setTextContent(styleElement, css);
  doc.body.appendChild(styleElement);

  return styleElement.sheet.cssRules;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.addSvgStyles = function (container) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;
  var ss = this.format.getSelectionState();
  container.style.paddingTop = "6px";
  container.style.paddingBottom = "6px";
  container.style.fontWeight = "bold";
  container.style.display = "none";

  try {
    var exp = ss.style.editableCssRules;

    if (exp != null) {
      var regex = new RegExp(exp);

      var data = ss.style.image.substring(ss.style.image.indexOf(",") + 1);
      var xml = window.atob ? atob(data) : Base64.decode(data, true);
      var svg = mxUtils.parseXml(xml);

      if (svg != null) {
        var styles = svg.getElementsByTagName("style");

        for (var i = 0; i < styles.length; i++) {
          var rules = this.getCssRules(mxUtils.getTextContent(styles[i]));

          for (var j = 0; j < rules.length; j++) {
            this.addSvgRule(
              container,
              rules[j],
              svg,
              styles[i],
              rules,
              j,
              regex
            );
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return container;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.addSvgRule = function (
  container,
  rule,
  svg,
  styleElem,
  rules,
  ruleIndex,
  regex
) {
  var ui = this.editorUi;
  var graph = ui.editor.graph;

  if (regex.test(rule.selectorText)) {
    function rgb2hex(rgb) {
      rgb = rgb.match(
        /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
      );

      return rgb && rgb.length === 4
        ? "#" +
            ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2)
        : "";
    }

    var addStyleRule = mxUtils.bind(this, function (rule, key, label) {
      var value = mxUtils.trim(rule.style[key]);

      if (value != "" && value.substring(0, 4) != "url(") {
        var option = this.createColorOption(
          label + " " + rule.selectorText,
          function () {
            return rgb2hex(value);
          },
          function (color) {
            rules[ruleIndex].style[key] = color;
            var cssTxt = "";

            for (var i = 0; i < rules.length; i++) {
              cssTxt += rules[i].cssText + " ";
            }

            styleElem.textContent = cssTxt;
            var xml = mxUtils.getXml(svg.documentElement);

            graph.setCellStyles(
              mxConstants.STYLE_IMAGE,
              "data:image/svg+xml," +
                (window.btoa ? btoa(xml) : Base64.encode(xml, true)),
              graph.getSelectionCells()
            );
          },
          "#ffffff",
          {
            install: function (apply) {
              // ignore
            },
            destroy: function () {
              // ignore
            },
          }
        );

        container.appendChild(option);

        // Shows container if rules are added
        container.style.display = "";
      }
    });

    addStyleRule(rule, "fill", mxResources.get("fill"));
    addStyleRule(rule, "stroke", mxResources.get("line"));
    addStyleRule(rule, "stop-color", mxResources.get("gradient"));
  }
};

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.addEditOps = function (div) {
  var ss = this.format.getSelectionState();
  var btn = null;

  if (this.editorUi.editor.graph.getSelectionCount() == 1) {
    btn = mxUtils.button(
      mxResources.get("editStyle"),
      mxUtils.bind(this, function (evt) {
        this.editorUi.actions.get("editStyle").funct();
      })
    );

    btn.setAttribute(
      "title",
      mxResources.get("editStyle") +
        " (" +
        this.editorUi.actions.get("editStyle").shortcut +
        ")"
    );
    btn.style.width = "202px";
    btn.style.marginBottom = "2px";

    div.appendChild(btn);
  }

  if (ss.image) {
    var btn2 = mxUtils.button(
      mxResources.get("editImage"),
      mxUtils.bind(this, function (evt) {
        this.editorUi.actions.get("image").funct();
      })
    );

    btn2.setAttribute("title", mxResources.get("editImage"));
    btn2.style.marginBottom = "2px";

    if (btn == null) {
      btn2.style.width = "202px";
    } else {
      btn.style.width = "100px";
      btn2.style.width = "100px";
      btn2.style.marginLeft = "2px";
    }

    div.appendChild(btn2);
  }

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.addFill = function (container) {
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
StyleFormatPanel.prototype.getCustomColors = function () {
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

/**
 * Adds the label menu items to the given menu and parent.
 */
StyleFormatPanel.prototype.addStroke = function (container) {
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
StyleFormatPanel.prototype.addLineJumps = function (container) {
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
StyleFormatPanel.prototype.addEffects = function (div) {
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
StyleFormatPanel.prototype.addStyleOps = function (div) {
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
DiagramStylePanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(DiagramStylePanel, BaseFormatPanel);

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramStylePanel.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;

  this.container.appendChild(this.addView(this.createPanel()));
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramStylePanel.prototype.addView = function (div) {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var model = graph.getModel();

  div.style.whiteSpace = "normal";

  var sketch =
    graph.currentVertexStyle["sketch"] == "1" &&
    graph.currentEdgeStyle["sketch"] == "1";
  var rounded = graph.currentVertexStyle["rounded"] == "1";
  var curved = graph.currentEdgeStyle["curved"] == "1";

  var opts = document.createElement("div");
  opts.style.paddingBottom = "12px";
  opts.style.marginRight = "16px";
  div.style.paddingTop = "8px";

  var table = document.createElement("table");

  if (mxClient.IS_QUIRKS) {
    table.style.fontSize = "1em";
  }

  table.style.width = "100%";
  table.style.fontWeight = "bold";

  var tbody = document.createElement("tbody");
  var row = document.createElement("tr");
  row.style.padding = "0px";

  var left = document.createElement("td");
  left.style.padding = "0px";
  left.style.width = "50%";
  left.setAttribute("valign", "middle");

  var right = left.cloneNode(true);
  right.style.paddingLeft = "8px";
  row.appendChild(left);
  row.appendChild(right);
  tbody.appendChild(row);
  table.appendChild(tbody);

  // Sketch
  left.appendChild(
    this.createOption(
      mxResources.get("sketch"),
      function () {
        return sketch;
      },
      function (checked) {
        sketch = checked;

        if (checked) {
          graph.currentEdgeStyle["sketch"] = "1";
          graph.currentVertexStyle["sketch"] = "1";
        } else {
          delete graph.currentEdgeStyle["sketch"];
          delete graph.currentVertexStyle["sketch"];
        }

        graph.updateCellStyles(
          "sketch",
          checked ? "1" : null,
          graph.getVerticesAndEdges()
        );
      },
      null,
      function (div) {
        div.style.width = "auto";
      }
    )
  );

  // Rounded
  right.appendChild(
    this.createOption(
      mxResources.get("rounded"),
      function () {
        return rounded;
      },
      function (checked) {
        rounded = checked;

        if (checked) {
          graph.currentVertexStyle["rounded"] = "1";
        } else {
          delete graph.currentVertexStyle["rounded"];
        }

        graph.updateCellStyles(
          "rounded",
          checked ? "1" : null,
          graph.getVerticesAndEdges(true, true)
        );
      },
      null,
      function (div) {
        div.style.width = "auto";
      }
    )
  );

  // Curved
  left = left.cloneNode(false);
  right = right.cloneNode(false);
  row = row.cloneNode(false);
  row.appendChild(left);
  row.appendChild(right);
  tbody.appendChild(row);

  left.appendChild(
    this.createOption(
      mxResources.get("curved"),
      function () {
        return curved;
      },
      function (checked) {
        curved = checked;

        if (checked) {
          graph.currentEdgeStyle["curved"] = "1";
        } else {
          delete graph.currentEdgeStyle["curved"];
        }

        graph.updateCellStyles(
          "curved",
          checked ? "1" : null,
          graph.getVerticesAndEdges(false, true)
        );
      },
      null,
      function (div) {
        div.style.width = "auto";
      }
    )
  );

  opts.appendChild(table);
  div.appendChild(opts);

  var defaultStyles = [
    "fillColor",
    "strokeColor",
    "fontColor",
    "gradientColor",
  ];

  var updateCells = mxUtils.bind(this, function (styles, graphStyle) {
    var cells = graph.getVerticesAndEdges();

    model.beginUpdate();
    try {
      for (var i = 0; i < cells.length; i++) {
        var style = graph.getCellStyle(cells[i]);

        // Handles special label background color
        if (style["labelBackgroundColor"] != null) {
          graph.updateCellStyles(
            "labelBackgroundColor",
            graphStyle != null ? graphStyle.background : null,
            [cells[i]]
          );
        }

        var edge = model.isEdge(cells[i]);
        var newStyle = model.getStyle(cells[i]);
        var current = edge ? graph.currentEdgeStyle : graph.currentVertexStyle;

        for (var j = 0; j < styles.length; j++) {
          if (
            (style[styles[j]] != null &&
              style[styles[j]] != mxConstants.NONE) ||
            (styles[j] != mxConstants.STYLE_FILLCOLOR &&
              styles[j] != mxConstants.STYLE_STROKECOLOR)
          ) {
            newStyle = mxUtils.setStyle(
              newStyle,
              styles[j],
              current[styles[j]]
            );
          }
        }

        model.setStyle(cells[i], newStyle);
      }
    } finally {
      model.endUpdate();
    }
  });

  var removeStyles = mxUtils.bind(this, function (style, styles, defaultStyle) {
    if (style != null) {
      for (var j = 0; j < styles.length; j++) {
        if (
          (style[styles[j]] != null && style[styles[j]] != mxConstants.NONE) ||
          (styles[j] != mxConstants.STYLE_FILLCOLOR &&
            styles[j] != mxConstants.STYLE_STROKECOLOR)
        ) {
          style[styles[j]] = defaultStyle[styles[j]];
        }
      }
    }
  });

  var applyStyle = mxUtils.bind(
    this,
    function (style, result, cell, graphStyle, theGraph) {
      if (style != null) {
        if (cell != null) {
          // Handles special label background color
          if (result["labelBackgroundColor"] != null) {
            var bg = graphStyle != null ? graphStyle.background : null;
            theGraph = theGraph != null ? theGraph : graph;

            if (bg == null) {
              bg = theGraph.background;
            }

            if (bg == null) {
              bg = theGraph.defaultPageBackgroundColor;
            }

            result["labelBackgroundColor"] = bg;
          }
        }

        for (var key in style) {
          if (
            cell == null ||
            (result[key] != null && result[key] != mxConstants.NONE) ||
            (key != mxConstants.STYLE_FILLCOLOR &&
              key != mxConstants.STYLE_STROKECOLOR)
          ) {
            result[key] = style[key];
          }
        }
      }
    }
  );

  var btn = mxUtils.button(
    mxResources.get("reset"),
    mxUtils.bind(this, function (evt) {
      var all = graph.getVerticesAndEdges(true, true);

      if (all.length > 0) {
        model.beginUpdate();
        try {
          graph.updateCellStyles("sketch", null, all);
          graph.updateCellStyles("rounded", null, all);
          graph.updateCellStyles(
            "curved",
            null,
            graph.getVerticesAndEdges(false, true)
          );
        } finally {
          model.endUpdate();
        }
      }

      graph.defaultVertexStyle = mxUtils.clone(ui.initialDefaultVertexStyle);
      graph.defaultEdgeStyle = mxUtils.clone(ui.initialDefaultEdgeStyle);
      ui.clearDefaultStyle();
    })
  );

  btn.setAttribute("title", mxResources.get("reset"));
  btn.style.textOverflow = "ellipsis";
  btn.style.maxWidth = "90px";
  right.appendChild(btn);

  var createPreview = mxUtils.bind(
    this,
    function (commonStyle, vertexStyle, edgeStyle, graphStyle, container) {
      // Wrapper needed to catch events
      var div = document.createElement("div");
      div.style.cssText =
        "position:absolute;display:inline-block;width:100%;height:100%;overflow:hidden;pointer-events:none;";
      container.appendChild(div);

      var graph2 = new Graph(div, null, null, graph.getStylesheet());
      graph2.resetViewOnRootChange = false;
      graph2.foldingEnabled = false;
      graph2.gridEnabled = false;
      graph2.autoScroll = false;
      graph2.setTooltips(false);
      graph2.setConnectable(false);
      graph2.setPanning(false);
      graph2.setEnabled(false);

      graph2.getCellStyle = function (cell) {
        var result = mxUtils.clone(
          Graph.prototype.getCellStyle.apply(this, arguments)
        );
        var defaultStyle = graph.stylesheet.getDefaultVertexStyle();
        var appliedStyle = vertexStyle;

        if (model.isEdge(cell)) {
          defaultStyle = graph.stylesheet.getDefaultEdgeStyle();
          appliedStyle = edgeStyle;
        }

        removeStyles(result, defaultStyles, defaultStyle);
        applyStyle(commonStyle, result, cell, graphStyle, graph2);
        applyStyle(appliedStyle, result, cell, graphStyle, graph2);

        return result;
      };

      // Avoid HTML labels to capture events in bubble phase
      graph2.model.beginUpdate();
      try {
        var v1 = graph2.insertVertex(
          graph2.getDefaultParent(),
          null,
          "Shape",
          14,
          8,
          70,
          40,
          "strokeWidth=2;"
        );
        var e1 = graph2.insertEdge(
          graph2.getDefaultParent(),
          null,
          "Connector",
          v1,
          v1,
          "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;endSize=5;strokeWidth=2;"
        );
        e1.geometry.points = [new mxPoint(32, 70)];
        e1.geometry.offset = new mxPoint(0, 8);
      } finally {
        graph2.model.endUpdate();
      }
    }
  );

  // Entries
  var entries = document.createElement("div");
  entries.style.position = "relative";
  div.appendChild(entries);

  // Cached entries
  if (this.format.cachedStyleEntries == null) {
    this.format.cachedStyleEntries = [];
  }

  var addEntry = mxUtils.bind(
    this,
    function (commonStyle, vertexStyle, edgeStyle, graphStyle, index) {
      var panel = this.format.cachedStyleEntries[index];

      if (panel == null) {
        panel = document.createElement("div");
        panel.style.cssText =
          "display:inline-block;position:relative;width:96px;height:90px;" +
          "cursor:pointer;border:1px solid gray;margin:2px;overflow:hidden;";

        if (graphStyle != null && graphStyle.background != null) {
          panel.style.backgroundColor = graphStyle.background;
        }

        createPreview(commonStyle, vertexStyle, edgeStyle, graphStyle, panel);

        mxEvent.addGestureListeners(
          panel,
          mxUtils.bind(this, function (evt) {
            panel.style.opacity = 0.5;
          }),
          null,
          mxUtils.bind(this, function (evt) {
            panel.style.opacity = 1;
            graph.defaultVertexStyle = mxUtils.clone(
              ui.initialDefaultVertexStyle
            );
            graph.defaultEdgeStyle = mxUtils.clone(ui.initialDefaultEdgeStyle);

            applyStyle(commonStyle, graph.defaultVertexStyle);
            applyStyle(commonStyle, graph.defaultEdgeStyle);
            applyStyle(vertexStyle, graph.defaultVertexStyle);
            applyStyle(edgeStyle, graph.defaultEdgeStyle);
            ui.clearDefaultStyle();

            if (sketch) {
              graph.currentEdgeStyle["sketch"] = "1";
              graph.currentVertexStyle["sketch"] = "1";
            } else {
              graph.currentEdgeStyle["sketch"] = "0";
              graph.currentVertexStyle["sketch"] = "0";
            }

            if (rounded) {
              graph.currentVertexStyle["rounded"] = "1";
              graph.currentEdgeStyle["rounded"] = "1";
            } else {
              graph.currentVertexStyle["rounded"] = "0";
              graph.currentEdgeStyle["rounded"] = "1";
            }

            if (curved) {
              graph.currentEdgeStyle["curved"] = "1";
            } else {
              graph.currentEdgeStyle["curved"] = "0";
            }

            model.beginUpdate();
            try {
              updateCells(defaultStyles, graphStyle);

              var change = new ChangePageSetup(
                ui,
                graphStyle != null ? graphStyle.background : null
              );
              change.ignoreImage = true;
              model.execute(change);

              model.execute(
                new ChangeGridColor(
                  ui,
                  graphStyle != null && graphStyle.gridColor != null
                    ? graphStyle.gridColor
                    : graph.view.defaultGridColor
                )
              );
            } finally {
              model.endUpdate();
            }
          })
        );

        mxEvent.addListener(
          panel,
          "mouseenter",
          mxUtils.bind(this, function (evt) {
            var prev = graph.getCellStyle;
            var prevBg = graph.background;
            var prevGrid = graph.view.gridColor;

            graph.background =
              graphStyle != null ? graphStyle.background : null;
            graph.view.gridColor =
              graphStyle != null && graphStyle.gridColor != null
                ? graphStyle.gridColor
                : graph.view.defaultGridColor;

            graph.getCellStyle = function (cell) {
              var result = mxUtils.clone(prev.apply(this, arguments));

              var defaultStyle = graph.stylesheet.getDefaultVertexStyle();
              var appliedStyle = vertexStyle;

              if (model.isEdge(cell)) {
                defaultStyle = graph.stylesheet.getDefaultEdgeStyle();
                appliedStyle = edgeStyle;
              }

              removeStyles(result, defaultStyles, defaultStyle);
              applyStyle(commonStyle, result, cell, graphStyle);
              applyStyle(appliedStyle, result, cell, graphStyle);

              return result;
            };

            graph.refresh();
            graph.getCellStyle = prev;
            graph.background = prevBg;
            graph.view.gridColor = prevGrid;
          })
        );

        mxEvent.addListener(
          panel,
          "mouseleave",
          mxUtils.bind(this, function (evt) {
            graph.refresh();
          })
        );

        this.format.cachedStyleEntries[index] = panel;
      }

      entries.appendChild(panel);
    }
  );

  // Maximum palettes to switch the switcher
  var maxEntries = 10;
  var pageCount = Math.ceil(Editor.styles.length / maxEntries);
  this.format.currentStylePage =
    this.format.currentStylePage != null ? this.format.currentStylePage : 0;
  var dots = [];

  var addEntries = mxUtils.bind(this, function () {
    if (dots.length > 0) {
      dots[this.format.currentStylePage].style.background = "#84d7ff";
    }

    for (
      var i = this.format.currentStylePage * maxEntries;
      i <
      Math.min(
        (this.format.currentStylePage + 1) * maxEntries,
        Editor.styles.length
      );
      i++
    ) {
      var s = Editor.styles[i];
      addEntry(s.commonStyle, s.vertexStyle, s.edgeStyle, s.graph, i);
    }
  });

  var selectPage = mxUtils.bind(this, function (index) {
    if (index >= 0 && index < pageCount) {
      dots[this.format.currentStylePage].style.background = "transparent";
      entries.innerHTML = "";
      this.format.currentStylePage = index;
      addEntries();
    }
  });

  if (pageCount > 1) {
    // Selector
    var switcher = document.createElement("div");
    switcher.style.whiteSpace = "nowrap";
    switcher.style.position = "relative";
    switcher.style.textAlign = "center";
    switcher.style.paddingTop = "4px";
    switcher.style.width = "210px";

    div.style.paddingBottom = "8px";

    for (var i = 0; i < pageCount; i++) {
      var dot = document.createElement("div");
      dot.style.display = "inline-block";
      dot.style.width = "6px";
      dot.style.height = "6px";
      dot.style.marginLeft = "4px";
      dot.style.marginRight = "3px";
      dot.style.borderRadius = "3px";
      dot.style.cursor = "pointer";
      dot.style.background = "transparent";
      dot.style.border = "1px solid #b5b6b7";

      mxUtils.bind(this, function (index, elt) {
        mxEvent.addListener(
          dot,
          "click",
          mxUtils.bind(this, function () {
            selectPage(index);
          })
        );
      })(i, dot);

      switcher.appendChild(dot);
      dots.push(dot);
    }

    div.appendChild(switcher);
    addEntries();

    if (pageCount < 15) {
      var left = document.createElement("div");
      left.style.cssText =
        "position:absolute;left:0px;top:4px;bottom:0px;width:20px;margin:0px;opacity:0.5;" +
        "background-repeat:no-repeat;background-position:center center;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQBAMAAADQT4M0AAAAIVBMVEUAAAB2dnZ4eHh3d3d1dXVxcXF2dnZ2dnZ2dnZxcXF2dnYmb3w1AAAACnRSTlMAfCTkhhvb7cQSPH2JPgAAADRJREFUCNdjwACMAmBKaiGYs2oJmLPKAZ3DabU8AMRTXpUKopislqFyVzCAuUZgikkBZjoAcMYLnp53P/UAAAAASUVORK5CYII=);";

      mxEvent.addListener(
        left,
        "click",
        mxUtils.bind(this, function () {
          selectPage(mxUtils.mod(this.format.currentStylePage - 1, pageCount));
        })
      );

      var right = document.createElement("div");
      right.style.cssText =
        "position:absolute;right:2px;top:4px;bottom:0px;width:20px;margin:0px;opacity:0.5;" +
        "background-repeat:no-repeat;background-position:center center;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQBAMAAADQT4M0AAAAIVBMVEUAAAB2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnYBuwCcAAAACnRSTlMAfCTkhhvb7cQSPH2JPgAAADZJREFUCNdjQAOMAmBKaiGY8loF5rKswsZlrVo8AUiFrTICcbIWK8A5DF1gDoMymMPApIAwHwCS0Qx/U7qCBQAAAABJRU5ErkJggg==);";
      switcher.appendChild(left);
      switcher.appendChild(right);

      mxEvent.addListener(
        right,
        "click",
        mxUtils.bind(this, function () {
          selectPage(mxUtils.mod(this.format.currentStylePage + 1, pageCount));
        })
      );

      // Hover state
      function addHoverState(elt) {
        mxEvent.addListener(elt, "mouseenter", function () {
          elt.style.opacity = "1";
        });
        mxEvent.addListener(elt, "mouseleave", function () {
          elt.style.opacity = "0.5";
        });
      }

      addHoverState(left);
      addHoverState(right);
    }
  } else {
    addEntries();
  }

  return div;
};

/**
 * Adds the label menu items to the given menu and parent.
 */
DiagramFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};

mxUtils.extend(DiagramFormatPanel, BaseFormatPanel);

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

CommunicationFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};
BoundaryFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};
InspectionFormatPanel = function (format, editorUi, container) {
  BaseFormatPanel.call(this, format, editorUi, container);
  this.init();
};
mxUtils.extend(InspectionFormatPanel, BaseFormatPanel);

function generateRandomId(prefix, totalLength) {
  let randomPart = '';
  while (randomPart.length + prefix.length < totalLength) {
    randomPart += Math.random().toString(36).substr(2);
  }
  return prefix + randomPart.substring(0, totalLength - prefix.length);
}
function generateUniqueTrustkeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('Trust-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
function generateUniqueCommkeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('Com-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
function generateUniquekeyData(graph) {
  var newId;
  do {
      newId = generateRandomId('DATA-' ,10); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
function generateUniqueTrustId(graph) {
  var newId;
  do {
      newId = generateRandomId('tr-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
function generateUniquedataId(graph) {
  var newId;
  do {
      newId = generateRandomId('da-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}
// Function to generate a unique ID
function generateUniqueId(graph) {
  var newId;
  do {
    newId = generateRandomId('ta-' ,25); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}

function generateUniquekey(graph) {
  var newId;
  do {
    newId = generateRandomId('key-' ,15); // Generate a random ID
  } while (checkIdExists(graph, newId)); // Ensure it's unique
  return newId;
}


// Function to check if an ID already exists in the graph's model
function checkIdExists(graph, id) {
  // Assuming a method to check ID exists in your structure, you can modify this according to your application's logic
  var exists = graph.model.threagile.getIn(['technical_assets', id, 'id']);
  return !!exists; // Convert to boolean
}


InspectionFormatPanel.prototype.init = function () {
  var ui = this.editorUi;
  let self = this;
  var editor = ui.editor;
  var graph = editor.graph;
  var ss = this.format.getSelectionState();
  const go = new Go();
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

if(parsedString.includes("$$__ERROR__$$"))
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
      let jsonObj = JSON.parse(parsedString);

      // End timing and calculate the duration
      end = performance.now();
      console.log('JSON.parse() time: ' + (end - start) + ' ms');
      window.applyRAAJS();
      yaml = JSON.parse(window.applyRiskGenerationJS());

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
        let RAA = jsonObj.TechnicalAssets[id].RAA;
        let gauge = new JustGage({
          id: "gaugeElement",
          value: RAA == 1 ? 0: RAA,
          min: 0,
          max: 100,
          decimals: 2,
          gaugeWidthScale: 0.6,
        });
        for (var i = 0; i < yaml.length; i++) {
          let obj = yaml[i];
          if (obj.synthetic_id.includes(id)) {
            filteredArray.push(obj);
          }
        }
        for (let jsonData in filteredArray) {
          let value = filteredArray[jsonData];
          let riskScore = 0;

          riskScore += mapRiskLevel(value.severity, 'severity');
          riskScore += mapRiskLevel(value.exploitation_impact, 'impact');
          riskScore += mapRiskLevel(value.exploitation_likelihood, 'likelihood');
          riskScore *= mapRiskLevel(value.data_breach_probability, 'probability');
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
          let listItem = document.createElement("li");
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
mxUtils.extend(BoundaryFormatPanel, BaseFormatPanel);

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
function isNestedRectangle(rectangle, graph) {
  var nestedVertices = graph.getModel().getChildVertices(rectangle);
  for (var i = 0; i < nestedVertices.length; i++) {
    var nestedVertex = nestedVertices[i];
    var nestedVertexGeometry = nestedVertex.getGeometry();
    if (
      nestedVertexGeometry != null &&
      isInsideRectangle(nestedVertexGeometry, rectangle.getGeometry())
    ) {
      // Überprüfen, ob das verschachtelte Element ein Rechteck ist
      if (nestedVertex.isVertex()) {
        // Rekursiver Aufruf, um weitere Verschachtelungen zu überprüfen
        if (isNestedRectangle(nestedVertex)) {
          return true;
        }
      }
    }
  }
  return false;
}
function isInsideRectangle(elementGeometry, rectangleGeometry) {
  var elementX = elementGeometry.x;
  var elementY = elementGeometry.y;
  var elementWidth = elementGeometry.width;
  var elementHeight = elementGeometry.height;

  var rectangleX = rectangleGeometry.x;
  var rectangleY = rectangleGeometry.y;
  var rectangleWidth = rectangleGeometry.width;
  var rectangleHeight = rectangleGeometry.height;

  return (
    elementX >= rectangleX &&
    elementY >= rectangleY &&
    elementX + elementWidth <= rectangleX + rectangleWidth &&
    elementY + elementHeight <= rectangleY + rectangleHeight
  );
}
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
   
  idsData = [];
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

AssetFormatPanel = function (format, editorUi, container) {
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

function createSection(title) {
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

function createPropertyItem(label, type, options) {
  var item = document.createElement("div");
  item.style.display = "flex";
  item.style.alignItems = "baseline";
  item.style.marginBottom = "8px";

  var propertyName = document.createElement("span");
  propertyName.innerHTML = label;
  propertyName.style.width = "100px";
  propertyName.style.marginRight = "10px";

  if (type === "select") {
    var selectContainer = document.createElement("div");
    selectContainer.style.display = "flex";
    selectContainer.style.alignItems = "center";
    selectContainer.style.marginLeft = "auto";

    var selectDropdown = document.createElement("select");
    selectDropdown.style.width = "100px";
    selectContainer.appendChild(selectDropdown);

    for (var i = 0; i < options.length; i++) {
      var option = document.createElement("option");
      option.value = options[i];
      option.text = options[i];
      selectDropdown.appendChild(option);
    }

    item.appendChild(propertyName);
    item.appendChild(selectContainer);
  } else if (type === "checkbox") {
    var checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    item.appendChild(propertyName);
    item.appendChild(checkboxInput);
  } else if (type === "text") {
    var textInput = document.createElement("input");
    textInput.type = "text";
    item.appendChild(propertyName);
    item.appendChild(textInput);
  }

  return item;
}
function createCustomOption(self, parameter) {
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
function setCustomOption(self, parameter) {
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
            currentValue = newValue;

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
          threagileTagsSet = new Set();
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

AssetFormatPanel.prototype.addThreagileMenu = function (container) {
  let self = this;
  

  
  let main = document.createElement("div");
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
  };
  let customListener = {
    install: function (apply) {
      this.listener = function () {};
    },
    destroy: function () {},
  };

  sections = {};
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
        property,
        createCustomOption(self, property),
        setCustomOption(self, property),
        customListener
      );
      optionElement.querySelector('input[type="checkbox"]').title =
        typeProperties[property].tooltip;

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
        if(property == "id")
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

  idsData = [];
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

// Helper function to create property items
function createPropertyItem(label, type, options) {
  var itemContainer = document.createElement("div");

  var labelElement = document.createElement("b");
  labelElement.innerHTML = label + ":";
  itemContainer.appendChild(labelElement);

  if (type === "select") {
    var selectDropdown = document.createElement("select");
    for (var i = 0; i < options.length; i++) {
      var option = document.createElement("option");
      option.value = options[i];
      option.text = options[i];
      selectDropdown.appendChild(option);
    }
    itemContainer.appendChild(selectDropdown);
  } else if (type === "text") {
    var input = document.createElement("input");
    input.type = "text";
    itemContainer.appendChild(input);
  } else if (type === "spacer") {
    var spacerElement = document.createElement("span");
    spacerElement.style.width = "20px"; // Anpassen der Breite nach Bedarf
    itemContainer.appendChild(spacerElement);
  }

  return itemContainer;
}
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
function deleteItemData(listContainer) {
  // Bestimmen Sie das übergeordnete Listenelement und entfernen Sie es
  var listItem = event.target.parentNode;
  listContainer.removeChild(listItem);
}

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
