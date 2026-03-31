import * as ex from 'excalibur';
import { Config } from './config';
import { Resources } from './resources';
import { AgentCommandDirection, AgentLog } from './agent-log';

type Facing = AgentCommandDirection;
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
  private commandTimerMs = 0;
  private commandVelocity = ex.vec(0, 0);
  private commandAnimation: AnimationState = 'down-idle';

  constructor({ id, pos }: AgentOptions) {
    super({
      pos,
      width: 16,
      height: 16,
      collisionType: ex.CollisionType.Active
    });

    this.id = id;
    this.name = id;
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
      this.commandTimerMs -= elapsedMs;
      this.vel = this.commandVelocity;
      this.graphics.use(this.commandAnimation);

      if (this.commandTimerMs <= 0) {
        this.commandTimerMs = 0;
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

    this.vel = this.currentVelocity;
    this.graphics.use(this.currentAnimation);

    ex.Debug.drawRay(new ex.Ray(this.pos, this.vel), {
      distance: 24,
      color: ex.Color.Red
    });
  }

  applyLog(log: AgentLog): void {
    this.currentLog = log;
    const durationMs = log.durationMs ?? 1800;

    switch (log.action_type) {
      case 'CREATE_SO':
      case 'CREATE_PO':
      case 'IDLE':
        this.commandVelocity = ex.vec(0, 0);
        this.commandAnimation = `${this.facing}-idle`;
        this.commandTimerMs = durationMs;
        break;
      case 'STOCK_TRANSFER': {
        const direction = log.direction ?? FACINGS[Math.floor(Math.random() * FACINGS.length)];
        this.facing = direction;
        this.commandVelocity = directionToVelocity(direction);
        this.commandAnimation = `${direction}-walk`;
        this.commandTimerMs = durationMs;
        break;
      }
      default:
        this.commandVelocity = ex.vec(0, 0);
        this.commandAnimation = `${this.facing}-idle`;
        this.commandTimerMs = durationMs;
        break;
    }
  }

  getCurrentLog(): AgentLog | null {
    return this.currentLog;
  }

  getDebugStatus(): { mode: 'command' | 'autonomous'; actionType: string; remainingMs: number } {
    if (this.commandTimerMs > 0) {
      return {
        mode: 'command',
        actionType: this.currentLog?.action_type ?? 'UNKNOWN',
        remainingMs: Math.max(0, Math.round(this.commandTimerMs))
      };
    }

    return {
      mode: 'autonomous',
      actionType: 'RANDOM_BEHAVIOR',
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

  private pickNextBehavior(): void {
    const shouldIdle = Math.random() < 0.2;

    if (shouldIdle) {
      this.currentVelocity = ex.vec(0, 0);
      this.currentAnimation = `${this.facing}-idle`;
      this.behaviorTimerMs = randomBetween(600, 1400);
      return;
    }

    this.facing = FACINGS[Math.floor(Math.random() * FACINGS.length)];

    switch (this.facing) {
      case 'left':
        this.currentVelocity = ex.vec(-Config.AgentSpeed, 0);
        break;
      case 'right':
        this.currentVelocity = ex.vec(Config.AgentSpeed, 0);
        break;
      case 'up':
        this.currentVelocity = ex.vec(0, -Config.AgentSpeed);
        break;
      case 'down':
      default:
        this.currentVelocity = ex.vec(0, Config.AgentSpeed);
        break;
    }

    this.currentAnimation = `${this.facing}-walk`;
    this.behaviorTimerMs = randomBetween(700, 1800);
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
