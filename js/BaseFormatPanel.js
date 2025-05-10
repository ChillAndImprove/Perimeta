/**
 * Base class for format panels.
 */
export const BaseFormatPanel = function (format, editorUi, container) {
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

