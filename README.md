<p align="center">
  <img src="./images/logo.png" alt="Threagile Plus Logo" width="200">
</p>


# Perimeta

Welcome to Perimeta! This open-source project aims to enhance your experience with threat modeling.

![showcase](finished.gif)

## Getting Started

To start using Perimeta, follow these steps:

1. Switch to the cloned repository directory:
    ```bash
    cd path/to/cloned_repo
    ```
2. Launch the server using Python:
    ```bash
    python3 -m http.server
    ```
3. Open your web browser and navigate to `http://localhost:8000`.

4. Click on **File** -> **Import** -> **Browse**. Select your `Threagile.yaml` file and click **Import**.

## Technical Details

Perimeta is built upon JGraph (also known as [mxGraph](https://github.com/jgraph/mxgraph)) and [Threagile](https://github.com/Threagile/threagile), which was compiled to WebAssembly (WASM). The combination of these technologies allows for an enhanced and intuitive experience with threat modeling.


## TODO

### ✅ Tests

- [ ] Add more tests for all of the menus:
  - [ ] **Asset**
    - [ ] Don't focus on the CIA — we're planning to remove it anyway
    - [ ] Make CIA values non-changeable and get them from the data assets
  - [ ] **Vertices**
  - [ ] **TrustBoundary**

- [ ] User movements:
  - [ ] Create a node
  - [ ] Delete a node
  - [ ] Undo (`Ctrl + Z`)
  - [ ] Copy a node
  - [ ] Paste a node
  - [ ] Drag a node in and out of a Trust Boundary

---

### 🚧 Features

- [ ] Components should *look better* — save this for the end
- [ ] Data Assets menu is horrendous — we'll fix that later

---

### 🎯 Final Goal

- [ ] Post this stuff on **Hacker News** 😉 Would be fun!

