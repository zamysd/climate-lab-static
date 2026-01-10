import { ClimateModel } from './simulation.js';
import { EarthScene } from './earth.js';
import { ClimateGraphs } from './graphs.js';
import { translations } from './locales.js';

class App {
    constructor() {
        this.model = new ClimateModel();
        this.scene = new EarthScene('canvas-container');
        this.graphs = new ClimateGraphs();

        this.initDOM();
        this.startLoop();

        // Initialize Language
        this.setLanguage('id');
    }

    initDOM() {
        // Elements
        this.inputs = {
            co2: document.getElementById('co2-slider'),
            albedo: document.getElementById('albedo-slider'),
            solar: document.getElementById('solar-slider'),
            forest: document.getElementById('forest-slider')
        };

        this.displays = {
            co2: document.getElementById('co2-value'),
            albedo: document.getElementById('albedo-value'),
            solar: document.getElementById('solar-value'),
            forest: document.getElementById('forest-value'),
            temp: document.getElementById('temp-value'),
            balance: document.getElementById('balance-value'),
            flowIn: document.getElementById('flow-in'),
            flowReflected: document.getElementById('flow-reflected'),
            flowOut: document.getElementById('flow-out')
        };

        // Listeners
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key].addEventListener('input', (e) => {
                this.handleInput(key, e.target.value);
            });
        });

        // Language Switcher
        document.getElementById('lang-select').addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        // Presets
        document.querySelectorAll('.preset-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadPreset(e.target.dataset.preset);
            });
        });

        // Bottom Navigation (Mobile)
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.target);
            });
        });
    }

    switchView(viewId) {
        // Update Nav State
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === viewId);
        });

        // Update View Visibility
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });

        // Trigger Resize if simulation is shown (to fix canvas size)
        if (viewId === 'view-simulation') {
            setTimeout(() => {
                this.scene.onWindowResize();
            }, 50);
        }
    }

    setLanguage(lang) {
        console.log(`Setting language to: ${lang}`);
        const t = translations[lang];
        if (!t) {
            console.error(`Translation not found for language: ${lang}`);
            return;
        }

        // Update all data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');

            // Handle [attr]key syntax
            if (key.startsWith('[')) {
                const match = key.match(/\[(.*?)\](.*)/);
                if (match) {
                    const attr = match[1];
                    const realKey = match[2];
                    if (t[realKey]) {
                        el.setAttribute(attr, t[realKey]);
                    }
                }
            } else {
                // Normal text content
                if (t[key]) {
                    el.innerText = t[key];
                }
            }
        });

        // Update Graphs
        this.graphs.updateLabels(t);
    }

    handleInput(key, value) {
        // Update Model
        this.model.updateParams({ [key]: value });

        // Update DOM Display
        this.displays[key].innerText = value;
    }

    loadPreset(name) {
        let params = {};
        switch (name) {
            case 'pre-industrial':
                params = { co2: 280, albedo: 0.32, solar: 1361, forest: 50 };
                break;
            case 'modern':
                params = { co2: 420, albedo: 0.30, solar: 1361, forest: 30 };
                break;
            case 'extreme':
                params = { co2: 600, albedo: 0.25, solar: 1365, forest: 10 };
                break;
        }

        // Apply
        this.model.updateParams(params);

        // Update Inputs & Displays
        Object.keys(params).forEach(key => {
            if (this.inputs[key]) this.inputs[key].value = params[key];
            if (this.displays[key]) this.displays[key].innerText = params[key];
        });
    }

    startLoop() {
        // Main Logic Loop (approx 30fps for Physics/UI updates)
        setInterval(() => {
            const stats = this.model.step(0.5); // dt = 0.5s per frame

            // Update UI
            this.updateUI(stats);

            // Update 3D Scene
            this.scene.updateState({
                temp: stats.temp,
                co2: this.model.co2,
                forest: this.model.forestCover
            });

            // Update Graphs (Throttle?)
            // let's update graphs every frame for smoothness in this demo
            this.graphs.update(stats);

        }, 33);

        // Start 3D Render Loop
        this.scene.animate();
    }

    updateUI(stats) {
        this.displays.temp.innerText = stats.temp.toFixed(1);

        const balance = stats.incoming - stats.reflected - stats.outgoing;
        // Small epsilon check
        const balanceDisplay = Math.abs(balance) < 0.1 ? "0.0" : balance.toFixed(1);
        this.displays.balance.innerText = balanceDisplay;

        // Color stats based on danger
        if (stats.temp > 17) this.displays.temp.style.color = '#f87171'; // Red
        else if (stats.temp < 12) this.displays.temp.style.color = '#38bdf8'; // Blue
        else this.displays.temp.style.color = '#f1f5f9'; // White

        // Flow Diagram
        this.displays.flowIn.innerText = stats.incoming.toFixed(0);
        this.displays.flowReflected.innerText = stats.reflected.toFixed(0);
        this.displays.flowOut.innerText = stats.outgoing.toFixed(0);
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
