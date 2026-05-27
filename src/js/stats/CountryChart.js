/**
 * CountryChart - Chart.js bar chart for country statistics
 */

export class CountryChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
    }
    
    render(countries, onCountryClick) {
        if (this.chart) this.chart.destroy();
        
        const labels = countries.map((c, i) => (['🥇 ','🥈 ','🥉 '][i] || '') + c.name);
        const container = this.canvas.parentElement;
        container.style.height = (countries.length * 28 + 40) + 'px';
        
        this.chart = new Chart(this.ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ data: countries.map(c => c.count), backgroundColor: '#007aff', borderRadius: 6, maxBarThickness: 24, barPercentage: 0.85, categoryPercentage: 0.9 }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0 && onCountryClick) onCountryClick(countries[elements[0].index]);
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, cornerRadius: 8, displayColors: false,
                        callbacks: { label: (ctx) => [`${countries[ctx.dataIndex].count} check-ins (${countries[ctx.dataIndex].percentage}%)`, `${countries[ctx.dataIndex].cities} cities visited`] }
                    }
                },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f5f5f7' }, ticks: { color: '#86868b', font: { size: 12 } } },
                    y: { grid: { display: false }, ticks: { color: '#1d1d1f', font: { size: 13, weight: '500' }, padding: 4 } }
                },
                layout: { padding: 8 }
            }
        });
    }
    
    destroy() { if (this.chart) { this.chart.destroy(); this.chart = null; } }
}
