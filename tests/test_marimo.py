import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    # IFC Anywidget in marimo
    """)
    return


@app.cell
def _():
    import marimo as mo
    import ifcopenshell

    from ifc_anywidget import IfcViewer

    return IfcViewer, ifcopenshell, mo


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    Load the IFC file and create the widget
    """)
    return


@app.cell
def _(IfcViewer, ifcopenshell, mo):
    model = ifcopenshell.open(mo.notebook_dir() / "house.ifc")
    viewer = mo.ui.anywidget(IfcViewer(ifc_model=model))
    return model, viewer


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    Define the toggles to handle the visibility of certain elements
    """)
    return


@app.cell
def _(mo):
    sites_toggle = mo.ui.switch(label="Sites", value=True)
    spaces_toggle = mo.ui.switch(label="Spaces")
    spatial_zones_toggle = mo.ui.switch(label="Spatial zones")
    openings_toggle = mo.ui.switch(label="Openings")
    annotations_toggle = mo.ui.switch(label="Annotations")
    grids_toggle = mo.ui.switch(label="Grids")
    return (
        annotations_toggle,
        grids_toggle,
        openings_toggle,
        sites_toggle,
        spaces_toggle,
        spatial_zones_toggle,
    )


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    Connect the toggles to the viewer
    """)
    return


@app.cell
def _(
    annotations_toggle,
    grids_toggle,
    openings_toggle,
    sites_toggle,
    spaces_toggle,
    spatial_zones_toggle,
    viewer,
):
    viewer.hide_sites = not sites_toggle.value
    viewer.hide_spaces = not spaces_toggle.value
    viewer.hide_spatial_zones = not spatial_zones_toggle.value
    viewer.hide_opening_elements = not openings_toggle.value
    viewer.hide_annotations = not annotations_toggle.value
    viewer.hide_grids = not grids_toggle.value
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    Finally, display the toggles and viewer
    """)
    return


@app.cell
def _(
    annotations_toggle,
    grids_toggle,
    mo,
    openings_toggle,
    sites_toggle,
    spaces_toggle,
    spatial_zones_toggle,
    viewer,
):
    mo.vstack(
        [
            mo.hstack(
                [
                    sites_toggle,
                    spaces_toggle,
                    spatial_zones_toggle,
                    openings_toggle,
                    annotations_toggle,
                    grids_toggle,
                ]
            ),
            viewer,
        ]
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    Selected elements are returned via the `selected_guids` attribute:
    """)
    return


@app.cell
def _(mo, model, viewer):
    mo.ui.table([model.by_guid(gid).get_info() for gid in viewer.selected_guids if gid])
    return


if __name__ == "__main__":
    app.run()
