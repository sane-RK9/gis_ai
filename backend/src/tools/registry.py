from .gdal_tools import GdalTranslateTool, GdalWarpTool
from .whitebox_tools import BreachDepressionsTool, FlowAccumulationTool
from .base import GeospatialTool
from typing import Dict, Type
import logging

logger = logging.getLogger(__name__)

# Define all tool classes in a list
_TOOL_CLASSES: list[Type[GeospatialTool]] = [
    GdalTranslateTool,
    GdalWarpTool,
    BreachDepressionsTool,
    FlowAccumulationTool,
    # Add your mock STAC tool class here as well if needed
]

# The registry will hold instances of the tools
TOOL_REGISTRY: Dict[str, GeospatialTool] = {}

def initialize_tools():
    """Initializes and registers all available tools."""
    if TOOL_REGISTRY:  # Prevent re-initialization
        return

    # Add any non-standard or dynamically created tools here
    from pydantic import BaseModel, Field

    class StacSearchInput(BaseModel):
        bbox: list = Field(..., description="Bounding box [minx, miny, maxx, maxy]")
        collections: list = Field(["sentinel-2-l2a"], description="STAC collections to search")
        datetime: str = Field("2023-01-01/2023-12-31", description="Time range")
        limit: int = Field(10, description="Max items to return")

    class StacSearchTool(GeospatialTool):
        @property
        def name(self) -> str: return "stac_search"
        @property
        def description(self) -> str: return "Search STAC catalogs for geospatial assets"
        def get_args_schema(self) -> Type[BaseModel]: return StacSearchInput
        
        def execute(self, params: dict) -> dict:
            # This tool is special and doesn't use the sandbox
            logger.info(f"Executing STAC search with params: {params}")
            # In a real implementation, you'd use a STAC client like pystac-client
            return {
                "items_found": 2,
                "results": [
                    {"id": "S2A_12345", "asset_href": "/data_workspace/S2A_12345.tif"},
                    {"id": "S2B_67890", "asset_href": "/data_workspace/S2B_67890.tif"}
                ]
            }

    _TOOL_CLASSES.append(StacSearchTool) # Add the dynamically defined class

    for tool_class in _TOOL_CLASSES:
        try:
            tool_instance = tool_class()
            TOOL_REGISTRY[tool_instance.name] = tool_instance
            logger.info(f"Registered tool: {tool_instance.name}")
        except Exception as e:
            logger.error(f"Failed to register tool {tool_class.__name__}: {e}")

# Call this once on application startup
initialize_tools()


def get_tool_by_name(name: str) -> GeospatialTool:
    if name not in TOOL_REGISTRY:
        raise ValueError(f"Tool '{name}' not found in registry.")
    return TOOL_REGISTRY[name]

def list_available_tools() -> list[dict]:
    tool_list = []
    for tool in TOOL_REGISTRY.values():
        try:
            schema = tool.get_args_schema().model_json_schema()
            tool_list.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": schema
            })
        except Exception as e:
            logger.error(f"Could not generate schema for tool {tool.name}: {e}")
    return tool_list