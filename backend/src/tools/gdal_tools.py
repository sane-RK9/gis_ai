from .base import GeospatialTool, ToolInput
from pydantic import Field, conlist

class GdalTranslateInput(ToolInput):
    input_file: str = Field(..., description="Path to input raster file")
    output_file: str = Field(None, description="Path for output raster file")
    of: str = Field("GTiff", description="Output format")
    ot: str = Field(None, description="Output data type")
    scale: conlist(float, min_items=2, max_items=2) = Field(
        None, 
        description="Scaling parameters [min, max]"
    )

class GdalTranslateTool(GeospatialTool):
    @property
    def name(self) -> str:
        return "gdal_translate"
    
    @property
    def description(self) -> str:
        return "Converts raster data between different formats"
    
    def get_args_schema(self) -> Type[ToolInput]:
        return GdalTranslateInput

class GdalWarpInput(ToolInput):
    input_file: str = Field(..., description="Path to input raster file")
    output_file: str = Field(None, description="Path for output raster file")
    t_srs: str = Field(None, description="Target spatial reference")
    te: conlist(float, min_items=4, max_items=4) = Field(
        None,
        description="Target extent [minx, miny, maxx, maxy]"
    )

class GdalWarpTool(GeospatialTool):
    @property
    def name(self) -> str:
        return "gdal_warp"
    
    @property
    def description(self) -> str:
        return "Image reprojection and warping utility"
    
    def get_args_schema(self) -> Type[ToolInput]:
        return GdalWarpInput