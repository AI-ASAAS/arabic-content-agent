import os
import json
import urllib.request
import n8n_client

WORKFLOW_ID = os.environ.get("WORKFLOW_ID", "d4aV1FqCq6JLIR2v")
API_KEY = n8n_client.N8N_API_KEY
BASE_URL = f"{n8n_client.N8N_BASE_URL}/api/v1"

def update_workflow_with_nvidia():
    if not API_KEY:
        print("[!] N8N_API_KEY is not configured in .env or environment variables.")
        return

    # 1. Fetch current workflow
    req = urllib.request.Request(f"{BASE_URL}/workflows/{WORKFLOW_ID}", headers={"X-N8N-API-KEY": API_KEY})
    wf = json.loads(urllib.request.urlopen(req).read())

    nodes = wf["nodes"]
    connections = wf["connections"]

    # 2. Find or replace model node
    for node in nodes:
        if node["id"] == "ag-node-04-gemini-model" or "Chat Model" in node["name"]:
            node["name"] = "NVIDIA Nemotron 3 Ultra (OpenRouter)"
            node["type"] = "@n8n/n8n-nodes-langchain.lmChatOpenAi"
            node["typeVersion"] = 1.2
            node["parameters"] = {
                "model": {
                    "__rl": True,
                    "mode": "id",
                    "value": "nvidia/nemotron-3-ultra-550b-a55b:free"
                },
                "options": {
                    "temperature": 0.6
                }
            }
            node["credentials"] = {
                "openAiApi": {
                    "id": "I1B28r9KIxU2C8yx",
                    "name": "OpenRouter NVIDIA Nemotron"
                }
            }
            print("Updated model node to NVIDIA Nemotron via OpenRouter!")

    # Update connections if node name changed
    old_name = "Google Gemini Chat Model"
    new_name = "NVIDIA Nemotron 3 Ultra (OpenRouter)"
    if old_name in connections:
        connections[new_name] = connections.pop(old_name)

    payload = {
        "name": "Arabic Content Generator - Agentic AI (ASAAS Brand & NVIDIA Nemotron)",
        "nodes": nodes,
        "connections": connections,
        "settings": wf.get("settings", {"executionOrder": "v1"})
    }

    put_req = urllib.request.Request(
        f"{BASE_URL}/workflows/{WORKFLOW_ID}",
        headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
        data=json.dumps(payload).encode(),
        method="PUT"
    )

    res = urllib.request.urlopen(put_req)
    updated = json.loads(res.read())
    print("Successfully updated workflow in n8n!")
    print("Workflow Name:", updated.get("name"))

    with open("agentic_workflow.json", "w", encoding="utf-8") as f:
        json.dump(updated, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    update_workflow_with_nvidia()
