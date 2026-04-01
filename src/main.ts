import * as ex from 'excalibur';
import { Config } from './config';
import { DepartmentBaseMapResources, loader, Resources } from './resources';
import { AgentManager } from './agent-manager';
import { DEPARTMENTS, getDepartmentById } from './departments';
import {
  addCustomCharacter,
  canUseCharacterStore,
  CharacterDepartmentId,
  CustomCharacterRecord,
  deleteCustomCharacter,
  fetchCustomCharacters
} from './character-store';

type OfficePropSpriteKey =
  | 'OfficeDeskWithPcPng'
  | 'OfficeChairPng'
  | 'OfficePartition1Png'
  | 'OfficePartition2Png';

interface OfficePropPlacement {
  spriteKey: OfficePropSpriteKey;
  x: number;
  y: number;
  z?: number;
  flipX?: boolean;
  rotation?: number;
}

interface RuntimeAgentMeta {
  displayName: string;
  customCharacterId: string | null;
}

const SALES_COLUMNS = 4;
const SALES_ROWS = 6;
const SALES_START_X = 68;
const SALES_START_Y = 44;
const SALES_STEP_X = 42;
const SALES_STEP_Y = 34;
const SALES_PARTITION_RIGHT_OFFSET = 4;

function buildSalesOfficeLayout(): OfficePropPlacement[] {
  const placements: OfficePropPlacement[] = [];

  for (let row = 0; row < SALES_ROWS; row += 1) {
    for (let col = 0; col < SALES_COLUMNS; col += 1) {
      const x = SALES_START_X + col * SALES_STEP_X;
      const y = SALES_START_Y + row * SALES_STEP_Y;
      placements.push({ spriteKey: 'OfficeDeskWithPcPng', x, y, z: 30 });
      placements.push({ spriteKey: 'OfficeChairPng', x, y: y + 12, z: 31 });
      placements.push({
        spriteKey: 'OfficePartition1Png',
        x: x + SALES_PARTITION_RIGHT_OFFSET,
        y: y + 6,
        z: 29,
        flipX: true
      });
    }
  }

  return placements;
}

const OFFICE_LAYOUTS: Record<string, OfficePropPlacement[]> = {
  sales: buildSalesOfficeLayout(),
  purchase: [
    { spriteKey: 'OfficeDeskWithPcPng', x: 368, y: 64, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 432, y: 64, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 368, y: 82, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 432, y: 82, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 368, y: 76, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 432, y: 76, z: 29, flipX: true },
    { spriteKey: 'OfficeDeskWithPcPng', x: 368, y: 122, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 432, y: 122, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 368, y: 138, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 432, y: 138, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 368, y: 132, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 432, y: 132, z: 29, flipX: true }
  ],
  operations: [
    { spriteKey: 'OfficeDeskWithPcPng', x: 640, y: 64, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 704, y: 64, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 640, y: 82, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 704, y: 82, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 640, y: 76, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 704, y: 76, z: 29, flipX: true },
    { spriteKey: 'OfficeDeskWithPcPng', x: 640, y: 122, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 704, y: 122, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 640, y: 138, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 704, y: 138, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 640, y: 132, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 704, y: 132, z: 29, flipX: true }
  ]
};

function spawnDepartmentWalls(scene: ex.Scene): void {
  const wallThickness = 6;
  const wallColor = ex.Color.fromHex('#4c5f6d');

  for (const department of DEPARTMENTS) {
    const { x1, y1, x2, y2 } = department.bounds;
    const width = x2 - x1;
    const height = y2 - y1;
    const wallSegments = [
      { x: (x1 + x2) / 2, y: y1 + wallThickness / 2, width, height: wallThickness },
      { x: (x1 + x2) / 2, y: y2 - wallThickness / 2, width, height: wallThickness },
      { x: x1 + wallThickness / 2, y: (y1 + y2) / 2, width: wallThickness, height },
      { x: x2 - wallThickness / 2, y: (y1 + y2) / 2, width: wallThickness, height }
    ];

    for (const segment of wallSegments) {
      const wall = new ex.Actor({
        pos: ex.vec(segment.x, segment.y),
        width: segment.width,
        height: segment.height,
        collisionType: ex.CollisionType.PreventCollision
      });
      wall.graphics.use(
        new ex.Rectangle({
          width: segment.width,
          height: segment.height,
          color: wallColor
        })
      );
      wall.z = 28;
      scene.add(wall);
    }
  }
}

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
  spawnDepartmentWalls(game.currentScene);
  spawnOfficeProps(game.currentScene);
  const worldBoundsPadding = 12;
  const worldBoundsLeftPadding = 30;
  const worldBounds = {
    minX: Math.min(...DEPARTMENTS.map((d) => d.bounds.x1)) - worldBoundsLeftPadding,
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

    // Fit zoom against actual department layout size (not extra clamp padding),
    // so the whole scene stays larger while still allowing left-side camera room.
    const layoutWidth = (maxX - minX) + worldBoundsPadding * 2;
    const layoutHeight = (maxY - minY) + worldBoundsPadding * 2;
    const zoomByWidth = game.screen.drawWidth / layoutWidth;
    const zoomByHeight = game.screen.drawHeight / layoutHeight;
    const zoom = Math.max(1.22, Math.min(4.0, Math.min(zoomByWidth, zoomByHeight) * 1.42));

    game.currentScene.camera.pos = ex.vec((minX + maxX) / 2, (minY + maxY) / 2);
    game.currentScene.camera.zoom = zoom;
    clampCameraToWorld();
  };

  const setInitialCameraAngle = () => {
    const sales = getDepartmentById('sales');
    const desiredSalesLeftPx = Math.min(500, Math.max(500, window.innerWidth * 0.22));
    const halfScreenPx = window.innerWidth / 2;
    const salesLeftWorldX = sales.bounds.x1;
    const salesCenterY = (sales.bounds.y1 + sales.bounds.y2) / 2;
    const targetCameraX = salesLeftWorldX - (desiredSalesLeftPx - halfScreenPx) / game.currentScene.camera.zoom;
    game.currentScene.camera.pos = ex.vec(targetCameraX, salesCenterY);
    clampCameraToWorld();
  };

  fitCameraToDepartments();
  setInitialCameraAngle();
  game.screen.events.on('resize', () => {
    fitCameraToDepartments();
    setInitialCameraAngle();
  });

  let closeDetailPanel: (() => void) | null = null;

  window.addEventListener(
    'wheel',
    (event) => {
      const camera = game.currentScene.camera;
      const scrollScale = 0.45 / camera.zoom;
      const horizontalDelta = event.deltaX + event.deltaY;
      if (horizontalDelta !== 0) {
        closeDetailPanel?.();
      }
      camera.pos = ex.vec(camera.pos.x + horizontalDelta * scrollScale, camera.pos.y);
      clampCameraToWorld();
      event.preventDefault();
    },
    { passive: false }
  );

  window.setInterval(() => {
    let dx = 0;

    if (game.input.keyboard.isHeld(ex.Keys.Left) || game.input.keyboard.isHeld(ex.Keys.A)) {
      dx -= 1;
    }
    if (game.input.keyboard.isHeld(ex.Keys.Right) || game.input.keyboard.isHeld(ex.Keys.D)) {
      dx += 1;
    }

    if (dx === 0) {
      return;
    }

    closeDetailPanel?.();

    const camera = game.currentScene.camera;
    const step = 5.5 / camera.zoom;
    camera.pos = ex.vec(camera.pos.x + dx * step, camera.pos.y);
    clampCameraToWorld();
  }, 16);

  const bubbleStyles = document.createElement('style');
  bubbleStyles.textContent = `
    .agent-name-tag {
      position: fixed;
      left: 0;
      top: 0;
      display: block;
      transform: translate(-50%, -112%);
      padding: 2px 7px;
      background: rgba(14, 18, 27, 0.9);
      color: #f6fbff;
      font-family: monospace;
      font-size: 10px;
      line-height: 1.2;
      white-space: nowrap;
      border: 1px solid rgba(147, 219, 255, 0.35);
      border-radius: 999px;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
      pointer-events: none;
      z-index: 9998;
    }

    .agent-name-tag::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -6px;
      width: 9px;
      height: 9px;
      background: rgba(14, 18, 27, 0.9);
      border-right: 1px solid rgba(147, 219, 255, 0.3);
      border-bottom: 1px solid rgba(147, 219, 255, 0.3);
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
  const agentMetaById = new Map<string, RuntimeAgentMeta>([
    ['A1', { displayName: 'A1', customCharacterId: null }],
    ['A2', { displayName: 'A2', customCharacterId: null }],
    ['A3', { displayName: 'A3', customCharacterId: null }],
    ['A4', { displayName: 'A4', customCharacterId: null }]
  ]);
  const customCharacterRows = new Map<string, CustomCharacterRecord>();
  let customAgentCounter = 1;

  const COMMAND_COOLDOWN_MS = 7000;
  const nextCommandAtByAgent = new Map<string, number>();
  const wasActiveByAgent = new Map<string, boolean>();

  const dispatchCommandForAgent = (agentId: string, zoneId: string | null) => {
    switch (zoneId) {
      case 'sales':
        agentManager.updateLogs(agentId, {
          action_type: 'CREATE_SO',
          durationMs: 5000,
          note: 'Simulated sales-order creation'
        });
        return;
      case 'purchase':
        agentManager.updateLogs(agentId, {
          action_type: 'STOCK_TRANSFER',
          direction: Math.random() < 0.5 ? 'left' : 'right',
          durationMs: 2200,
          note: 'Simulated stock movement'
        });
        return;
      case 'operations':
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
        dispatchCommandForAgent(status.id, status.zoneId);
        nextCommandAtByAgent.set(status.id, Number.POSITIVE_INFINITY);
        wasActiveByAgent.set(status.id, true);
      }
    }
  }, 250);

  const hoverTooltip = document.createElement('div');
  hoverTooltip.style.position = 'fixed';
  hoverTooltip.style.left = '12px';
  hoverTooltip.style.right = 'auto';
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

  let selectedAgentId: string | null = null;
  let selectedDetailAnchorAgentId: string | null = null;
  let selectedDetailPanelPos: { left: number; top: number } | null = null;
  const clearSelectedDetailPanel = () => {
    selectedAgentId = null;
    selectedDetailAnchorAgentId = null;
    selectedDetailPanelPos = null;
    hoverTooltip.style.display = 'none';
  };
  closeDetailPanel = clearSelectedDetailPanel;
  const agentNameTags = new Map<string, HTMLDivElement>();
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

  const registerAgentTag = (agent: (typeof agents)[number]) => {
    const nameTag = document.createElement('div');
    nameTag.className = 'agent-name-tag';
    nameTag.textContent = agentMetaById.get(agent.id)?.displayName ?? agent.id;
    document.body.appendChild(nameTag);
    agentNameTags.set(agent.id, nameTag);

    agent.on('pointerup', () => {
      selectedAgentId = agent.id;
    });
  };

  const unregisterAgent = (agentId: string) => {
    const removed = agentManager.removeAgent(agentId);
    if (!removed) {
      return false;
    }

    const index = agents.findIndex((agent) => agent.id === agentId);
    if (index >= 0) {
      agents.splice(index, 1);
    }

    const nameTag = agentNameTags.get(agentId);
    if (nameTag) {
      nameTag.remove();
      agentNameTags.delete(agentId);
    }

    if (selectedAgentId === agentId) {
      clearSelectedDetailPanel();
    }

    nextCommandAtByAgent.delete(agentId);
    wasActiveByAgent.delete(agentId);
    agentMetaById.delete(agentId);
    customCharacterRows.delete(agentId);
    return true;
  };

  const getNextCustomAgentId = () => {
    while (agentManager.getAgent(`C${customAgentCounter}`)) {
      customAgentCounter += 1;
    }
    const id = `C${customAgentCounter}`;
    customAgentCounter += 1;
    return id;
  };

  const spawnCustomCharacterFromRecord = (record: CustomCharacterRecord) => {
    const department = getDepartmentById(record.department_id);
    const runtimeId = getNextCustomAgentId();
    const pos = ex.vec(
      department.defaultSpawn.x + randomBetween(-12, 12),
      department.defaultSpawn.y + randomBetween(-6, 6)
    );
    const agent = agentManager.spawnAgent({
      id: runtimeId,
      pos,
      departmentZone: department
    });
    agents.push(agent);
    agentMetaById.set(runtimeId, { displayName: record.display_name, customCharacterId: record.id });
    customCharacterRows.set(runtimeId, record);
    nextCommandAtByAgent.set(runtimeId, Date.now());
    wasActiveByAgent.set(runtimeId, false);
    registerAgentTag(agent);
  };

  for (const agent of agents) {
    registerAgentTag(agent);
  }

  const getAgentPageBounds = (agent: { width: number; height: number; scale: ex.Vector; pos: ex.Vector }) => {
    const halfWidth = (agent.width * agent.scale.x) / 2;
    const halfHeight = (agent.height * agent.scale.y) / 2;
    const p1 = game.screen.worldToPageCoordinates(ex.vec(agent.pos.x - halfWidth, agent.pos.y - halfHeight));
    const p2 = game.screen.worldToPageCoordinates(ex.vec(agent.pos.x + halfWidth, agent.pos.y + halfHeight));
    return {
      left: Math.min(p1.x, p2.x) - 2,
      right: Math.max(p1.x, p2.x) + 2,
      top: Math.min(p1.y, p2.y) - 2,
      bottom: Math.max(p1.y, p2.y) + 2
    };
  };

  const findAgentIdAtPagePoint = (pageX: number, pageY: number): string | null => {
    for (const agent of agents) {
      const bounds = getAgentPageBounds(agent);
      if (pageX >= bounds.left && pageX <= bounds.right && pageY >= bounds.top && pageY <= bounds.bottom) {
        return agent.id;
      }
    }
    return null;
  };

  window.addEventListener('pointerdown', (event) => {
    const clickedAgentId = findAgentIdAtPagePoint(event.clientX, event.clientY);
    if (clickedAgentId) {
      selectedAgentId = clickedAgentId;
      selectedDetailAnchorAgentId = null;
      selectedDetailPanelPos = null;
      return;
    }
    clearSelectedDetailPanel();
  });

  window.addEventListener('blur', () => {
    clearSelectedDetailPanel();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearSelectedDetailPanel();
    }
  });

  const debugHudPanel = document.createElement('div');
  debugHudPanel.style.position = 'fixed';
  debugHudPanel.style.left = '12px';
  debugHudPanel.style.top = '12px';
  debugHudPanel.style.width = 'min(460px, calc(100vw - 24px))';
  debugHudPanel.style.background = 'rgba(0, 0, 0, 0.72)';
  debugHudPanel.style.color = '#eaf7ff';
  debugHudPanel.style.fontFamily = 'monospace';
  debugHudPanel.style.fontSize = '12px';
  debugHudPanel.style.lineHeight = '1.35';
  debugHudPanel.style.border = '1px solid rgba(255,255,255,0.25)';
  debugHudPanel.style.borderRadius = '8px';
  debugHudPanel.style.zIndex = '9999';
  debugHudPanel.style.overflow = 'hidden';

  const debugHudHeader = document.createElement('div');
  debugHudHeader.textContent = 'Agent Commands (Scrollable Multi-Department View)';
  debugHudHeader.style.padding = '8px 10px 6px';
  debugHudHeader.style.borderBottom = '1px solid rgba(255,255,255,0.14)';
  debugHudHeader.style.fontWeight = '700';
  debugHudHeader.style.letterSpacing = '0.2px';

  const debugHudLog = document.createElement('div');
  debugHudLog.style.height = '420px';
  debugHudLog.style.maxHeight = '420px';
  debugHudLog.style.display = 'flex';
  debugHudLog.style.flexDirection = 'column';
  debugHudLog.style.justifyContent = 'flex-end';
  debugHudLog.style.overflowY = 'auto';
  debugHudLog.style.overflowX = 'hidden';
  debugHudLog.style.padding = '6px 10px 8px';
  debugHudLog.style.whiteSpace = 'normal';
  debugHudLog.style.scrollbarGutter = 'stable';

  debugHudPanel.appendChild(debugHudHeader);
  debugHudPanel.appendChild(debugHudLog);
  document.body.appendChild(debugHudPanel);

  const characterMenu = document.createElement('div');
  characterMenu.style.position = 'fixed';
  characterMenu.style.right = '12px';
  characterMenu.style.top = '12px';
  characterMenu.style.width = '220px';
  characterMenu.style.padding = '8px';
  characterMenu.style.background = 'rgba(0, 0, 0, 0.72)';
  characterMenu.style.border = '1px solid rgba(255,255,255,0.24)';
  characterMenu.style.borderRadius = '8px';
  characterMenu.style.zIndex = '9999';
  characterMenu.style.fontFamily = 'monospace';
  characterMenu.style.color = '#eaf7ff';

  const menuTitle = document.createElement('div');
  menuTitle.textContent = 'Characters';
  menuTitle.style.fontWeight = '700';
  menuTitle.style.marginBottom = '6px';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Character name';
  nameInput.maxLength = 24;
  nameInput.style.width = '100%';
  nameInput.style.boxSizing = 'border-box';
  nameInput.style.marginBottom = '6px';
  nameInput.style.padding = '4px 6px';
  nameInput.style.borderRadius = '4px';
  nameInput.style.border = '1px solid rgba(255,255,255,0.25)';
  nameInput.style.background = 'rgba(7, 23, 40, 0.95)';
  nameInput.style.color = '#eaf7ff';

  const departmentSelect = document.createElement('select');
  departmentSelect.style.width = '100%';
  departmentSelect.style.boxSizing = 'border-box';
  departmentSelect.style.marginBottom = '6px';
  departmentSelect.style.padding = '4px 6px';
  departmentSelect.style.borderRadius = '4px';
  departmentSelect.style.border = '1px solid rgba(255,255,255,0.25)';
  departmentSelect.style.background = 'rgba(7, 23, 40, 0.95)';
  departmentSelect.style.color = '#eaf7ff';
  for (const department of DEPARTMENTS) {
    const option = document.createElement('option');
    option.value = department.id;
    option.textContent = department.label;
    departmentSelect.appendChild(option);
  }
  departmentSelect.value = 'sales';

  const addButton = document.createElement('button');
  addButton.textContent = 'Add Character';
  addButton.style.width = '100%';
  addButton.style.boxSizing = 'border-box';
  addButton.style.marginBottom = '8px';
  addButton.style.padding = '5px 6px';
  addButton.style.borderRadius = '4px';
  addButton.style.border = '1px solid rgba(255,255,255,0.25)';
  addButton.style.background = 'rgba(22, 84, 128, 0.95)';
  addButton.style.color = '#eaf7ff';
  addButton.style.cursor = 'pointer';

  const customListSelect = document.createElement('select');
  customListSelect.size = 6;
  customListSelect.style.width = '100%';
  customListSelect.style.boxSizing = 'border-box';
  customListSelect.style.marginBottom = '6px';
  customListSelect.style.padding = '4px';
  customListSelect.style.borderRadius = '4px';
  customListSelect.style.border = '1px solid rgba(255,255,255,0.25)';
  customListSelect.style.background = 'rgba(7, 23, 40, 0.95)';
  customListSelect.style.color = '#eaf7ff';

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete Selected';
  deleteButton.style.width = '100%';
  deleteButton.style.boxSizing = 'border-box';
  deleteButton.style.marginBottom = '6px';
  deleteButton.style.padding = '5px 6px';
  deleteButton.style.borderRadius = '4px';
  deleteButton.style.border = '1px solid rgba(255,255,255,0.25)';
  deleteButton.style.background = 'rgba(118, 36, 36, 0.95)';
  deleteButton.style.color = '#ffe6e6';
  deleteButton.style.cursor = 'pointer';

  const menuStatus = document.createElement('div');
  menuStatus.style.fontSize = '11px';
  menuStatus.style.lineHeight = '1.25';
  menuStatus.style.minHeight = '28px';
  menuStatus.style.color = '#b8dff8';

  const refreshCustomList = () => {
    customListSelect.innerHTML = '';
    for (const [runtimeAgentId, record] of customCharacterRows.entries()) {
      const option = document.createElement('option');
      option.value = runtimeAgentId;
      option.textContent = `${record.display_name} (${record.department_id})`;
      customListSelect.appendChild(option);
    }

    deleteButton.disabled = customListSelect.options.length === 0;
  };

  addButton.addEventListener('click', async () => {
    const displayName = nameInput.value.trim();
    if (!displayName) {
      menuStatus.textContent = 'Enter a name first.';
      return;
    }
    if (!canUseCharacterStore()) {
      menuStatus.textContent = 'Set Supabase env vars to add persistent characters.';
      return;
    }

    addButton.disabled = true;
    deleteButton.disabled = true;
    menuStatus.textContent = 'Adding character...';

    try {
      const departmentId = departmentSelect.value as CharacterDepartmentId;
      const record = await addCustomCharacter(displayName, departmentId);
      spawnCustomCharacterFromRecord(record);
      refreshCustomList();
      nameInput.value = '';
      menuStatus.textContent = `Added "${record.display_name}"`;
    } catch (error) {
      menuStatus.textContent = error instanceof Error ? error.message : 'Failed to add character.';
    } finally {
      addButton.disabled = false;
      deleteButton.disabled = customListSelect.options.length === 0;
    }
  });

  deleteButton.addEventListener('click', async () => {
    const runtimeAgentId = customListSelect.value;
    if (!runtimeAgentId) {
      menuStatus.textContent = 'Select a custom character to delete.';
      return;
    }

    const meta = agentMetaById.get(runtimeAgentId);
    if (!meta?.customCharacterId) {
      menuStatus.textContent = 'Only custom characters can be deleted.';
      return;
    }

    deleteButton.disabled = true;
    addButton.disabled = true;
    menuStatus.textContent = 'Deleting character...';

    try {
      if (canUseCharacterStore()) {
        await deleteCustomCharacter(meta.customCharacterId);
      }
      unregisterAgent(runtimeAgentId);
      refreshCustomList();
      menuStatus.textContent = 'Character deleted.';
    } catch (error) {
      menuStatus.textContent = error instanceof Error ? error.message : 'Failed to delete character.';
    } finally {
      addButton.disabled = false;
      deleteButton.disabled = customListSelect.options.length === 0;
    }
  });

  characterMenu.appendChild(menuTitle);
  characterMenu.appendChild(nameInput);
  characterMenu.appendChild(departmentSelect);
  characterMenu.appendChild(addButton);
  characterMenu.appendChild(customListSelect);
  characterMenu.appendChild(deleteButton);
  characterMenu.appendChild(menuStatus);
  document.body.appendChild(characterMenu);
  refreshCustomList();

  if (canUseCharacterStore()) {
    menuStatus.textContent = 'Loading saved characters...';
    fetchCustomCharacters()
      .then((records) => {
        for (const record of records) {
          spawnCustomCharacterFromRecord(record);
        }
        refreshCustomList();
        menuStatus.textContent = records.length > 0
          ? `Loaded ${records.length} saved character${records.length === 1 ? '' : 's'}.`
          : 'No saved characters yet.';
      })
      .catch((error) => {
        menuStatus.textContent = error instanceof Error ? error.message : 'Failed to load characters.';
      });
  } else {
    menuStatus.textContent = 'Supabase not configured yet.';
    addButton.disabled = true;
    deleteButton.disabled = true;
  }

  const lastLoggedStatusByAgent = new Map<string, string>();
  const maxHistoryRows = 400;

  const appendHistoryRow = (text: string) => {
    const row = document.createElement('div');
    row.textContent = text;
    row.style.whiteSpace = 'pre-wrap';
    row.style.wordBreak = 'break-word';
    row.style.opacity = '0';
    row.style.transform = 'translateY(8px)';
    row.style.transition = 'opacity 220ms ease, transform 220ms ease';

    const nearBottom = debugHudLog.scrollTop + debugHudLog.clientHeight >= debugHudLog.scrollHeight - 14;
    debugHudLog.appendChild(row);

    while (debugHudLog.childElementCount > maxHistoryRows) {
      debugHudLog.firstElementChild?.remove();
    }

    requestAnimationFrame(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    });

    if (nearBottom || debugHudLog.childElementCount <= 8) {
      debugHudLog.scrollTop = debugHudLog.scrollHeight;
    }
  };

  const formatLogTimestamp = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const renderDebugHud = () => {
    const snapshot = agentManager.getDebugSnapshot();
    const lines = snapshot.map((entry) => {
      const department = entry.zoneId ? getDepartmentById(entry.zoneId) : null;
      const normalizedActionType = entry.actionType.startsWith('AUTO_') ? 'NO_LOG' : entry.actionType;
      const displayName = agentMetaById.get(entry.id)?.displayName ?? entry.id;
      return {
        agentId: entry.id,
        signature: `${entry.zoneId ?? 'none'}|${entry.state}|${normalizedActionType}`,
        text: `${displayName} | zone:${department?.id ?? 'none'} | action:${normalizedActionType} | status:${entry.state}`
      };
    });
    for (const line of lines) {
      const previous = lastLoggedStatusByAgent.get(line.agentId);
      if (!previous) {
        appendHistoryRow(`[${formatLogTimestamp()}] ${line.text}`);
        lastLoggedStatusByAgent.set(line.agentId, line.signature);
        continue;
      }
      if (previous !== line.signature) {
        appendHistoryRow(`[${formatLogTimestamp()}] ${line.text}`);
        lastLoggedStatusByAgent.set(line.agentId, line.signature);
      }
    }

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
      const nameTag = agentNameTags.get(agent.id);
      if (!nameTag) {
        continue;
      }

      const anchorWorldPos = ex.vec(agent.pos.x, agent.pos.y - agent.height + 3);
      const pagePos = game.screen.worldToPageCoordinates(anchorWorldPos);
      nameTag.style.left = `${pagePos.x}px`;
      nameTag.style.top = `${pagePos.y}px`;
      nameTag.textContent = agentMetaById.get(agent.id)?.displayName ?? agent.id;
      nameTag.style.opacity = '0.98';
    }

    if (!selectedAgentId) {
      hoverTooltip.style.display = 'none';
      return;
    }

    const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
    if (!selectedAgent) {
      clearSelectedDetailPanel();
      return;
    }

    const selectedBounds = getAgentPageBounds(selectedAgent);
    const selectedIsOffscreen =
      selectedBounds.right < 0 ||
      selectedBounds.left > window.innerWidth ||
      selectedBounds.bottom < 0 ||
      selectedBounds.top > window.innerHeight;
    if (selectedIsOffscreen) {
      clearSelectedDetailPanel();
      return;
    }

    const selectedStatus = snapshot.find((entry) => entry.id === selectedAgentId);
    const selectedLog = agentManager.getLastLog(selectedAgentId);
    const selectedDisplayName = agentMetaById.get(selectedAgentId)?.displayName ?? selectedAgentId;
    hoverTooltip.style.display = 'block';
    hoverTooltip.textContent = [
      `Agent: ${selectedDisplayName}`,
      `Last action: ${selectedLog?.action_type ?? 'NO_LOG'}`,
      `Mode: ${selectedStatus?.state ?? 'unknown'} / ${selectedStatus?.behavior ?? 'unknown'}`
    ].join('\n');

    if (selectedDetailAnchorAgentId !== selectedAgentId || !selectedDetailPanelPos) {
      const panelMargin = 12;
      const selectedZoneId = selectedStatus?.zoneId ?? null;
      const selectedZoneBox = selectedZoneId ? departmentBoxes.get(selectedZoneId) : undefined;

      if (!selectedZoneBox) {
        selectedDetailPanelPos = { left: panelMargin, top: panelMargin };
      } else {
        const zoneRect = selectedZoneBox.getBoundingClientRect();
        const tooltipRect = hoverTooltip.getBoundingClientRect();
        const panelLeft = zoneRect.right + panelMargin;
        let panelTop = zoneRect.top;
        if (panelTop + tooltipRect.height > window.innerHeight - panelMargin) {
          panelTop = Math.max(panelMargin, window.innerHeight - tooltipRect.height - panelMargin);
        }
        selectedDetailPanelPos = { left: panelLeft, top: panelTop };
      }

      selectedDetailAnchorAgentId = selectedAgentId;
    }

    if (selectedDetailPanelPos) {
      hoverTooltip.style.left = `${selectedDetailPanelPos.left}px`;
      hoverTooltip.style.top = `${selectedDetailPanelPos.top}px`;
    }
  };

  renderDebugHud();
  window.setInterval(renderDebugHud, 120);
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
