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

interface OfficeDeskActorSet {
  desk: ex.Actor;
  chair: ex.Actor;
  partition: ex.Actor;
}

type TrackedActionType = 'CREATE_SO' | 'CREATE_PO' | 'STOCK_TRANSFER';

interface ActionSnapshotEntry {
  state: 'active' | 'inactive';
  actionType: string;
  zoneId?: string | null;
}

const SALES_COLUMNS = 4;
const SALES_ROWS = 6;
const SALES_START_X = 68;
const SALES_START_Y = 44;
const SALES_STEP_X = 42;
const SALES_STEP_Y = 34;
const SALES_PARTITION_RIGHT_OFFSET = 4;
const PURCHASE_COLUMNS = 4;
const PURCHASE_ROWS = 6;
const PURCHASE_START_X = 276;
const PURCHASE_START_Y = 44;
const PURCHASE_STEP_X = 42;
const PURCHASE_STEP_Y = 34;

function buildSalesDeskSlotAnchors(): Array<{ x: number; y: number }> {
  const anchors: Array<{ x: number; y: number }> = [];
  // Row-first sequence: fill one row left->right, then move down.
  for (let row = 0; row < SALES_ROWS; row += 1) {
    for (let col = 0; col < SALES_COLUMNS; col += 1) {
      anchors.push({
        x: SALES_START_X + col * SALES_STEP_X,
        y: SALES_START_Y + row * SALES_STEP_Y
      });
    }
  }
  return anchors;
}

function buildPurchaseDeskSlotAnchors(): Array<{ x: number; y: number }> {
  const anchors: Array<{ x: number; y: number }> = [];
  // Row-first sequence: fill one row left->right, then move down.
  for (let row = 0; row < PURCHASE_ROWS; row += 1) {
    for (let col = 0; col < PURCHASE_COLUMNS; col += 1) {
      anchors.push({
        x: PURCHASE_START_X + col * PURCHASE_STEP_X,
        y: PURCHASE_START_Y + row * PURCHASE_STEP_Y
      });
    }
  }
  return anchors;
}

const OFFICE_LAYOUTS: Record<string, OfficePropPlacement[]> = {
  operations: [
    { spriteKey: 'OfficeDeskWithPcPng', x: 512, y: 64, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 576, y: 64, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 512, y: 82, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 576, y: 82, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 512, y: 76, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 576, y: 76, z: 29, flipX: true },
    { spriteKey: 'OfficeDeskWithPcPng', x: 512, y: 122, z: 30 },
    { spriteKey: 'OfficeDeskWithPcPng', x: 576, y: 122, z: 30 },
    { spriteKey: 'OfficeChairPng', x: 512, y: 138, z: 31 },
    { spriteKey: 'OfficeChairPng', x: 576, y: 138, z: 31 },
    { spriteKey: 'OfficePartition1Png', x: 512, y: 132, z: 29 },
    { spriteKey: 'OfficePartition1Png', x: 576, y: 132, z: 29, flipX: true }
  ]
};

function spawnDepartmentFloors(scene: ex.Scene): void {
  const floorColor = ex.Color.fromHex('#ffffff');

  for (const department of DEPARTMENTS) {
    const width = department.bounds.x2 - department.bounds.x1;
    const height = department.bounds.y2 - department.bounds.y1;
    const floor = new ex.Actor({
      pos: ex.vec((department.bounds.x1 + department.bounds.x2) / 2, (department.bounds.y1 + department.bounds.y2) / 2),
      width,
      height,
      collisionType: ex.CollisionType.PreventCollision
    });
    floor.graphics.use(
      new ex.Rectangle({
        width,
        height,
        color: floorColor
      })
    );
    floor.z = 1;
    scene.add(floor);
  }
}

function spawnDepartmentWalls(scene: ex.Scene): void {
  const wallThickness = 6;
  const wallColor = ex.Color.fromHex('#0a2a63');

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

function spawnOfficeProps(
  scene: ex.Scene
): { salesDeskSets: OfficeDeskActorSet[]; purchaseDeskSets: OfficeDeskActorSet[] } {
  const salesDeskSets: OfficeDeskActorSet[] = [];
  const salesAnchors = buildSalesDeskSlotAnchors();
  for (const anchor of salesAnchors) {
    const desk = new ex.Actor({
      pos: ex.vec(anchor.x, anchor.y),
      collisionType: ex.CollisionType.PreventCollision
    });
    desk.graphics.use(Resources.OfficeDeskWithPcPng.toSprite());
    desk.scale = ex.vec(Config.OfficePropScale, Config.OfficePropScale);
    desk.z = 30;
    desk.graphics.visible = false;
    scene.add(desk);

    const chair = new ex.Actor({
      pos: ex.vec(anchor.x, anchor.y + 12),
      collisionType: ex.CollisionType.PreventCollision
    });
    chair.graphics.use(Resources.OfficeChairPng.toSprite());
    chair.scale = ex.vec(Config.OfficePropScale, Config.OfficePropScale);
    chair.z = 31;
    chair.graphics.visible = false;
    scene.add(chair);

    const partition = new ex.Actor({
      pos: ex.vec(anchor.x + SALES_PARTITION_RIGHT_OFFSET, anchor.y + 6),
      collisionType: ex.CollisionType.PreventCollision
    });
    partition.graphics.use(Resources.OfficePartition1Png.toSprite());
    partition.scale = ex.vec(-Config.OfficePropScale, Config.OfficePropScale);
    partition.z = 29;
    partition.graphics.visible = false;
    scene.add(partition);

    salesDeskSets.push({ desk, chair, partition });
  }

  const purchaseDeskSets: OfficeDeskActorSet[] = [];
  const purchaseAnchors = buildPurchaseDeskSlotAnchors();
  for (const anchor of purchaseAnchors) {
    const desk = new ex.Actor({
      pos: ex.vec(anchor.x, anchor.y),
      collisionType: ex.CollisionType.PreventCollision
    });
    desk.graphics.use(Resources.OfficeDeskWithPcPng.toSprite());
    desk.scale = ex.vec(Config.OfficePropScale, Config.OfficePropScale);
    desk.z = 30;
    desk.graphics.visible = false;
    scene.add(desk);

    const chair = new ex.Actor({
      pos: ex.vec(anchor.x, anchor.y + 12),
      collisionType: ex.CollisionType.PreventCollision
    });
    chair.graphics.use(Resources.OfficeChairPng.toSprite());
    chair.scale = ex.vec(Config.OfficePropScale, Config.OfficePropScale);
    chair.z = 31;
    chair.graphics.visible = false;
    scene.add(chair);

    const partition = new ex.Actor({
      pos: ex.vec(anchor.x + SALES_PARTITION_RIGHT_OFFSET, anchor.y + 6),
      collisionType: ex.CollisionType.PreventCollision
    });
    partition.graphics.use(Resources.OfficePartition1Png.toSprite());
    partition.scale = ex.vec(-Config.OfficePropScale, Config.OfficePropScale);
    partition.z = 29;
    partition.graphics.visible = false;
    scene.add(partition);

    purchaseDeskSets.push({ desk, chair, partition });
  }

  for (const department of DEPARTMENTS) {
    if (department.id === 'sales' || department.id === 'purchase') {
      continue;
    }
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

  return { salesDeskSets, purchaseDeskSets };
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
  }
  spawnDepartmentFloors(game.currentScene);
  spawnDepartmentWalls(game.currentScene);
  const officeProps = spawnOfficeProps(game.currentScene);
  const worldBoundsPadding = 12;
  const uiEdgeMarginPx = 12;
  const fallbackDebugHudReservedPx = 60;
  const fallbackCharacterMenuReservedPx = 52;
  const departmentBounds = {
    minX: Math.min(...DEPARTMENTS.map((d) => d.bounds.x1)),
    maxX: Math.max(...DEPARTMENTS.map((d) => d.bounds.x2)),
    minY: Math.min(...DEPARTMENTS.map((d) => d.bounds.y1)),
    maxY: Math.max(...DEPARTMENTS.map((d) => d.bounds.y2))
  };
  let debugHudPanelEl: HTMLDivElement | null = null;
  let debugHudLogEl: HTMLDivElement | null = null;
  let characterMenuEl: HTMLDivElement | null = null;
  let hoverTooltipEl: HTMLDivElement | null = null;

  const getViewportSizePx = () => {
    const canvasBounds = game.canvas?.getBoundingClientRect();
    const width = canvasBounds?.width ?? window.innerWidth;
    const height = canvasBounds?.height ?? window.innerHeight;
    return {
      width: Math.max(1, width),
      height: Math.max(1, height)
    };
  };

  const getHorizontalCameraPaddingWorld = (zoom: number) => {
    const safeZoom = Math.max(0.001, zoom);
    const debugHudRect = debugHudPanelEl?.getBoundingClientRect();
    const characterMenuRect = characterMenuEl?.getBoundingClientRect();
    const leftPaddingPx = (debugHudRect?.width ?? fallbackDebugHudReservedPx) + uiEdgeMarginPx;
    const rightPaddingPx = (characterMenuRect?.width ?? fallbackCharacterMenuReservedPx) + uiEdgeMarginPx;
    return {
      left: leftPaddingPx / safeZoom,
      right: rightPaddingPx / safeZoom
    };
  };

  const clampCameraToWorld = () => {
    const camera = game.currentScene.camera;
    const viewport = getViewportSizePx();
    const halfVisibleWidth = viewport.width / (camera.zoom * 2);
    const halfVisibleHeight = viewport.height / (camera.zoom * 2);
    const horizontalPadding = getHorizontalCameraPaddingWorld(camera.zoom);
    const minX = departmentBounds.minX - horizontalPadding.left + halfVisibleWidth;
    const maxX = departmentBounds.maxX + horizontalPadding.right - halfVisibleWidth;
    const minY = departmentBounds.minY - worldBoundsPadding + halfVisibleHeight;
    const maxY = departmentBounds.maxY + worldBoundsPadding - halfVisibleHeight;
    const nextX = minX > maxX ? (minX + maxX) / 2 : clamp(camera.pos.x, minX, maxX);
    const nextY = minY > maxY ? (minY + maxY) / 2 : clamp(camera.pos.y, minY, maxY);

    camera.pos = ex.vec(
      nextX,
      nextY
    );
  };

  const fitCameraToDepartments = () => {
    const viewport = getViewportSizePx();

    // Fit zoom against actual department layout size (not extra camera clamp padding),
    // so we do not introduce oversized empty side-scroll regions.
    const layoutWidth = (departmentBounds.maxX - departmentBounds.minX) + worldBoundsPadding * 2;
    const layoutHeight = (departmentBounds.maxY - departmentBounds.minY) + worldBoundsPadding * 2;
    const zoomByWidth = viewport.width / layoutWidth;
    const zoomByHeight = viewport.height / layoutHeight;
    const zoom = Math.max(0.98, Math.min(3.35, Math.min(zoomByWidth, zoomByHeight) * 1.18));

    game.currentScene.camera.pos = ex.vec(
      (departmentBounds.minX + departmentBounds.maxX) / 2,
      (departmentBounds.minY + departmentBounds.maxY) / 2
    );
    game.currentScene.camera.zoom = zoom;
    clampCameraToWorld();
  };

  const setInitialCameraAngle = () => {
    const sales = getDepartmentById('sales');
    const salesCenterY = (sales.bounds.y1 + sales.bounds.y2) / 2;
    game.currentScene.camera.pos = ex.vec(game.currentScene.camera.pos.x, salesCenterY);
    clampCameraToWorld();

    if (debugHudPanelEl) {
      // Startup alignment only: place Sales just to the right of the log panel.
      const panelRect = debugHudPanelEl.getBoundingClientRect();
      const targetSalesLeftPx = panelRect.right + 12;
      const salesLeftPage = game.screen.worldToPageCoordinates(ex.vec(sales.bounds.x1, salesCenterY)).x;
      const probePage = game.screen.worldToPageCoordinates(ex.vec(sales.bounds.x1 + 10, salesCenterY)).x;
      const pxPerWorld = Math.max(0.001, Math.abs(probePage - salesLeftPage) / 10);
      const worldDelta = (targetSalesLeftPx - salesLeftPage) / pxPerWorld;
      game.currentScene.camera.pos = ex.vec(game.currentScene.camera.pos.x - worldDelta, salesCenterY);
      clampCameraToWorld();
    }
  };

  fitCameraToDepartments();
  setInitialCameraAngle();
  game.screen.events.on('resize', () => {
    fitCameraToDepartments();
    setInitialCameraAngle();
  });

  window.addEventListener(
    'wheel',
    (event) => {
      const targetNode = event.target as Node | null;
      const pointerOnUi =
        (debugHudLogEl && targetNode ? debugHudLogEl.contains(targetNode) : false) ||
        (debugHudPanelEl && targetNode ? debugHudPanelEl.contains(targetNode) : false) ||
        (characterMenuEl && targetNode ? characterMenuEl.contains(targetNode) : false) ||
        (hoverTooltipEl && targetNode ? hoverTooltipEl.contains(targetNode) : false);

      if (pointerOnUi) {
        return;
      }

      const camera = game.currentScene.camera;
      const scrollScale = 0.45 / camera.zoom;
      let horizontalDelta = event.deltaX;
      if (Math.abs(horizontalDelta) < 0.1) {
        horizontalDelta = event.deltaY;
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
      padding: 3px 8px;
      font-family: monospace;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
      color: #f3fbff;
      background: #1f2937;
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
  const salesDeskSets = officeProps.salesDeskSets;
  const purchaseDeskSets = officeProps.purchaseDeskSets;
  const salesSeatSpotsByDesk = buildSalesDeskSlotAnchors().map((anchor) => ({
    x: anchor.x,
    y: anchor.y + 12,
    facing: 'up' as const
  }));
  const purchaseSeatSpotsByDesk = buildPurchaseDeskSlotAnchors().map((anchor) => ({
    x: anchor.x,
    y: anchor.y + 12,
    facing: 'up' as const
  }));
  let currentVisibleSalesDeskCount = -1;
  let currentVisiblePurchaseDeskCount = -1;
  const actionCounterByType: Record<TrackedActionType, number> = {
    CREATE_SO: 0,
    CREATE_PO: 0,
    STOCK_TRANSFER: 0
  };
  const departmentActionCounterById = new Map<string, Record<TrackedActionType, number>>(
    DEPARTMENTS.map((department) => [
      department.id,
      { CREATE_SO: 0, CREATE_PO: 0, STOCK_TRANSFER: 0 }
    ])
  );
  const departmentSummaryRowEls = new Map<string, HTMLDivElement>();
  const actionCounterValueEls = new Map<TrackedActionType | 'TOTAL', HTMLSpanElement>();
  const actionCounterActiveEls = new Map<TrackedActionType | 'TOTAL', HTMLSpanElement>();
  const trackedActionTypes: TrackedActionType[] = ['CREATE_SO', 'CREATE_PO', 'STOCK_TRANSFER'];

  const getActionStatsFromSnapshot = (
    snapshot: ActionSnapshotEntry[]
  ): Record<TrackedActionType, number> => {
    const stats: Record<TrackedActionType, number> = {
      CREATE_SO: 0,
      CREATE_PO: 0,
      STOCK_TRANSFER: 0
    };

    for (const entry of snapshot) {
      if (entry.state !== 'active') {
        continue;
      }
      if (entry.actionType === 'CREATE_SO') {
        stats.CREATE_SO += 1;
      } else if (entry.actionType === 'CREATE_PO') {
        stats.CREATE_PO += 1;
      } else if (entry.actionType === 'STOCK_TRANSFER') {
        stats.STOCK_TRANSFER += 1;
      }
    }
    return stats;
  };

  const getDepartmentActiveActionStatsFromSnapshot = (snapshot: ActionSnapshotEntry[]) => {
    const activeByDepartment = new Map<string, Record<TrackedActionType, number>>(
      DEPARTMENTS.map((department) => [
        department.id,
        { CREATE_SO: 0, CREATE_PO: 0, STOCK_TRANSFER: 0 }
      ])
    );

    for (const entry of snapshot) {
      if (entry.state !== 'active' || !entry.zoneId) {
        continue;
      }

      const bucket = activeByDepartment.get(entry.zoneId);
      if (!bucket) {
        continue;
      }

      if (entry.actionType === 'CREATE_SO') {
        bucket.CREATE_SO += 1;
      } else if (entry.actionType === 'CREATE_PO') {
        bucket.CREATE_PO += 1;
      } else if (entry.actionType === 'STOCK_TRANSFER') {
        bucket.STOCK_TRANSFER += 1;
      }
    }

    return activeByDepartment;
  };

  const refreshActionStatsUi = (
    snapshot: ActionSnapshotEntry[] = []
  ) => {
    const activeByType = getActionStatsFromSnapshot(snapshot);
    let totalCommands = 0;
    let totalActive = 0;

    for (const actionType of trackedActionTypes) {
      totalCommands += actionCounterByType[actionType];
      totalActive += activeByType[actionType];
      const countEl = actionCounterValueEls.get(actionType);
      if (countEl) {
        countEl.textContent = String(actionCounterByType[actionType]);
      }
      const activeEl = actionCounterActiveEls.get(actionType);
      if (activeEl) {
        activeEl.textContent = `(active ${activeByType[actionType]})`;
      }
    }

    const totalCountEl = actionCounterValueEls.get('TOTAL');
    if (totalCountEl) {
      totalCountEl.textContent = String(totalCommands);
    }
    const totalActiveEl = actionCounterActiveEls.get('TOTAL');
    if (totalActiveEl) {
      totalActiveEl.textContent = `(active ${totalActive})`;
    }
  };

  const refreshDepartmentSummaryUi = (snapshot: ActionSnapshotEntry[] = []) => {
    const activeByDepartment = getDepartmentActiveActionStatsFromSnapshot(snapshot);
    for (const department of DEPARTMENTS) {
      const totals =
        departmentActionCounterById.get(department.id) ??
        { CREATE_SO: 0, CREATE_PO: 0, STOCK_TRANSFER: 0 };
      const active =
        activeByDepartment.get(department.id) ??
        { CREATE_SO: 0, CREATE_PO: 0, STOCK_TRANSFER: 0 };
      const rowEl = departmentSummaryRowEls.get(department.id);
      if (!rowEl) {
        continue;
      }

      rowEl.textContent =
        `${department.label} (${department.baseMapKey}) | ` +
        `SO ${totals.CREATE_SO} (${active.CREATE_SO}) | ` +
        `PO ${totals.CREATE_PO} (${active.CREATE_PO}) | ` +
        `ST ${totals.STOCK_TRANSFER} (${active.STOCK_TRANSFER})`;
    }
  };

  const incrementActionCounter = (actionType: TrackedActionType, zoneId: string | null) => {
    actionCounterByType[actionType] += 1;
    if (zoneId) {
      const zoneTotals = departmentActionCounterById.get(zoneId);
      if (zoneTotals) {
        zoneTotals[actionType] += 1;
      }
    }
    refreshActionStatsUi();
    refreshDepartmentSummaryUi();
  };

  const setDeskSetVisibility = (set: OfficeDeskActorSet, visible: boolean) => {
    set.desk.graphics.visible = visible;
    set.chair.graphics.visible = visible;
    set.partition.graphics.visible = visible;
  };

  const updateSalesDeskVisibility = (
    snapshot: Array<{ id: string; zoneId: string | null }> = agentManager.getDebugSnapshot()
  ) => {
    const salesAgentCount = snapshot.filter((entry) => entry.zoneId === 'sales').length;
    const visibleDeskCount = Math.max(0, Math.min(salesAgentCount, salesDeskSets.length));
    if (visibleDeskCount === currentVisibleSalesDeskCount) {
      return;
    }

    currentVisibleSalesDeskCount = visibleDeskCount;
    for (let i = 0; i < salesDeskSets.length; i += 1) {
      setDeskSetVisibility(salesDeskSets[i], i < visibleDeskCount);
    }

    // Keep Sales seat targets in sync with visible desks, using the same
    // column-first ordering so agents never path to hidden desks/chairs.
    const salesRuntimeZone = {
      id: salesDepartment.id,
      bounds: salesDepartment.bounds,
      noWalkAreas: salesDepartment.noWalkAreas,
      obstacleAreas: salesDepartment.obstacleAreas,
      seatSpots: salesSeatSpotsByDesk.slice(0, visibleDeskCount)
    };
    for (const entry of snapshot) {
      if (entry.zoneId === 'sales') {
        agentManager.assignAgentToZone(entry.id, salesRuntimeZone);
      }
    }
  };

  const updatePurchaseDeskVisibility = (
    snapshot: Array<{ id: string; zoneId: string | null }> = agentManager.getDebugSnapshot()
  ) => {
    const purchaseAgentCount = snapshot.filter((entry) => entry.zoneId === 'purchase').length;
    const visibleDeskCount = Math.max(0, Math.min(purchaseAgentCount, purchaseDeskSets.length));
    if (visibleDeskCount === currentVisiblePurchaseDeskCount) {
      return;
    }

    currentVisiblePurchaseDeskCount = visibleDeskCount;
    for (let i = 0; i < purchaseDeskSets.length; i += 1) {
      setDeskSetVisibility(purchaseDeskSets[i], i < visibleDeskCount);
    }

    const purchaseRuntimeZone = {
      id: purchaseDepartment.id,
      bounds: purchaseDepartment.bounds,
      noWalkAreas: purchaseDepartment.noWalkAreas,
      obstacleAreas: purchaseDepartment.obstacleAreas,
      seatSpots: purchaseSeatSpotsByDesk.slice(0, visibleDeskCount)
    };
    for (const entry of snapshot) {
      if (entry.zoneId === 'purchase') {
        agentManager.assignAgentToZone(entry.id, purchaseRuntimeZone);
      }
    }
  };

  const updateDepartmentDeskVisibility = (
    snapshot: Array<{ id: string; zoneId: string | null }> = agentManager.getDebugSnapshot()
  ) => {
    updateSalesDeskVisibility(snapshot);
    updatePurchaseDeskVisibility(snapshot);
  };
  updateDepartmentDeskVisibility();

  const COMMAND_COOLDOWN_MS = 7000;
  const nextCommandAtByAgent = new Map<string, number>();
  const wasActiveByAgent = new Map<string, boolean>();

  const dispatchCommandForAgent = (agentId: string, zoneId: string | null) => {
    switch (zoneId) {
      case 'sales':
        incrementActionCounter('CREATE_SO', zoneId);
        agentManager.updateLogs(agentId, {
          action_type: 'CREATE_SO',
          durationMs: Config.CreateSoCommandDurationMs,
          note: 'Simulated sales-order creation'
        });
        return;
      case 'purchase':
        incrementActionCounter('STOCK_TRANSFER', zoneId);
        agentManager.updateLogs(agentId, {
          action_type: 'STOCK_TRANSFER',
          direction: Math.random() < 0.5 ? 'left' : 'right',
          durationMs: 2200,
          note: 'Simulated stock movement'
        });
        return;
      case 'operations':
        incrementActionCounter('CREATE_PO', zoneId);
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
  hoverTooltipEl = hoverTooltip;
  hoverTooltip.style.position = 'fixed';
  hoverTooltip.style.left = '12px';
  hoverTooltip.style.right = 'auto';
  hoverTooltip.style.top = '12px';
  hoverTooltip.style.display = 'none';
  hoverTooltip.style.padding = '10px 10px 8px 10px';
  hoverTooltip.style.background = 'rgba(22, 18, 10, 0.85)';
  hoverTooltip.style.color = '#fff9e8';
  hoverTooltip.style.fontFamily = 'monospace';
  hoverTooltip.style.fontSize = '12px';
  hoverTooltip.style.lineHeight = '1.35';
  hoverTooltip.style.whiteSpace = 'normal';
  hoverTooltip.style.border = '1px solid rgba(255, 226, 138, 0.35)';
  hoverTooltip.style.borderRadius = '6px';
  hoverTooltip.style.pointerEvents = 'auto';
  hoverTooltip.style.zIndex = '9999';
  const hoverTooltipContent = document.createElement('div');
  hoverTooltipContent.style.whiteSpace = 'pre';
  hoverTooltip.appendChild(hoverTooltipContent);
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
    departmentSummaryRowEls.set(department.id, zoneLabel);
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
    updateDepartmentDeskVisibility();
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
    updateDepartmentDeskVisibility();
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
    if (hoverTooltip.contains(event.target as Node)) {
      return;
    }
    const clickedAgentId = findAgentIdAtPagePoint(event.clientX, event.clientY);
    if (clickedAgentId) {
      selectedAgentId = clickedAgentId;
      selectedDetailAnchorAgentId = null;
      selectedDetailPanelPos = null;
    }
  });

  const debugHudPanel = document.createElement('div');
  debugHudPanelEl = debugHudPanel;
  debugHudPanel.className = 'debug-hud-panel';
  debugHudPanel.style.position = 'fixed';
  debugHudPanel.style.left = '12px';
  debugHudPanel.style.top = '12px';
  debugHudPanel.style.width = 'min(240px, calc(100vw - 24px))';
  debugHudPanel.style.background = 'linear-gradient(180deg, rgba(7, 24, 42, 0.94) 0%, rgba(5, 17, 31, 0.92) 100%)';
  debugHudPanel.style.color = '#ecf8ff';
  debugHudPanel.style.fontFamily = '\'JetBrains Mono\', \'IBM Plex Mono\', \'Cascadia Code\', monospace';
  debugHudPanel.style.fontSize = '12px';
  debugHudPanel.style.lineHeight = '1.35';
  debugHudPanel.style.border = '1px solid rgba(122, 205, 255, 0.3)';
  debugHudPanel.style.borderRadius = '12px';
  debugHudPanel.style.boxShadow = '0 14px 28px rgba(0, 8, 20, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04) inset';
  debugHudPanel.style.backdropFilter = 'blur(2px)';
  debugHudPanel.style.zIndex = '9999';
  debugHudPanel.style.overflow = 'hidden';

  const debugHudHeader = document.createElement('div');
  debugHudHeader.className = 'debug-hud-header';
  debugHudHeader.textContent = 'Team Activity';
  debugHudHeader.style.padding = '9px 11px 7px';
  debugHudHeader.style.borderBottom = '1px solid rgba(160, 224, 255, 0.22)';
  debugHudHeader.style.background =
    'linear-gradient(90deg, rgba(26, 90, 128, 0.35) 0%, rgba(13, 38, 60, 0.1) 100%)';
  debugHudHeader.style.fontWeight = '700';
  debugHudHeader.style.letterSpacing = '0.35px';
  debugHudHeader.style.textTransform = 'uppercase';
  debugHudHeader.style.textShadow = '0 1px 0 rgba(0, 0, 0, 0.35)';

  const debugHudLog = document.createElement('div');
  debugHudLogEl = debugHudLog;
  debugHudLog.className = 'debug-hud-log';
  debugHudLog.style.height = '420px';
  debugHudLog.style.maxHeight = '420px';
  debugHudLog.style.display = 'flex';
  debugHudLog.style.flexDirection = 'column';
  debugHudLog.style.justifyContent = 'flex-end';
  debugHudLog.style.gap = '5px';
  debugHudLog.style.overflowY = 'auto';
  debugHudLog.style.overflowX = 'hidden';
  debugHudLog.style.padding = '8px 10px 9px';
  debugHudLog.style.whiteSpace = 'normal';
  debugHudLog.style.wordBreak = 'break-word';
  debugHudLog.style.scrollbarGutter = 'stable';
  debugHudLog.style.background = 'linear-gradient(180deg, rgba(3, 12, 23, 0.45) 0%, rgba(2, 9, 18, 0.2) 100%)';
  debugHudLog.style.scrollbarWidth = 'thin';
  debugHudLog.style.scrollbarColor = 'rgba(132, 207, 255, 0.72) rgba(17, 47, 72, 0.55)';

  const debugHudScrollStyles = document.createElement('style');
  debugHudScrollStyles.textContent = `
    .debug-hud-log::-webkit-scrollbar {
      width: 9px;
    }
    .debug-hud-log::-webkit-scrollbar-track {
      background: rgba(17, 47, 72, 0.55);
      border-radius: 999px;
    }
    .debug-hud-log::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(139, 215, 255, 0.9) 0%, rgba(82, 167, 226, 0.92) 100%);
      border-radius: 999px;
      border: 2px solid rgba(17, 47, 72, 0.7);
    }
  `;
  document.head.appendChild(debugHudScrollStyles);

  debugHudPanel.appendChild(debugHudHeader);
  debugHudPanel.appendChild(debugHudLog);
  document.body.appendChild(debugHudPanel);
  setInitialCameraAngle();

  const characterMenu = document.createElement('div');
  characterMenuEl = characterMenu;
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

  const actionStatsWrap = document.createElement('div');
  actionStatsWrap.style.marginTop = '8px';
  actionStatsWrap.style.paddingTop = '6px';
  actionStatsWrap.style.borderTop = '1px solid rgba(255,255,255,0.14)';

  const actionStatsTitle = document.createElement('div');
  actionStatsTitle.textContent = 'Action Stats';
  actionStatsTitle.style.fontWeight = '700';
  actionStatsTitle.style.marginBottom = '4px';

  const makeActionStatsRow = (label: string, key: TrackedActionType | 'TOTAL') => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.fontSize = '11px';
    row.style.lineHeight = '1.3';
    row.style.marginBottom = '2px';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#d9f0ff';

    const valueWrap = document.createElement('span');
    valueWrap.style.display = 'inline-flex';
    valueWrap.style.alignItems = 'center';
    valueWrap.style.gap = '8px';

    const totalEl = document.createElement('span');
    totalEl.textContent = '0';
    totalEl.style.color = '#ffffff';
    totalEl.style.minWidth = '24px';
    totalEl.style.textAlign = 'right';

    const activeEl = document.createElement('span');
    activeEl.textContent = '(active 0)';
    activeEl.style.color = '#8cc8ff';
    activeEl.style.minWidth = '70px';
    activeEl.style.textAlign = 'right';

    valueWrap.appendChild(totalEl);
    valueWrap.appendChild(activeEl);
    row.appendChild(labelEl);
    row.appendChild(valueWrap);
    actionCounterValueEls.set(key, totalEl);
    actionCounterActiveEls.set(key, activeEl);
    actionStatsWrap.appendChild(row);
  };
  actionStatsWrap.appendChild(actionStatsTitle);
  makeActionStatsRow('CREATE_SO', 'CREATE_SO');
  makeActionStatsRow('CREATE_PO', 'CREATE_PO');
  makeActionStatsRow('STOCK_TRANSFER', 'STOCK_TRANSFER');
  makeActionStatsRow('TOTAL', 'TOTAL');

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
  characterMenu.appendChild(actionStatsWrap);
  document.body.appendChild(characterMenu);
  clampCameraToWorld();
  refreshCustomList();
  refreshActionStatsUi();
  refreshDepartmentSummaryUi();

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
    const rowIndex = debugHudLog.childElementCount;
    row.style.whiteSpace = 'pre-wrap';
    row.style.wordBreak = 'break-word';
    row.style.padding = '4px 6px';
    row.style.borderRadius = '7px';
    row.style.border = '1px solid rgba(128, 204, 255, 0.22)';
    row.style.background =
      rowIndex % 2 === 0
        ? 'linear-gradient(180deg, rgba(19, 53, 82, 0.42) 0%, rgba(13, 39, 63, 0.35) 100%)'
        : 'linear-gradient(180deg, rgba(11, 40, 64, 0.5) 0%, rgba(9, 30, 49, 0.4) 100%)';
    row.style.boxShadow = '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 2px 8px rgba(0, 10, 24, 0.22)';
    row.style.textShadow = '0 1px 0 rgba(0, 0, 0, 0.22)';
    row.style.color = '#f4fbff';
    row.style.opacity = '0';
    row.style.transform = 'translateY(6px)';
    row.style.transition = 'opacity 220ms ease, transform 220ms ease, filter 220ms ease';
    row.style.filter = 'saturate(0.92)';

    const nearBottom = debugHudLog.scrollTop + debugHudLog.clientHeight >= debugHudLog.scrollHeight - 14;
    debugHudLog.appendChild(row);

    while (debugHudLog.childElementCount > maxHistoryRows) {
      debugHudLog.firstElementChild?.remove();
    }

    requestAnimationFrame(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
      row.style.filter = 'saturate(1)';
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

  const formatActionForPeople = (actionType: string) => {
    switch (actionType) {
      case 'CREATE_SO':
        return 'creating a Sales Order';
      case 'CREATE_PO':
        return 'creating a Purchase Order';
      case 'STOCK_TRANSFER':
        return 'moving stock';
      default:
        return 'idle';
    }
  };

  const renderDebugHud = () => {
    const snapshot = agentManager.getDebugSnapshot();
    refreshActionStatsUi(snapshot);
    refreshDepartmentSummaryUi(snapshot);
    updateDepartmentDeskVisibility(snapshot);
    const lines = snapshot.map((entry) => {
      const department = entry.zoneId ? getDepartmentById(entry.zoneId) : null;
      const normalizedActionType = entry.actionType.startsWith('AUTO_') ? 'NO_LOG' : entry.actionType;
      const displayName = agentMetaById.get(entry.id)?.displayName ?? entry.id;
      const friendlyDepartment = department?.label ?? 'Unassigned area';
      const friendlyAction = formatActionForPeople(normalizedActionType);
      const friendlyState =
        entry.state === 'active'
          ? `${displayName} is ${friendlyAction} in ${friendlyDepartment}.`
          : `${displayName} is idle in ${friendlyDepartment}.`;
      return {
        agentId: entry.id,
        signature: `${entry.zoneId ?? 'none'}|${entry.state}|${normalizedActionType}`,
        text: `${friendlyState}`
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

    // Keep activity log anchored to the left side of Sales (Area 1)
    // so it tracks the world instead of staying fixed to the viewport.
    if (debugHudPanelEl) {
      const panelMargin = 12;
      const salesTopLeftPage = game.screen.worldToPageCoordinates(
        ex.vec(salesDepartment.bounds.x1, salesDepartment.bounds.y1)
      );
      const panelRect = debugHudPanelEl.getBoundingClientRect();
      const alignedLeft = Math.round(salesTopLeftPage.x - panelRect.width - panelMargin);
      const alignedTop = Math.round(salesTopLeftPage.y);
      debugHudPanelEl.style.left = `${alignedLeft}px`;
      debugHudPanelEl.style.top = `${alignedTop}px`;
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

    const selectedStatus = snapshot.find((entry) => entry.id === selectedAgentId);
    const selectedLog = agentManager.getLastLog(selectedAgentId);
    const selectedDisplayName = agentMetaById.get(selectedAgentId)?.displayName ?? selectedAgentId;
    hoverTooltip.style.display = 'block';
    hoverTooltipContent.textContent = [
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
