from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from src.services.sandbox_service import SandboxService
from typing import Type

class ToolInput(BaseModel):
    """Base model for tool input parameters"""
    pass

class GeospatialTool(ABC):
    def __init__(self):
        self.sandbox = SandboxService()
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        pass
    
    @abstractmethod
    def get_args_schema(self) -> Type[BaseModel]:
        pass
    
    def execute(self, params: dict) -> dict:
        """Execute tool with parameter validation"""
        args_model = self.get_args_schema()
        validated_params = args_model(**params).model_dump()
        return self.sandbox.execute_tool(self.name, validated_params)