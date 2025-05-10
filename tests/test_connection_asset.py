from pudb import set_trace;
import tempfile
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
from selenium.webdriver.support import expected_conditions as EC  # Added alias
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

temp_profile = tempfile.mkdtemp()

@pytest.fixture(scope="class")
def browser_and_setup(request):
    # ✅ Setup browser once
    options = Options()
    options.add_argument("--window-size=1854,1011")
    options.add_argument(f'--user-data-dir={temp_profile}')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options)

    # ✅ Navigate and click on asset once
    driver.get("http://0.0.0.0:8000/indexTests.html")
    driver.set_window_size(1854, 1011)
    driver.switch_to.frame(0)
    driver.find_element(By.ID, "customer_portal_erp_threat_model").click()
    driver.switch_to.default_content()

    time.sleep(2)
    # ✅ Focus the node you're working on
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
                    var label = cell.value;
                    if (typeof label !== "string" && label && label.hasAttribute) {{
                        label = label.getAttribute("label") || label.getAttribute("value");
                    }}
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

    # ✅ Provide driver to test class
    request.cls.driver = driver
    # ✅ Rename to 'foo'
    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "/html/body/div[4]/div[2]/div/div/div[1]/li[1]/button"))
    ).click()
    input_box = driver.switch_to.active_element
    input_box.send_keys(Keys.CONTROL, 'a')
    input_box.send_keys("foo")
    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "/html/body/div[10]/table/tbody/tr[3]/td/button[2]"))
    ).click()
    edge_id = driver.execute_script(f"""
        var graph = editorUi.editor.graph;
        var model = graph.model;
        var sourceCell = model.getCell("{target_cell_id}");
        var edges = model.getEdges(sourceCell);

        if (edges != null && edges.length > 0) {{
            var edge = edges[0]; // Assuming just one outgoing edge
            graph.setSelectionCell(edge);
            graph.scrollCellToVisible(edge);
            return edge.id;
        }}
        return null;
    """)
    print("Focused edge ID:", edge_id)

    # 👇 Make the driver available to tests
    request.cls.driver = driver
    yield driver
    try:
        driver.quit()
    except Exception as e:
        print(f"[Teardown Warning] {e}")

@pytest.fixture(autouse=True)
def post_test_hook(request):
    yield  # test runs here
    driver = getattr(request.cls, "driver", None)
    if not driver:
        print("[post_test_hook] No driver found")
        return

    try:
        # 👇 Insert your JS here
        oval_node_ids = driver.execute_script("""
            try {
                var graph = editorUi.editor.graph;
                var model = graph.model;
                var root = model.getRoot();
                var ovalCellIds = [];

                var childCount = model.getChildCount(root);
                for (var i = 0; i < childCount; i++) {
                    var layer = model.getChildAt(root, i);
                    var innerCount = model.getChildCount(layer);
                    for (var j = 0; j < innerCount; j++) {
                        var cell = model.getChildAt(layer, j);
                        if (cell != null && cell.vertex) {
                            var style = model.getStyle(cell);
                            if (style && style.indexOf("shape=ellipse") !== -1) {
                                ovalCellIds.push(String(cell.id));
                            }
                        }
                    }
                }

                graph.setSelectionCells(ovalCellIds.map(function(id) {
                    return model.getCell(id);
                }));

                return ovalCellIds;
            } catch (err) {
                return ["__JS_ERROR__", err.toString()];
            }
        """)
        print("Oval nodes focused:", oval_node_ids)

        target_label = "foo"
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
                        var label = cell.value;
                        if (typeof label !== "string" && label && label.hasAttribute) {{
                            label = label.getAttribute("label") || label.getAttribute("value");
                        }}
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
        # 🔍 Find and focus the one edge that comes from the node
        edge_id = driver.execute_script(f"""
            var graph = editorUi.editor.graph;
            var model = graph.model;
            var sourceCell = model.getCell("{target_cell_id}");
            var edges = model.getEdges(sourceCell);

            if (edges != null && edges.length > 0) {{
                var edge = edges[0]; // Assuming just one outgoing edge
                graph.setSelectionCell(edge);
                graph.scrollCellToVisible(edge);
                return edge.id;
            }}
            return null;
        """)
        print("Focused edge ID:", edge_id)

    except Exception as e:
        print(f"[post_test_hook error] {e}")

   
@pytest.mark.usefixtures("browser_and_setup")
class TestEdges():
  

    def select_tagify_item_and_assert(
        self,
        tagify_input_xpath,
        tag_text_to_select, # Text of the tag you intend to select (for clarity/logging)
        expected_model_id,  # The actual ID expected in the model's list
        arrow_up_count=2,   # How many times to press ARROW_UP
        root_key="technical_assets",
        asset_key="foo",     # You might need to make this dynamic based on the selected cell
        nested_path_prefix=None,
        dropdown_container_selector="div.tagify__dropdown" # CSS selector for the dropdown container
    ):
        """
        Clicks a Tagify input, uses keyboard navigation (ARROW_UP * count, ENTER)
        to select an item, and asserts that the expected ID exists in the specified nested path
        in the Threagile model data.

        :param tagify_input_xpath: XPath to the Tagify input element.
        :param tag_text_to_select: The text display of the tag you are trying to select via keys. Used for logging/clarity.
        :param expected_model_id: The ID (string) that should exist in the model's nested list after selection.
        :param arrow_up_count: The number of times to press Keys.ARROW_UP before Keys.ENTER.
        :param root_key: Top-level JSON key (e.g., 'technical_assets').
        :param asset_key: Sub-key under the root (e.g., the specific technical asset's key).
        :param nested_path_prefix: List of keys leading to the list where the ID should be added (e.g., ['data_assets_processed']).
        :param dropdown_container_selector: CSS selector to wait for the Tagify dropdown container visibility.
        """
        def get_nested_value(data, root, asset, path):
            """Safely retrieves a nested value from the dictionary."""
            if not isinstance(path, (list, tuple)):
                raise TypeError("nested_path_prefix must be a list or tuple of keys")
            try:
                value = data[root][asset]
                for key in path:
                    # Handle cases where intermediate keys might not exist yet
                    if value is None or key not in value:
                         # If the path doesn't fully exist, treat it as an empty list for length comparison
                         # Or return None if the structure is unexpected before the list
                        return [] if key == path[-1] else None # Assume last key accesses the list
                    value = value[key]
                return value
            except (KeyError, TypeError):
                 # If the root or asset key doesn't exist, or path fails midway
                return [] # Treat as empty list if path is supposed to lead to the list


        assert isinstance(nested_path_prefix, list), "nested_path_prefix must be a list"
        print(f"--- Test: Selecting tag '{tag_text_to_select}' via keyboard and checking model path: {root_key}.{asset_key}.{'.'.join(nested_path_prefix)} ---")

        # --- Step 1: Get initial model state ---
        threagile_data_before = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        # Use the helper function to safely get the value or an empty list
        old_nested_list = get_nested_value(threagile_data_before, root_key, asset_key, nested_path_prefix)
        # Ensure we are dealing with a list for length check, default to 0 if None/not list
        old_len = len(old_nested_list) if isinstance(old_nested_list, list) else 0
        print(f"Initial list length at path: {old_len}")
        print(f"Initial list content: {old_nested_list}")


        # --- Step 2: Interact with the Tagify Input ---
        tagify_input = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, tagify_input_xpath))
        )
        # Click to ensure focus and potentially trigger dropdown
        tagify_input.click()
        print("Clicked Tagify input.")
        # Optional: Send a space or initial character to reliably open dropdown if needed
        # tagify_input.send_keys(" ")
        # time.sleep(0.2) # Small pause if needed after sending keys

        # --- Step 3: Wait for dropdown and use keyboard navigation ---
        try:
            # Wait for the dropdown container to become VISIBLE
            WebDriverWait(self.driver, 5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, dropdown_container_selector))
            )
            print("Tagify dropdown detected.")

            # Send ARROW_UP keys
            for _ in range(arrow_up_count):
                tagify_input.send_keys(Keys.ARROW_UP)
                print("Sent ARROW_UP")
                time.sleep(0.1) # Small delay between key presses might help

            # Send ENTER to select
            tagify_input.send_keys(Keys.ENTER)
            print(f"Sent ENTER after {arrow_up_count} ARROW_UP presses.")

        except TimeoutException:
            print("Warning: Tagify dropdown did not appear or close as expected within the timeout.")
            # Decide how to handle: fail the test, log a warning, try alternative?
            # For now, we'll proceed and let the assertion fail if the model wasn't updated.
            # raise TimeoutException(f"Tagify dropdown interaction failed for input: {tagify_input_xpath}")


        # --- Step 4: Fetch updated model data ---
        # Add a small explicit wait/delay IF NECESSARY after dropdown closes, before fetching data,
        # to allow any async model updates triggered by Tagify's events to complete. Usually not needed if waits were sufficient.
        time.sleep(0.5) # Adjust or remove if waits for invisibility are enough

        threagile_data_after = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")

        # --- Step 5: Assertions ---
        # Get the potentially updated list
        new_nested_list = get_nested_value(threagile_data_after, root_key, asset_key, nested_path_prefix)
        # Ensure we are dealing with a list for length check, default to 0 if None/not list
        new_len = len(new_nested_list) if isinstance(new_nested_list, list) else 0
        print(f"Final list length at path: {new_len}")
        print(f"Final list content: {new_nested_list}")


        # Assert length increased
        if new_len <= old_len:
             # Provide more context in the error message
            error_msg = (
                f"Assertion Failed: Expected list length at path '{root_key} -> {asset_key} -> {'.'.join(nested_path_prefix)}' "
                f"to increase after selecting '{tag_text_to_select}', but it did not. "
                f"Before: {old_len} (Content: {old_nested_list}), After: {new_len} (Content: {new_nested_list})"
            )
            print(error_msg) # Print before raising for better logging
            raise AssertionError(error_msg)
        else:
             print(f"✅ Assertion Passed: List length increased from {old_len} to {new_len}.")


        # Assert the specific ID is now in the list
        if not isinstance(new_nested_list, list):
             raise AssertionError(f"Assertion Failed: Expected a list at path '{root_key} -> {asset_key} -> {'.'.join(nested_path_prefix)}' but found type {type(new_nested_list).__name__}.")

        found = False
        for item in new_nested_list:
            print(f"🔍 Checking item: {item} (Type: {type(item).__name__}) against expected ID: {expected_model_id}")
            if item == expected_model_id:
                print(f"✅ Assertion Passed: Found expected ID '{expected_model_id}' in the updated list.")
                found = True
                break

        if not found:
            error_msg = (
                f"Assertion Failed: Expected ID '{expected_model_id}' was not found in the updated list "
                f"at path '{root_key} -> {asset_key} -> {'.'.join(nested_path_prefix)}'. "
                f"List content: {new_nested_list}"
            )
            print(error_msg) # Print before raising
            raise AssertionError(error_msg)

        print(f"--- Test Passed for tag '{tag_text_to_select}' ---")

    def click_and_assert_nested_key_exists(
            self,
            click_xpath_1,
            click_xpath_2,
            data_asset_id,
            root_key="technical_assets",
            asset_key="foo",
            nested_path_prefix=None
        ):
            """
            Clicks two elements, fetches a value from the second, and asserts that a nested key exists using a known data_asset_id.

            :param click_xpath_1: XPath to the first clickable element (e.g., dropdown trigger).
            :param click_xpath_2: XPath to the element to click within the dropdown.
            :param data_asset_id: The ID (string) that should exist in the nested path.
            :param root_key: Top-level JSON key.
            :param asset_key: Sub-key under the root.
            :param nested_path_prefix: List of keys leading to the data asset list.
            """
            def get_nested_value(data, root_key, asset_key, nested_path):
                assert isinstance(nested_path, (list, tuple)), "nested_path must be a list or tuple of keys"

                try:
                    value = data[root_key][asset_key]
                    for key in nested_path:
                        value = value[key]
                    return value
                except (KeyError, TypeError):
                    return None



            assert isinstance(nested_path_prefix, list), "nested_path_prefix must be a list"
            threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
            old_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path_prefix)
            #old_len = len(old_nested) if hasattr(old_nested, '__len__') else None
            old_len = len(old_nested) if isinstance(old_nested, list) else 0

            # Step 1: Click the first element (e.g., open dropdown)
            clickable_1 = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, click_xpath_1))
            )
            clickable_1.click()

            try:
                # First try: wait for presence of element at click_xpath_2
                WebDriverWait(self.driver, 2).until(
                    EC.presence_of_element_located((By.XPATH, click_xpath_2))
                )
            except TimeoutException:
                # If it fails (times out), fall back to trying to click click_xpath_1
                clickable_1 = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, click_xpath_1))
                )
                clickable_1.click()            # Step 2: Click the second element (the actual dropdown value)
            clickable_2 = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, click_xpath_2))
            )

            value = clickable_2.get_attribute("value") or clickable_2.text
            toRemoveElement = threagile_data["data_assets"][value]["id"]

            clickable_2.click()
            # 🔍 Log the selected value for debugging
            print(f"Selected label: {value}")
            print(f"Expecting data_asset_id: {data_asset_id}")

            # Step 4: Fetch model data
            threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
            new_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path_prefix)
            new_len = len(new_nested) if hasattr(new_nested, '__len__') else None
            if old_len is None or new_len is None:
                raise ValueError(
                    f"Cannot compare length"
                    f"because one of them is None (old_len: {old_len}, new_len: {new_len})"
                )

            if new_len <= old_len:
                raise AssertionError(
                    f"Expected length at path '{root_key} -> {asset_key} -> {nested_path}' "
                    f"to increase, but it did not (before: {old_len}, after: {new_len})"
                )

            # Step 3: Build full nested path
            nested_path = nested_path_prefix



            data = threagile_data
            data = data[root_key]
            data = data[asset_key]
            for key in nested_path:
                data = data[key]

            found = False
            for i, key in enumerate(data):
                print(f"🔍 Step {i} — Key type: {type(key).__name__}, Key value: {key}")
                
                if key == toRemoveElement:
                    print(f"✅ Found 'data_asset_id': {toRemoveElement} at step {i}")
                    found = True
                    break

            if not found:
                raise AssertionError(f"❌ 'data_asset_id' ({toRemoveElement}) not found in data keys.")


    def click_and_assert_nested_key_removed(self, click_xpath, root_key="technical_assets", asset_key="foo", nested_path=None):
        """
        Clicks an element and asserts that a nested key no longer exists in the data returned from threagile.toJSON().

        :param click_xpath: XPath to the element to be clicked (e.g., 'remove' button).
        :param root_key: Top-level JSON key (e.g., 'technical_assets').
        :param asset_key: Sub-key under the root (e.g., 'foo').
        :param nested_path: List of keys forming the path to the target (e.g., ['data_assets_processed', 'customer-data']).
        """
        def get_nested_value(data, root_key, asset_key, nested_path):
            assert isinstance(nested_path, (list, tuple)), "nested_path must be a list or tuple of keys"

            try:
                value = data[root_key][asset_key]
                for key in nested_path:
                    value = value[key]
                return value
            except (KeyError, TypeError):
                return None

        assert nested_path and isinstance(nested_path, list), "nested_path must be a non-empty list of keys"

        # Click the element
        clickable = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath))
        )
        parent = clickable.find_element(By.XPATH, "..")
        value = parent.get_attribute("value")
        old = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        print(value)
        toRemoveElement = old["data_assets"][value]["id"]

        # Save pre-click length of the relevant section
        print(f"[DEBUG] root_key: {root_key}")
        print(f"[DEBUG] asset_key: {asset_key}")
        print(f"[DEBUG] nested_path: {nested_path[0]}")

        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        old_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path)
        old_len = len(old_nested) if hasattr(old_nested, '__len__') else None

        clickable.click()

        # Wait briefly for the UI/model to update
        self.driver.implicitly_wait(1)

        # Re-fetch model data
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        # Get the nested section (before and after)
        new_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path)
        new_len = len(new_nested) if hasattr(new_nested, '__len__') else None
        if old_len is None or new_len is None:
            raise ValueError(
                f"Cannot compare lengths at path '{root_key} -> {asset_key} ->  {nested_path[0]}' "
                f"because one of them is None (old_len: {old_len}, new_len: {new_len})"
            )

        if new_len >= old_len:
            raise AssertionError(
                f"Expected length at path '{root_key} -> {asset_key} -> {nested_path}' "
                f"to decrease, but it did not (before: {old_len}, after: {new_len})"
            )


        current = threagile_data
        try:
            current = current[root_key]
            current = current[asset_key]
            for key in nested_path:
                current = current[key]

            found = False
            for item in current:
                if item == toRemoveElement:
                    found = True
                    break

            if found:
                raise AssertionError(f"Expected item to be removed at path '{full_path}', but it still exists")


        except (KeyError, IndexError, TypeError):
            # ✅ It's gone — either a missing key or index access failure
            return



    def toggle_checkbox_and_assert(self, checkbox_xpath, asset_key="foo", attribute="internet", previous_value=None):
        """
        Generic helper to toggle a checkbox and assert the technical asset's boolean attribute is updated accordingly.
        """
        # Wait until the checkbox is present in the DOM
        checkbox = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, checkbox_xpath))
        )

        # Check current state
        was_checked = checkbox.is_selected()
        if previous_value is not None:
            assert was_checked == previous_value, (
                f"Expected checkbox to be {'checked' if previous_value else 'unchecked'}, "
                f"but it was {'checked' if was_checked else 'unchecked'}."
            )
        # Toggle it
        checkbox.click()

         # Wait a moment if needed
        self.driver.implicitly_wait(1)

        # Fetch updated data
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("technical_assets", {})
        asset = technical_assets.get(asset_key)

        assert asset is not None, f"Technical asset '{asset_key}' not found"

        communication_links = asset.get("communication_links", {})
        assert communication_links, f"No communication_links found for technical asset '{asset_key}'"

        first_link = next(iter(communication_links.values()), None)
        assert first_link, f"Failed to retrieve the only communication link in asset '{asset_key}'"

        expected_value = not was_checked
        actual_value = first_link.get(attribute)

        assert actual_value == expected_value, (
            f"Expected communication link attribute '{attribute}' to be {expected_value}, but got '{actual_value}'"
        )
    def edit_and_verify_field(self, xpath, input_text, verify_key, verify_field=None, expected_value=None, save_button_xpath=None,marked_value=None):
        # Click the edit button
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath))).click()

        # Enter the new text
        active = self.driver.switch_to.active_element
        active.send_keys(Keys.CONTROL, 'a')
        assert marked_value!=None, "Marked value should not be None" 
        current_value = active.get_attribute("value")
        assert current_value.startswith(marked_value), f"Unexpected {current_value}"
        active.send_keys(input_text)

        # If a save/confirm button needs to be clicked
        if save_button_xpath:
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, save_button_xpath))
            ).click()

        # Retrieve updated data from the frontend
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("technical_assets", {})
        assert isinstance(technical_assets, dict), "technical_assets is not a dict"
        assert verify_key in technical_assets, f"Expected technical asset key '{verify_key}' not found"

        # Optionally verify a specific field value inside the only communication link
        if verify_field and expected_value is not None:
            comm_links = technical_assets[verify_key].get("communication_links", {})
            assert isinstance(comm_links, dict), "communication_links is not a dict"
            assert comm_links, f"No communication links found for '{verify_key}'"

            first_link = next(iter(comm_links.values()), None)
            assert first_link is not None, f"Failed to retrieve the communication link for '{verify_key}'"

            actual_value = first_link.get(verify_field)
            assert actual_value == expected_value, f"Expected {verify_field} '{expected_value}', got '{actual_value}'"


    def select_and_assert(self, select_xpath, expected_value, asset_key="foo", attribute="type", previous_value=None):
        """
        Helper to select a value from a <select> and assert that the asset has the expected value for a given attribute.
        """
        select_element = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, select_xpath))
        )
        dropdown = Select(select_element)
        if previous_value is not None:
            current_selected = dropdown.first_selected_option.text.strip()
            assert current_selected == previous_value, (
                f"Expected previous value '{previous_value}', but found '{current_selected}'"
            )
        dropdown.select_by_visible_text(expected_value)

        # Re-fetch the data to get updated values
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("technical_assets", {})
        asset = technical_assets.get(asset_key)

        assert asset is not None, f"Technical asset '{asset_key}' not found"

        communication_links = asset.get("communication_links", [])
        assert communication_links, f"No communication_links found for technical asset '{asset_key}'"

        first_link_data = next(iter(asset.get("communication_links", {}).values()), None)

        actual_value = first_link_data.get(attribute)
        assert actual_value == expected_value, f"Expected {attribute} '{expected_value}', but got '{actual_value}'"

    def test_edit_description(self):
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div/div[1]/li[3]/button",
            input_text="foo",
            verify_key="foo",
            verify_field="description",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Link to the load balancer"
        )

    def test_select_proto(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[1]/div/select", "ws", "foo", "protocol",previous_value="https")

    def test_select_autheni(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[2]/div/select",  "none", "foo", "authentication",previous_value="session-id")

    def test_select_autho(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[3]/div/select", "none", "foo", "authorization",previous_value="enduser-identity-propagation")

    def test_select_usage(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[4]/div/select", "devops", "foo", "usage",previous_value="business")

    def test_toggle_vpn(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[1]/input", "foo", "vpn",False)

    def test_toggle_ip_filtered(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[2]/input", "foo", "ip_filtered",False)

    def test_toggle_readonly(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[3]/input", "foo", "readonly",False)


    def test_remove_tag_customer_traffic_sent(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_sent"]
        )

    def test_remove_tag_customer_accounts(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_sent"]
        )
    def test_remove_tag_customer_traffic_received(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[4]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_received"]
        )

    def test_add_tag_data_assets_processed_contract_summaries(self):
        self.select_tagify_item_and_assert(
            tagify_input_xpath='/html/body/div[4]/div[2]/div/div[4]/tags/span',
            expected_model_id="erp-customizing",
            root_key='technical_assets',
            asset_key='foo',
            nested_path_prefix=["communication_links", "Customer Traffic","data_assets_received"],
            dropdown_container_selector="div.tagify__dropdown", # CSS selector for the dropdown container
            tag_text_to_select="Customer Contracts"
            
        )

