import subprocess
import logging
import os
import shutil
import time
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

class SandboxService:
    def __init__(self, container_name="gvisor-worker"):
        self.container_name = container_name
        self.data_workspace = "/data_workspace"
        
        # Ensure workspace exists
        os.makedirs(self.data_workspace, exist_ok=True)

    def _generate_temp_path(self, prefix: str = "output") -> str:
        """Generate a unique temporary file path in the workspace"""
        timestamp = int(time.time() * 1000)
        return os.path.join(self.data_workspace, f"{prefix}_{timestamp}")

    def run_command(self, command: list) -> Tuple[str, str, int]:
        """Execute command in gVisor sandbox"""
        docker_cmd = ["docker", "exec", self.container_name] + command
        
        try:
            result = subprocess.run(
                docker_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.CalledProcessError as e:
            logger.error(f"Sandbox execution failed: {e.stderr}")
            raise RuntimeError(f"Command execution failed: {e.stderr}") from e

    def execute_tool(self, tool_name: str, params: dict) -> dict:
        """Execute a registered tool with parameters"""
        # Special handling for different tool categories
        if tool_name.startswith("gdal_"):
            return self._execute_gdal_tool(tool_name, params)
        elif tool_name.startswith("whitebox_"):
            return self._execute_whitebox_tool(tool_name, params)
        else:
            return self._execute_generic_tool(tool_name, params)

    def _execute_gdal_tool(self, tool_name: str, params: dict) -> dict:
        """Construct and execute GDAL command"""
        # Generate output paths
        input_file = params.get("input_file", "")
        output_file = params.get("output_file", self._generate_temp_path() + ".tif")
        
        # Build command
        cmd = [tool_name.replace("_", "-")]
        
        # Add parameters
        for param, value in params.items():
            if param in ["input_file", "output_file"]:
                continue
            if value is not None:
                if isinstance(value, list):
                    cmd.extend([f"-{param}"] + [str(v) for v in value])
                else:
                    cmd.extend([f"-{param}", str(value)])
        
        cmd.extend([input_file, output_file])
        
        # Execute in sandbox
        stdout, stderr, returncode = self.run_command(cmd)
        
        return {
            "output_file": output_file,
            "stdout": stdout,
            "stderr": stderr,
            "returncode": returncode
        }

    def _execute_whitebox_tool(self, tool_name: str, params: dict) -> dict:
        """Construct and execute WhiteboxTools command"""
        cmd = ["whitebox_tools", f"--run={tool_name}"]
        
        # Add parameters
        for param, value in params.items():
            if param == "output_file":
                output_file = value
            elif value is not None:
                cmd.extend([f"--{param}", str(value)])
        
        # Generate default output if needed
        if "output_file" not in params:
            output_file = self._generate_temp_path() + ".tif"
            cmd.extend(["--output", output_file])
        
        # Execute in sandbox
        stdout, stderr, returncode = self.run_command(cmd)
        
        return {
            "output_file": output_file,
            "stdout": stdout,
            "stderr": stderr,
            "returncode": returncode
        }

    def _execute_generic_tool(self, tool_name: str, params: dict) -> dict:
        """Execute other tools with basic parameter handling"""
        output_file = params.get("output_file", self._generate_temp_path())
        cmd = [tool_name]
        
        # Add parameters
        for param, value in params.items():
            if param == "output_file":
                continue
            cmd.append(str(value))
        
        # Execute in sandbox
        stdout, stderr, returncode = self.run_command(cmd)
        
        return {
            "output_file": output_file,
            "stdout": stdout,
            "stderr": stderr,
            "returncode": returncode
        }

    def cleanup_workspace(self, max_age_hours: int = 24):
        """Clean up old files in the workspace"""
        now = time.time()
        for filename in os.listdir(self.data_workspace):
            filepath = os.path.join(self.data_workspace, filename)
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age_hours * 3600:
                    os.remove(filepath)
                    logger.info(f"Cleaned up old file: {filename}")