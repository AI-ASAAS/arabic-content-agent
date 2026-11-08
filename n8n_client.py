"""
n8n API Client for Antigravity Integration
Allows Antigravity to read, create, update, and manage workflows directly.
"""
import os
import sys
import json
import urllib.request
import urllib.error

N8N_BASE_URL = os.environ.get("N8N_BASE_URL", "http://localhost:5678").rstrip("/")
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")

# Load from .env if present
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == "N8N_API_KEY" and not N8N_API_KEY:
                    N8N_API_KEY = v
                elif k == "N8N_BASE_URL" and os.environ.get("N8N_BASE_URL") is None:
                    N8N_BASE_URL = v.rstrip("/")

def _make_request(endpoint, method="GET", data=None):
    if not N8N_API_KEY:
        raise ValueError("N8N_API_KEY is not set. Please set the N8N_API_KEY environment variable or pass it.")
    
    url = f"{N8N_BASE_URL}/api/v1{endpoint}"
    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP Error {e.code}: {e.reason}\nBody: {error_body}")
    except Exception as e:
        raise RuntimeError(f"Request failed: {str(e)}")

def list_workflows():
    return _make_request("/workflows")

def get_workflow(workflow_id):
    return _make_request(f"/workflows/{workflow_id}")

def create_workflow(name, nodes=None, connections=None, settings=None):
    body = {
        "name": name,
        "nodes": nodes or [],
        "connections": connections or {},
        "settings": settings or {}
    }
    return _make_request("/workflows", method="POST", data=body)

def update_workflow(workflow_id, workflow_data):
    return _make_request(f"/workflows/{workflow_id}", method="PUT", data=workflow_data)

def activate_workflow(workflow_id):
    return _make_request(f"/workflows/{workflow_id}/activate", method="POST")

def deactivate_workflow(workflow_id):
    return _make_request(f"/workflows/{workflow_id}/deactivate", method="POST")

def delete_workflow(workflow_id):
    return _make_request(f"/workflows/{workflow_id}", method="DELETE")

def list_executions(workflow_id=None, limit=10):
    endpoint = f"/executions?limit={limit}"
    if workflow_id:
        endpoint += f"&workflowId={workflow_id}"
    return _make_request(endpoint)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python n8n_client.py [list|get <id>|activate <id>|deactivate <id>]")
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    if cmd == "list":
        result = list_workflows()
        print(json.dumps(result, indent=2))
    elif cmd == "get" and len(sys.argv) > 2:
        result = get_workflow(sys.argv[2])
        print(json.dumps(result, indent=2))
    elif cmd == "activate" and len(sys.argv) > 2:
        result = activate_workflow(sys.argv[2])
        print(json.dumps(result, indent=2))
    elif cmd == "deactivate" and len(sys.argv) > 2:
        result = deactivate_workflow(sys.argv[2])
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown command: {cmd}")
