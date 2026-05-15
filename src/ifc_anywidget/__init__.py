from importlib.metadata import version
from pathlib import Path

import anywidget
import ifcopenshell
import traitlets

__version__ = version("ifc-anywidget")

def ifc_to_json(ifc_model: ifcopenshell.file, _widget: anywidget.AnyWidget):
    """Serialize an IFC model to string and pass it as JSON to the frontend."""
    return {"contents": ifc_model.to_string()}


class IfcViewer(anywidget.AnyWidget):
    """IFC viewer widget."""

    _esm = Path(__file__).with_name("index.js")
    ifc_model = traitlets.Instance(ifcopenshell.file).tag(
        sync=True, to_json=ifc_to_json
    )
    selected_guids = traitlets.List(trait=traitlets.Unicode(), allow_none=True).tag(
        sync=True
    )
