import * as OBC from "https://esm.sh/@thatopen/components@3.1.3";
import * as OBCF from "https://esm.sh/@thatopen/components-front@3.1.7";
import * as BUI from "https://esm.sh/@thatopen/ui@3.1.1";
import * as BUIC from "https://esm.sh/@thatopen/ui-obc@3.1.3";


/**
 * @param {OBC.Components} components
 * @returns {OBC.FragmentsManager}
 */
async function initFragments(components) {
  const fragments = components.get(OBC.FragmentsManager);
  const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetchedUrl = await fetch(githubUrl);
  const workerBlob = await fetchedUrl.blob();
  const workerFile = new File([workerBlob], "worker.mjs", {
    type: "text/javascript",
  });
  fragments.init(URL.createObjectURL(workerFile));
  return fragments;
}

/**
 * @param {OBC.Components} components
 * @param {BUI.Viewport} viewport
 * @returns {OBC.World}
 */
function setupWorld(components, viewport) {
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create();
  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = null;
  world.renderer = new OBC.SimpleRenderer(components, viewport);
  world.camera = new OBC.SimpleCamera(components);
  world.camera.controls.setLookAt(10, 5.5, 5, -4, -1, -6.5);
  return world;
}

/**
 * @param {OBC.Components} components
 * @returns {OBC.IfcLoader}
 */
async function setupLoader(components) {
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: "https://esm.sh/web-ifc@0.0.71/",
      absolute: true,
    },
  });
  ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
  return ifcLoader;
}

/**
 * @param {OBC.Components} components
 * @param {OBC.World} world
 * @returns {OBCF.Highlighter}
 */
function setupHighlighter(components, world) {
  const highlighter = components.get(OBCF.Highlighter);
  highlighter.setup({world});
  highlighter.zoomToSelection = true;
  return highlighter;
}

export default () =>{
  let components; /* @type {OBC.Components} */
  let fragments; /* @type {OBC.FragmentsManager} */
  let ifcLoader; /* @type {OBC.IfcLoader} */
  let viewport; /* @type {BUI.Viewport} */
  let world; /* @type {OBC.World} */

  return {
    async initialize() {
      BUI.Manager.init();
      components = new OBC.Components();
      fragments = await initFragments(components);
      ifcLoader = await setupLoader(components);
      viewport = document.createElement("bim-viewport");
      world = setupWorld(components, viewport);
    },

    async render({model, el}) {
      world.camera.controls.addEventListener("rest", () =>
        fragments.core.update(true),
      );
      fragments.list.onItemSet.add(({value: addedModel}) => {
        addedModel.useCamera(world.camera.three);
        world.scene.three.add(addedModel.object);
        fragments.core.update(true);
      });

      components.init();
      components.get(OBC.Grids).create(world);
      const highlighter = setupHighlighter(components, world);

      const loadModel = async () => {
        const modelContents = model.get("ifc_model").contents;
        await ifcLoader.load(
          new TextEncoder().encode(modelContents),
          true,
          "IfcModel",
        );
      };

      model.on("change:ifc_model", async () => {
        await loadModel();
        model.set("selected_guids", null);
        model.save_changes();
      });

      // region Properties table
      const [propertiesTable, updatePropertiesTable] =
        BUIC.tables.itemsData({
          components,
          modelIdMap: {},
        });

      propertiesTable.preserveStructureOnFilter = true;
      propertiesTable.indentationInText = false;

      highlighter.events.select.onHighlight.add(async (modelIdMap) => {
        updatePropertiesTable({modelIdMap});
        const guids = await fragments.modelIdMapToGuids(modelIdMap);
        model.set("selected_guids", guids);
        model.save_changes();
      });

      highlighter.events.select.onClear.add(() => {
        updatePropertiesTable({modelIdMap: {}});
        model.set("selected_guids", null);
        model.save_changes();
      });

      const propertiesSection = BUI.Component.create(() => {
        const onTextInput = (e) => {
          const input = e.target; // type BUI.TextInput;
          propertiesTable.queryString = input.value !== "" ? input.value : null;
        };

        const expandTable = (e) => {
          const button = e.target; // type BUI.Button;
          propertiesTable.expanded = !propertiesTable.expanded;
          button.label = propertiesTable.expanded ? "Collapse" : "Expand";
        };

        return BUI.html`
          <bim-panel-section label="Element Data">
            <div style="display: flex; gap: 0.5rem;">
              <bim-button @click=${expandTable} label=${propertiesTable.expanded ? "Collapse" : "Expand"}>
              </bim-button>
            </div>
            <bim-text-input @input=${onTextInput} placeholder="Search Property" debounce="250"></bim-text-input>
            ${propertiesTable}
          </bim-panel-section>
        `;
      });
      // endregion

      // region relations tree
      /** @type {BUI.Tree} */
      const [spatialTree] = BUIC.tables.spatialTree({
        components,
        models: [],
      });
      spatialTree.preserveStructureOnFilter = true;

      const relationsTreeSection = BUI.Component.create(() => {
        const onSearch = (e) => {
          const input = e.target;
          spatialTree.queryString = input.value;
        };
        return BUI.html`
          <bim-panel-section label="Model Tree">
            <bim-text-input @input=${onSearch} placeholder="Search..." debounce="200"></bim-text-input>
            ${spatialTree}
          </bim-panel-section>
        `;
      });
      // endregion

      const panel = BUI.Component.create(() => {
        return BUI.html`
          <bim-panel label="Tools">
            ${relationsTreeSection}
            ${propertiesSection}
          </bim-panel>
        `;
      });

      const widget = document.createElement("bim-grid");
      widget.layouts = {
        main: {
          template: `
          "panel viewport"
          /20rem 1fr
          `,
          elements: {panel, viewport},
        },
      };
      widget.layout = "main";
      el.classList.add("bim-viewer");
      el.appendChild(widget);

      const applyExplicitHeightIfFullscreen = () => {
        const isFullscreen = !!document.fullscreenElement;
        if (isFullscreen) {
          const h = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
          // marimo fullscreen mode has a 1rem padding, this avoids scrollbars
          if (h) el.style.height = h - 32 + "px";
        } else {
          // TODO: how to retrieve the max height of the marimo/Jupyter cell?
          el.style.height = "578px";
        }
      };

      const resizeObserver = new ResizeObserver(() => {
        applyExplicitHeightIfFullscreen();
        world.renderer.resize();
        world.camera.updateAspect();
      });
      resizeObserver.observe(el);
      applyExplicitHeightIfFullscreen();

      await loadModel();
    },
  }
};
