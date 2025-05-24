from pathlib import Path

import anywidget
import traitlets
import ifcopenshell


__version__ = "0.1.0"


def ifc_to_json(ifc_model: ifcopenshell.file, widget: anywidget.AnyWidget):
    return {
        "contents": ifc_model.to_string(),
    }


class IfcViewer(anywidget.AnyWidget):
    _esm = Path(__file__).with_name("index.js")
    _css = Path(__file__).with_name("index.css")
    ifc_model = traitlets.Instance(ifcopenshell.file).tag(sync=True, to_json=ifc_to_json)
    selected_guids = traitlets.List(trait=traitlets.Unicode(), allow_none=True).tag(sync=True)
