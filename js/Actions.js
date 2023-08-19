/**
 * Copyright (c) 2006-2020, JGraph Ltd
 * Copyright (c) 2006-2020, draw.io AG
 *
 * Constructs the actions object for the given UI.
 */
function Actions(editorUi) {
  this.editorUi = editorUi;
  this.actions = new Object();
  this.init();
}
function camelToSnakeCase(str) {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, "");
}

function handleImportAFile(xml, filename) {}
function keysToSnakeCase(obj, depth = 0) {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnakeCase(item, depth));
  }

  const recurseKeys = [
    "DataAssets",
    "TechnicalAssets",
    "TrustBoundaries",
    "SharedRuntime",
    "RiskTracking",
  ];
  return Object.keys(obj).reduce((accum, key) => {
    const newKey = camelToSnakeCase(key);
    if (depth < 2 && typeof obj[key] === "object" && obj[key] !== null) {
      accum[newKey] = keysToSnakeCase(
        obj[key],
        recurseKeys.includes(newKey) ? depth + 1 : depth
      );
    } else {
      accum[newKey] = obj[key];
    }
    return accum;
  }, {});
}

/**
 * Adds the default actions.
 */
Actions.prototype.init = function () {
  var ui = this.editorUi;
  var editor = ui.editor;
  var graph = editor.graph;
  var isGraphEnabled = function () {
    return (
      Action.prototype.isEnabled.apply(this, arguments) && graph.isEnabled()
    );
  };

  // File actions
  this.addAction("new...", function () {
    graph.openLink(ui.getUrl());
  });
  this.addAction("open...", function () {
    window.openNew = true;
    window.openKey = "open";

    ui.openFile();
  });
  this.addAction("import...", function () {
    window.openNew = false;
    window.openKey = "import";

    // Closes dialog after open
    window.openFile = new OpenFile(
      mxUtils.bind(this, function () {
        ui.hideDialog();
      })
    );

    window.openFile.setConsumer(
      mxUtils.bind(this, function (xml, filename) {
        try {
          if (filename.endsWith(".yaml")) {
            const go = new Go();
            WebAssembly.instantiateStreaming(
              fetch("main.wasm"),
              go.importObject
            ).then((result) => {
              go.run(result.instance);
              const startTime = performance.now();
                try {
                graph.model.threagile = YAML.parseDocument(xml);
              } catch (error) {
                console.error("Can not parse: ", error);
              }
              let jsonObj;
              try {
                jsonObj = JSON.parse(parseModelViaString(xml));
              } catch (error) {
                console.error("Couldn't parse JSON-Object: ", error);
                alert("Error while parsing JSON-Object: " + error);
                return;
              }
              dot = printDataFlowDiagramGraphvizDOT();
              //let jsonObj = dotParser.parse(dot);
              let dotJson = dotParser.parse(dot)[0];
              //First data import
              jsonObj = keysToSnakeCase(jsonObj);

              endWASM();
              let cnt = 0;

              graph.getModel().diagramData = new Object();
              graph.getModel().diagramData.data_assets = new Map();

	      let dataAssets = graph.model.threagile.getIn(["data_assets"]).items;
   		dataAssets.forEach((item, index) => {
	       let key = item.key.value; // Get the key of this data asset
		    graph.getModel().diagramData.data_assets.set(key, {
			visible: false
		    });
		});	

              //Technology Asset Import

              let cells = [];
              let nodeIdMap = {};
              var vizInstance = new Viz();
              vizInstance
                .renderString(dot)
                .then(function (result) {
                  let svg = result;
                  let parser = new DOMParser();
                  let svgDoc = parser.parseFromString(svg, "image/svg+xml");

                  let edgeSVGs = svgDoc.querySelectorAll(".edge");
                  let nodes = svgDoc.querySelectorAll(".node");
                  let coordinates = {};
                  graph.getModel().clear();
                  let clusters = svgDoc.querySelectorAll(".cluster");

                  for (var i = 0; i < clusters.length; i++) {
                    let cluster = clusters[i];
                    let polygon = cluster.querySelector("polygon");
                    let points = polygon.getAttribute("points");
                    let title = cluster.querySelector("title").textContent;
                    let titleCluster = cluster.querySelector(
                      'text[font-weight="bold"]'
                    );
                    let fill = polygon.getAttribute("fill");
                    let stroke = polygon.getAttribute("stroke");
                    let strokeWidth = polygon.getAttribute("stroke-width");
                    let coordinatesArray = points
                      .split(" ")
                      .map(function (point) {
                        var coords = point.split(",");
                        var x = parseFloat(coords[0]);
                        var y = parseFloat(coords[1]);
                        return { x: x, y: y };
                      });

                    let minX = Math.min.apply(
                      null,
                      coordinatesArray.map((coord) => coord.x)
                    );
                    let maxX = Math.max.apply(
                      null,
                      coordinatesArray.map((coord) => coord.x)
                    );
                    let minY = Math.min.apply(
                      null,
                      coordinatesArray.map((coord) => coord.y)
                    );
                    let maxY = Math.max.apply(
                      null,
                      coordinatesArray.map((coord) => coord.y)
                    );

                    let width = maxX - minX;
                    let height = maxY - minY;
                    if (!title.includes("space_boundary")) {
                      let textWithCoords = ` (x: ${minX}, y: ${minY}) width: ${width} height: ${height}`;
                      let clusterStyle =
                        mxConstants.STYLE_SHAPE +
                        "=rectangle;dashed=1;verticalAlign=top;fontStyle=1;fontSize=18;fillColor=" +
                        fill +
                        ";strokeColor=" +
                        stroke +
                        ";strokeWidth=" +
                        strokeWidth;
                      let clusterVertex = graph.insertVertex(
                        null,
                        titleCluster.textContent,
                        titleCluster.textContent,
                        minX,
                        minY,
                        width,
                        height,
                        clusterStyle
                      );
                      clusterVertex.setConnectable(false);
			if (titleCluster.textContent) {
			    clusterVertex.trust_boundaries = titleCluster.textContent;
			}	

                    }
                  }
                  for (var i = 0; i < nodes.length; i++) {
                    let node = nodes[i];
                    let nodeId = node.getAttribute("id");
                    let nodeTitle = node.querySelector("title").textContent;

                    let paths = node.querySelectorAll("path");
                    let is3DCylinder = paths.length === 2;
                    if (node.querySelector("ellipse") != null) {
                      let ellipse = node.querySelector("ellipse");
                      let cx = parseFloat(ellipse.getAttribute("cx"));
                      let cy = parseFloat(ellipse.getAttribute("cy"));
                      let rx = parseFloat(ellipse.getAttribute("rx"));
                      let ry = parseFloat(ellipse.getAttribute("ry"));
                      let fill = ellipse.getAttribute("fill");
                      let stroke = ellipse.getAttribute("stroke");
                      let strokeWidth = ellipse.getAttribute("stroke-width");

                      let x = cx - rx;
                      let y = cy - ry;

                      let width = 2 * rx;
                      let height = 2 * ry;

                      coordinates[nodeId] = {
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        nodeTitle: nodeTitle,
                        shape: "ellipse",
                        fill: fill,
                        stroke: stroke,
                        strokeWidth: strokeWidth,
                      };
                    } else if (node.querySelector("polygon") != null) {
                      let points = node
                        .querySelector("polygon")
                        .getAttribute("points");
                      let polygon = node.querySelector("polygon");
                      let coordinatesArray = points
                        .split(" ")
                        .map(function (point) {
                          let coords = point.split(",");
                          let x = parseFloat(coords[0]);
                          let y = parseFloat(coords[1]);
                          return { x: x, y: y };
                        });
                      let fill = polygon.getAttribute("fill");
                      let stroke = polygon.getAttribute("stroke");
                      let strokeWidth = polygon.getAttribute("stroke-width");
                      let minX = Math.min.apply(
                        null,
                        coordinatesArray.map((coord) => coord.x)
                      );
                      let maxX = Math.max.apply(
                        null,
                        coordinatesArray.map((coord) => coord.x)
                      );
                      let minY = Math.min.apply(
                        null,
                        coordinatesArray.map((coord) => coord.y)
                      );
                      let maxY = Math.max.apply(
                        null,
                        coordinatesArray.map((coord) => coord.y)
                      );

                      let width = maxX - minX;
                      let height = maxY - minY;

                      coordinates[nodeId] = {
                        x: minX,
                        y: minY,
                        width: width,
                        height: height,
                        nodeTitle: nodeTitle,
                        shape: "hexagon",
                        fill: fill,
                        stroke: stroke,
                        strokeWidth: strokeWidth,
                      };
                    } else if (is3DCylinder) {
                      let firstPath = paths[0];
                      let d = firstPath.getAttribute("d");
                      let values = d.match(/[0-9\.]+/g);
                      let valuesFloat = values.map(parseFloat);

                      let x = valuesFloat[0];
                      let y = valuesFloat[1];
                      let width = valuesFloat[6] - x;
                      let height = valuesFloat[8] - y;
                      let fill = firstPath.getAttribute("fill");
                      let stroke = firstPath.getAttribute("stroke");
                      let strokeWidth = firstPath.getAttribute("stroke-width");

                      coordinates[nodeId] = {
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        nodeTitle: nodeTitle,
                        shape: "datastore",
                        fill: fill,
                        stroke: stroke,
                        strokeWidth: strokeWidth,
                      };
                    }
                  }
                  let style = graph.getStylesheet().getDefaultEdgeStyle();
                  style[mxConstants.STYLE_EDGE] = mxEdgeStyle.TopToBottom;

                  let parent = graph.getDefaultParent();

                  try {
                    for (let nodeId in coordinates) {
                      let nodeCoords = coordinates[nodeId];

                      let minX, minY, maxX, maxY;

                      if (Array.isArray(nodeCoords)) {
                        minX = Math.min.apply(
                          null,
                          nodeCoords.map((coord) => coord.x)
                        );
                        maxX = Math.max.apply(
                          null,
                          nodeCoords.map((coord) => coord.x)
                        );
                        minY = Math.min.apply(
                          null,
                          nodeCoords.map((coord) => coord.y)
                        );
                        maxY = Math.max.apply(
                          null,
                          nodeCoords.map((coord) => coord.y)
                        );
                      } else {
                        minX = nodeCoords.x;
                        minY = nodeCoords.y;
                        maxX = nodeCoords.x + nodeCoords.width;
                        maxY = nodeCoords.y + nodeCoords.height;
                      }

                      let nodeElement = svgDoc.querySelector("#" + nodeId);
                      let paths = nodeElement.querySelectorAll("path");
                      let textElement = nodeElement.querySelector(
                        'text[font-weight="bold"]'
                      );

                      if (!textElement) {
                        textElement = nodeElement.querySelector(
                          'text[text-anchor="start"]'
                        );
                      }
                      let text = textElement.textContent;
                      // Check if it's a 3D cylinder
                      let is3DCylinder = paths.length === 2;

                      //var textWithCoords = `${text} (x: ${minX}, y: ${minY}) width: ${width} height: ${height}`;
                      let vertex;
                      if (is3DCylinder) {
                        let widthScaleFactor = 2.0;
                        let heightScaleFactor = 0.07;

                        // Create a 3D cylinder vertex
                        let style =
                          "shape=datastore;fontStyle=1;fontSize=18;shadow=1;fillColor=" +
                          nodeCoords.fill +
                          ";strokeColor=" +
                          nodeCoords.stroke +
                          ";strokeWidth=" +
                          nodeCoords.strokeWidth;
                        vertex = graph.insertVertex(
                          parent,
                          null,
                          text,
                          minX - Math.abs(maxX - minX) * widthScaleFactor,
                          -minY,
                          Math.abs(maxX - minX) * widthScaleFactor,
                          Math.abs(maxY - minY) * heightScaleFactor,
                          style
                        );
                      } else if (nodeCoords.shape === "ellipse") {
                        let widthScaleFactor = 0.6;
                        let heightScaleFactor = 0.6;
                        let style =
                          "shape=ellipse;fontStyle=1;fontSize=18;shadow=1;fillColor=" +
                          nodeCoords.fill +
                          ";strokeColor=" +
                          nodeCoords.stroke +
                          ";strokeWidth=" +
                          nodeCoords.strokeWidth;

                        vertex = graph.insertVertex(
                          parent,
                          null,
                          text,
                          minX,
                          minY,
                          Math.abs(maxX - minX),
                          Math.abs(maxY - minY),
                          style
                        );
                      } else {
                        let widthScaleFactor = 0.6;
                        let heightScaleFactor = 0.6;
                        let style =
                          "shape=hexagon;fontStyle=1;fontSize=18;shadow=1;fillColor=" +
                          nodeCoords.fill +
                          ";strokeColor=" +
                          nodeCoords.stroke +
                          ";strokeWidth=" +
                          nodeCoords.strokeWidth;
                        vertex = graph.insertVertex(
                          parent,
                          null,
                          text,
                          minX,
                          minY,
                          Math.abs(maxX - minX),
                          Math.abs(maxY - minY),
                          style
                        );
                      }
if (graph.model.threagile.hasIn(["technical_assets", text])) {
    vertex.technicalAsset = text;
}
  
vertex.setVertex(true);  
nodeIdMap[nodeCoords.nodeTitle] = vertex;

                      let bounds = graph.getCellGeometry(vertex);
                      let textWidth = mxUtils.getSizeForString(
                        text,
                        12,
                        mxConstants.DEFAULT_FONTFAMILY
                      ).width;
                      let textHeight = mxUtils.getSizeForString(
                        text,
                        12,
                        mxConstants.DEFAULT_FONTFAMILY
                      ).height;

                      let padding = 20;
                      if (bounds.width < textWidth + padding) {
                        bounds.width = textWidth + padding;
                      }
                      if (bounds.height < textHeight + padding) {
                        bounds.height = textHeight + padding;
                      }
                      graph.resizeCell(vertex, bounds);
                    }

                    // Parse edges
                    let edgeStmts = dotJson.children.filter(
                      (child) => child.type === "edge_stmt"
                    );
                    let edgeMap = {};
                    let uniqueEdgeStmts = [];

                    edgeStmts.forEach((edgeStmt) => {
                      let key =
                        edgeStmt.edge_list[0].id +
                        "->" +
                        edgeStmt.edge_list[1].id;
                      if (!(key in edgeMap)) {
                        edgeMap[key] = true;
                        uniqueEdgeStmts.push(edgeStmt);
                      }
                    });

                    edgeStmts = uniqueEdgeStmts;
                    edgeStmts.forEach((edgeStmt) => {
                      let sourceTitle = edgeStmt.edge_list[0].id;
                      let targetTitle = edgeStmt.edge_list[1].id;
                      let edgeStyle = "edgeStyle=orthogonalEdgeStyle;";

                      // Validate IDs
                      if (
                        !(sourceTitle in nodeIdMap) ||
                        !(targetTitle in nodeIdMap)
                      ) {
                        console.log("Invalid edge source or target id");
                        return;
                      }

                      let pathPoints;
                      edgeSVGs.forEach((edgeSVG) => {
                        let title = edgeSVG.querySelector("title").textContent;
                        // Iterate through parsed edges
                        let edgeString = `${sourceTitle}->${targetTitle}`;
                        // Compare SVG edge title to parsed edge title
                        if (title === edgeString) {
                          let path = edgeSVG
                            .querySelector("path")
                            .getAttribute("d");
                          pathPoints = path.split(" ");
                          pathPoints.shift(); // Remove first element
                          pathPoints.pop(); // Remove last element

                          // Convert path points to mxPoints
                          pathPoints = pathPoints.map((pointString) => {
                            let [x, y] = pointString.split(",").map(Number);
                            return new mxPoint(x, y);
                          });
                        }
                      });

                      // Get source and target vertices
                      let sourceVertex = nodeIdMap[sourceTitle];
                      let targetVertex = nodeIdMap[targetTitle];
                      // Insert edge
                      let edge = graph.insertEdge(
                        parent,
                        null,
                        "",
                        sourceVertex,
                        targetVertex,
                        edgeStyle
                      );
                      // Assign waypoints to edge if they exist
                      if (pathPoints) {
                        let edgeGeometry = edge.getGeometry();
                        edgeGeometry = edgeGeometry.clone();
                        edgeGeometry.points = pathPoints;
                        graph.getModel().setGeometry(edge, edgeGeometry);
                      }
                      if (
                        sourceVertex.technicalAsset !== undefined &&
                        targetVertex.technicalAsset !== undefined
                      ) {
                        for (links in sourceVertex.technicalAsset
                          .communication_links) {
                          if (
                            targetVertex.technicalAsset.id ===
                            sourceVertex.technicalAsset.communication_links[
                              links
                            ].target_id
                          ) {
                            edge.communicationAsset =
                              sourceVertex.technicalAsset.communication_links[
                                links
                              ];
                            break;
                          }
                        }
                      }
                    });
                    let cells = graph.getModel().cells;
                    for (let id in cells) {
                      let cell = cells[id];
                      if (cell.technicalAsset) {
                        if (cell.technicalAsset.communication_links) {
                          delete cell.technicalAsset.communication_links;
                        }
                      }
                    }
		  

    
                  } catch (error) {
                    console.error(error);
                  } finally {
                    graph.fit();
                  }
                })
                .catch(function (error) {
                  console.error(error);
                });
            });
          } else {
            var doc = mxUtils.parseXml(xml);
            editor.graph.setSelectionCells(
              editor.graph.importGraphModel(doc.documentElement)
            );
            graph.fit();
          }
        } catch (e) {
          mxUtils.alert(
            mxResources.get("invalidOrMissingFile") + ": " + e.message
          );
        }
      })
    );

    function getPolygonPoints(coordinates) {
      var points = [];
      for (var i = 0; i < coordinates.length; i++) {
        points.push(coordinates[i].x + "," + coordinates[i].y);
      }
      return points.join(" ");
    }
    function downloadSVG(svgData, fileName) {
      var blob = new Blob([svgData], { type: "image/svg+xml" });
      var url = URL.createObjectURL(blob);

      var link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    // Removes openFile if dialog is closed
    ui.showDialog(
      new OpenDialog(this).container,
      320,
      220,
      true,
      true,
      function () {
        window.openFile = null;
      }
    );
  }).isEnabled = isGraphEnabled;
  this.addAction(
    "save",
    function () {
      ui.saveFile(false);
    },
    null,
    null,
    Editor.ctrlKey + "+S"
  ).isEnabled = isGraphEnabled;
  this.addAction(
    "saveAs...",
    function () {
      ui.saveFile(true);
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+S"
  ).isEnabled = isGraphEnabled;
  this.addAction("export...", function () {
    ui.showDialog(new ExportDialog(ui).container, 300, 296, true, true);
  });
  this.addAction("editDiagram...", function () {
    var dlg = new EditDiagramDialog(ui);
    ui.showDialog(dlg.container, 620, 420, true, false);
    dlg.init();
  });
  this.addAction("pageSetup...", function () {
    ui.showDialog(new PageSetupDialog(ui).container, 320, 220, true, true);
  }).isEnabled = isGraphEnabled;
  this.addAction(
    "print...",
    function () {
      ui.showDialog(new PrintDialog(ui).container, 300, 180, true, true);
    },
    null,
    "sprite-print",
    Editor.ctrlKey + "+P"
  );
  this.addAction("preview", function () {
    mxUtils.show(graph, null, 10, 10);
  });

  // Edit actions
  this.addAction(
    "undo",
    function () {
      ui.undo();
    },
    null,
    "sprite-undo",
    Editor.ctrlKey + "+Z"
  );
  this.addAction(
    "redo",
    function () {
      ui.redo();
    },
    null,
    "sprite-redo",
    !mxClient.IS_WIN ? Editor.ctrlKey + "+Shift+Z" : Editor.ctrlKey + "+Y"
  );
  this.addAction(
    "cut",
    function () {
      mxClipboard.cut(graph);
    },
    null,
    "sprite-cut",
    Editor.ctrlKey + "+X"
  );
  this.addAction(
    "copy",
    function () {
      try {
        mxClipboard.copy(graph);
      } catch (e) {
        ui.handleError(e);
      }
    },
    null,
    "sprite-copy",
    Editor.ctrlKey + "+C"
  );
  this.addAction(
    "paste",
    function () {
      if (graph.isEnabled() && !graph.isCellLocked(graph.getDefaultParent())) {
        mxClipboard.paste(graph);
      }
    },
    false,
    "sprite-paste",
    Editor.ctrlKey + "+V"
  );
  this.addAction("pasteHere", function (evt) {
    if (graph.isEnabled() && !graph.isCellLocked(graph.getDefaultParent())) {
      graph.getModel().beginUpdate();
      try {
        var cells = mxClipboard.paste(graph);

        if (cells != null) {
          var includeEdges = true;

          for (var i = 0; i < cells.length && includeEdges; i++) {
            includeEdges = includeEdges && graph.model.isEdge(cells[i]);
          }

          var t = graph.view.translate;
          var s = graph.view.scale;
          var dx = t.x;
          var dy = t.y;
          var bb = null;

          if (cells.length == 1 && includeEdges) {
            var geo = graph.getCellGeometry(cells[0]);

            if (geo != null) {
              bb = geo.getTerminalPoint(true);
            }
          }

          bb =
            bb != null
              ? bb
              : graph.getBoundingBoxFromGeometry(cells, includeEdges);

          if (bb != null) {
            var x = Math.round(
              graph.snap(graph.popupMenuHandler.triggerX / s - dx)
            );
            var y = Math.round(
              graph.snap(graph.popupMenuHandler.triggerY / s - dy)
            );

            graph.cellsMoved(cells, x - bb.x, y - bb.y);
          }
        }
      } finally {
        graph.getModel().endUpdate();
      }
    }
  });

  this.addAction(
    "copySize",
    function (evt) {
      var cell = graph.getSelectionCell();

      if (
        graph.isEnabled() &&
        cell != null &&
        graph.getModel().isVertex(cell)
      ) {
        var geo = graph.getCellGeometry(cell);

        if (geo != null) {
          ui.copiedSize = new mxRectangle(geo.x, geo.y, geo.width, geo.height);
        }
      }
    },
    null,
    null,
    "Alt+Shift+X"
  );

  this.addAction(
    "pasteSize",
    function (evt) {
      if (
        graph.isEnabled() &&
        !graph.isSelectionEmpty() &&
        ui.copiedSize != null
      ) {
        graph.getModel().beginUpdate();

        try {
          var cells = graph.getSelectionCells();

          for (var i = 0; i < cells.length; i++) {
            if (graph.getModel().isVertex(cells[i])) {
              var geo = graph.getCellGeometry(cells[i]);

              if (geo != null) {
                geo = geo.clone();
                geo.width = ui.copiedSize.width;
                geo.height = ui.copiedSize.height;

                graph.getModel().setGeometry(cells[i], geo);
              }
            }
          }
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    null,
    null,
    "Alt+Shift+V"
  );

  function deleteCells(includeEdges) {
    // Cancels interactive operations
    graph.escape();
    var select = graph.deleteCells(
      graph.getDeletableCells(graph.getSelectionCells()),
      includeEdges
    );

    if (select != null) {
      graph.setSelectionCells(select);
    }
  }

  this.addAction(
    "delete",
    function (evt) {
      deleteCells(evt != null && mxEvent.isControlDown(evt));
    },
    null,
    null,
    "Delete"
  );
  this.addAction("deleteAll", function () {
    if (!graph.isSelectionEmpty()) {
      graph.getModel().beginUpdate();
      try {
        var cells = graph.getSelectionCells();

        for (var i = 0; i < cells.length; i++) {
          graph.cellLabelChanged(cells[i], "");
        }
      } finally {
        graph.getModel().endUpdate();
      }
    }
  });
  this.addAction(
    "deleteLabels",
    function () {
      if (!graph.isSelectionEmpty()) {
        graph.getModel().beginUpdate();
        try {
          var cells = graph.getSelectionCells();

          for (var i = 0; i < cells.length; i++) {
            graph.cellLabelChanged(cells[i], "");
          }
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Delete"
  );
  this.addAction(
    "duplicate",
    function () {
      try {
        graph.setSelectionCells(graph.duplicateCells());
        graph.scrollCellToVisible(graph.getSelectionCell());
      } catch (e) {
        ui.handleError(e);
      }
    },
    null,
    null,
    Editor.ctrlKey + "+D"
  );
  this.put(
    "turn",
    new Action(
      mxResources.get("turn") + " / " + mxResources.get("reverse"),
      function (evt) {
        graph.turnShapes(
          graph.getSelectionCells(),
          evt != null ? mxEvent.isShiftDown(evt) : false
        );
      },
      null,
      null,
      Editor.ctrlKey + "+R"
    )
  );
  this.addAction(
    "selectVertices",
    function () {
      graph.selectVertices(null, true);
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+I"
  );
  this.addAction(
    "selectEdges",
    function () {
      graph.selectEdges();
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+E"
  );
  this.addAction(
    "selectAll",
    function () {
      graph.selectAll(null, true);
    },
    null,
    null,
    Editor.ctrlKey + "+A"
  );
  this.addAction(
    "selectNone",
    function () {
      graph.clearSelection();
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+A"
  );
  this.addAction(
    "lockUnlock",
    function () {
      if (!graph.isSelectionEmpty()) {
        graph.getModel().beginUpdate();
        try {
          var defaultValue = graph.isCellMovable(graph.getSelectionCell())
            ? 1
            : 0;
          graph.toggleCellStyles(mxConstants.STYLE_MOVABLE, defaultValue);
          graph.toggleCellStyles(mxConstants.STYLE_RESIZABLE, defaultValue);
          graph.toggleCellStyles(mxConstants.STYLE_ROTATABLE, defaultValue);
          graph.toggleCellStyles(mxConstants.STYLE_DELETABLE, defaultValue);
          graph.toggleCellStyles(mxConstants.STYLE_EDITABLE, defaultValue);
          graph.toggleCellStyles("connectable", defaultValue);
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    null,
    null,
    Editor.ctrlKey + "+L"
  );

  // Navigation actions
  this.addAction(
    "home",
    function () {
      graph.home();
    },
    null,
    null,
    "Shift+Home"
  );
  this.addAction(
    "exitGroup",
    function () {
      graph.exitGroup();
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+Home"
  );
  this.addAction(
    "enterGroup",
    function () {
      graph.enterGroup();
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+End"
  );
  this.addAction(
    "collapse",
    function () {
      graph.foldCells(true);
    },
    null,
    null,
    Editor.ctrlKey + "+Home"
  );
  this.addAction(
    "expand",
    function () {
      graph.foldCells(false);
    },
    null,
    null,
    Editor.ctrlKey + "+End"
  );

  // Arrange actions
  this.addAction(
    "toFront",
    function () {
      graph.orderCells(false);
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+F"
  );
  this.addAction(
    "toBack",
    function () {
      graph.orderCells(true);
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+B"
  );
  this.addAction(
    "group",
    function () {
      if (graph.isEnabled()) {
        var cells = mxUtils.sortCells(graph.getSelectionCells(), true);

        if (
          cells.length == 1 &&
          !graph.isTable(cells[0]) &&
          !graph.isTableRow(cells[0])
        ) {
          graph.setCellStyles("container", "1");
        } else {
          cells = graph.getCellsForGroup(cells);

          if (cells.length > 1) {
            graph.setSelectionCell(graph.groupCells(null, 0, cells));
          }
        }
      }
    },
    null,
    null,
    Editor.ctrlKey + "+G"
  );
  this.addAction(
    "ungroup",
    function () {
      if (graph.isEnabled()) {
        var cells = graph.getSelectionCells();

        graph.model.beginUpdate();
        try {
          var temp = graph.ungroupCells();

          // Clears container flag for remaining cells
          if (cells != null) {
            for (var i = 0; i < cells.length; i++) {
              if (graph.model.contains(cells[i])) {
                if (
                  graph.model.getChildCount(cells[i]) == 0 &&
                  graph.model.isVertex(cells[i])
                ) {
                  graph.setCellStyles("container", "0", [cells[i]]);
                }

                temp.push(cells[i]);
              }
            }
          }
        } finally {
          graph.model.endUpdate();
        }

        graph.setSelectionCells(temp);
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+U"
  );
  this.addAction("removeFromGroup", function () {
    if (graph.isEnabled()) {
      var cells = graph.getSelectionCells();

      // Removes table rows and cells
      if (cells != null) {
        var temp = [];

        for (var i = 0; i < cells.length; i++) {
          if (!graph.isTableRow(cells[i]) && !graph.isTableCell(cells[i])) {
            temp.push(cells[i]);
          }
        }

        graph.removeCellsFromParent(temp);
      }
    }
  });
  // Adds action
  this.addAction(
    "edit",
    function () {
      if (graph.isEnabled()) {
        graph.startEditingAtCell();
      }
    },
    null,
    null,
    "F2/Enter"
  );
  this.addAction(
    "editData...",
    function () {
      var cell = graph.getSelectionCell() || graph.getModel().getRoot();
      ui.showDataDialog(cell);
    },
    null,
    null,
    Editor.ctrlKey + "+M"
  );
  this.addAction(
    "editTooltip...",
    function () {
      if (graph.isEnabled() && !graph.isSelectionEmpty()) {
        var cell = graph.getSelectionCell();
        var tooltip = "";

        if (mxUtils.isNode(cell.value)) {
          var tmp = null;

          if (
            Graph.translateDiagram &&
            Graph.diagramLanguage != null &&
            cell.value.hasAttribute("tooltip_" + Graph.diagramLanguage)
          ) {
            tmp = cell.value.getAttribute("tooltip_" + Graph.diagramLanguage);
          }

          if (tmp == null) {
            tmp = cell.value.getAttribute("tooltip");
          }

          if (tmp != null) {
            tooltip = tmp;
          }
        }

        var dlg = new TextareaDialog(
          ui,
          mxResources.get("editTooltip") + ":",
          tooltip,
          function (newValue) {
            graph.setTooltipForCell(cell, newValue);
          }
        );
        ui.showDialog(dlg.container, 320, 200, true, true);
        dlg.init();
      }
    },
    null,
    null,
    "Alt+Shift+T"
  );
  this.addAction("openLink", function () {
    var link = graph.getLinkForCell(graph.getSelectionCell());

    if (link != null) {
      graph.openLink(link);
    }
  });
  this.addAction(
    "editLink...",
    function () {
      if (graph.isEnabled() && !graph.isSelectionEmpty()) {
        var cell = graph.getSelectionCell();
        var value = graph.getLinkForCell(cell) || "";

        ui.showLinkDialog(value, mxResources.get("apply"), function (link) {
          link = mxUtils.trim(link);
          graph.setLinkForCell(cell, link.length > 0 ? link : null);
        });
      }
    },
    null,
    null,
    "Alt+Shift+L"
  );
  this.put(
    "insertImage",
    new Action(mxResources.get("image") + "...", function () {
      if (graph.isEnabled() && !graph.isCellLocked(graph.getDefaultParent())) {
        graph.clearSelection();
        ui.actions.get("image").funct();
      }
    })
  ).isEnabled = isGraphEnabled;
  this.put(
    "insertLink",
    new Action(mxResources.get("link") + "...", function () {
      if (graph.isEnabled() && !graph.isCellLocked(graph.getDefaultParent())) {
        ui.showLinkDialog("", mxResources.get("insert"), function (link, docs) {
          link = mxUtils.trim(link);

          if (link.length > 0) {
            var icon = null;
            var title = graph.getLinkTitle(link);

            if (docs != null && docs.length > 0) {
              icon = docs[0].iconUrl;
              title = docs[0].name || docs[0].type;
              title = title.charAt(0).toUpperCase() + title.substring(1);

              if (title.length > 30) {
                title = title.substring(0, 30) + "...";
              }
            }

            var linkCell = new mxCell(
              title,
              new mxGeometry(0, 0, 100, 40),
              "fontColor=#0000EE;fontStyle=4;rounded=1;overflow=hidden;" +
                (icon != null
                  ? "shape=label;imageWidth=16;imageHeight=16;spacingLeft=26;align=left;image=" +
                    icon
                  : "spacing=10;")
            );
            linkCell.vertex = true;

            var pt = graph.getCenterInsertPoint(
              graph.getBoundingBoxFromGeometry([linkCell], true)
            );
            linkCell.geometry.x = pt.x;
            linkCell.geometry.y = pt.y;

            graph.setLinkForCell(linkCell, link);
            graph.cellSizeUpdated(linkCell, true);

            graph.getModel().beginUpdate();
            try {
              linkCell = graph.addCell(linkCell);
              graph.fireEvent(
                new mxEventObject("cellsInserted", "cells", [linkCell])
              );
            } finally {
              graph.getModel().endUpdate();
            }

            graph.setSelectionCell(linkCell);
            graph.scrollCellToVisible(graph.getSelectionCell());
          }
        });
      }
    })
  ).isEnabled = isGraphEnabled;
  this.addAction(
    "link...",
    mxUtils.bind(this, function () {
      if (graph.isEnabled()) {
        if (graph.cellEditor.isContentEditing()) {
          var elt = graph.getSelectedElement();
          var link = graph.getParentByName(elt, "A", graph.cellEditor.textarea);
          var oldValue = "";

          // Workaround for FF returning the outermost selected element after double
          // click on a DOM hierarchy with a link inside (but not as topmost element)
          if (link == null && elt != null && elt.getElementsByTagName != null) {
            // Finds all links in the selected DOM and uses the link
            // where the selection text matches its text content
            var links = elt.getElementsByTagName("a");

            for (var i = 0; i < links.length && link == null; i++) {
              if (links[i].textContent == elt.textContent) {
                link = links[i];
              }
            }
          }

          if (link != null && link.nodeName == "A") {
            oldValue = link.getAttribute("href") || "";
            graph.selectNode(link);
          }

          var selState = graph.cellEditor.saveSelection();

          ui.showLinkDialog(
            oldValue,
            mxResources.get("apply"),
            mxUtils.bind(this, function (value) {
              graph.cellEditor.restoreSelection(selState);

              if (value != null) {
                graph.insertLink(value);
              }
            })
          );
        } else if (graph.isSelectionEmpty()) {
          this.get("insertLink").funct();
        } else {
          this.get("editLink").funct();
        }
      }
    })
  ).isEnabled = isGraphEnabled;
  this.addAction(
    "autosize",
    function () {
      var cells = graph.getSelectionCells();

      if (cells != null) {
        graph.getModel().beginUpdate();
        try {
          for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];

            if (graph.getModel().getChildCount(cell)) {
              graph.updateGroupBounds([cell], 20);
            } else {
              var state = graph.view.getState(cell);
              var geo = graph.getCellGeometry(cell);

              if (
                graph.getModel().isVertex(cell) &&
                state != null &&
                state.text != null &&
                geo != null &&
                graph.isWrapping(cell)
              ) {
                geo = geo.clone();
                geo.height = state.text.boundingBox.height / graph.view.scale;
                graph.getModel().setGeometry(cell, geo);
              } else {
                graph.updateCellSize(cell);
              }
            }
          }
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+Y"
  );
  this.addAction("formattedText", function () {
    var refState = graph.getView().getState(graph.getSelectionCell());

    if (refState != null) {
      graph.stopEditing();
      var value = refState.style["html"] == "1" ? null : "1";

      graph.getModel().beginUpdate();
      try {
        var cells = graph.getSelectionCells();

        for (var i = 0; i < cells.length; i++) {
          state = graph.getView().getState(cells[i]);

          if (state != null) {
            var html = mxUtils.getValue(state.style, "html", "0");

            if (html == "1" && value == null) {
              var label = graph.convertValueToString(state.cell);

              if (mxUtils.getValue(state.style, "nl2Br", "1") != "0") {
                // Removes newlines from HTML and converts breaks to newlines
                // to match the HTML output in plain text
                label = label.replace(/\n/g, "").replace(/<br\s*.?>/g, "\n");
              }

              // Removes HTML tags
              var temp = document.createElement("div");
              temp.innerHTML = graph.sanitizeHtml(label);
              label = mxUtils.extractTextWithWhitespace(temp.childNodes);

              graph.cellLabelChanged(state.cell, label);
              graph.setCellStyles("html", value, [cells[i]]);
            } else if (html == "0" && value == "1") {
              // Converts HTML tags to text
              var label = mxUtils.htmlEntities(
                graph.convertValueToString(state.cell),
                false
              );

              if (mxUtils.getValue(state.style, "nl2Br", "1") != "0") {
                // Converts newlines in plain text to breaks in HTML
                // to match the plain text output
                label = label.replace(/\n/g, "<br/>");
              }

              graph.cellLabelChanged(state.cell, graph.sanitizeHtml(label));
              graph.setCellStyles("html", value, [cells[i]]);
            }
          }
        }

        ui.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            ["html"],
            "values",
            [value != null ? value : "0"],
            "cells",
            cells
          )
        );
      } finally {
        graph.getModel().endUpdate();
      }
    }
  });
  this.addAction("wordWrap", function () {
    var state = graph.getView().getState(graph.getSelectionCell());
    var value = "wrap";

    graph.stopEditing();

    if (state != null && state.style[mxConstants.STYLE_WHITE_SPACE] == "wrap") {
      value = null;
    }

    graph.setCellStyles(mxConstants.STYLE_WHITE_SPACE, value);
  });
  this.addAction("rotation", function () {
    var value = "0";
    var state = graph.getView().getState(graph.getSelectionCell());

    if (state != null) {
      value = state.style[mxConstants.STYLE_ROTATION] || value;
    }

    var dlg = new FilenameDialog(
      ui,
      value,
      mxResources.get("apply"),
      function (newValue) {
        if (newValue != null && newValue.length > 0) {
          graph.setCellStyles(mxConstants.STYLE_ROTATION, newValue);
        }
      },
      mxResources.get("enterValue") +
        " (" +
        mxResources.get("rotation") +
        " 0-360)"
    );

    ui.showDialog(dlg.container, 375, 80, true, true);
    dlg.init();
  });
  // View actions
  this.addAction(
    "resetView",
    function () {
      graph.zoomTo(1);
      ui.resetScrollbars();
    },
    null,
    null,
    "Home"
  );
  this.addAction(
    "zoomIn",
    function (evt) {
      if (graph.isFastZoomEnabled()) {
        graph.lazyZoom(true, true, ui.buttonZoomDelay);
      } else {
        graph.zoomIn();
      }
    },
    null,
    null,
    Editor.ctrlKey + " + (Numpad) / Alt+Mousewheel"
  );
  this.addAction(
    "zoomOut",
    function (evt) {
      if (graph.isFastZoomEnabled()) {
        graph.lazyZoom(false, true, ui.buttonZoomDelay);
      } else {
        graph.zoomOut();
      }
    },
    null,
    null,
    Editor.ctrlKey + " - (Numpad) / Alt+Mousewheel"
  );
  this.addAction(
    "fitWindow",
    function () {
      var bounds = graph.isSelectionEmpty()
        ? graph.getGraphBounds()
        : graph.getBoundingBox(graph.getSelectionCells());
      var t = graph.view.translate;
      var s = graph.view.scale;

      bounds.x = bounds.x / s - t.x;
      bounds.y = bounds.y / s - t.y;
      bounds.width /= s;
      bounds.height /= s;

      if (graph.backgroundImage != null) {
        bounds.add(
          new mxRectangle(
            0,
            0,
            graph.backgroundImage.width,
            graph.backgroundImage.height
          )
        );
      }

      if (bounds.width == 0 || bounds.height == 0) {
        graph.zoomTo(1);
        ui.resetScrollbars();
      } else {
        graph.fitWindow(bounds);
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+H"
  );
  this.addAction(
    "fitPage",
    mxUtils.bind(this, function () {
      if (!graph.pageVisible) {
        this.get("pageView").funct();
      }

      var fmt = graph.pageFormat;
      var ps = graph.pageScale;
      var cw = graph.container.clientWidth - 10;
      var ch = graph.container.clientHeight - 10;
      var scale =
        Math.floor(20 * Math.min(cw / fmt.width / ps, ch / fmt.height / ps)) /
        20;
      graph.zoomTo(scale);

      if (mxUtils.hasScrollbars(graph.container)) {
        var pad = graph.getPagePadding();
        graph.container.scrollTop = pad.y * graph.view.scale - 1;
        graph.container.scrollLeft =
          Math.min(
            pad.x * graph.view.scale,
            (graph.container.scrollWidth - graph.container.clientWidth) / 2
          ) - 1;
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+J"
  );
  this.addAction(
    "fitTwoPages",
    mxUtils.bind(this, function () {
      if (!graph.pageVisible) {
        this.get("pageView").funct();
      }

      var fmt = graph.pageFormat;
      var ps = graph.pageScale;
      var cw = graph.container.clientWidth - 10;
      var ch = graph.container.clientHeight - 10;

      var scale =
        Math.floor(
          20 * Math.min(cw / (2 * fmt.width) / ps, ch / fmt.height / ps)
        ) / 20;
      graph.zoomTo(scale);

      if (mxUtils.hasScrollbars(graph.container)) {
        var pad = graph.getPagePadding();
        graph.container.scrollTop = Math.min(
          pad.y,
          (graph.container.scrollHeight - graph.container.clientHeight) / 2
        );
        graph.container.scrollLeft = Math.min(
          pad.x,
          (graph.container.scrollWidth - graph.container.clientWidth) / 2
        );
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+Shift+J"
  );
  this.addAction(
    "fitPageWidth",
    mxUtils.bind(this, function () {
      if (!graph.pageVisible) {
        this.get("pageView").funct();
      }

      var fmt = graph.pageFormat;
      var ps = graph.pageScale;
      var cw = graph.container.clientWidth - 10;

      var scale = Math.floor((20 * cw) / fmt.width / ps) / 20;
      graph.zoomTo(scale);

      if (mxUtils.hasScrollbars(graph.container)) {
        var pad = graph.getPagePadding();
        graph.container.scrollLeft = Math.min(
          pad.x * graph.view.scale,
          (graph.container.scrollWidth - graph.container.clientWidth) / 2
        );
      }
    })
  );
  this.put(
    "customZoom",
    new Action(
      mxResources.get("custom") + "...",
      mxUtils.bind(this, function () {
        var dlg = new FilenameDialog(
          this.editorUi,
          parseInt(graph.getView().getScale() * 100),
          mxResources.get("apply"),
          mxUtils.bind(this, function (newValue) {
            var val = parseInt(newValue);

            if (!isNaN(val) && val > 0) {
              graph.zoomTo(val / 100);
            }
          }),
          mxResources.get("zoom") + " (%)"
        );
        this.editorUi.showDialog(dlg.container, 300, 80, true, true);
        dlg.init();
      }),
      null,
      null,
      Editor.ctrlKey + "+0"
    )
  );
  this.addAction(
    "pageScale...",
    mxUtils.bind(this, function () {
      var dlg = new FilenameDialog(
        this.editorUi,
        parseInt(graph.pageScale * 100),
        mxResources.get("apply"),
        mxUtils.bind(this, function (newValue) {
          var val = parseInt(newValue);

          if (!isNaN(val) && val > 0) {
            var change = new ChangePageSetup(ui, null, null, null, val / 100);
            change.ignoreColor = true;
            change.ignoreImage = true;

            graph.model.execute(change);
          }
        }),
        mxResources.get("pageScale") + " (%)"
      );
      this.editorUi.showDialog(dlg.container, 300, 80, true, true);
      dlg.init();
    })
  );

  // Option actions
  var action = null;
  action = this.addAction(
    "grid",
    function () {
      graph.setGridEnabled(!graph.isGridEnabled());
      ui.fireEvent(new mxEventObject("gridEnabledChanged"));
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+G"
  );
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.isGridEnabled();
  });
  action.setEnabled(false);

  action = this.addAction("guides", function () {
    graph.graphHandler.guidesEnabled = !graph.graphHandler.guidesEnabled;
    ui.fireEvent(new mxEventObject("guidesEnabledChanged"));
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.graphHandler.guidesEnabled;
  });
  action.setEnabled(false);

  action = this.addAction("tooltips", function () {
    graph.tooltipHandler.setEnabled(!graph.tooltipHandler.isEnabled());
    ui.fireEvent(new mxEventObject("tooltipsEnabledChanged"));
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.tooltipHandler.isEnabled();
  });

  action = this.addAction("collapseExpand", function () {
    var change = new ChangePageSetup(ui);
    change.ignoreColor = true;
    change.ignoreImage = true;
    change.foldingEnabled = !graph.foldingEnabled;

    graph.model.execute(change);
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.foldingEnabled;
  });
  action.isEnabled = isGraphEnabled;
  action = this.addAction("scrollbars", function () {
    ui.setScrollbars(!ui.hasScrollbars());
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.scrollbars;
  });
  action = this.addAction(
    "pageView",
    mxUtils.bind(this, function () {
      ui.setPageVisible(!graph.pageVisible);
    })
  );
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.pageVisible;
  });
  action = this.addAction(
    "connectionArrows",
    function () {
      graph.connectionArrowsEnabled = !graph.connectionArrowsEnabled;
      ui.fireEvent(new mxEventObject("connectionArrowsChanged"));
    },
    null,
    null,
    "Alt+Shift+A"
  );
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.connectionArrowsEnabled;
  });
  action = this.addAction(
    "connectionPoints",
    function () {
      graph.setConnectable(!graph.connectionHandler.isEnabled());
      ui.fireEvent(new mxEventObject("connectionPointsChanged"));
    },
    null,
    null,
    "Alt+Shift+P"
  );
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.connectionHandler.isEnabled();
  });
  action = this.addAction("copyConnect", function () {
    graph.connectionHandler.setCreateTarget(
      !graph.connectionHandler.isCreateTarget()
    );
    ui.fireEvent(new mxEventObject("copyConnectChanged"));
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return graph.connectionHandler.isCreateTarget();
  });
  action.isEnabled = isGraphEnabled;
  action = this.addAction("autosave", function () {
    ui.editor.setAutosave(!ui.editor.autosave);
  });
  action.setToggleAction(true);
  action.setSelectedCallback(function () {
    return ui.editor.autosave;
  });
  action.isEnabled = isGraphEnabled;
  action.visible = false;

  // Help actions
  this.addAction("help", function () {
    var ext = "";

    if (mxResources.isLanguageSupported(mxClient.language)) {
      ext = "_" + mxClient.language;
    }

    graph.openLink(RESOURCES_PATH + "/help" + ext + ".html");
  });

  var showingAbout = false;

  this.put(
    "about",
    new Action(mxResources.get("about") + " Threagile+...", function () {
      if (!showingAbout) {
        ui.showDialog(
          new AboutDialog(ui).container,
          320,
          380,
          true,
          true,
          function () {
            showingAbout = false;
          }
        );

        showingAbout = true;
      }
    })
  );

  // Font style actions
  var toggleFontStyle = mxUtils.bind(this, function (key, style, fn, shortcut) {
    return this.addAction(
      key,
      function () {
        if (fn != null && graph.cellEditor.isContentEditing()) {
          fn();
        } else {
          graph.stopEditing(false);

          graph.getModel().beginUpdate();
          try {
            var cells = graph.getSelectionCells();
            graph.toggleCellStyleFlags(
              mxConstants.STYLE_FONTSTYLE,
              style,
              cells
            );

            // Removes bold and italic tags and CSS styles inside labels
            if ((style & mxConstants.FONT_BOLD) == mxConstants.FONT_BOLD) {
              graph.updateLabelElements(
                graph.getSelectionCells(),
                function (elt) {
                  elt.style.fontWeight = null;

                  if (elt.nodeName == "B") {
                    graph.replaceElement(elt);
                  }
                }
              );
            } else if (
              (style & mxConstants.FONT_ITALIC) ==
              mxConstants.FONT_ITALIC
            ) {
              graph.updateLabelElements(
                graph.getSelectionCells(),
                function (elt) {
                  elt.style.fontStyle = null;

                  if (elt.nodeName == "I") {
                    graph.replaceElement(elt);
                  }
                }
              );
            } else if (
              (style & mxConstants.FONT_UNDERLINE) ==
              mxConstants.FONT_UNDERLINE
            ) {
              graph.updateLabelElements(
                graph.getSelectionCells(),
                function (elt) {
                  elt.style.textDecoration = null;

                  if (elt.nodeName == "U") {
                    graph.replaceElement(elt);
                  }
                }
              );
            }

            for (var i = 0; i < cells.length; i++) {
              if (graph.model.getChildCount(cells[i]) == 0) {
                graph.autoSizeCell(cells[i], false);
              }
            }
          } finally {
            graph.getModel().endUpdate();
          }
        }
      },
      null,
      null,
      shortcut
    );
  });

  toggleFontStyle(
    "bold",
    mxConstants.FONT_BOLD,
    function () {
      document.execCommand("bold", false, null);
    },
    Editor.ctrlKey + "+B"
  );
  toggleFontStyle(
    "italic",
    mxConstants.FONT_ITALIC,
    function () {
      document.execCommand("italic", false, null);
    },
    Editor.ctrlKey + "+I"
  );
  toggleFontStyle(
    "underline",
    mxConstants.FONT_UNDERLINE,
    function () {
      document.execCommand("underline", false, null);
    },
    Editor.ctrlKey + "+U"
  );

  // Color actions
  this.addAction("fontColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_FONTCOLOR, "forecolor", "000000");
  });
  this.addAction("strokeColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_STROKECOLOR);
  });
  this.addAction("fillColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_FILLCOLOR);
  });
  this.addAction("gradientColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_GRADIENTCOLOR);
  });
  this.addAction("backgroundColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_LABEL_BACKGROUNDCOLOR, "backcolor");
  });
  this.addAction("borderColor...", function () {
    ui.menus.pickColor(mxConstants.STYLE_LABEL_BORDERCOLOR);
  });

  // Format actions
  this.addAction("vertical", function () {
    ui.menus.toggleStyle(mxConstants.STYLE_HORIZONTAL, true);
  });
  this.addAction("shadow", function () {
    ui.menus.toggleStyle(mxConstants.STYLE_SHADOW);
  });
  this.addAction("solid", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_DASHED, null);
      graph.setCellStyles(mxConstants.STYLE_DASH_PATTERN, null);
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
          "values",
          [null, null],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("dashed", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_DASHED, "1");
      graph.setCellStyles(mxConstants.STYLE_DASH_PATTERN, null);
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
          "values",
          ["1", null],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("dotted", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_DASHED, "1");
      graph.setCellStyles(mxConstants.STYLE_DASH_PATTERN, "1 4");
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_DASHED, mxConstants.STYLE_DASH_PATTERN],
          "values",
          ["1", "1 4"],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("sharp", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_ROUNDED, "0");
      graph.setCellStyles(mxConstants.STYLE_CURVED, "0");
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_ROUNDED, mxConstants.STYLE_CURVED],
          "values",
          ["0", "0"],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("rounded", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_ROUNDED, "1");
      graph.setCellStyles(mxConstants.STYLE_CURVED, "0");
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_ROUNDED, mxConstants.STYLE_CURVED],
          "values",
          ["1", "0"],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("toggleRounded", function () {
    if (!graph.isSelectionEmpty() && graph.isEnabled()) {
      graph.getModel().beginUpdate();
      try {
        var cells = graph.getSelectionCells();
        var style = graph.getCurrentCellStyle(cells[0]);
        var value =
          mxUtils.getValue(style, mxConstants.STYLE_ROUNDED, "0") == "1"
            ? "0"
            : "1";

        graph.setCellStyles(mxConstants.STYLE_ROUNDED, value);
        graph.setCellStyles(mxConstants.STYLE_CURVED, null);
        ui.fireEvent(
          new mxEventObject(
            "styleChanged",
            "keys",
            [mxConstants.STYLE_ROUNDED, mxConstants.STYLE_CURVED],
            "values",
            [value, "0"],
            "cells",
            graph.getSelectionCells()
          )
        );
      } finally {
        graph.getModel().endUpdate();
      }
    }
  });
  this.addAction("curved", function () {
    graph.getModel().beginUpdate();
    try {
      graph.setCellStyles(mxConstants.STYLE_ROUNDED, "0");
      graph.setCellStyles(mxConstants.STYLE_CURVED, "1");
      ui.fireEvent(
        new mxEventObject(
          "styleChanged",
          "keys",
          [mxConstants.STYLE_ROUNDED, mxConstants.STYLE_CURVED],
          "values",
          ["0", "1"],
          "cells",
          graph.getSelectionCells()
        )
      );
    } finally {
      graph.getModel().endUpdate();
    }
  });
  this.addAction("collapsible", function () {
    var state = graph.view.getState(graph.getSelectionCell());
    var value = "1";

    if (state != null && graph.getFoldingImage(state) != null) {
      value = "0";
    }

    graph.setCellStyles("collapsible", value);
    ui.fireEvent(
      new mxEventObject(
        "styleChanged",
        "keys",
        ["collapsible"],
        "values",
        [value],
        "cells",
        graph.getSelectionCells()
      )
    );
  });
  this.addAction(
    "editDataAssets",
    mxUtils.bind(this, function () {
      var model = graph.getModel();

      var dlg = new TextareaDialog(
        this.editorUi,
        "DataAssets:",
        "SomeStuff",
        function (newValue) {
          console.log("Neuer Wert:", newValue);
        },
        null,
        null,
        400,
        220
      );

      var scrollbar = new graph.mxUtils.scrollbar(dlg.container);
      scrollbar.style.height = "100%";
      scrollbar.style.width = "100%";
      dlg.container.appendChild(scrollbar);

      this.editorUi.showDialog(dlg.container, 420, 800, true, true);
      dlg.init();
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  /*
  this.addAction(
    "loadDiagramData",
    mxUtils.bind(this, function (list, menu) {
      console.log("this");
      var diagramData = graph.model.diagramData;
      if (typeof diagramData !== "undefined") {
        diagramData.forEach(
          function (value, property) {
            var clonedMenu = this.addDataMenu(this.createPanel());
            var listItem = document.createElement("li");
            listItem.style.display = "flex";
            listItem.style.flexDirection = "column";
            listItem.style.padding = "8px";
            listItem.style.borderBottom = "1px solid #ccc";
            var parentNode = clonedMenu.childNodes[0];
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
                    if (i < parentNode.childNodes.length - 1) {
                      var nextChildNode =
                        currentChildNode.children[1].children[0];

                      if (nextChildNode.nodeName === "SELECT") {
                        nextChildNode.value = childNode;
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
            var arrowIcon = document.createElement("img");
            arrowIcon.src =
              " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
            arrowIcon.style.width = "15px";
            arrowIcon.style.height = "15px";
            arrowIcon.style.marginRight = "5px";

            arrowIcon.style.transform = "rotate(270deg)";
            textContainer.insertBefore(arrowIcon, dataText);

            var dataText = document.createElement("div");
            dataText.textContent = value.descriptionMenu;

            var xButton = document.createElement("button");
            xButton.innerHTML =
              '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEV7mr3///+wksspAAAAAnRSTlP/AOW3MEoAAAAdSURBVAgdY9jXwCDDwNDRwHCwgeExmASygSL7GgB12QiqNHZZIwAAAABJRU5ErkJggg==" alt="X">';
            xButton.style.marginLeft = "auto";
            xButton.style.padding = "5px";
            xButton.style.backgroundColor = "transparent";
            xButton.style.border = "none";
            xButton.style.cursor = "pointer";
            xButton.addEventListener("click", function () {
              var parentListItem = xButton.parentNode.parentNode;
              var parentList = parentListItem.parentNode;
              parentList.removeChild(parentListItem);
              graph.model.diagramData.delete(menu.id);
            });

            textContainer.appendChild(dataText);
            textContainer.appendChild(xButton);

            listItem.appendChild(textContainer);
            listItem.appendChild(clonedMenu);
            function toggleContent() {
              // Überprüfe, ob die enthaltenen Elemente bereits versteckt sind
              var isHidden = listItem.style.backgroundColor === "lightgray";
              let current = diagramData.get(menu.id)["isHidden"];
              if (!current["isHidden"]) {
                current["isHidden"] = false;
              }
              let state = current["isHidden"];
              if (state) {
                listItem.style.backgroundColor = "";
                arrowIcon.style.transform = "rotate(270deg)";
                xButton.style.display = "inline-block";
                menu.style.display = "block";
              } else {
                listItem.style.backgroundColor = "lightgray";
                arrowIcon.style.transform = "rotate(90deg)";
                xButton.style.display = "none";
                menu.style.display = "none";
              }
              current["isHidden"] = !current["isHidden"];
            }
            arrowIcon.addEventListener("click", toggleContent);
            dataText.addEventListener("click", toggleContent);

            list.appendChild(listItem);
          }.bind(this)
        );
      }
    })
  );
  */
  this.addAction(
    "addDataAssets",
    mxUtils.bind(this, function (list, menu) {
      if (typeof graph.model.diagramData === "undefined") {
        graph.model.diagramData = new Map();
        graph.model.diagramData.DataAssets = new Map();
      }
      if (graph.model.diagramData.DataAssets instanceof Map) {
        var menuId = "menu_" + list.childElementCount;
        graph.model.diagramData.DataAssets.set(menuId, {
          descriptionMenu: "Data" + list.childElementCount + ":",
        });
        menu.id = menuId;
      } else {
        console.error("diagramData is not a Map");
      }
      var listItem = document.createElement("li");
      listItem.style.display = "flex";
      listItem.style.flexDirection = "column";
      listItem.style.padding = "8px";
      listItem.style.borderBottom = "1px solid #ccc";

      var textContainer = document.createElement("div");
      textContainer.style.display = "flex";
      textContainer.style.alignItems = "center";
      textContainer.style.marginBottom = "8px";
      var arrowIcon = document.createElement("img");
      arrowIcon.src =
        " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAagAAAGoB3Bi5tQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEUSURBVDiNjdO9SgNBFIbhJ4YkhZ2W2tgmphYEsTJiY2Vjk0YbMYVeiKAo2mjlHVhpDBaCoPGnEjtvQLAWRIjF7sJmM9nk7WbO+b6Zc+ZMwSB1bGMRhXivhwec4z2gARWcoo0VlFKxEhq4xQnKIXEbO8PcU+ziJmtyNqY4oYXjZFGPHbNMo5hj0kEVDkU1Z2niCpNDDFZxAF39DUuzgUfMBmJlPMFLzjVhGW+YC8ReJ0aIR9FjvBJmArEKukXU8IfPTEITm1jHd8CgkRw8L5qwLFPyn/EO1SK+sCBq0nMq4UdcY4B9/OIy2SiLhqmVc2LCHq4F+lYWjWdHNCTpWa9gLb72UVpcMEgNW1jS/53vcYGPdPI/rfEvjAsiqsMAAAAASUVORK5CYII=";
      arrowIcon.style.width = "15px";
      arrowIcon.style.height = "15px";
      arrowIcon.style.marginRight = "5px";

      arrowIcon.style.transform = "rotate(270deg)";
      textContainer.insertBefore(arrowIcon, dataText);

      var dataText = document.createElement("div");
      dataText.textContent = "Data " + list.childElementCount + ":";
      //dataText.textContent = graph.model.diagramData.get(menu.id).id;

      var xButton = document.createElement("button");
      xButton.innerHTML =
        '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEV7mr3///+wksspAAAAAnRSTlP/AOW3MEoAAAAdSURBVAgdY9jXwCDDwNDRwHCwgeExmASygSL7GgB12QiqNHZZIwAAAABJRU5ErkJggg==" alt="X">';
      xButton.style.marginLeft = "auto";
      xButton.style.padding = "5px";
      xButton.style.backgroundColor = "transparent";
      xButton.style.border = "none";
      xButton.style.cursor = "pointer";
      xButton.addEventListener("click", function () {
        var parentListItem = xButton.parentNode.parentNode;
        var parentList = parentListItem.parentNode;
        parentList.removeChild(parentListItem);

        var menuId = graph.model.diagramData.DataAssets.delete(menuId);
      });

      textContainer.appendChild(dataText);
      textContainer.appendChild(xButton);

      listItem.appendChild(textContainer);
      listItem.appendChild(menu);
      function toggleContent() {
        // Überprüfe, ob die enthaltenen Elemente bereits versteckt sind
        var isHidden = listItem.style.backgroundColor === "lightgray";
        if (isHidden) {
          listItem.style.backgroundColor = "";
          arrowIcon.style.transform = "rotate(270deg)";
          xButton.style.display = "inline-block";
          menu.style.display = "block";
        } else {
          listItem.style.backgroundColor = "lightgray";
          arrowIcon.style.transform = "rotate(90deg)";
          xButton.style.display = "none";
          menu.style.display = "none";
        }
      }
      arrowIcon.addEventListener("click", toggleContent);
      dataText.addEventListener("click", toggleContent);

      list.appendChild(listItem);
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );

  this.addAction(
    "editAssetJustificationOutOfScope...",
    mxUtils.bind(this, function () {
      var cells = graph.getSelectionCells();

      if (cells != null && cells.length > 0) {
        var cell = graph.getSelectionCell();

        if (!cell.technicalAsset) {
          cell.technicalAsset = {
            justificationoutofscope: "",
          };
        }

        // Greifen Sie auf die benutzerdefinierten Eigenschaften zu
        var descriptionData = cell.technicalAsset.justificationoutofscope;

        var dlg = new TextareaDialog(
          this.editorUi,
          "Justifcation out of Scope:",
          descriptionData,
          function (newValue) {
            if (newValue != null) {
              console.log(newValue);
              cell.technicalAsset.justificationoutofscope = newValue;
              //graph.setCellStyle(mxUtils.trim(newValue), cells);
            }
          },
          null,
          null,
          400,
          220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);

        dlg.init();
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "editAssetJustificationOftheRating...",
    mxUtils.bind(this, function () {
      var cells = graph.getSelectionCells();

      if (cells != null && cells.length > 0) {
        var cell = graph.getSelectionCell();

        // Fügen Sie benutzerdefinierte Eigenschaften zur Zelle hinzu
        if (!cell.technicalAsset) {
          cell.technicalAsset = {
            justificationoftherating: "",
          };
        }

        // Greifen Sie auf die benutzerdefinierten Eigenschaften zu
        var descriptionData = cell.technicalAsset.justificationoftherating;

        var dlg = new TextareaDialog(
          this.editorUi,
          "Justifcation of the rating:",
          descriptionData,
          function (newValue) {
            if (newValue != null) {
              console.log(newValue);
              cell.technicalAsset.justificationoftherating = newValue;
              //graph.setCellStyle(mxUtils.trim(newValue), cells);
            }
          },
          null,
          null,
          400,
          220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);

        dlg.init();
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "editAssetOwner...",
    mxUtils.bind(this, function () {
      var cells = graph.getSelectionCells();

      if (cells != null && cells.length > 0) {
        var cell = graph.getSelectionCell();

        // Fügen Sie benutzerdefinierte Eigenschaften zur Zelle hinzu
        if (!cell.technicalAsset) {
          cell.technicalAsset = {
            owner: "",
          };
        }

        // Greifen Sie auf die benutzerdefinierten Eigenschaften zu
        var descriptionData = cell.technicalAsset.owner;

        var dlg = new TextareaDialog(
          this.editorUi,
          "Owner:",
          descriptionData,
          function (newValue) {
            if (newValue != null) {
              console.log(newValue);
              cell.technicalAsset.owner = newValue;
              //graph.setCellStyle(mxUtils.trim(newValue), cells);
            }
          },
          null,
          null,
          400,
          220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);

        dlg.init();
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "editDataDescription...",
    mxUtils.bind(this, function (evt) {
      var menuId = evt.target.parentNode.id;
      var current = graph.model.diagramData.DataAssets.get(menuId);

      if (!current.description) {
        current.description = "";
      }

      // Greifen Sie auf die benutzerdefinierten Eigenschaften zu
      var descriptionData = current.description;

      var dlg = new TextareaDialog(
        this.editorUi,
        "Description:",
        descriptionData,
        function (newValue) {
          if (newValue != null) {
            current.description = newValue;
          }
        },
        null,
        null,
        400,
        220
      );
      this.editorUi.showDialog(dlg.container, 420, 300, true, true);

      dlg.init();
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "editAssetDescription...",
    mxUtils.bind(this, function () {
      var cells = graph.getSelectionCells();

      if (cells != null && cells.length > 0) {
        var cell = graph.getSelectionCell();

        // Fügen Sie benutzerdefinierte Eigenschaften zur Zelle hinzu
        if (!cell.technicalAsset) {
          cell.technicalAsset = {
            description: "",
          };
        }

        // Greifen Sie auf die benutzerdefinierten Eigenschaften zu
        var descriptionData = cell.technicalAsset.description;

        var dlg = new TextareaDialog(
          this.editorUi,
          "Description:",
          descriptionData,
          function (newValue) {
            if (newValue != null) {
              console.log(newValue);
              cell.technicalAsset.description = newValue;
              //graph.setCellStyle(mxUtils.trim(newValue), cells);
            }
          },
          null,
          null,
          400,
          220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);

        dlg.init();
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "editStyle...",
    mxUtils.bind(this, function () {
      var cells = graph.getSelectionCells();

      if (cells != null && cells.length > 0) {
        var model = graph.getModel();

        var dlg = new TextareaDialog(
          this.editorUi,
          mxResources.get("editStyle") + ":",
          model.getStyle(cells[0]) || "",
          function (newValue) {
            if (newValue != null) {
              graph.setCellStyle(mxUtils.trim(newValue), cells);
            }
          },
          null,
          null,
          400,
          220
        );
        this.editorUi.showDialog(dlg.container, 420, 300, true, true);
        dlg.init();
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+E"
  );
  this.addAction(
    "setAsDefaultStyle",
    function () {
      if (graph.isEnabled() && !graph.isSelectionEmpty()) {
        ui.setDefaultStyle(graph.getSelectionCell());
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+D"
  );
  this.addAction(
    "clearDefaultStyle",
    function () {
      if (graph.isEnabled()) {
        ui.clearDefaultStyle();
      }
    },
    null,
    null,
    Editor.ctrlKey + "+Shift+R"
  );
  this.addAction("addWaypoint", function () {
    var cell = graph.getSelectionCell();

    if (cell != null && graph.getModel().isEdge(cell)) {
      var handler = editor.graph.selectionCellsHandler.getHandler(cell);

      if (handler instanceof mxEdgeHandler) {
        var t = graph.view.translate;
        var s = graph.view.scale;
        var dx = t.x;
        var dy = t.y;

        var parent = graph.getModel().getParent(cell);
        var pgeo = graph.getCellGeometry(parent);

        while (graph.getModel().isVertex(parent) && pgeo != null) {
          dx += pgeo.x;
          dy += pgeo.y;

          parent = graph.getModel().getParent(parent);
          pgeo = graph.getCellGeometry(parent);
        }

        var x = Math.round(
          graph.snap(graph.popupMenuHandler.triggerX / s - dx)
        );
        var y = Math.round(
          graph.snap(graph.popupMenuHandler.triggerY / s - dy)
        );

        handler.addPointAt(handler.state, x, y);
      }
    }
  });
  this.addAction("removeWaypoint", function () {
    // TODO: Action should run with "this" set to action
    var rmWaypointAction = ui.actions.get("removeWaypoint");

    if (rmWaypointAction.handler != null) {
      // NOTE: Popupevent handled and action updated in Menus.createPopupMenu
      rmWaypointAction.handler.removePoint(
        rmWaypointAction.handler.state,
        rmWaypointAction.index
      );
    }
  });
  this.addAction(
    "clearWaypoints",
    function () {
      var cells = graph.getSelectionCells();

      if (cells != null) {
        cells = graph.addAllEdges(cells);

        graph.getModel().beginUpdate();
        try {
          for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];

            if (graph.getModel().isEdge(cell)) {
              var geo = graph.getCellGeometry(cell);

              if (geo != null) {
                geo = geo.clone();
                geo.points = null;
                graph.getModel().setGeometry(cell, geo);
              }
            }
          }
        } finally {
          graph.getModel().endUpdate();
        }
      }
    },
    null,
    null,
    "Alt+Shift+C"
  );
  action = this.addAction(
    "subscript",
    mxUtils.bind(this, function () {
      if (graph.cellEditor.isContentEditing()) {
        document.execCommand("subscript", false, null);
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+,"
  );
  action = this.addAction(
    "superscript",
    mxUtils.bind(this, function () {
      if (graph.cellEditor.isContentEditing()) {
        document.execCommand("superscript", false, null);
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+."
  );
  action = this.addAction(
    "indent",
    mxUtils.bind(this, function () {
      // NOTE: Alt+Tab for outdent implemented via special code in
      // keyHandler.getFunction in EditorUi.js. Ctrl+Tab is reserved.
      if (graph.cellEditor.isContentEditing()) {
        document.execCommand("indent", false, null);
      }
    }),
    null,
    null,
    "Shift+Tab"
  );
  this.addAction("image...", function () {
    if (graph.isEnabled() && !graph.isCellLocked(graph.getDefaultParent())) {
      var title =
        mxResources.get("image") + " (" + mxResources.get("url") + "):";
      var state = graph.getView().getState(graph.getSelectionCell());
      var value = "";

      if (state != null) {
        value = state.style[mxConstants.STYLE_IMAGE] || value;
      }

      var selectionState = graph.cellEditor.saveSelection();

      ui.showImageDialog(
        title,
        value,
        function (newValue, w, h) {
          // Inserts image into HTML text
          if (graph.cellEditor.isContentEditing()) {
            graph.cellEditor.restoreSelection(selectionState);
            graph.insertImage(newValue, w, h);
          } else {
            var cells = graph.getSelectionCells();

            if (newValue != null && (newValue.length > 0 || cells.length > 0)) {
              var select = null;

              graph.getModel().beginUpdate();
              try {
                // Inserts new cell if no cell is selected
                if (cells.length == 0) {
                  cells = [
                    graph.insertVertex(
                      graph.getDefaultParent(),
                      null,
                      "",
                      0,
                      0,
                      w,
                      h,
                      "shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;"
                    ),
                  ];
                  var pt = graph.getCenterInsertPoint(
                    graph.getBoundingBoxFromGeometry(cells, true)
                  );
                  cells[0].geometry.x = pt.x;
                  cells[0].geometry.y = pt.y;

                  select = cells;
                  graph.fireEvent(
                    new mxEventObject("cellsInserted", "cells", select)
                  );
                }

                graph.setCellStyles(
                  mxConstants.STYLE_IMAGE,
                  newValue.length > 0 ? newValue : null,
                  cells
                );

                // Sets shape only if not already shape with image (label or image)
                var style = graph.getCurrentCellStyle(cells[0]);

                if (
                  style[mxConstants.STYLE_SHAPE] != "image" &&
                  style[mxConstants.STYLE_SHAPE] != "label"
                ) {
                  graph.setCellStyles(mxConstants.STYLE_SHAPE, "image", cells);
                } else if (newValue.length == 0) {
                  graph.setCellStyles(mxConstants.STYLE_SHAPE, null, cells);
                }

                if (graph.getSelectionCount() == 1) {
                  if (w != null && h != null) {
                    var cell = cells[0];
                    var geo = graph.getModel().getGeometry(cell);

                    if (geo != null) {
                      geo = geo.clone();
                      geo.width = w;
                      geo.height = h;
                      graph.getModel().setGeometry(cell, geo);
                    }
                  }
                }
              } finally {
                graph.getModel().endUpdate();
              }

              if (select != null) {
                graph.setSelectionCells(select);
                graph.scrollCellToVisible(select[0]);
              }
            }
          }
        },
        graph.cellEditor.isContentEditing(),
        !graph.cellEditor.isContentEditing()
      );
    }
  }).isEnabled = isGraphEnabled;
  action = this.addAction(
    "layers",
    mxUtils.bind(this, function () {
      if (this.layersWindow == null) {
        // LATER: Check outline window for initial placement
        this.layersWindow = new LayersWindow(
          ui,
          document.body.offsetWidth - 280,
          120,
          220,
          196
        );
        this.layersWindow.window.addListener("show", function () {
          ui.fireEvent(new mxEventObject("layers"));
        });
        this.layersWindow.window.addListener("hide", function () {
          ui.fireEvent(new mxEventObject("layers"));
        });
        this.layersWindow.window.setVisible(true);
        ui.fireEvent(new mxEventObject("layers"));

        this.layersWindow.init();
      } else {
        this.layersWindow.window.setVisible(
          !this.layersWindow.window.isVisible()
        );
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+Shift+L"
  );
  action.setToggleAction(true);
  action.setSelectedCallback(
    mxUtils.bind(this, function () {
      return this.layersWindow != null && this.layersWindow.window.isVisible();
    })
  );
  action = this.addAction(
    "formatPanel",
    mxUtils.bind(this, function () {
      ui.toggleFormatPanel();
    }),
    null,
    null,
    Editor.ctrlKey + "+Shift+P"
  );
  action.setToggleAction(true);
  action.setSelectedCallback(
    mxUtils.bind(this, function () {
      return ui.formatWidth > 0;
    })
  );
  action = this.addAction(
    "outline",
    mxUtils.bind(this, function () {
      if (this.outlineWindow == null) {
        // LATER: Check layers window for initial placement
        this.outlineWindow = new OutlineWindow(
          ui,
          document.body.offsetWidth - 260,
          100,
          180,
          180
        );
        this.outlineWindow.window.addListener("show", function () {
          ui.fireEvent(new mxEventObject("outline"));
        });
        this.outlineWindow.window.addListener("hide", function () {
          ui.fireEvent(new mxEventObject("outline"));
        });
        this.outlineWindow.window.setVisible(true);
        ui.fireEvent(new mxEventObject("outline"));
      } else {
        this.outlineWindow.window.setVisible(
          !this.outlineWindow.window.isVisible()
        );
      }
    }),
    null,
    null,
    Editor.ctrlKey + "+Shift+O"
  );

  action.setToggleAction(true);
  action.setSelectedCallback(
    mxUtils.bind(this, function () {
      return (
        this.outlineWindow != null && this.outlineWindow.window.isVisible()
      );
    })
  );
};

/**
 * Registers the given action under the given name.
 */
Actions.prototype.addAction = function (
  key,
  funct,
  enabled,
  iconCls,
  shortcut
) {
  var title;

  if (key.substring(key.length - 3) == "...") {
    key = key.substring(0, key.length - 3);
    title = mxResources.get(key) + "...";
  } else {
    title = mxResources.get(key);
  }

  return this.put(key, new Action(title, funct, enabled, iconCls, shortcut));
};

/**
 * Registers the given action under the given name.
 */
Actions.prototype.put = function (name, action) {
  this.actions[name] = action;

  return action;
};

/**
 * Returns the action for the given name or null if no such action exists.
 */
Actions.prototype.get = function (name) {
  return this.actions[name];
};

/**
 * Constructs a new action for the given parameters.
 */
function Action(label, funct, enabled, iconCls, shortcut) {
  mxEventSource.call(this);
  this.label = label;
  this.funct = this.createFunction(funct);
  this.enabled = enabled != null ? enabled : true;
  this.iconCls = iconCls;
  this.shortcut = shortcut;
  this.visible = true;
}

// Action inherits from mxEventSource
mxUtils.extend(Action, mxEventSource);

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.createFunction = function (funct) {
  return funct;
};

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.setEnabled = function (value) {
  if (this.enabled != value) {
    this.enabled = value;
    this.fireEvent(new mxEventObject("stateChanged"));
  }
};

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.isEnabled = function () {
  return this.enabled;
};

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.setToggleAction = function (value) {
  this.toggleAction = value;
};

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.setSelectedCallback = function (funct) {
  this.selectedCallback = funct;
};

/**
 * Sets the enabled state of the action and fires a stateChanged event.
 */
Action.prototype.isSelected = function () {
  return this.selectedCallback();
};
