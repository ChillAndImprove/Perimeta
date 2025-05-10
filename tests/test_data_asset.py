import tempfile
from pudb import set_trace;
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
    options.add_argument("--incognito")
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options)

    # ✅ Navigate and click on asset once
    driver.get("http://0.0.0.0:8000/indexTests.html")
    driver.set_window_size(1854, 1011)
    driver.switch_to.frame(0)
    driver.find_element(By.ID, "customer_portal_erp_threat_model").click()
    driver.switch_to.default_content()

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

        # ✅ Focus the rectangle node you're working on
        target_cell_id = driver.execute_script("""
            var graph = editorUi.editor.graph;
            var model = graph.model;
            graph.clearSelection()
            return null;
        """)
    except Exception as e:
        print(f"[post_test_hook error] {e}")

   
@pytest.mark.usefixtures("browser_and_setup")
class TestDataAsset():


    def click_and_assert_nested_key_exists_in_a_set(
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
                assert isinstance(nested_path, str), "nested_path must be a string key"

                try:
                    return data[root_key][asset_key][nested_path]
                except (KeyError, TypeError):
                    return None

            assert isinstance(nested_path_prefix, list), "nested_path_prefix must be a list"
            js_code_to_execute = """
            // Arguments passed from Selenium:
            // arguments[0]: root_key (string)
            // arguments[1]: asset_key (string)
            // arguments[2]: nested_path_key (string)

            try {
                const mainData = editorUi.editor.graph.model.threagile.toJSON();

                // Basic check for mainData
                if (!mainData || typeof mainData !== 'object') {
                    return { error: "editorUi.editor.graph.model.threagile.toJSON() did not return a valid object.", data: null };
                }

                const rootObject = mainData[arguments[0]]; // Use root_key from Python
                if (rootObject === undefined || rootObject === null) {
                    return { error: `Root key '${arguments[0]}' not found.`, data: null };
                }
                if (typeof rootObject !== 'object') {
                    return { error: `Value at root key '${arguments[0]}' is not an object (found ${typeof rootObject}).`, data: null };
                }

                const assetObject = rootObject[arguments[1]]; // Use asset_key from Python
                if (assetObject === undefined || assetObject === null) {
                    return { error: `Asset key '${arguments[1]}' not found under root '${arguments[0]}'.`, data: null };
                }
                if (typeof assetObject !== 'object') {
                    return { error: `Value at asset key '${arguments[1]}' is not an object (found ${typeof assetObject}).`, data: null };
                }

                const targetValue = assetObject[arguments[2]]; // Use nested_path_key from Python

                // Check if the target value exists
                if (targetValue === undefined || targetValue === null) {
                    return { error: `Nested key '${arguments[2]}' not found or its value is null/undefined.`, data: null };
                }

                // THE CORE LOGIC: Check if it's a Set and convert
                if (targetValue instanceof Set) {
                    // Convert *this specific Set* to an Array and return success
                    return { error: null, data: Array.from(targetValue) };
                } else {
                    // It exists, but it's not a Set. This is an error for this function's purpose.
                    return { error: `Expected a Set at path '${arguments[0]}'>'${arguments[1]}'>'${arguments[2]}', but found type: ${targetValue.constructor.name || typeof targetValue}`, data: null };
                }
            } catch (e) {
                // Catch potential JS errors during access or execution
                return { error: `JavaScript error during execution: ${e.message || e.toString()}`, data: null };
            }
            """

            # --- Execute Script and Process Result ---
            result = self.driver.execute_script(
                js_code_to_execute,
                root_key,
                asset_key,
                nested_path_prefix
            )


            #old_len = len(old_nested) if hasattr(old_nested, '__len__') else None
            old_len = 0  # Default length is 0

            # Check if the result is a dictionary and there was no error reported by JS
            if isinstance(result, dict) and result.get("error") is None:
                # Access the data part
                data_list = result.get("data")
                # Check if the data part is actually a list
                if isinstance(data_list, list):
                    # If it is a list, calculate its length
                    old_len = len(data_list)
 
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


            clickable_2.click()

            # Step 4: Fetch model data
            result2 = self.driver.execute_script(
                js_code_to_execute,
                root_key,
                asset_key,
                nested_path_prefix
            )



            new_len = 0  # Default length is 0

            # Check if the result is a dictionary and there was no error reported by JS
            if isinstance(result2, dict) and result2.get("error") is None:
                # Access the data part
                data_list = result2.get("data")
                # Check if the data part is actually a list
                if isinstance(data_list, list):
                    # If it is a list, calculate its length
                    new_len = len(data_list)
            if old_len is None or new_len is None:
                raise ValueError(
                    f"Cannot compare length"
                    f"because one of them is None (old_len: {old_len}, new_len: {new_len})"
                )

            if new_len <= old_len:
                raise AssertionError(
                    f"Expected length "
                    f"to increase, but it did not (before: {old_len}, after: {new_len})"
                )

            # Step 3: Build full nested path
            nested_path = nested_path_prefix + [data_asset_id]





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
                assert isinstance(nested_path, str), "nested_path must be a string key"

                try:
                    return data[root_key][asset_key][nested_path]
                except (KeyError, TypeError):
                    return None

            assert isinstance(nested_path_prefix, list), "nested_path_prefix must be a list"
            threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
            old_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path_prefix[0])
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
            toRemoveElement = threagile_data["data_assets"][asset_key]["id"]

            clickable_2.click()

            # 🔍 Log the selected value for debugging
            print(f"Selected label: {value}")
            print(f"Expecting data_asset_id: {data_asset_id}")

            # Step 4: Fetch model data
            threagile_data2 = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
            new_nested = get_nested_value(threagile_data2, root_key, asset_key, nested_path_prefix[0])
            new_len = len(new_nested) if isinstance(new_nested, list) else 0
            if old_len is None or new_len is None:
                raise ValueError(
                    f"Cannot compare length"
                    f"because one of them is None (old_len: {old_len}, new_len: {new_len})"
                )

            if new_len <= old_len:
                raise AssertionError(
                    f"Expected length "
                    f"to increase, but it did not (before: {old_len}, after: {new_len})"
                )

            # Step 3: Build full nested path
            nested_path = nested_path_prefix + [data_asset_id]


            data = threagile_data[root_key][asset_key][nested_path[0]]
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
            assert isinstance(nested_path, str), "nested_path must be a string key"

            try:
                return data[root_key][asset_key][nested_path]
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
        old_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path[0])
        old_len = len(old_nested) if hasattr(old_nested, '__len__') else None
 

        clickable.click()

        # Wait briefly for the UI/model to update
        self.driver.implicitly_wait(1)

        # Re-fetch model data

        # Get the nested section (before and after)
        new_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path[0])
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

            for i, key in enumerate(nested_path):
                if isinstance(current, dict):
                    if key not in current:
                        return  # ✅ key gone
                    if current[key] == toRemoveElement:
                        raise AssertionError(f"Found element with ID '{toRemoveElement}' still present at path {nested_path[:i+1]}")
                    current = current[key]
                elif isinstance(current, list):
                    if not isinstance(key, int) or key >= len(current):
                        return  # ✅ index gone or invalid
                    if current[key] == toRemoveElement:
                        raise AssertionError(f"Found element with ID '{toRemoveElement}' still present at path {nested_path[:i+1]}")
                    current = current[key]
                else:
                    return  # ✅ unexpected structure = considered gone

            # If we get here, the item still exists — fail
            full_path = f"{root_key} -> {asset_key} -> {' -> '.join(map(str, nested_path))}"
            raise AssertionError(f"Expected item to be removed at path '{full_path}', but it still exists")

        except (KeyError, IndexError, TypeError):
            # ✅ It's gone — either a missing key or index access failure
            return



    def toggle_checkbox_and_assert(self, checkbox_xpath, asset_key="foo", attribute="internet",previous_value=None):
        """
        Generic helper to toggle a checkbox and assert the technical asset's boolean attribute is updated accordingly.
        """
        # Wait until the checkbox is present in the DOM
        checkbox = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, checkbox_xpath))
        )
        if previous_value is not None:
            assert was_checked == previous_value, (
                f"Expected checkbox to be {'checked' if previous_value else 'unchecked'}, "
                f"but it was {'checked' if was_checked else 'unchecked'}."
            )
        # Toggle it
 
        # Check current state
        was_checked = checkbox.is_selected()

        # Toggle it
        checkbox.click()

        # Wait a moment if needed (if value updates are async)
        self.driver.implicitly_wait(1)

        # Fetch updated data
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("technical_assets", {})
        asset = technical_assets.get(asset_key)

        assert asset is not None, f"Technical asset '{asset_key}' not found"

        expected_value = not was_checked
        actual_value = asset.get(attribute)

        assert actual_value == expected_value, (
            f"Expected '{attribute}' to be {expected_value}, but got '{actual_value}'"
        )

    def edit_and_verify_key(self, xpath, input_text, verify_new_key, save_button_xpath=None,marked_value=None):
        # Click the edit button
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath))).click()

        # Enter the new text
        active = self.driver.switch_to.active_element
        active.send_keys(Keys.CONTROL, 'a')
        if marked_value is not None:
            current_value = active.get_attribute("value")
            assert current_value.startswith(marked_value), "Unexpected contract text"
        time.sleep(0.5)

        active.send_keys(input_text)

        # If a save/confirm button needs to be clicked
        if save_button_xpath:
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, save_button_xpath))
            ).click()

        # Retrieve updated data
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("data_assets", {})
        assert isinstance(technical_assets, dict), "data_assets is not a dict"
        assert verify_new_key in technical_assets, f"Expected data asset key '{verify_new_key}' not found"

    def edit_and_verify_field(self, xpath, input_text, verify_key, verify_field=None, expected_value=None, save_button_xpath=None,marked_value=None):
        # Click the edit button
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath))).click()

        # Enter the new text
        active = self.driver.switch_to.active_element
        active.send_keys(Keys.CONTROL, 'a')
        if marked_value is not None:
            current_value = active.get_attribute("value")
            assert current_value.startswith(marked_value), f"Unexpected {current_value}"

        active.send_keys(input_text)

        # If a save/confirm button needs to be clicked
        if save_button_xpath:
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, save_button_xpath))
            ).click()

        # Retrieve updated data
        threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data.get("data_assets", {})
        assert isinstance(technical_assets, dict), "data_assets is not a dict"
        assert verify_key in technical_assets, f"Expected data asset key '{verify_key}' not found"

        # Optionally verify a specific field value
        if verify_field and expected_value is not None:
            actual_value = technical_assets[verify_key].get(verify_field)
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
        technical_assets = threagile_data.get("data_assets", {})
        asset = technical_assets.get(asset_key)

        assert asset is not None, f"Technical asset '{asset_key}' not found"
        actual_value = asset.get(attribute)
        assert actual_value == expected_value, f"Expected {attribute} '{expected_value}', but got '{actual_value}'"


    def verify_table_elements(self, xpath, expected_texts):
        """
        Wait for the elements defined by the given XPath to be visible and
        verify that their text contents match the expected array of strings.
        """
        # Wait up to 10 seconds for the data cells to become visible.
        WebDriverWait(self.driver, 10).until(
            EC.visibility_of_all_elements_located((By.XPATH, xpath))
        )
        
        # Retrieve all elements matching the XPath.
        table = self.driver.find_element(By.XPATH, xpath)
        rows = table.find_elements(By.TAG_NAME, "tr")

        # Skip the first <tr> (the <th> header row)
        data_rows = rows[1:]

        assert len(data_rows) == len(expected_texts), (
            f"Expected {len(expected_texts)} rows, but found {len(data_rows)}."
        )

        for row_index, (row, expected_text) in enumerate(zip(data_rows, expected_texts)):
            td = row.find_element(By.TAG_NAME, "td")
            actual_text = td.text.strip()
            assert actual_text == expected_text, (
                f"Row {row_index}: Expected '{expected_text}', but found '{actual_text}'."
            )



    def check_ul_items_present(self, ul_xpath, expected_items):
        """
        Check if all expected items are present as visible labels in the UL,
        waiting for elements to appear.

        :param ul_xpath: XPATH to the <ul> element
        :param expected_items: List of expected strings (e.g., ["Customer Contracts", "Customer Accounts"])
        :return: True if all are present within the timeout, False otherwise
        """
        if not expected_items: # Handle empty expected list
             print("Warning: No expected items provided.")
             return True # Or False, depending on desired behaviour

        try:
            # 1. Wait for the UL element to be present (or visible)
            wait = WebDriverWait(self.driver, self.timeout)
            ul_element = wait.until(EC.visibility_of_element_located((By.XPATH, ul_xpath)))
            # Or EC.presence_of_element_located if visibility isn't strictly required for the UL itself

            # 2. Wait specifically for the list items to contain the expected text
            #    This is more robust than just finding the elements immediately after the UL.
            #    We define a custom wait condition using a lambda function.
            def check_all_items_found(driver):
                # Re-find elements within the lambda to get the latest state
                current_ul = driver.find_element(By.XPATH, ul_xpath) # Find UL again inside lambda
                # Consider waiting for *at least one* child div first if the list can be initially empty
                # wait.until(EC.presence_of_element_located((By.XPATH, f"{ul_xpath}//li/div/div")))
                actual_items_elements = current_ul.find_elements(By.XPATH, ".//li/div/div")
                actual_items_text = [div.text.strip(':') for div in actual_items_elements if div.is_displayed()] # Check visibility too?
                print(f"Waiting... Actual items found: {actual_items_text}") # Debugging inside wait
                return all(item in actual_items_text for item in expected_items)

            # Execute the custom wait
            wait.until(check_all_items_found)

            print(f"Success: All expected items {expected_items} found.")
            return True

        except TimeoutException:
            print(f"Timeout: Failed to find all expected items {expected_items} within {self.timeout} seconds.")
            # Optionally, find whatever items *were* present for better debugging
            try:
                 ul_element = self.driver.find_element(By.XPATH, ul_xpath)
                 actual_items = [div.text.strip(':') for div in ul_element.find_elements(By.XPATH, ".//li/div/div")]
                 print("Actual items found at timeout:", actual_items)
                 missing_items = [item for item in expected_items if item not in actual_items]
                 print("Missing items:", missing_items)
            except Exception as e:
                 print(f"Could not retrieve actual items after timeout: {e}")
            return False
        except Exception as e:
             # Catch other potential exceptions like StaleElementReferenceException
             print(f"An error occurred: {e}")
             return False

    def test_check_if_import_of_all_data_assets_worked(self):
        ul_xpath = "/html/body/div[4]/div[2]/div[2]/ul"
        expected_labels = [
            "Customer Contracts",
            "Customer Contract Summaries",
            "Customer Operational Data",
            "Customer Accounts",
            "Some Internal Business Data",
            "Client Application Code",
            "Server Application Code",
            "Build Job Config",
            "Marketing Material",
            "ERP Logs",
            "ERP Customizing Data",
            "Database Customizing and Dumps"
        ]

        result = self.check_ul_items_present(ul_xpath, expected_labels)

    def test_add_tag_data_assets_stored_internal_business_data(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()

        self.click_and_assert_nested_key_exists_in_a_set(
            click_xpath_1='/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/tags/span',
            click_xpath_2='/html/body/div[9]/div/div[10]',
            data_asset_id="customer-contracts",
            root_key='data_assets',
            asset_key='Customer Contracts',
            nested_path_prefix=['tags']
        )

    def test_justification_cia_rating(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[12]/button",
            input_text="foo",
            verify_key="Customer Contracts",
            verify_field="justification_cia_rating",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Contract data might contain financial data as well as personally identifiable information (PII). The integrity and availability of contract data is required for clearing payment disputes."

        )

    def test_avail(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
 
        self.select_and_assert("/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[11]/div/select", "critical", "Customer Contracts", "availability","operational")

    def test_inte(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
 
        self.select_and_assert("/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[10]/div/select", "mission-critical", "Customer Contracts", "integrity","critical")
    def test_conf(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
 
        self.select_and_assert("/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[9]/div/select", "public", "Customer Contracts", "confidentiality","confidential")
    def test_quant(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
 
        self.select_and_assert("/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[8]/div/select", "many", "Customer Contracts", "quantity","many")



    def test_owner(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[7]/button",
            input_text="foo",
            verify_key="Customer Contracts",
            verify_field="owner",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Company XYZ"
        )

    def test_origin(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[6]/button",
            input_text="foo",
            verify_key="Customer Contracts",
            verify_field="origin",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Customer"
        )

    def test_usage(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
 
        self.select_and_assert("/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[4]/div/select", "devops", "Customer Contracts", "usage","business")



    def test_descri(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[3]/button",
            input_text="foo",
            verify_key="Customer Contracts",
            verify_field="description",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Customer Contracts (PDF)"
        )

    def test_key(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[2]/div[1]"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_key(
            xpath="//*[@id=\"Customer Contract Summaries:\"]/div/li[1]/button",
            input_text="foo",
            verify_new_key="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="Customer Contract Summaries"
        )

    def test_id(self):
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        self.edit_and_verify_field(
            xpath="/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[2]/div/li[2]/button",
            input_text="foo",
            verify_key="Customer Contracts",
            verify_field="id",
            expected_value="foo",
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]",
            marked_value="customer-contracts"
        )

    #!!!!!!!!!!! we need delete a data asset
    # and we need to check if in the technical_assets under e.g. communcation_assets the data_asset is still there

    def test_delete_data(self):
        threagile_data_old = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets = threagile_data_old.get("data_assets", {})
        old_len = len(technical_assets) 
        click_xpath_1= "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/img"
        clickable_1 = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, click_xpath_1))
        )
        clickable_1.click()
        delete = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[4]/div[2]/div[2]/ul/li[1]/div[1]/button/img"))
        )
        delete.click()
        deleteApprove = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[9]/div/div[6]/button[1]"))
        )
        deleteApprove.click()
        
        
        threagile_data_new = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
        technical_assets_new = threagile_data_old.get("data_assets", {})
        new_len = len(technical_assets_new) 
        if old_len is None or new_len is None:
            raise ValueError(
                f"Cannot compare length"
                f"because one of them is None (old_len: {old_len}, new_len: {new_len})"
            )

        if new_len < old_len:
            raise AssertionError(
                f"Expected length "
                f"to be smaller, but it did not (before: {old_len}, after: {new_len})"
            )

    # we need to delete multiple nodes too but not in data, in tehcnical asset or in connectin ;)


