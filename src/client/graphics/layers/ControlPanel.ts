import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { renderNumber, renderTroops } from '../Utils';
import { EventBus } from '../../../core/EventBus';
import { UIState } from '../UIState';
import { SendSetTargetTroopRatioEvent } from '../../Transport';

@customElement('control-panel')
export class ControlPanel extends LitElement implements Layer {
    private game: Game
    public clientID: ClientID
    public eventBus: EventBus
    public uiState: UIState

    @state()
    private attackRatio: number = .2;

    @state()
    private targetTroopRatio = 1;

    @state()
    private _population: number;

    @state()
    private _maxPopulation: number;

    @state()
    private popRate: number;

    @state()
    private _troops: number;

    @state()
    private _workers: number;

    @state()
    private _isVisible = false;

    @state()
    private _manpower: number = 0;

    @state()
    private _gold: number


    @state()
    private _goldPerSecond: number

    init(game: Game) {
        this.game = game;
        this.attackRatio = .20
        this.uiState.attackRatio = this.attackRatio
    }

    tick() {
        // Update game state based on numTroops value if needed
        if (!this._isVisible && !this.game.inSpawnPhase()) {
            this.toggleVisibility();
        }

        const player = this.game.playerByClientID(this.clientID)
        if (player == null) {
            this._isVisible = false
            return
        }
        this._population = player.population()
        this._maxPopulation = this.game.config().maxPopulation(player)
        this._gold = player.gold()
        this._troops = player.troops()
        this._workers = player.workers()
        this.popRate = this.game.config().populationIncreaseRate(player) * 10
        this._goldPerSecond = this.game.config().goldAdditionRate(player) * 10
    }

    onAttackRatioChange(newRatio: number) {
        this.uiState.attackRatio = newRatio
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // Render any necessary canvas elements
    }

    shouldTransform(): boolean {
        return false;
    }

    toggleVisibility() {
        this._isVisible = !this._isVisible;
        this.requestUpdate();
    }

    targetTroops(): number {
        return this._manpower * this.targetTroopRatio
    }

    onTroopChange(newRatio: number) {
        this.eventBus.emit(new SendSetTargetTroopRatioEvent(newRatio))
    }

    delta(): number {
        const d = this._population - this.targetTroops()
        // if (Math.abs(d) < this._manpower / 200) {
        //     return 0
        // }
        return d
    }


    static styles = css`
        :host {
            display: block;
        }
        .control-panel {
            position: fixed;
            bottom: 10px;
            left: 10px;
            z-index: 9999;
            background-color: rgba(30, 30, 30, 0.7);
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            width: 250px;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        }
        .hidden {
            opacity: 0;
            visibility: hidden;
        }
        .slider-container {
            margin-bottom: 15px;
        }
        .control-panel-info {
            color: white;
            margin-bottom: 15px;
            padding: 10px;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: bold;
        }
        label {
            display: block;
            color: white;
            margin-bottom: 5px;
        }
        input[type="range"] {
            width: 100%;
        }
        .slider-value {
            color: white;
            text-align: right;
        }
    `;

    render() {
        return html`
            <div class="control-panel ${this._isVisible ? '' : 'hidden'}">
                <div class="control-panel-info">
                    <div class="info-row">
                        <span class="info-label">Population:</span>
                        <span>${renderTroops(this._population)} / ${renderTroops(this._maxPopulation)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Population/s:</span>
                        <span>${renderTroops(this.popRate)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Gold:</span>
                        <span>${renderNumber(this._gold)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Gold/s:</span>
                        <span>${renderNumber(this._goldPerSecond)}</span>
                    </div>
                </div>
                <div class="slider-container">
                    <label for="numTroops">Troops: ${renderTroops(this._troops)}   |   Workers: ${renderTroops(this._workers)}</label>
                    <input type="range" id="numTroops" min="1" max="10" .value=${this.targetTroopRatio * 10}
                           @input=${(e: Event) => {
                this.targetTroopRatio = parseInt((e.target as HTMLInputElement).value) / 10;
                this.onTroopChange(this.targetTroopRatio);
            }}>
                </div>
               <div class="slider-container">
                    <label for="numTroops">Attack Ratio: ${this.attackRatio * 100}%</label>
                    <input type="range" id="numTroops" min="1" max="10" value=${this.attackRatio * 10}
                           @input=${(e: Event) => {
                this.attackRatio = parseInt((e.target as HTMLInputElement).value) / 10;
                this.onAttackRatioChange(this.attackRatio);
            }}>
                </div>
            </div>
        `;
    }
}