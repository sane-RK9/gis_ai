from .base import GeospatialTool, ToolInput
from pydantic import Field
from typing import List, Type, Annotated 


GdalScale = Annotated[List[float], Field(min_length=2, max_length=2)]
GdalExtent = Annotated[List[float], Field(min_length=4, max_length=4)]

class GdalTranslateInput(ToolInput):
    input_file: str = Field(..., description="Path to input raster file")
    output_file: str = Field(None, description="Path for output raster file")
    of: str = Field("GTiff", description="Output format")
    ot: str = Field(None, description="Output data type")
    scale: GdalScale = Field(
        None, 
        description="Scaling parameters [src_min, src_max, dst_min, dst_max] or [src_min, src_max]"
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
    te: GdalExtent = Field(
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