import * as BUI from "https://esm.sh/@thatopen/ui";
import * as OBC from "https://esm.sh/@thatopen/components";
import * as OBCF from "https://esm.sh/@thatopen/components-front";
import * as BUIC from "https://esm.sh/@thatopen/ui-obc";

export default {
  initialize() {
    BUI.Manager.init();
  },

  async render({ model, el }) {
    const viewport = document.createElement("bim-viewport");
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create();
    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.renderer = new OBC.SimpleRenderer(components, viewport);
    world.camera = new OBC.SimpleCamera(components);
    world.camera.controls.setLookAt(10, 5.5, 5, -4, -1, -6.5);

    viewport.addEventListener("resize", () => {
      world.renderer.resize();
      world.camera.updateAspect();
    });
    components.init();

    const grids = components.get(OBC.Grids);
    grids.create(world);

    const fragments = components.get(OBC.FragmentsManager);
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup();
    ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
    const indexer = components.get(OBC.IfcRelationsIndexer);

    const loadModel = async (modelContents) => {
      // TODO: remove previous model
      fragments.dispose();
      const ifcModel = await ifcLoader.load(
        new TextEncoder().encode(modelContents),
      );
      world.scene.three.add(ifcModel);
      await indexer.process(ifcModel);
    };

    await loadModel(model.get("ifc_model").contents);

    model.on("change:ifc_model", async () => {
      await loadModel(model.get("ifc_model").contents);
      model.set("selected_guids", null);
      model.save_changes();
    });

    // use entityAttributes for more complete table
    const [propertiesTable, updatePropertiesTable] =
      BUIC.tables.elementProperties({
        components,
        fragmentIdMap: {},
      });

    propertiesTable.preserveStructureOnFilter = true;
    propertiesTable.indentationInText = false;

    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });

    highlighter.events.select.onHighlight.add((fragmentIdMap) => {
      updatePropertiesTable({ fragmentIdMap });
      const guids = fragments.fragmentIdMapToGuids(fragmentIdMap);
      model.set("selected_guids", guids);
      model.save_changes();
    });

    highlighter.events.select.onClear.add(() => {
      updatePropertiesTable({ fragmentIdMap: {} });
      model.set("selected_guids", null);
      model.save_changes();
    });

    const propertiesPanel = BUI.Component.create(() => {
      const onTextInput = (e) => {
        const input = e.target; // type BUI.TextInput;
        propertiesTable.queryString = input.value !== "" ? input.value : null;
      };

      const expandTable = (e) => {
        const button = e.target; // type BUI.Button;
        propertiesTable.expanded = !propertiesTable.expanded;
        button.label = propertiesTable.expanded ? "Collapse" : "Expand";
      };

      const copyAsTSV = async () => {
        await navigator.clipboard.writeText(propertiesTable.tsv);
      };

      return BUI.html`
        <bim-panel label="Properties">
          <bim-panel-section label="Element Data">
            <div style="display: flex; gap: 0.5rem;">
              <bim-button @click=${expandTable} label=${propertiesTable.expanded ? "Collapse" : "Expand"}></bim-button>
              <bim-button @click=${copyAsTSV} label="Copy as TSV"></bim-button>
            </div>
            <bim-text-input @input=${onTextInput} placeholder="Search Property" debounce="250"></bim-text-input>
            ${propertiesTable}
          </bim-panel-section>
        </bim-panel>
      `;
    });

    const widget = document.createElement("bim-grid");
    widget.layouts = {
      main: {
        template: `
        "propertiesPanel viewport"
        /20rem 1fr
        `,
        elements: { propertiesPanel, viewport },
      },
    };

    widget.layout = "main";
    el.classList.add("bim-viewer");
    el.appendChild(widget);
  },
};
