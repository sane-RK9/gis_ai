# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install poetry for dependency management
# This step is removed to simplify; we will use pip directly with pyproject.toml
# RUN pip install poetry

# Copy only the dependency configuration files
COPY pyproject.toml ./

# Copy the application source code
COPY ./src ./src

# Install project dependencies
# The '.' installs the project itself along with its dependencies
RUN pip install .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
# uvicorn src.api.main:app --host 0.0.0.0 --port 8000
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]