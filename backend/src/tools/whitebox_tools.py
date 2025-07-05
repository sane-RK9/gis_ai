from .base import GeospatialTool, ToolInput
from pydantic import Field

class BreachDepressionsInput(ToolInput):
    dem: str = Field(..., description="Input DEM raster file")
    output: str = Field(None, description="Output raster file")
    fill_depth: float = Field(100.0, description="Maximum breach channel depth")

class BreachDepressionsTool(GeospatialTool):
    @property
    def name(self) -> str:
        return "whitebox_breach_depressions"
    
    @property
    def description(self) -> str:
        return "Breaches topographic depressions in a DEM"
    
    def get_args_schema(self) -> Type[ToolInput]:
        return BreachDepressionsInput

class FlowAccumulationInput(ToolInput):
    dem: str = Field(..., description="Input DEM raster file")
    output: str = Field(None, description="Output raster file")
    method: str = Field("D8", description="Flow accumulation method")

class FlowAccumulationTool(GeospatialTool):
    @property
    def name(self) -> str:
        return "whitebox_flow_accumulation"
    
    @property
    def description(self) -> str:
        return "Calculates flow accumulation from a DEM"
    
    def get_args_schema(self) -> Type[ToolInput]:
        return FlowAccumulationInput