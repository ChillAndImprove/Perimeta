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


@pytest.fixture(scope="class")
def browser_and_setup(request):
    # ✅ Setup browser once
    options = Options()
    options.add_argument("--window-size=1854,1011")
    #options.add_argument("--headless=new")
    driver = webdriver.Chrome(options)

    # ✅ Navigate and click on asset once
    driver.get("http://0.0.0.0:8000/indexTests.html")
    driver.set_window_size(1854, 1011)
    driver.switch_to.frame(0)
    driver.find_element(By.CSS_SELECTOR, "td:nth-child(1) > .geBtn").click()
    driver.switch_to.default_content()

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
class TestOpenGraph():

  
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
            toRemoveElement = threagile_data["data_assets"][value]["id"]

            clickable_2.click()

            # 🔍 Log the selected value for debugging
            print(f"Selected label: {value}")
            print(f"Expecting data_asset_id: {data_asset_id}")

            # Step 4: Fetch model data
            #set_trace()
            threagile_data = self.driver.execute_script("return editorUi.editor.graph.model.threagile.toJSON();")
            new_nested = get_nested_value(threagile_data, root_key, asset_key, nested_path_prefix[0])
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
            assert isinstance(nested_path, (list, tuple)), "nested_path must be a list or tuple of keys"

            try:
                value = data[root_key][asset_key]
                for key in nested_path:
                    value = value[key]
                return value
            except (KeyError, TypeError):
                return None

        assert nested_path and isinstance(nested_path, list), "nested_path must be a non-empty list of keys"

        set_trace()
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



    def toggle_checkbox_and_assert(self, checkbox_xpath, asset_key="foo", attribute="protocol_encrypted"):
        """
        Toggle a checkbox and assert the given boolean attribute in the asset's only communication link is updated.
        """
        # Wait until the checkbox is present in the DOM
        checkbox = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, checkbox_xpath))
        )

        # Check current state
        was_checked = checkbox.is_selected()

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
    def edit_and_verify_field(self, xpath, input_text, verify_key, verify_field=None, expected_value=None, save_button_xpath=None):
        """
        Edits a field in the UI and verifies that the corresponding attribute in the only communication link
        of the specified technical asset is updated correctly.
        """
        # Click the edit button
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, xpath))).click()

        # Enter the new text
        active = self.driver.switch_to.active_element
        active.send_keys(Keys.CONTROL, 'a')
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


    def select_and_assert(self, select_xpath, expected_value, asset_key="foo", attribute="description"):
        """
        Helper to select a value from a <select> and assert that the first communication link
        in the given technical asset has the expected value for the specified attribute.
        """
        select_element = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, select_xpath))
        )
        dropdown = Select(select_element)
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
            save_button_xpath="/html/body/div[10]/table/tbody/tr[3]/td/button[2]"
        )

    def test_select_proto(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[1]/div/select", "ws", "foo", "protocol")

    def test_select_autheni(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[2]/div/select",  "none", "foo", "authentication")

    def test_select_autho(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[3]/div/select", "none", "foo", "authorization")

    def test_select_usage(self):
        self.select_and_assert("/html/body/div[4]/div[2]/div/div[2]/li[4]/div/select", "devops", "foo", "usage")

    def test_toggle_vpn(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[1]/input", "foo", "vpn")

    def test_toggle_ip_filtered(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[2]/input", "foo", "ip_filtered")

    def test_toggle_readonly(self):
        self.toggle_checkbox_and_assert("/html/body/div[4]/div[2]/div/div[2]/div[3]/input", "foo", "readonly")


    def test_remove_tag_customer_traffic(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_sent"]
        )
    def test_remove_tag_customer_accounts(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_sent"]
        )
    def test_remove_tag_customer_traffic(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_received"]
        )
    def test_remove_tag_customer_accounts(self):
        self.click_and_assert_nested_key_removed(
            click_xpath="/html/body/div[4]/div[2]/div/div[3]/tags/tag[1]/x",
            root_key="technical_assets",
            asset_key="foo",
            nested_path=["communication_links", "Customer Traffic","data_assets_received"]
        )

    def test_add_tag_data_assets_processed_contract_summaries(self):
        self.click_and_assert_nested_key_exists(
            click_xpath_1='/html/body/div[4]/div[2]/div/div[3]/tags/span',
            click_xpath_2='/html/body/div[9]/div/div[1]',
            data_asset_id="contract-contracts",
            root_key='technical_assets',
            asset_key='foo',
            nested_path_prefix=["communication_links", "Customer Traffic","data_assets_received"]
        )

