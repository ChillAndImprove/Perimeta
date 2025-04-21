import tempfile
from pudb import set_trace # Your debugger import
import pytest
import time
import json
from selenium.webdriver.support.ui import Select
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from deepdiff import DeepDiff

temp_profile = tempfile.mkdtemp()

# --- Fixture Setup (No changes needed here, looks good) ---
@pytest.fixture(scope="function")
def browser_and_setup(request):
    options = Options()
    options.add_argument("--window-size=1854,1011")
    options.add_argument(f'--user-data-dir={temp_profile}')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options) # Corrected options passing

    driver.get("http://0.0.0.0:8000/indexTests.html")
    driver.set_window_size(1854, 1011)
    try:
        # Wait for the frame to be available and switch to it
        WebDriverWait(driver, 10).until(
            EC.frame_to_be_available_and_switch_to_it((By.TAG_NAME, "iframe"))
        )
        # Wait for the button inside the frame to be clickable
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "td:nth-child(1) > .geBtn"))
        ).click()
    except TimeoutException:
        pytest.fail("Timed out waiting for iframe or button within iframe.")
    finally:
        # Always switch back to default content
        driver.switch_to.default_content()

    # Focus the node you're working on
    target_label = "Customer Web Client"
    target_cell_id = driver.execute_script(f"""
        var graph = editorUi.editor.graph;
        var model = graph.model;
        var root = model.getRoot();
        var childCount = model.getChildCount(root);
        for (var i = 0; i < childCount; i++) {{
            var layer = model.getChildAt(root, i);
            var innerCount = model.getChildCount(layer);
            for (var j = 0; j < innerCount; j++) {{
                var cell = model.getChildAt(layer, j);
                if (cell != null && cell.vertex) {{
                    var label = graph.convertValueToString(cell); // Use graph helper for consistency
                    if (label === "{target_label}") {{
                        graph.setSelectionCell(cell);
                        graph.scrollCellToVisible(cell);
                        return cell.id;
                    }}
                }}
            }}
        }}
        return null;
    """)
    print("Focused node ID:", target_cell_id)
    assert target_cell_id is not None, f"Could not find node with label '{target_label}'"

    # Rename to 'foo'
    try:
        # Click the rename/edit button (adjust XPath if necessary)
        edit_button_xpath = "/html/body/div[4]/div[2]/div/div/div[1]/li[1]/button" # Check this XPath
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, edit_button_xpath))
        ).click()

        # Switch to the input box (often an active element after click)
        input_box = WebDriverWait(driver, 10).until(
            lambda d: d.switch_to.active_element
        )
        # Use ActionChains for reliable select-all and typing
        actions = ActionChains(driver)
        actions.key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL) # Select All
        actions.send_keys(Keys.DELETE) # Clear existing text reliably
        actions.send_keys("foo") # Type new text
        actions.perform()

        # Click Apply/OK button (adjust XPath if necessary)
        apply_button_xpath = "/html/body/div[10]/table/tbody/tr[3]/td/button[2]" # Check this XPath
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, apply_button_xpath))
        ).click()
        print("Node renamed to 'foo'")
    except TimeoutException:
         pytest.fail("Timed out waiting for rename elements (edit button, input box, or apply button). Check XPaths.")
    except Exception as e:
         pytest.fail(f"Error during rename operation: {e}")

    # Provide driver to test class
    request.cls.driver = driver
    yield driver # Yield the driver for the test

    # --- Teardown ---
    try:
        driver.quit()
    except Exception as e:
        print(f"[Teardown Warning] Failed to quit driver: {e}")


@pytest.fixture(autouse=True)
def post_test_hook(request):
    # Keep this fixture, but understand it runs *after* your test.
    # Its actions (focusing nodes) won't affect the validation *within* the test.
    yield  # test runs here
    driver = getattr(request.cls, "driver", None)
    if not driver:
        # If driver quit successfully in teardown, this is expected.
        # print("[post_test_hook] No driver found (likely already quit).")
        return

    # Added check if browser is still active
    try:
        _ = driver.window_handles # Check if browser is still accessible
    except Exception:
        print("[post_test_hook] Driver connection lost (likely already quit).")
        return

    try:
        # Check if editorUi is still available (page might have changed/closed)
        editor_exists = driver.execute_script("return typeof window.editorUi !== 'undefined';")
        if not editor_exists:
            print("[post_test_hook] editorUi not found, skipping JS execution.")
            return

        # 👇 Insert your JS here (This focuses nodes AFTER the test is done)
        oval_node_ids = driver.execute_script("""
            // JS code to focus oval nodes... (kept as is)
            try {
                var graph = editorUi.editor.graph; var model = graph.model; var root = model.getRoot(); var ovalCellIds = [];
                var childCount = model.getChildCount(root);
                for (var i = 0; i < childCount; i++) {
                    var layer = model.getChildAt(root, i); var innerCount = model.getChildCount(layer);
                    for (var j = 0; j < innerCount; j++) {
                        var cell = model.getChildAt(layer, j);
                        if (cell != null && cell.vertex) {
                            var style = model.getStyle(cell);
                            if (style && style.indexOf("shape=ellipse") !== -1) { ovalCellIds.push(String(cell.id)); }
                        }
                    }
                }
                // Only select if ovals found
                if (ovalCellIds.length > 0) {
                    graph.setSelectionCells(ovalCellIds.map(function(id) { return model.getCell(id); }));
                }
                return ovalCellIds;
            } catch (err) { return ["__JS_ERROR__", err.toString()]; }
        """)
        print("[post_test_hook] Oval nodes focused:", oval_node_ids)

        target_label = "foo"
        target_cell_id = driver.execute_script(f"""
            // JS code to focus 'foo' node... (kept as is)
             try {{
                var graph = editorUi.editor.graph; var model = graph.model; var root = model.getRoot();
                var childCount = model.getChildCount(root);
                for (var i = 0; i < childCount; i++) {{
                    var layer = model.getChildAt(root, i); var innerCount = model.getChildCount(layer);
                    for (var j = 0; j < innerCount; j++) {{
                        var cell = model.getChildAt(layer, j);
                        if (cell != null && cell.vertex) {{
                            var label = graph.convertValueToString(cell); // Use graph helper
                            if (label === "{target_label}") {{
                                graph.setSelectionCell(cell); graph.scrollCellToVisible(cell); return cell.id;
                            }}
                        }}
                    }}
                }} return null;
             }} catch (err) {{ return ["__JS_ERROR__", err.toString()]; }}
        """)
        print("[post_test_hook] Focused node ID:", target_cell_id)
    except Exception as e:
        # Catch errors during post-test hook execution
        print(f"[post_test_hook error] {e}")


@pytest.mark.usefixtures("browser_and_setup")
class TestTechnicalAsset():

    SELECT_RECTANGLES_SCRIPT = """
    // NOTE: This script finds *all* vertices styled as rectangles.
    // If your diagram uses rectangles for things other than trust boundaries
    // (e.g., some technical assets), this might select too many items.
    // Consider refining the style check (e.g., add 'dashed=1', specific fill/stroke colors)
    // or correlating with IDs from the Threagile model if this proves too broad.
    try {
        var editorUi = window.editorUi; if (!editorUi) throw new Error("editorUi not found.");
        var graph = editorUi.editor.graph; var model = graph.model; if (!graph || !model) throw new Error("graph/model not found.");
        var rectangleCells = []; var rectangleIds = [];
        var root = model.getRoot(); var childCount = model.getChildCount(root);

        for (var i = 0; i < childCount; i++) {
            var layer = model.getChildAt(root, i);
            // Skip check if layer is not visible, if needed
            // if (!model.isVisible(layer)) continue;
            var cellCount = model.getChildCount(layer);
            for (var j = 0; j < cellCount; j++) {
                var cell = model.getChildAt(layer, j);
                if (cell != null && cell.vertex) { // It's a vertex
                    var style = model.getStyle(cell);
                    // Basic check for rectangle shape
                    if (style && style.indexOf('shape=rectangle') !== -1) {
                        // Add more conditions here if needed, e.g.:
                        // && style.indexOf('dashed=1') !== -1
                        // && style.indexOf('fillColor=none') !== -1
                        rectangleCells.push(cell);
                        rectangleIds.push(String(cell.id));
                    }
                }
            }
        }
        if (rectangleCells.length === 0) {
             // It's okay if no trust boundaries exist, return success but indicate none found
             return { status: "Success_NoRectanglesFound", rectangleCount: 0, rectangleIds: [], selectedCount: 0 };
        }
        // Select the found rectangles
        graph.setSelectionCells(rectangleCells);
        return { status: "Success", rectangleCount: rectangleCells.length, rectangleIds: rectangleIds, selectedCount: graph.getSelectionCount() };
    } catch (err) {
        return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" };
    }
    """
    # --- Define JS Scripts as Class Constants ---

    GET_JSON_SCRIPT = """
    try {
        var editorUi = window.editorUi;
        if (!editorUi || !editorUi.editor || !editorUi.editor.graph || !editorUi.editor.graph.model) { throw new Error("Required editorUi/graph/model objects not found."); }
        var threagileModel = editorUi.editor.graph.model.threagile;
        if (!threagileModel || typeof threagileModel.toJSON !== 'function') {
             if (typeof threagileModel === 'object' && threagileModel !== null) {
                 try { return { status: "Success_DirectObject", data: JSON.parse(JSON.stringify(threagileModel)) }; } catch (stringifyErr) { throw new Error("Found 'threagile' object, but failed to stringify/parse it: " + stringifyErr); }
             } throw new Error("Could not find 'threagile.toJSON()' method or suitable 'threagile' object.");
        }
        var jsonData = threagileModel.toJSON();
        return { status: "Success_toJSON", data: jsonData };
    } catch (err) { return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" }; }
    """

    SELECT_EDGES_SCRIPT = """
    try {
        var editorUi = window.editorUi; if (!editorUi) throw new Error("Could not find editorUi object.");
        var graph = editorUi.editor.graph; var model = graph.model; if (!graph || !model) throw new Error("Could not find graph or model object.");
        var edgeCells = []; var edgeIds = []; var root = model.getRoot(); var childCount = model.getChildCount(root);
        for (var i = 0; i < childCount; i++) {
            var layer = model.getChildAt(root, i); var cellCount = model.getChildCount(layer);
            for (var j = 0; j < cellCount; j++) {
                var cell = model.getChildAt(layer, j);
                if (cell != null && model.isEdge(cell)) {
                     edgeCells.push(cell);
                     edgeIds.push(String(cell.id)); // Collect IDs
                }
            }
        }
        if (edgeCells.length === 0) { return { status: "No edges found", edgeIds: [] }; }
        graph.setSelectionCells(edgeCells); // Select the found edges
        return { status: "Success", edgeCount: edgeCells.length, edgeIds: edgeIds, selectedCount: graph.getSelectionCount() };
    } catch (err) { return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" }; }
    """

    DELETE_SELECTION_SCRIPT = """
    try {
        var editorUi = window.editorUi; if (!editorUi) throw new Error("Could not find editorUi object.");
        var graph = editorUi.editor.graph; if (!graph) throw new Error("Could not find graph object.");
        var selectionCount = graph.getSelectionCount(); if (selectionCount === 0) { return { status: "Warning", message: "No cells were selected for deletion." }; }
        var deleteAction = editorUi.actions.get('delete'); if (!deleteAction || typeof deleteAction.funct !== 'function') { throw new Error("Could not find or execute the 'delete' action."); }
        deleteAction.funct();
        return { status: "Success", message: `Delete action triggered for ${selectionCount} selected cell(s).` };
    } catch (err) { return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" }; }
    """

    UNDO_SCRIPT = """
    try {
        var editorUi = window.editorUi; if (!editorUi) throw new Error("Could not find editorUi object.");
        var undoManager = editorUi.editor.undoManager; if (!undoManager) throw new Error("Could not find undoManager object.");
        if (undoManager.indexOfNextAdd === 0) { return { status: "Warning", message: "Nothing in the undo history." }; }
        undoManager.undo();
        return { status: "Success", message: "Undo operation performed." };
    } catch (err) { return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" }; }
    """
    SELECT_CIRCLES_SCRIPT = """
    // NOTE: This script finds *all* vertices styled as ellipses/circles.
    // It assumes these directly correspond to technical assets in the model.
    // If this assumption is incorrect (e.g., some assets aren't circles,
    // or some circles aren't assets), the validation comparing counts might fail,
    // or the wrong items might be deleted. Refine the selector if needed.
    try {
        var editorUi = window.editorUi; if (!editorUi) throw new Error("editorUi not found.");
        var graph = editorUi.editor.graph; var model = graph.model; if (!graph || !model) throw new Error("graph/model not found.");
        var circleCells = []; var circleIds = [];
        var root = model.getRoot(); var childCount = model.getChildCount(root);

        for (var i = 0; i < childCount; i++) {
            var layer = model.getChildAt(root, i);
            var cellCount = model.getChildCount(layer);
            for (var j = 0; j < cellCount; j++) {
                var cell = model.getChildAt(layer, j);
                if (cell != null && cell.vertex) { // It's a vertex
                    var style = model.getStyle(cell);
                    // Basic check for ellipse/circle shape
                    if (style && style.indexOf('shape=ellipse') !== -1) {
                        circleCells.push(cell);
                        circleIds.push(String(cell.id));
                    }
                }
            }
        }
        if (circleCells.length === 0) {
             // It's okay if no circles exist
             return { status: "Success_NoCirclesFound", circleCount: 0, circleIds: [], selectedCount: 0 };
        }
        // Select the found circles
        graph.setSelectionCells(circleCells);
        return { status: "Success", circleCount: circleCells.length, circleIds: circleIds, selectedCount: graph.getSelectionCount() };
    } catch (err) {
        return { status: "JS_ERROR", message: err.toString(), stack: err.stack || "No stack trace available" };
    }
    """
    def test_delete_technical_assets_and_undo(self):
        """
        Tests deleting circle shapes (assumed Technical Assets) and verifies
        the removal and restoration of corresponding entries in the 'technical_assets'
        section of the Threagile model.
        """
        #set_trace()

        # Step 1: Get Initial Threagile State (focus on technical_assets)
        print("\n[TA Test - Step 1] Getting initial Threagile model state...")
        initial_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        initial_state_result = self.check_js_result(initial_state_result, "TA - Get Initial State")
        initial_threagile_model = initial_state_result.get("data")
        assert initial_threagile_model is not None, "TA - Failed to retrieve initial Threagile model data"
        assert isinstance(initial_threagile_model, dict), "TA - Initial Threagile model is not a dictionary"

        # Store the initial technical_assets section and their IDs (keys)
        initial_tech_assets = initial_threagile_model.get('technical_assets', {})
        if not isinstance(initial_tech_assets, dict):
             print(f"WARNING: Initial 'technical_assets' is not a dictionary: {initial_tech_assets}. Treating as empty.")
             initial_tech_assets = {}
        initial_asset_ids = set(initial_tech_assets.keys()) # Get the set of asset IDs (keys)
        print(f"Initial model has {len(initial_asset_ids)} technical assets.")

        # Step 2: Find and Select Circles (assumed Technical Assets)
        print("\n[TA Test - Step 2] Finding and selecting graph circles...")
        select_result = self.driver.execute_script(self.SELECT_CIRCLES_SCRIPT)
        select_result = self.check_js_result(select_result, "TA - Select Circles")

        circle_count = select_result.get("circleCount", 0)
        selected_count = select_result.get("selectedCount", 0)
        circle_ids = select_result.get("circleIds", []) # Visual IDs from mxGraph

        if circle_count == 0:
            print("No circle shapes found in the graph to delete.")
            if not initial_asset_ids:
                 pytest.skip("No circle shapes found and no technical assets in initial model.")
            else:
                 print("WARNING: No circle shapes found, but initial model has technical assets. Proceeding to check model remains unchanged.")
        else:
            print(f"Found and selected {circle_count} graph circles (Visual IDs: {circle_ids}).")
            assert selected_count == circle_count, "TA - JS Selection count mismatch for circles"
            time.sleep(0.2) # Pause after selection

        # Step 3: Delete Selected Circles (if any were selected)
        if selected_count > 0:
            print("\n[TA Test - Step 3] Deleting selected graph circles...")
            delete_result = self.driver.execute_script(self.DELETE_SELECTION_SCRIPT)
            delete_result = self.check_js_result(delete_result, "TA - Delete Circles")
            time.sleep(0.5) # Allow time for model update after delete
        else:
             print("\n[TA Test - Step 3] Skipping deletion as no circles were selected.")

        # Step 4: Get State After Deletion and Validate Technical Assets
        print("\n[TA Test - Step 4] Verifying Threagile model state after deletion...")
        deleted_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        deleted_state_result = self.check_js_result(deleted_state_result, "TA - Get State After Delete")
        deleted_threagile_model = deleted_state_result.get("data")
        assert deleted_threagile_model is not None, "TA - Failed to retrieve Threagile model data after deletion"

        # Get the technical_assets section after deletion
        deleted_tech_assets = deleted_threagile_model.get('technical_assets', {})
        if not isinstance(deleted_tech_assets, dict):
             print(f"WARNING: Deleted 'technical_assets' is not a dictionary: {deleted_tech_assets}. Treating as empty.")
             deleted_tech_assets = {}
        deleted_asset_ids = set(deleted_tech_assets.keys()) # Get the set of remaining asset IDs

        # Validation 4a: Check if the correct assets were removed
        if circle_count > 0: # Only expect changes if circles were deleted
            print(f"Initial asset IDs ({len(initial_asset_ids)}): {initial_asset_ids}")
            print(f"Remaining asset IDs ({len(deleted_asset_ids)}): {deleted_asset_ids}")

            # Check that remaining IDs are a subset of the original IDs
            assert deleted_asset_ids.issubset(initial_asset_ids), \
                f"Remaining asset IDs {deleted_asset_ids} are not a subset of initial IDs {initial_asset_ids}"

            # Check that *some* assets were removed
            assert deleted_asset_ids != initial_asset_ids, \
                "Assets were expected to be removed (circles deleted), but the set of asset IDs remained the same."

            # Check if the *number* of removed assets matches the number of circles deleted
            # *** This relies on the assumption that 1 circle = 1 technical asset ***
            removed_count = len(initial_asset_ids) - len(deleted_asset_ids)
            assert removed_count == circle_count, \
                f"Expected {circle_count} assets to be removed (based on deleted circles), but {removed_count} were removed."

            print(f"Validation successful: {removed_count} technical assets removed, matching the {circle_count} circles deleted.")
        else: # If no circles were deleted, the assets should be unchanged
             assert deleted_asset_ids == initial_asset_ids, \
                 f"No circles were deleted, but technical asset IDs changed. Initial: {initial_asset_ids}, After Delete: {deleted_asset_ids}"
             print("Validation successful: Technical assets remained unchanged as expected (no circles deleted).")

        # Validation 4b: Optional check if other parts of the model were unchanged
        diff_other_parts = DeepDiff(
            initial_threagile_model,
            deleted_threagile_model,
            ignore_order=True,
            exclude_paths=["root['technical_assets']"] # Exclude the entire tech assets dict
        )
        if diff_other_parts:
             print("WARNING: Other parts of the Threagile model changed unexpectedly after TA deletion!")
             print(diff_other_parts)
             # Decide if this should fail the test
             # pytest.fail("Unexpected changes in Threagile model besides technical_assets after deletion.")
        else:
            print("Other parts of the Threagile model appear consistent after deletion.")

        # Step 5: Undo Last Action (if deletion occurred)
        if selected_count > 0:
            print("\n[TA Test - Step 5] Undoing circle deletion...")
            undo_result = self.driver.execute_script(self.UNDO_SCRIPT)
            undo_result = self.check_js_result(undo_result, "TA - Undo")
            time.sleep(0.5) # Allow time for model update
        else:
             print("\n[TA Test - Step 5] Skipping undo as no deletion was performed.")

        # Step 6: Get Final State and Validate Full Restoration
        print("\n[TA Test - Step 6] Verifying Threagile model state after undo...")
        final_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        final_state_result = self.check_js_result(final_state_result, "TA - Get Final State")
        final_threagile_model = final_state_result.get("data")
        assert final_threagile_model is not None, "TA - Failed to retrieve final Threagile model after undo"

        # Validation 6: Compare Final model with Initial model using DeepDiff
        print("Comparing final Threagile model with the initial model...")
        diff_after_undo = DeepDiff(initial_threagile_model, final_threagile_model, ignore_order=True)

        if diff_after_undo:
            print("ERROR: Threagile model differs from initial state after undo!")
            print(diff_after_undo)
            # Save files for debugging
            try:
                with open("initial_model_ta_failed.json", "w") as f: json.dump(initial_threagile_model, f, indent=2)
                with open("final_model_ta_failed.json", "w") as f: json.dump(final_threagile_model, f, indent=2)
                print("Saved initial_model_ta_failed.json and final_model_ta_failed.json for comparison.")
            except Exception as save_err:
                print(f"Could not save debug JSON files: {save_err}")
            pytest.fail("TA - Threagile model state was not correctly restored after undo.")
        else:
            print("Success: Final Threagile model is identical to the initial state.")

        print("\n[TA Test] Verification of Technical Asset delete and restore complete.")

    # --- Helper Method (already exists in your class) ---
    def check_js_result(self, result, step_name):
        """Helper to check for JS errors returned from execute_script."""
        if isinstance(result, dict) and result.get("status") == "JS_ERROR":
            print(f"--- JavaScript Error during {step_name} ---")
            print(f"Message: {result.get('message')}")
            print(f"Stack: {result.get('stack')}")
            print("------------------------------------------")
            pytest.fail(f"JavaScript error occurred during {step_name}")
        if result is None:
             pytest.fail(f"JavaScript execution returned None during {step_name}")
        # Print non-error results for debugging (shorten data part)
        print_result = result
        if isinstance(result, dict) and 'data' in result:
            print_result = result.copy() # Avoid modifying original
            data_repr = json.dumps(print_result['data']) # Use json.dumps for better repr
            if len(data_repr) > 300: # Truncate long data in printout
                 print_result['data'] = data_repr[:300] + "... (truncated)"
            else:
                 print_result['data'] = data_repr # Show full if short enough
        print(f"[{step_name}] JS Result: {print_result}")
        return result

    # --- Test Method ---
    def test_delete_edges_and_undo_threagile(self):

        # Step 1: Get Initial Threagile State
        print("\n[Step 1] Getting initial Threagile model state...")
        initial_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        initial_state_result = self.check_js_result(initial_state_result, "Get Initial State")
        initial_threagile_model = initial_state_result.get("data")
        assert initial_threagile_model is not None, "Failed to retrieve initial Threagile model"
        print(f"Successfully retrieved initial Threagile model.")
        initial_tech_assets = initial_threagile_model.get('technical_assets', {})
        # Count initial links for later verification
        # Count initial links accurately, handling None values
        initial_link_count = 0
        print("Counting initial communication links:") # Added print for debugging
        for asset_name, asset_data in initial_tech_assets.items():
            # Robustness check: ensure asset_data is a dict
            if isinstance(asset_data, dict):
                # Get the value for 'communication_links'. This might be a dict, None, or missing.
                comm_links = asset_data.get('communication_links')

                # *** THE KEY FIX: Check if comm_links is a dictionary BEFORE calling len() ***
                if isinstance(comm_links, dict):
                    num_links = len(comm_links)
                    if num_links > 0: # Optional: Only print if links exist
                         print(f"  - Asset '{asset_name}': Found {num_links} links.")
                    initial_link_count += num_links
                # else: # Optional: Print assets with no/null links
                #     print(f"  - Asset '{asset_name}': No 'communication_links' dictionary found (value was: {comm_links}).")
            else:
                 # Warn if an asset's data isn't structured as expected
                 print(f"  WARNING: Asset '{asset_name}' data is not a dictionary: {asset_data}")
        # ---^^^ END OF CORRECTED COUNTING LOGIC ^^^---

        print(f"Finished counting. Initial model has {len(initial_tech_assets)} technical assets and {initial_link_count} total communication links.")
        print(f"Initial model has {len(initial_tech_assets)} technical assets and {initial_link_count} total communication links.")

        # Step 2: Find and Select Edges
        print("\n[Step 2] Finding and selecting graph edges...")
        select_result = self.driver.execute_script(self.SELECT_EDGES_SCRIPT)
        select_result = self.check_js_result(select_result, "Select Edges")

        edge_count = select_result.get("edgeCount", 0)
        original_edge_ids = select_result.get("edgeIds", []) # Keep track if needed

        # Ensure edges exist to proceed with delete/undo testing
        if edge_count == 0:
            if initial_link_count == 0:
                 pytest.skip("No edges found in graph and no communication links in initial model. Cannot test delete/undo.")
            else:
                 pytest.fail(f"No edges found in graph, but initial model has {initial_link_count} communication links. Model/Graph mismatch?")
        else:
             print(f"Found and selected {edge_count} graph edges.")
             # Optional: Check if graph edge count matches initial link count if expected
             # assert edge_count == initial_link_count, f"Graph edge count ({edge_count}) doesn't match initial Threagile link count ({initial_link_count})."

        assert select_result.get("selectedCount") == edge_count, "JS Selection count mismatch"

        time.sleep(0.2) # Small pause after selection

        # Step 3: Delete Selected Edges
        print("\n[Step 3] Deleting selected graph edges...")
        delete_result = self.driver.execute_script(self.DELETE_SELECTION_SCRIPT)
        delete_result = self.check_js_result(delete_result, "Delete Edges")
        time.sleep(0.5) # Allow time for model update after delete

        # Step 4: Get State After Deletion and Validate
        print("\n[Step 4] Verifying Threagile model state after edge deletion...")
        deleted_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        deleted_state_result = self.check_js_result(deleted_state_result, "Get State After Delete")
        deleted_threagile_model = deleted_state_result.get("data")
        assert deleted_threagile_model is not None, "Failed to retrieve Threagile model after deletion"

        # Validation 4a: Check Communication Links are Gone
        deleted_tech_assets = deleted_threagile_model.get('technical_assets', {})
        assert set(initial_tech_assets.keys()) == set(deleted_tech_assets.keys()), \
            f"Set of technical assets changed after deletion. Initial: {set(initial_tech_assets.keys())}, After Delete: {set(deleted_tech_assets.keys())}"

        links_found_after_delete = False
        print("Checking communication links within technical assets after deletion:")
        for asset_id, asset_data in deleted_tech_assets.items():
            comm_links = asset_data.get('communication_links') # Get links or None
            # Check if comm_links exists and is not empty
            if comm_links and isinstance(comm_links, dict) and len(comm_links) > 0:
                print(f"  ERROR: Asset '{asset_id}' still has communication_links after deletion: {comm_links}")
                links_found_after_delete = True

        assert not links_found_after_delete, "Found non-empty communication_links in Threagile model after edge deletion."
        print("Validation successful: All communication links appear removed from technical assets.")

        # Validation 4b: Optional consistency check using DeepDiff (excluding links)
        diff_after_delete = DeepDiff(
            initial_threagile_model,
            deleted_threagile_model,
            ignore_order=True, # Usually safe for JSON comparisons
            exclude_paths=["root['technical_assets'][*]['communication_links']"] # Exclude the part expected to change
        )
        if diff_after_delete:
            print("WARNING: Other parts of the Threagile model changed unexpectedly after edge deletion!")
            print(diff_after_delete)
            # Decide if this should fail the test:
            # pytest.fail("Unexpected changes in Threagile model besides communication links after deletion.")
        else:
             print("Other parts of the Threagile model appear consistent after deletion.")

        # --- Custom Python Logic Placeholder ---
        print("\n[Step 4b] Running custom Python logic before undo (if any)...")
        # --- End of Custom Logic ---

        # Step 5: Undo Last Action
        print("\n[Step 5] Undoing edge deletion...")
        undo_result = self.driver.execute_script(self.UNDO_SCRIPT)
        undo_result = self.check_js_result(undo_result, "Undo")
        time.sleep(0.5) # Allow time for model update after undo

        # Step 6: Get Final State and Validate Restoration
        print("\n[Step 6] Verifying Threagile model state after undo...")
        final_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        final_state_result = self.check_js_result(final_state_result, "Get Final State")
        final_threagile_model = final_state_result.get("data")
        assert final_threagile_model is not None, "Failed to retrieve final Threagile model after undo"
        print(f"Successfully retrieved final Threagile model after undo.")

        # Validation 6: Compare Final model with Initial model
        print("Comparing final Threagile model with the initial model...")
        diff_after_undo = DeepDiff(initial_threagile_model, final_threagile_model, ignore_order=True)

        if diff_after_undo:
            print("ERROR: Threagile model differs from initial state after undo!")
            print(diff_after_undo)
            # Optionally save models to files for easier debugging
            try:
                with open("initial_model_failed.json", "w") as f: json.dump(initial_threagile_model, f, indent=2)
                with open("final_model_failed.json", "w") as f: json.dump(final_threagile_model, f, indent=2)
                print("Saved initial_model_failed.json and final_model_failed.json for comparison.")
            except Exception as save_err:
                print(f"Could not save debug JSON files: {save_err}")
            pytest.fail("Threagile model state was not correctly restored after undo.")
        else:
            print("Success: Final Threagile model is identical to the initial state.")

        print("\n[Test] Verification of Threagile model delete and restore complete.")
    def test_delete_trust_boundaries_and_undo(self):
        """
        Tests deleting rectangle shapes (assumed Trust Boundaries) and verifies
        the impact and restoration on the 'trust_boundaries' section of the Threagile model.
        """
        #set_trace()

        # Step 1: Get Initial Threagile State (focus on trust_boundaries)
        print("\n[TB Test - Step 1] Getting initial Threagile model state...")
        initial_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        initial_state_result = self.check_js_result(initial_state_result, "TB - Get Initial State")
        initial_threagile_model = initial_state_result.get("data")
        assert initial_threagile_model is not None, "TB - Failed to retrieve initial Threagile model data"
        assert isinstance(initial_threagile_model, dict), "TB - Initial Threagile model is not a dictionary"

        # Store the initial trust_boundaries section specifically
        initial_trust_boundaries = initial_threagile_model.get('trust_boundaries', {}) # Use {} if key missing
        if not isinstance(initial_trust_boundaries, dict):
            print(f"WARNING: Initial 'trust_boundaries' is not a dictionary: {initial_trust_boundaries}. Treating as empty.")
            initial_trust_boundaries = {} # Treat non-dict as empty for comparison

        print(f"Initial model has {len(initial_trust_boundaries)} trust boundaries defined.")

        # Step 2: Find and Select Rectangles (assumed Trust Boundaries)
        print("\n[TB Test - Step 2] Finding and selecting graph rectangles...")
        select_result = self.driver.execute_script(self.SELECT_RECTANGLES_SCRIPT)
        select_result = self.check_js_result(select_result, "TB - Select Rectangles")

        rectangle_count = select_result.get("rectangleCount", 0)
        selected_count = select_result.get("selectedCount", 0)
        rectangle_ids = select_result.get("rectangleIds", [])

        # It's okay if no rectangles are found, the model should remain unchanged.
        if rectangle_count == 0:
            print("No rectangle shapes found in the graph to delete.")
            # Optionally skip rest of test if no boundaries exist and none were expected
            if not initial_trust_boundaries:
                 pytest.skip("No rectangle shapes found and no trust boundaries in initial model.")
            else:
                 # This might indicate a mismatch or styling issue
                 print("WARNING: No rectangle shapes found, but initial model has trust boundaries.")
        else:
            print(f"Found and selected {rectangle_count} graph rectangles (IDs: {rectangle_ids}).")
            assert selected_count == rectangle_count, "JS Selection count mismatch for rectangles"
            time.sleep(0.2) # Small pause after selection

        # Step 3: Delete Selected Rectangles (if any were selected)
        if selected_count > 0:
            print("\n[TB Test - Step 3] Deleting selected graph rectangles...")
            delete_result = self.driver.execute_script(self.DELETE_SELECTION_SCRIPT)
            delete_result = self.check_js_result(delete_result, "TB - Delete Rectangles")
            time.sleep(0.5) # Allow time for model update after delete
        else:
             print("\n[TB Test - Step 3] Skipping deletion as no rectangles were selected.")

        # Step 4: Get State After Deletion and Validate Trust Boundaries
        print("\n[TB Test - Step 4] Verifying Threagile model state after deletion...")
        deleted_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        deleted_state_result = self.check_js_result(deleted_state_result, "TB - Get State After Delete")
        deleted_threagile_model = deleted_state_result.get("data")
        assert deleted_threagile_model is not None, "TB - Failed to retrieve Threagile model data after deletion"

        # Get the trust_boundaries section after deletion
        deleted_trust_boundaries = deleted_threagile_model.get('trust_boundaries') # Get value (dict, null, missing)

        # Validation 4: Check 'trust_boundaries' is empty or gone
        # It should be missing, null, or an empty dictionary {}
        if rectangle_count > 0: # Only expect change if we actually deleted something
            assert not deleted_trust_boundaries or len(deleted_trust_boundaries) == 0, \
                f"Expected 'trust_boundaries' to be missing, null, or empty after deleting rectangles, but found: {deleted_trust_boundaries}"
            print("Validation successful: 'trust_boundaries' section is absent or empty as expected.")
        else: # If nothing was deleted, it should be unchanged
            # Use DeepDiff for robust comparison in case of empty dict vs missing key etc.
            diff_no_delete = DeepDiff(initial_trust_boundaries, deleted_trust_boundaries or {}, ignore_order=True)
            assert not diff_no_delete, \
                 f"No rectangles were deleted, but 'trust_boundaries' section changed unexpectedly. Diff: {diff_no_delete}"
            print("Validation successful: 'trust_boundaries' section remained unchanged as expected (no rectangles deleted).")

        # Optional: Could add a DeepDiff check here like in the other test to ensure *only* trust_boundaries changed (if deletion occurred)

        # Step 5: Undo Last Action (if deletion occurred)
        if selected_count > 0:
            print("\n[TB Test - Step 5] Undoing rectangle deletion...")
            undo_result = self.driver.execute_script(self.UNDO_SCRIPT)
            undo_result = self.check_js_result(undo_result, "TB - Undo")
            time.sleep(0.5) # Allow time for model update after undo
        else:
             print("\n[TB Test - Step 5] Skipping undo as no deletion was performed.")

        # Step 6: Get Final State and Validate Restoration
        print("\n[TB Test - Step 6] Verifying Threagile model state after undo...")
        final_state_result = self.driver.execute_script(self.GET_JSON_SCRIPT)
        final_state_result = self.check_js_result(final_state_result, "TB - Get Final State")
        final_threagile_model = final_state_result.get("data")
        assert final_threagile_model is not None, "TB - Failed to retrieve final Threagile model after undo"

        # Get the final trust_boundaries section
        final_trust_boundaries = final_threagile_model.get('trust_boundaries', {}) # Default to {} if missing
        if not isinstance(final_trust_boundaries, dict):
            print(f"WARNING: Final 'trust_boundaries' is not a dictionary: {final_trust_boundaries}. Treating as empty.")
            final_trust_boundaries = {}

        # Validation 6: Compare Final trust_boundaries with Initial trust_boundaries
        print("Comparing final 'trust_boundaries' section with the initial state...")
        diff_after_undo = DeepDiff(initial_trust_boundaries, final_trust_boundaries, ignore_order=True)

        if diff_after_undo:
            print("ERROR: 'trust_boundaries' section differs from initial state after undo!")
            print(f"Initial: {initial_trust_boundaries}")
            print(f"Final:   {final_trust_boundaries}")
            print(f"Diff:    {diff_after_undo}")
            # Optionally save models/sections to files for easier debugging
            try:
                with open("initial_tb_failed.json", "w") as f: json.dump(initial_trust_boundaries, f, indent=2)
                with open("final_tb_failed.json", "w") as f: json.dump(final_trust_boundaries, f, indent=2)
                print("Saved initial_tb_failed.json and final_tb_failed.json for comparison.")
            except Exception as save_err:
                print(f"Could not save debug JSON files: {save_err}")
            pytest.fail("'trust_boundaries' section was not correctly restored after undo.")
        else:
            print("Success: Final 'trust_boundaries' section is identical to the initial state.")

        print("\n[TB Test] Verification of Trust Boundary delete and restore complete.")
