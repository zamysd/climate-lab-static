/**
 * Graphs Module
 * Handles Chart.js initialization and updates.
 */

export class ClimateGraphs {
    constructor() {
        this.maxPoints = 50;
        this.timeLabel = 0;

        // 1. Temperature Chart (Line)
        const ctxTemp = document.getElementById('temp-chart').getContext('2d');
        this.tempChart = new Chart(ctxTemp, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Avg Surface Temp (°C)',
                    data: [],
                    borderColor: '#38bdf8', // Accent
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#94a3b8' },
                        suggestedMin: 10,
                        suggestedMax: 20
                    }
                },
                animation: { duration: 0 } // Performance
            }
        });

        // 2. Balance Chart (Bar/Gauge-ish)
        const ctxBalance = document.getElementById('balance-chart').getContext('2d');
        this.balanceChart = new Chart(ctxBalance, {
            type: 'bar',
            data: {
                labels: ['Absorbed (In)', 'Emitted (Out)'],
                datasets: [{
                    label: 'Energy (W/m²)',
                    data: [240, 240],
                    backgroundColor: [
                        '#fbbf24', // Amber (Sun)
                        '#f87171'  // Red (Heat)
                    ],
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' },
                        min: 0,
                        max: 400
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f1f5f9' }
                    }
                },
                animation: { duration: 200 }
            }
        });
    }

    update(stats) {
        this.timeLabel++;

        // Update Temp Chart
        this.tempChart.data.labels.push(this.timeLabel);
        this.tempChart.data.datasets[0].data.push(stats.temp);

        if (this.tempChart.data.labels.length > this.maxPoints) {
            this.tempChart.data.labels.shift();
            this.tempChart.data.datasets[0].data.shift();
        }
        this.tempChart.update();

        // [Absorbed, Outgoing]
        this.balanceChart.data.datasets[0].data = [stats.absorbed, stats.outgoing];
        this.balanceChart.update();
    }

    updateLabels(t) {
        // Update Temp Chart
        this.tempChart.data.datasets[0].label = t.chart_temp;
        this.tempChart.update();

        // Update Balance Chart
        this.balanceChart.data.labels = [t.chart_absorbed, t.chart_emitted];
        this.balanceChart.data.datasets[0].label = t.chart_balance;
        this.balanceChart.update();
    }
}
