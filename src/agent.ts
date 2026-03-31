import * as ex from 'excalibur';
import { Config } from './config';
import { Resources } from './resources';

type Facing = 'left' | 'right' | 'up' | 'down';
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
