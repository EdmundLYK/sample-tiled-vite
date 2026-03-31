import * as ex from 'excalibur';
import { Config } from './config';
import { DepartmentBaseMapResources, loader, Resources } from './resources';
import { AgentManager } from './agent-manager';
import { DEPARTMENTS, getDepartmentById } from './departments';

type OfficePropSpriteKey =
  | 'OfficeDeskWithPcPng'
  | 'OfficeDeskPng'
  | 'OfficeChairPng'
  | 'OfficePc1Png'
  | 'OfficePc2Png'
  | 'OfficePlantPng'
  | 'OfficeTrashPng'
  | 'OfficeCabinetPng'
  | 'OfficeWaterCoolerPng'
  | 'OfficePrinterPng'
  | 'OfficePartition1Png'
  | 'OfficePartition2Png'
  | 'OfficeCoffeeMakerPng'
  | 'OfficeStampingTablePng';

interface OfficePropPlacement {
  spriteKey: OfficePropSpriteKey;
  x: number;
  y: number;
  z?: number;
  flipX?: boolean;
  rotation?: number;
}

const OFFICE_LAYOUTS: Record<string, OfficePropPlacement[]> = {
  sales: [
    { spriteKey: 'OfficeCabinetPng', x: 12, y: 30, z: 33 },
    { spriteKey: 'OfficeWaterCoolerPng', x: 132, y: 30, z: 33 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 20, y: 56, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 62, y: 56, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 20, y: 68, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 62, y: 68, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 20, y: 62, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 62, y: 62, z: 29, flipX: true },
    { spriteKey: 'OfficeDeskWithPcPng', x: 20, y: 94, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 62, y: 94, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 20, y: 106, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 62, y: 106, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 20, y: 100, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 62, y: 100, z: 29, flipX: true },
    { spriteKey: 'OfficeDeskWithPcPng', x: 20, y: 132, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 62, y: 132, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 20, y: 144, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 62, y: 144, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 20, y: 138, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 62, y: 138, z: 29, flipX: true },
    { spriteKey: 'OfficeCoffeeMakerPng', x: 148, y: 90, z: 33, rotation: Math.PI / 2 },
    { spriteKey: 'OfficeStampingTablePng', x: 156, y: 126, z: 33, rotation: Math.PI / 2 },
    { spriteKey: 'OfficePrinterPng', x: 20, y: 170, z: 33 },
    { spriteKey: 'OfficeTrashPng', x: 118, y: 170, z: 33 },
    { spriteKey: 'OfficePlantPng', x: 132, y: 152, z: 32 }
  ],
  purchase: [
    { spriteKey: 'OfficeDeskWithPcPng', x: 272, y: 64, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 336, y: 64, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 272, y: 82, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 336, y: 82, z: 31 },
    { spriteKey: 'OfficeDeskPng', x: 272, y: 122, z: 30 },
    { spriteKey: 'OfficeDeskPng', x: 336, y: 122, z: 30 },
    { spriteKey: 'OfficePc1Png', x: 272, y: 114, z: 32 },
    { spriteKey: 'OfficePc2Png', x: 336, y: 114, z: 32 },
    { spriteKey: 'OfficeChairPng', x: 272, y: 138, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 336, y: 138, z: 31 },
    { spriteKey: 'OfficePlantPng', x: 368, y: 152, z: 32 }
  ],
  operations: [
    { spriteKey: 'OfficeDeskWithPcPng', x: 48, y: 288, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 112, y: 288, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 48, y: 306, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 112, y: 306, z: 31 },
    { spriteKey: 'OfficeDeskPng', x: 48, y: 346, z: 30 },
    { spriteKey: 'OfficeDeskPng', x: 112, y: 346, z: 30 },
    { spriteKey: 'OfficePc1Png', x: 48, y: 338, z: 32 },
    { spriteKey: 'OfficePc2Png', x: 112, y: 338, z: 32 },
    { spriteKey: 'OfficeChairPng', x: 48, y: 362, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 112, y: 362, z: 31 },
    { spriteKey: 'OfficePlantPng', x: 144, y: 374, z: 32 }
  ]
};

function spawnOfficeProps(scene: ex.Scene): void {
  for (const department of DEPARTMENTS) {
    const placements = OFFICE_LAYOUTS[department.id] ?? [];
    for (const prop of placements) {
      const sprite = Resources[prop.spriteKey].toSprite();
      const actor = new ex.Actor({
        pos: ex.vec(prop.x, prop.y),
        collisionType: ex.CollisionType.PreventCollision
      });
      actor.graphics.use(sprite);
      actor.scale = ex.vec(
        Config.OfficePropScale * (prop.flipX ? -1 : 1),
        Config.OfficePropScale
      );
      actor.rotation = prop.rotation ?? 0;
      actor.z = prop.z ?? 30;
      scene.add(actor);
    }
  }
}

const game = new ex.Engine({
  canvasElementId: 'game',
  displayMode: ex.DisplayMode.FillScreen,
  pixelArt: true,
  pixelRatio: 2
});

game.start(loader).then(() => {
  document.documentElement.style.width = '100%';
  document.documentElement.style.height = '100%';
  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  document.body.style.width = '100%';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#111722';

  for (const department of DEPARTMENTS) {
    const mapResource = DepartmentBaseMapResources[department.baseMapKey as keyof typeof DepartmentBaseMapResources];
    if (!mapResource) {
      throw new Error(`No tiled resource configured for baseMapKey "${department.baseMapKey}"`);
    }
    mapResource.addToScene(game.currentScene);
  }
  spawnOfficeProps(game.currentScene);
  const worldBoundsPadding = 12;
  const worldBounds = {
    minX: Math.min(...DEPARTMENTS.map((d) => d.bounds.x1)) - worldBoundsPadding,
    maxX: Math.max(...DEPARTMENTS.map((d) => d.bounds.x2)) + worldBoundsPadding,
    minY: Math.min(...DEPARTMENTS.map((d) => d.bounds.y1)) - worldBoundsPadding,
    maxY: Math.max(...DEPARTMENTS.map((d) => d.bounds.y2)) + worldBoundsPadding
  };

  const clampCameraToWorld = () => {
    const camera = game.currentScene.camera;
    const halfVisibleWidth = game.screen.drawWidth / (camera.zoom * 2);
    const halfVisibleHeight = game.screen.drawHeight / (camera.zoom * 2);
    const minX = worldBounds.minX + halfVisibleWidth;
    const maxX = worldBounds.maxX - halfVisibleWidth;
    const minY = worldBounds.minY + halfVisibleHeight;
    const maxY = worldBounds.maxY - halfVisibleHeight;

    if (minX > maxX || minY > maxY) {
      camera.pos = ex.vec(
        (worldBounds.minX + worldBounds.maxX) / 2,
        (worldBounds.minY + worldBounds.maxY) / 2
      );
      return;
    }

    camera.pos = ex.vec(
      clamp(camera.pos.x, minX, maxX),
      clamp(camera.pos.y, minY, maxY)
    );
  };

  const fitCameraToDepartments = () => {
    const minX = Math.min(...DEPARTMENTS.map((d) => d.bounds.x1));
    const maxX = Math.max(...DEPARTMENTS.map((d) => d.bounds.x2));
    const minY = Math.min(...DEPARTMENTS.map((d) => d.bounds.y1));
    const maxY = Math.max(...DEPARTMENTS.map((d) => d.bounds.y2));

    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;
    const zoomByWidth = game.screen.drawWidth / worldWidth;
    const zoomByHeight = game.screen.drawHeight / worldHeight;
    const zoom = Math.max(1, Math.min(3.2, Math.min(zoomByWidth, zoomByHeight) * 1.2));

    game.currentScene.camera.pos = ex.vec((minX + maxX) / 2, (minY + maxY) / 2);
    game.currentScene.camera.zoom = zoom;
    clampCameraToWorld();
  };
  fitCameraToDepartments();
  game.screen.events.on('resize', () => {
    fitCameraToDepartments();
  });

  window.addEventListener(
    'wheel',
    (event) => {
      const camera = game.currentScene.camera;
      const scrollScale = 0.45 / camera.zoom;
      camera.pos = ex.vec(
        camera.pos.x + event.deltaX * scrollScale,
        camera.pos.y + event.deltaY * scrollScale
      );
      clampCameraToWorld();
      event.preventDefault();
    },
    { passive: false }
  );

  window.setInterval(() => {
    let dx = 0;
    let dy = 0;

    if (game.input.keyboard.isHeld(ex.Keys.Left) || game.input.keyboard.isHeld(ex.Keys.A)) {
      dx -= 1;
    }
    if (game.input.keyboard.isHeld(ex.Keys.Right) || game.input.keyboard.isHeld(ex.Keys.D)) {
      dx += 1;
    }
    if (game.input.keyboard.isHeld(ex.Keys.Up) || game.input.keyboard.isHeld(ex.Keys.W)) {
      dy -= 1;
    }
    if (game.input.keyboard.isHeld(ex.Keys.Down) || game.input.keyboard.isHeld(ex.Keys.S)) {
      dy += 1;
    }

    if (dx === 0 && dy === 0) {
      return;
    }

    const direction = ex.vec(dx, dy).normalize();
    const camera = game.currentScene.camera;
    const step = (5.5 / camera.zoom);
    camera.pos = camera.pos.add(direction.scale(step));
    clampCameraToWorld();
  }, 16);

  const bubbleStyles = document.createElement('style');
  bubbleStyles.textContent = `
    .agent-action-bubble {
      position: fixed;
      left: 0;
      top: 0;
      display: none;
      transform: translate(-50%, -112%);
      padding: 3px 9px;
      background: rgba(255, 255, 255, 0.98);
      color: #2c2a1d;
      font-family: monospace;
      font-size: 10px;
      line-height: 1.2;
      white-space: nowrap;
      border: 1px solid rgba(72, 66, 36, 0.38);
      border-radius: 999px;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
      pointer-events: none;
      z-index: 9998;
    }

    .agent-action-bubble::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -6px;
      width: 9px;
      height: 9px;
      background: rgba(255, 255, 255, 0.98);
      border-right: 1px solid rgba(72, 66, 36, 0.34);
      border-bottom: 1px solid rgba(72, 66, 36, 0.34);
      transform: translateX(-50%) rotate(45deg);
    }

    .department-zone-box {
      position: fixed;
      box-sizing: border-box;
      border: none;
      background: transparent;
      pointer-events: none;
      z-index: 200;
    }

    .department-zone-box-label {
      position: absolute;
      left: 4px;
      top: 4px;
      padding: 1px 4px;
      font-family: monospace;
      font-size: 10px;
      line-height: 1.2;
      color: #f3fbff;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 4px;
    }
  `;
  document.head.appendChild(bubbleStyles);

  const salesDepartment = getDepartmentById('sales');
  const purchaseDepartment = getDepartmentById('purchase');
  const operationsDepartment = getDepartmentById('operations');

  const agentManager = new AgentManager(game.currentScene);
  const agents = agentManager.spawnAgents([
    {
      id: 'A1',
      pos: ex.vec(salesDepartment.defaultSpawn.x, salesDepartment.defaultSpawn.y),
      departmentZone: salesDepartment
    },
    {
      id: 'A2',
      pos: ex.vec(purchaseDepartment.defaultSpawn.x, purchaseDepartment.defaultSpawn.y),
      departmentZone: purchaseDepartment
    },
    {
      id: 'A3',
      pos: ex.vec(operationsDepartment.defaultSpawn.x, operationsDepartment.defaultSpawn.y),
      departmentZone: operationsDepartment
    },
    {
      id: 'A4',
      pos: ex.vec(salesDepartment.defaultSpawn.x + 28, salesDepartment.defaultSpawn.y),
      departmentZone: salesDepartment
    }
  ]);

  const COMMAND_COOLDOWN_MS = 7000;
  const nextCommandAtByAgent = new Map<string, number>();
  const wasActiveByAgent = new Map<string, boolean>();

  const dispatchCommandForAgent = (agentId: string) => {
    switch (agentId) {
      case 'A1':
      case 'A4':
        agentManager.updateLogs(agentId, {
          action_type: 'CREATE_SO',
          durationMs: 5000,
          note: 'Simulated sales-order creation'
        });
        return;
      case 'A2':
        agentManager.updateLogs(agentId, {
          action_type: 'STOCK_TRANSFER',
          direction: Math.random() < 0.5 ? 'left' : 'right',
          durationMs: 2200,
          note: 'Simulated stock movement'
        });
        return;
      case 'A3':
        agentManager.updateLogs(agentId, {
          action_type: 'CREATE_PO',
          durationMs: 4200,
          note: 'Simulated purchase-order creation'
        });
        return;
      default:
        return;
    }
  };

  const initializeCommandScheduler = () => {
    const now = Date.now();
    for (const status of agentManager.getDebugSnapshot()) {
      nextCommandAtByAgent.set(status.id, now);
      wasActiveByAgent.set(status.id, status.state === 'active');
    }
  };

  initializeCommandScheduler();
  window.setInterval(() => {
    const now = Date.now();
    const snapshot = agentManager.getDebugSnapshot();

    for (const status of snapshot) {
      const wasActive = wasActiveByAgent.get(status.id) ?? false;
      const isActive = status.state === 'active';
      if (wasActive && !isActive) {
        nextCommandAtByAgent.set(status.id, now + COMMAND_COOLDOWN_MS);
      }
      wasActiveByAgent.set(status.id, isActive);

      const nextCommandAt = nextCommandAtByAgent.get(status.id) ?? now;
      if (!isActive && now >= nextCommandAt) {
        dispatchCommandForAgent(status.id);
        nextCommandAtByAgent.set(status.id, Number.POSITIVE_INFINITY);
        wasActiveByAgent.set(status.id, true);
      }
    }
  }, 250);

  const hoverTooltip = document.createElement('div');
  hoverTooltip.style.position = 'fixed';
  hoverTooltip.style.right = '12px';
  hoverTooltip.style.top = '12px';
  hoverTooltip.style.display = 'none';
  hoverTooltip.style.padding = '8px 10px';
  hoverTooltip.style.background = 'rgba(22, 18, 10, 0.85)';
  hoverTooltip.style.color = '#fff9e8';
  hoverTooltip.style.fontFamily = 'monospace';
  hoverTooltip.style.fontSize = '12px';
  hoverTooltip.style.lineHeight = '1.35';
  hoverTooltip.style.whiteSpace = 'pre';
  hoverTooltip.style.border = '1px solid rgba(255, 226, 138, 0.35)';
  hoverTooltip.style.borderRadius = '6px';
  hoverTooltip.style.pointerEvents = 'none';
  hoverTooltip.style.zIndex = '9999';
  document.body.appendChild(hoverTooltip);

  let hoveredAgentId: string | null = null;
  const actionBubbles = new Map<string, HTMLDivElement>();
  const departmentBoxes = new Map<string, HTMLDivElement>();

  for (const department of DEPARTMENTS) {
    const zoneBox = document.createElement('div');
    zoneBox.className = 'department-zone-box';
    zoneBox.style.borderColor = department.debugColor;
    zoneBox.style.background = department.debugFillColor;

    const zoneLabel = document.createElement('div');
    zoneLabel.className = 'department-zone-box-label';
    zoneLabel.textContent = `${department.label} (${department.baseMapKey})`;
    zoneBox.appendChild(zoneLabel);

    document.body.appendChild(zoneBox);
    departmentBoxes.set(department.id, zoneBox);
  }

  for (const agent of agents) {
    const bubble = document.createElement('div');
    bubble.className = 'agent-action-bubble';
    bubble.textContent = `${agent.id}: NO_LOG`;
    document.body.appendChild(bubble);
    actionBubbles.set(agent.id, bubble);

    agent.on('pointerenter', () => {
      hoveredAgentId = agent.id;
      const action = agentManager.getLastLog(agent.id)?.action_type ?? 'NO_LOG';
      console.log(`[Hover] ${agent.id} last action -> ${action}`);
    });

    agent.on('pointerleave', () => {
      if (hoveredAgentId === agent.id) {
        hoveredAgentId = null;
      }
    });

    agent.on('pointerup', () => {
      const fullLog = agentManager.getLastLog(agent.id) ?? null;
      console.log(`[Click] ${agent.id} full log`, fullLog);
    });
  }

  const debugHud = document.createElement('pre');
  debugHud.style.position = 'fixed';
  debugHud.style.left = '12px';
  debugHud.style.top = '12px';
  debugHud.style.margin = '0';
  debugHud.style.padding = '8px 10px';
  debugHud.style.background = 'rgba(0, 0, 0, 0.7)';
  debugHud.style.color = '#eaf7ff';
  debugHud.style.fontFamily = 'monospace';
  debugHud.style.fontSize = '12px';
  debugHud.style.lineHeight = '1.35';
  debugHud.style.border = '1px solid rgba(255,255,255,0.25)';
  debugHud.style.borderRadius = '6px';
  debugHud.style.pointerEvents = 'none';
  debugHud.style.zIndex = '9999';
  document.body.appendChild(debugHud);

  const renderDebugHud = () => {
    const snapshot = agentManager.getDebugSnapshot();
    const lines = snapshot.map((entry) => {
      const seconds = (entry.remainingMs / 1000).toFixed(1);
      const department = entry.zoneId ? getDepartmentById(entry.zoneId) : null;
      return `${entry.id} | zone:${entry.zoneId ?? 'none'} | base:${department?.baseMapKey ?? 'none'} | ${entry.state} | ${entry.mode} | ${entry.actionType} | ${entry.behavior} | ${seconds}s`;
    });
    debugHud.textContent = ['Agent Commands (Scrollable Multi-Department View)', ...lines].join('\n');

    for (const department of DEPARTMENTS) {
      const zoneBox = departmentBoxes.get(department.id);
      if (!zoneBox) {
        continue;
      }

      const p1 = game.screen.worldToPageCoordinates(ex.vec(department.bounds.x1, department.bounds.y1));
      const p2 = game.screen.worldToPageCoordinates(ex.vec(department.bounds.x2, department.bounds.y2));
      const left = Math.min(p1.x, p2.x);
      const top = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);
      zoneBox.style.left = `${left}px`;
      zoneBox.style.top = `${top}px`;
      zoneBox.style.width = `${width}px`;
      zoneBox.style.height = `${height}px`;
    }

    for (const agent of agents) {
      const bubble = actionBubbles.get(agent.id);
      if (!bubble) {
        continue;
      }

      if (hoveredAgentId !== agent.id) {
        bubble.style.display = 'none';
        continue;
      }

      const status = snapshot.find((entry) => entry.id === agent.id);
      const anchorWorldPos = ex.vec(agent.pos.x, agent.pos.y - agent.height + 3);
      const pagePos = game.screen.worldToPageCoordinates(anchorWorldPos);
      bubble.style.display = 'block';
      bubble.style.left = `${pagePos.x}px`;
      bubble.style.top = `${pagePos.y}px`;
      bubble.textContent = `${agent.id}: ${status?.actionType ?? 'NO_LOG'}`;
      bubble.style.opacity = status?.state === 'active' ? '1' : '0.7';
    }

    if (!hoveredAgentId) {
      hoverTooltip.style.display = 'none';
      return;
    }

    const hoveredStatus = snapshot.find((entry) => entry.id === hoveredAgentId);
    const hoveredLog = agentManager.getLastLog(hoveredAgentId);
    hoverTooltip.style.display = 'block';
    hoverTooltip.textContent = [
      `Hover: ${hoveredAgentId}`,
      `Last action: ${hoveredLog?.action_type ?? 'NO_LOG'}`,
      `Mode: ${hoveredStatus?.state ?? 'unknown'} / ${hoveredStatus?.behavior ?? 'unknown'}`
    ].join('\n');
  };

  renderDebugHud();
  window.setInterval(renderDebugHud, 120);
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
