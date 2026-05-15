import marimo

__generated_with = "0.23.6"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import ifcopenshell

    from ifc_anywidget import IfcViewer

    return IfcViewer, ifcopenshell, mo


@app.cell
def _(IfcViewer, ifcopenshell, mo):
    model = ifcopenshell.open(mo.notebook_dir()/"house.ifc")
    viewer = mo.ui.anywidget(IfcViewer(ifc_model=model))
    viewer
    return model, viewer


@app.cell
def _(mo, model, viewer):
    mo.ui.table([model.by_guid(gid).get_info() for gid in viewer.value["selected_guids"] if gid])
    return


if __name__ == "__main__":
    app.run()
