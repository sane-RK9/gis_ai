FROM python:3.11-slim

WORKDIR /app


RUN apt-get update && \
    apt-get install -y curl docker.io && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy dependency configuration AND the source code
COPY pyproject.toml ./
COPY ./src ./src

# Install the project and its dependencies
RUN pip install .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application with live reload
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]