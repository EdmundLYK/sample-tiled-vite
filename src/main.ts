import * as ex from 'excalibur';
import { Resources, loader } from './resources';
import { AgentManager } from './agent-manager';

const game = new ex.Engine({
    width: 800,
    height: 600,
    canvasElementId: 'game',
    pixelArt: true,
    pixelRatio: 2
});

game.start(loader).then(() => {
    Resources.TiledMap.addToScene(game.currentScene);

    const agentManager = new AgentManager(game.currentScene);
    agentManager.spawnAgents([
        { id: 'A1', pos: ex.vec(37, 27) },
        { id: 'A2', pos: ex.vec(69, 27) }
    ]);
});
