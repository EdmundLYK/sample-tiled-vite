# Sandbox Development Plan (Agent Visualization System)

---

## 0. Objective

Build and validate the **agent behavior system in isolation (sandbox)** before integrating into the main project.

Focus:

* Agent spawning
* Log → animation mapping
* Basic interaction
* Minimal visuals (NOT final design)

---

## 1. Phase Overview

| Phase   | Goal                       |
| ------- | -------------------------- |
| Phase 1 | Multi-agent support        |
| Phase 2 | Log-driven behavior        |
| Phase 3 | Action mapping             |
| Phase 4 | Idle vs active logic       |
| Phase 5 | Basic interaction          |
| Phase 6 | Department zoning          |
| Phase 7 | Asset + visual design      |
| Phase 8 | Extraction for integration |

---

## 3. Phase 1 — Multi-Agent System

### Goal:

Support multiple agents instead of one player

### Steps:

* Duplicate player → create 2 agents
* Convert player → Agent class
* Create `AgentManager`

### Output:

* Multiple agents moving independently

---

## 4. Phase 2 — Log Simulation (Core Logic)

### Goal:

Prove behavior system works WITHOUT backend

### Steps:

* Hardcode logs:

  ```ts
  agentManager.updateLogs("A1", {
    action_type: "CREATE_SO"
  })
  ```
* Assign logs to specific agents

### Output:

* Agents respond to fake logs

---

## 5. Phase 3 — Action Mapping System

### Goal:

Map business actions → animations

### Steps:

* Create mapping file:

  ```ts
  const ACTION_MAP = {
    CREATE_SO: "typing",
    CREATE_PO: "typing",
    STOCK_TRANSFER: "walking"
  }
  ```

* Apply mapping in agent logic

### Output:

* Different actions trigger different animations

---

## 6. Phase 4 — Idle vs Active Behavior

### Goal:

Handle agents with no logs

### Steps:

* If log exists → play mapped animation
* Else → run random behavior:

  * walk
  * idle
  * sit

### Output:

* Active agents look “working”
* Inactive agents look “alive”

---

## 7. Phase 5 — Basic Interaction

### Goal:

Minimal UI interaction (no styling yet)

### Steps:

* Hover agent → show last action (tooltip or console)
* Click agent → show log (console first)

### Output:

* Debug-level interaction working

---

## 8. Phase 6 — Department Zoning

### Goal:

Simulate departments (boxes)

### Steps:

* Define zones:

  ```ts
  department = {
    id: "purchase",
    bounds: { x1, y1, x2, y2 }
  }
  ```
* Assign agents to zones
* Restrict movement within zone

### Output:

* Agents stay inside department areas

---

## 9. Phase 7 — Asset & Visual Design (IMPORTANT)

### ⚠️ Only start this AFTER logic works

---

## 9.1 Step 1 — Choose Style Direction

Pick ONE:

* Top-down 2D office
* Isometric office

DO NOT MIX

---

## 9.2 Step 2 — Choose Asset Strategy

### Option A (Fastest - Recommended MVP)

* Use prebuilt packs:

  * Kenney assets
  * itch.io packs

---

### Option B (Custom via AI)

Use tools:

* Midjourney
* DALL·E
* Stable Diffusion

---

## 9.3 Step 3 — Prompt Design (CRITICAL)

Use ONE consistent prompt style:

Example:

```
top-down 2D office game asset, clean minimal style, soft colors, consistent lighting, modern office, flat shading
```

Generate:

* character (walking, sitting)
* desk
* chair
* computer

---

## 9.4 Step 4 — Asset Consistency Check

Ensure:

* Same perspective
* Same scale
* Same lighting
* Same color palette

If not:
→ regenerate

---

## 9.5 Step 5 — Integrate into Sandbox

Replace:

* default sprites → your assets

Test:

* animation clarity
* readability

---

## 9.6 Step 6 — Animation Matching

Map assets to actions:

| Action         | Visual         |
| -------------- | -------------- |
| CREATE_SO      | sitting typing |
| STOCK_TRANSFER | walking        |
| IDLE           | random         |

---

## 10. Phase 8 — Extraction (VERY IMPORTANT)

### Goal:

Prepare for integration into main project

### Steps:

Extract ONLY:

* Agent class
* AgentManager
* Action mapping system
* Animation logic

DO NOT extract:

* entire game engine
* unnecessary demo files

---

## 11. Integration Readiness Checklist

Before moving to main project:

✔ Multi-agent works
✔ Log → animation works
✔ Idle vs active works
✔ Zones work
✔ Assets consistent
✔ No hardcoded junk

---

## 12. Key Rule

Do NOT:

* connect backend early
* design UI early
* polish visuals early

Do:

> prove behavior → THEN improve visuals → THEN integrate

---

## 13. Final Insight

You are building:

> A visual operating system for business activity

If behavior is unclear:
→ system fails

If visuals are inconsistent:
→ system looks amateur

If both are correct:
→ system becomes powerful

---

END
