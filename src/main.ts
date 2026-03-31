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

    // Phase 2: fake logs to prove behavior can be driven without backend wiring
    const runFakeLogs = () => {
        agentManager.updateLogs('A1', {
            action_type: 'CREATE_SO',
            durationMs: 5000,
            note: 'Simulated sales-order creation'
        });

        agentManager.updateLogs('A2', {
            action_type: 'STOCK_TRANSFER',
            direction: 'right',
            durationMs: 2200,
            note: 'Simulated stock movement'
        });
    };

    runFakeLogs();
    window.setInterval(runFakeLogs, 8000);

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
        const lines = agentManager.getDebugSnapshot().map((entry) => {
            const seconds = (entry.remainingMs / 1000).toFixed(1);
            return `${entry.id} | ${entry.mode} | ${entry.actionType} | ${seconds}s`;
        });
        debugHud.textContent = ['Agent Commands', ...lines].join('\n');
    };

    renderDebugHud();
    window.setInterval(renderDebugHud, 120);
});
