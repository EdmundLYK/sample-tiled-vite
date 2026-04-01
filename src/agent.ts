import * as ex from 'excalibur';
import { Config } from './config';
import { Resources } from './resources';
import { AgentCommandDirection, AgentLog } from './agent-log';
import { AgentBehaviorKind, getActionMapEntry } from './action-map';
import { DepartmentBounds, DepartmentZone, normalizeZoneBounds, ZoneSeatSpot } from './department-zone';

type Facing = AgentCommandDirection;
type AutonomousBehavior = 'walk' | 'idle' | 'sit';
type AnimationState =
  | 'left-idle'
  | 'right-idle'
  | 'up-idle'
  | 'down-idle'
  | 'left-walk'
  | 'right-walk'
  | 'up-walk'
  | 'down-walk';

const FACINGS: Facing[] = ['left', 'right', 'up', 'down'];
const DEPARTMENT_WALL_CLEARANCE_PX = 6;

export interface AgentOptions {
  id: string;
  pos: ex.Vector;
}

export class Agent extends ex.Actor {
  public readonly id: string;

  private behaviorTimerMs = 0;
  private facing: Facing = 'down';
  private currentVelocity = ex.vec(0, 0);
  private currentAnimation: AnimationState = 'down-idle';
  private currentLog: AgentLog | null = null;
  private currentMappedBehavior: AgentBehaviorKind = 'idle';
  private currentAutonomousBehavior: AutonomousBehavior = 'idle';
  private commandTimerMs = 0;
  private commandVelocity = ex.vec(0, 0);
  private commandAnimation: AnimationState = 'down-idle';
  private departmentZone: DepartmentZone | null = null;
  private noWalkAreas: DepartmentBounds[] = [];
  private obstacleAreas: DepartmentBounds[] = [];
  private seatSpots: ZoneSeatSpot[] = [];
  private commandTarget: ex.Vector | null = null;
  private commandTargetFacing: Facing = 'up';
  private commandPostMoveTimerMs = 0;
  private reservedSeatKey: string | null = null;

  private static readonly seatReservations = new Map<string, string>();

  constructor({ id, pos }: AgentOptions) {
    super({
      pos,
      width: 16,
      height: 16,
      // We drive movement and area constraints manually, so disable physics push-back
      // between agents to prevent them shoving each other during path crossing.
      collisionType: ex.CollisionType.PreventCollision
    });

    this.id = id;
    this.name = id;
    this.scale = ex.vec(Config.AgentScale, Config.AgentScale);
  }

  onInitialize(_engine: ex.Engine): void {
    const spriteSheet = ex.SpriteSheet.fromImageSource({
      image: Resources.HeroSpriteSheetPng as ex.ImageSource,
      grid: {
        spriteWidth: 16,
        spriteHeight: 16,
        rows: 8,
        columns: 8
      }
    });

    this.addAnimation('left-idle', spriteSheet, 1);
    this.addAnimation('right-idle', spriteSheet, 2);
    this.addAnimation('up-idle', spriteSheet, 3);
    this.addAnimation('down-idle', spriteSheet, 0);

    this.addAnimation('left-walk', spriteSheet, 5);
    this.addAnimation('right-walk', spriteSheet, 6);
    this.addAnimation('up-walk', spriteSheet, 7);
    this.addAnimation('down-walk', spriteSheet, 4);

    this.pickNextBehavior();
  }

  onPreUpdate(_engine: ex.Engine, elapsedMs: number): void {
    if (this.commandTimerMs > 0) {
      if (this.commandTarget) {
        this.updateCommandMove(elapsedMs);
      } else {
        this.commandTimerMs -= elapsedMs;
      }

      this.vel = this.commandVelocity;
      this.graphics.use(this.commandAnimation);

      if (this.commandTimerMs <= 0) {
        this.commandTimerMs = 0;
        this.commandTarget = null;
        this.commandPostMoveTimerMs = 0;
        this.pickNextBehavior();
      }

      ex.Debug.drawRay(new ex.Ray(this.pos, this.vel), {
        distance: 24,
        color: ex.Color.Red
      });
      return;
    }

    this.behaviorTimerMs -= elapsedMs;

    if (this.behaviorTimerMs <= 0) {
      this.pickNextBehavior();
    }

    if (this.currentAutonomousBehavior === 'walk' && this.wouldEnterNoWalkArea(this.currentVelocity, elapsedMs)) {
      this.pickNextBehavior();
      if (this.currentAutonomousBehavior === 'walk' && this.wouldEnterNoWalkArea(this.currentVelocity, elapsedMs)) {
        this.currentAutonomousBehavior = 'idle';
        this.currentVelocity = ex.vec(0, 0);
        this.currentAnimation = `${this.facing}-idle`;
        this.behaviorTimerMs = randomBetween(500, 900);
      }
    }

    this.vel = this.currentVelocity;
    this.graphics.use(this.currentAnimation);

    ex.Debug.drawRay(new ex.Ray(this.pos, this.vel), {
      distance: 24,
      color: ex.Color.Red
    });
  }

  onPostUpdate(_engine: ex.Engine, _elapsedMs: number): void {
    this.constrainToDepartmentZone();
    if (this.commandTimerMs <= 0) {
      this.constrainOutsideNoWalkAreas();
    }
  }

  applyLog(log: AgentLog): void {
    this.currentLog = log;
    const mapEntry = getActionMapEntry(log.action_type);
    const durationMs = log.durationMs ?? mapEntry.defaultDurationMs;
    this.currentMappedBehavior = mapEntry.behavior;

    if (log.action_type === 'CREATE_SO' && this.seatSpots.length > 0) {
      this.startCommandMoveToSeat(durationMs);
      return;
    }

    this.releaseSeatReservation();

    switch (mapEntry.behavior) {
      case 'typing':
      case 'idle':
        this.commandTarget = null;
        this.commandPostMoveTimerMs = 0;
        this.commandVelocity = ex.vec(0, 0);
        this.commandAnimation = `${this.facing}-idle`;
        this.commandTimerMs = durationMs;
        break;
      case 'walking': {
        this.commandTarget = null;
        this.commandPostMoveTimerMs = 0;
        const direction = log.direction ?? FACINGS[Math.floor(Math.random() * FACINGS.length)];
        this.facing = direction;
        this.commandVelocity = directionToVelocity(direction);
        this.commandAnimation = `${direction}-walk`;
        this.commandTimerMs = durationMs;
        break;
      }
      default:
        this.commandTarget = null;
        this.commandPostMoveTimerMs = 0;
        this.commandVelocity = ex.vec(0, 0);
        this.commandAnimation = `${this.facing}-idle`;
        this.commandTimerMs = durationMs;
        break;
    }
  }

  getCurrentLog(): AgentLog | null {
    return this.currentLog;
  }

  setDepartmentZone(zone: DepartmentZone): void {
    this.releaseSeatReservation();

    this.departmentZone = {
      id: zone.id,
      bounds: normalizeZoneBounds(zone.bounds),
      noWalkAreas: zone.noWalkAreas?.map((area) => normalizeZoneBounds(area)),
      obstacleAreas: zone.obstacleAreas?.map((area) => normalizeZoneBounds(area)),
      seatSpots: zone.seatSpots?.map((seat) => ({ ...seat }))
    };
    this.noWalkAreas = this.departmentZone.noWalkAreas ?? [];
    this.obstacleAreas = this.departmentZone.obstacleAreas ?? [];
    this.seatSpots = this.departmentZone.seatSpots ?? [];
    this.constrainToDepartmentZone();
    this.constrainOutsideNoWalkAreas();
  }

  getDepartmentZoneId(): string | null {
    return this.departmentZone?.id ?? null;
  }

  getDebugStatus(): {
    state: 'active' | 'inactive';
    mode: 'command' | 'autonomous';
    actionType: string;
    behavior: AgentBehaviorKind | AutonomousBehavior;
    remainingMs: number;
  } {
    if (this.commandTimerMs > 0) {
      return {
        state: 'active',
        mode: 'command',
        actionType: this.currentLog?.action_type ?? 'UNKNOWN',
        behavior: this.currentMappedBehavior,
        remainingMs: Math.max(0, Math.round(this.commandTimerMs))
      };
    }

    return {
      state: 'inactive',
      mode: 'autonomous',
      actionType: `AUTO_${this.currentAutonomousBehavior.toUpperCase()}`,
      behavior: this.currentAutonomousBehavior,
      remainingMs: Math.max(0, Math.round(this.behaviorTimerMs))
    };
  }

  private addAnimation(key: AnimationState, spriteSheet: ex.SpriteSheet, row: number): void {
    const animation = new ex.Animation({
      frames: [
        { graphic: spriteSheet.getSprite(0, row) as ex.Sprite, duration: Config.AgentFrameSpeed },
        { graphic: spriteSheet.getSprite(1, row) as ex.Sprite, duration: Config.AgentFrameSpeed },
        { graphic: spriteSheet.getSprite(2, row) as ex.Sprite, duration: Config.AgentFrameSpeed },
        { graphic: spriteSheet.getSprite(3, row) as ex.Sprite, duration: Config.AgentFrameSpeed }
      ]
    });

    this.graphics.add(key, animation);
  }

  private startCommandMoveToSeat(durationMs: number): void {
    const seatSelection = this.findNearestAvailableSeat();
    if (!seatSelection) {
      this.commandTarget = null;
      this.commandPostMoveTimerMs = 0;
      this.commandVelocity = ex.vec(0, 0);
      this.commandAnimation = `${this.facing}-idle`;
      this.commandTimerMs = durationMs;
      return;
    }

    if (!this.reserveSeat(seatSelection.key)) {
      this.commandTarget = null;
      this.commandPostMoveTimerMs = 0;
      this.commandVelocity = ex.vec(0, 0);
      this.commandAnimation = `${this.facing}-idle`;
      this.commandTimerMs = durationMs;
      return;
    }
    const target = ex.vec(seatSelection.seat.x, seatSelection.seat.y);
    const distance = target.sub(this.pos).size;
    const estimatedWalkMs = Math.ceil((distance / Config.AgentSpeed) * 1000);
    const walkMs = Math.max(
      Config.ChairWalkMinMs,
      Math.min(Config.ChairWalkWindowMs, estimatedWalkMs)
    );

    this.commandTarget = target;
    this.commandTargetFacing = seatSelection.seat.facing;
    this.commandPostMoveTimerMs = durationMs;
    this.commandTimerMs = walkMs;
    this.commandVelocity = ex.vec(0, 0);
    this.commandAnimation = `${this.facing}-walk`;
  }

  private updateCommandMove(elapsedMs: number): void {
    if (!this.commandTarget) {
      return;
    }

    const toTarget = this.commandTarget.sub(this.pos);
    const distance = toTarget.size;
    const maxStep = Config.AgentSpeed * (elapsedMs / 1000);
    this.commandTimerMs -= elapsedMs;

    if (distance <= maxStep + 0.01) {
      this.pos = this.commandTarget.clone();
      this.commandTarget = null;
      this.facing = this.commandTargetFacing;
      this.commandVelocity = ex.vec(0, 0);
      this.commandAnimation = `${this.facing}-idle`;
      this.commandTimerMs = this.commandPostMoveTimerMs;
      this.commandPostMoveTimerMs = 0;
      return;
    }

    if (this.commandTimerMs <= 0) {
      // Walk window expired: settle at the reserved seat so typing/sit state is still visible.
      this.pos = this.commandTarget.clone();
      this.commandTarget = null;
      this.facing = this.commandTargetFacing;
      this.commandVelocity = ex.vec(0, 0);
      this.commandAnimation = `${this.facing}-idle`;
      this.commandTimerMs = this.commandPostMoveTimerMs;
      this.commandPostMoveTimerMs = 0;
      return;
    }

    const direction = toTarget.normalize();
    const directVelocity = direction.scale(Config.AgentSpeed);

    if (!this.wouldEnterAreas(directVelocity, elapsedMs, this.obstacleAreas)) {
      this.commandVelocity = directVelocity;
      this.commandAnimation = directionToWalkAnimation(direction);
      return;
    }

    const candidateVelocities: ex.Vector[] = [];
    if (Math.abs(direction.x) > 0.001) {
      candidateVelocities.push(ex.vec(Math.sign(direction.x) * Config.AgentSpeed, 0));
    }
    if (Math.abs(direction.y) > 0.001) {
      candidateVelocities.push(ex.vec(0, Math.sign(direction.y) * Config.AgentSpeed));
    }

    const perpendiculars = [
      ex.vec(Config.AgentSpeed, 0),
      ex.vec(-Config.AgentSpeed, 0),
      ex.vec(0, Config.AgentSpeed),
      ex.vec(0, -Config.AgentSpeed)
    ];
    for (const option of perpendiculars) {
      candidateVelocities.push(option);
    }

    const step = elapsedMs / 1000;
    let bestVelocity: ex.Vector | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const velocity of candidateVelocities) {
      if (this.wouldEnterAreas(velocity, elapsedMs, this.obstacleAreas)) {
        continue;
      }

      const projected = this.pos.add(velocity.scale(step));
      const projectedDistance = projected.sub(this.commandTarget).size;
      if (projectedDistance < bestDistance) {
        bestDistance = projectedDistance;
        bestVelocity = velocity;
      }
    }

    if (!bestVelocity) {
      this.commandVelocity = ex.vec(0, 0);
      this.commandAnimation = `${this.facing}-idle`;
      return;
    }

    this.commandVelocity = bestVelocity;
    this.commandAnimation = directionToWalkAnimation(bestVelocity.normalize());
  }

  private findNearestAvailableSeat(): { seat: ZoneSeatSpot; key: string } | null {
    if (!this.departmentZone || this.seatSpots.length === 0) {
      return null;
    }

    const zoneId = this.departmentZone.id;
    const candidates = this.seatSpots
      .map((seat, index) => ({
        seat,
        key: `${zoneId}:${index}`,
        distance: ex.vec(seat.x, seat.y).sub(this.pos).size
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const candidate of candidates) {
      const holder = Agent.seatReservations.get(candidate.key);
      if (!holder || holder === this.id) {
        return { seat: candidate.seat, key: candidate.key };
      }
    }

    return null;
  }

  private reserveSeat(seatKey: string): boolean {
    if (this.reservedSeatKey === seatKey) {
      return true;
    }

    const holder = Agent.seatReservations.get(seatKey);
    if (holder && holder !== this.id) {
      return false;
    }

    this.releaseSeatReservation();
    Agent.seatReservations.set(seatKey, this.id);
    this.reservedSeatKey = seatKey;
    return true;
  }

  private releaseSeatReservation(): void {
    if (!this.reservedSeatKey) {
      return;
    }

    const holder = Agent.seatReservations.get(this.reservedSeatKey);
    if (holder === this.id) {
      Agent.seatReservations.delete(this.reservedSeatKey);
    }
    this.reservedSeatKey = null;
  }

  private pickNextBehavior(): void {
    const nextBehavior = this.pickRandomAutonomousBehavior();

    if (nextBehavior === 'idle') {
      this.currentAutonomousBehavior = 'idle';
      this.currentVelocity = ex.vec(0, 0);
      this.currentAnimation = `${this.facing}-idle`;
      this.behaviorTimerMs = randomBetween(600, 1400);
      return;
    }

    if (nextBehavior === 'sit') {
      this.currentAutonomousBehavior = 'sit';
      this.currentVelocity = ex.vec(0, 0);
      this.facing = 'down';
      this.currentAnimation = 'down-idle';
      this.behaviorTimerMs = randomBetween(1400, 2600);
      return;
    }

    // Release seat only when we actually start leaving it.
    this.releaseSeatReservation();
    this.currentAutonomousBehavior = 'walk';
    let selectedFacing: Facing | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateFacing = FACINGS[Math.floor(Math.random() * FACINGS.length)];
      const candidateVelocity = directionToVelocity(candidateFacing);
      if (!this.wouldEnterNoWalkArea(candidateVelocity, 300)) {
        selectedFacing = candidateFacing;
        this.currentVelocity = candidateVelocity;
        break;
      }
    }

    if (!selectedFacing) {
      this.currentAutonomousBehavior = 'idle';
      this.currentVelocity = ex.vec(0, 0);
      this.currentAnimation = `${this.facing}-idle`;
      this.behaviorTimerMs = randomBetween(600, 1200);
      return;
    }

    this.facing = selectedFacing;
    this.currentAnimation = `${this.facing}-walk`;
    this.behaviorTimerMs = randomBetween(700, 1800);
  }

  private pickRandomAutonomousBehavior(): AutonomousBehavior {
    const roll = Math.random();
    if (roll < 0.5) {
      return 'walk';
    }
    if (roll < 0.8) {
      return 'idle';
    }
    return 'sit';
  }

  private constrainToDepartmentZone(): void {
    if (!this.departmentZone) {
      return;
    }

    const movementBounds = this.getDepartmentMovementBounds();
    if (!movementBounds) {
      return;
    }

    const { minX, maxX, minY, maxY } = movementBounds;

    const clampedX = clamp(this.pos.x, minX, maxX);
    const clampedY = clamp(this.pos.y, minY, maxY);
    const hitX = clampedX !== this.pos.x;
    const hitY = clampedY !== this.pos.y;

    if (!hitX && !hitY) {
      return;
    }

    this.pos = ex.vec(clampedX, clampedY);

    if (hitX) {
      this.currentVelocity = ex.vec(0, this.currentVelocity.y);
      this.commandVelocity = ex.vec(0, this.commandVelocity.y);
    }
    if (hitY) {
      this.currentVelocity = ex.vec(this.currentVelocity.x, 0);
      this.commandVelocity = ex.vec(this.commandVelocity.x, 0);
    }

    if (this.commandTimerMs <= 0 && this.currentAutonomousBehavior === 'walk') {
      this.pickNextBehavior();
      return;
    }

    if (this.commandTimerMs > 0 && this.commandVelocity.equals(ex.Vector.Zero)) {
      this.commandAnimation = `${this.facing}-idle`;
    }
  }

  private constrainOutsideNoWalkAreas(): void {
    if (this.noWalkAreas.length === 0) {
      return;
    }

    const halfWidth = (this.width * this.scale.x) / 2;
    const halfHeight = (this.height * this.scale.y) / 2;

    for (const area of this.noWalkAreas) {
      const minX = area.x1 + halfWidth;
      const maxX = area.x2 - halfWidth;
      const minY = area.y1 + halfHeight;
      const maxY = area.y2 - halfHeight;
      const inside = this.pos.x > minX && this.pos.x < maxX && this.pos.y > minY && this.pos.y < maxY;
      if (!inside) {
        continue;
      }

      const distanceLeft = Math.abs(this.pos.x - minX);
      const distanceRight = Math.abs(maxX - this.pos.x);
      const distanceTop = Math.abs(this.pos.y - minY);
      const distanceBottom = Math.abs(maxY - this.pos.y);
      const nearest = Math.min(distanceLeft, distanceRight, distanceTop, distanceBottom);

      if (nearest === distanceLeft) {
        this.pos = ex.vec(minX, this.pos.y);
      } else if (nearest === distanceRight) {
        this.pos = ex.vec(maxX, this.pos.y);
      } else if (nearest === distanceTop) {
        this.pos = ex.vec(this.pos.x, minY);
      } else {
        this.pos = ex.vec(this.pos.x, maxY);
      }

      this.currentVelocity = ex.vec(0, 0);
      this.currentAnimation = `${this.facing}-idle`;
      this.behaviorTimerMs = randomBetween(500, 900);
      return;
    }
  }

  private wouldEnterNoWalkArea(velocity: ex.Vector, elapsedMs: number): boolean {
    return this.wouldEnterAreas(velocity, elapsedMs, this.noWalkAreas);
  }

  private wouldEnterAreas(velocity: ex.Vector, elapsedMs: number, areas: DepartmentBounds[]): boolean {
    if (velocity.equals(ex.Vector.Zero)) {
      return false;
    }

    const step = elapsedMs / 1000;
    const nextPos = this.pos.add(velocity.scale(step));

    const movementBounds = this.getDepartmentMovementBounds();
    if (movementBounds) {
      const outsideDepartment =
        nextPos.x < movementBounds.minX ||
        nextPos.x > movementBounds.maxX ||
        nextPos.y < movementBounds.minY ||
        nextPos.y > movementBounds.maxY;
      if (outsideDepartment) {
        return true;
      }
    }

    if (areas.length === 0) {
      return false;
    }

    const halfWidth = (this.width * this.scale.x) / 2;
    const halfHeight = (this.height * this.scale.y) / 2;
    return areas.some((area) => {
      const minX = area.x1 + halfWidth;
      const maxX = area.x2 - halfWidth;
      const minY = area.y1 + halfHeight;
      const maxY = area.y2 - halfHeight;
      return nextPos.x > minX && nextPos.x < maxX && nextPos.y > minY && nextPos.y < maxY;
    });
  }

  private getDepartmentMovementBounds():
    | { minX: number; maxX: number; minY: number; maxY: number }
    | null {
    if (!this.departmentZone) {
      return null;
    }

    const bounds = this.departmentZone.bounds;
    const halfWidth = (this.width * this.scale.x) / 2;
    const halfHeight = (this.height * this.scale.y) / 2;

    return {
      minX: bounds.x1 + halfWidth + DEPARTMENT_WALL_CLEARANCE_PX,
      maxX: bounds.x2 - halfWidth - DEPARTMENT_WALL_CLEARANCE_PX,
      minY: bounds.y1 + halfHeight + DEPARTMENT_WALL_CLEARANCE_PX,
      maxY: bounds.y2 - halfHeight - DEPARTMENT_WALL_CLEARANCE_PX
    };
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function directionToVelocity(direction: Facing): ex.Vector {
  switch (direction) {
    case 'left':
      return ex.vec(-Config.AgentSpeed, 0);
    case 'right':
      return ex.vec(Config.AgentSpeed, 0);
    case 'up':
      return ex.vec(0, -Config.AgentSpeed);
    case 'down':
    default:
      return ex.vec(0, Config.AgentSpeed);
  }
}

function directionToWalkAnimation(direction: ex.Vector): AnimationState {
  if (Math.abs(direction.x) > Math.abs(direction.y)) {
    return direction.x >= 0 ? 'right-walk' : 'left-walk';
  }
  return direction.y >= 0 ? 'down-walk' : 'up-walk';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
