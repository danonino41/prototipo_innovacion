document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sensorType = urlParams.get('type');
    const capitalizedSensorType = sensorType ? sensorType.charAt(0).toUpperCase() + sensorType.slice(1).toLowerCase() : 'N/A';

    if (capitalizedSensorType === 'N/A') {
        document.getElementById('detail-title').textContent = 'Error: Sensor no especificado.';
        return;
    }

    document.getElementById('detail-title').textContent = `Detalle del Sensor de ${capitalizedSensorType}`;
    document.getElementById('chart-sensor-type').textContent = capitalizedSensorType;

    fetchDetailData(capitalizedSensorType);
});


// --- Funciones de Procesamiento y Renderizado ---

function processHistoryForChart(historyData, sensorType) {
    const filteredHistory = historyData.filter(log => log.sensor.toLowerCase() === sensorType.toLowerCase());

    const labels = [];
    const values = [];

    filteredHistory.slice(0, 10).reverse().forEach(log => {

        const time = new Date(log.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        labels.push(time);

        const numericValueMatch = log.valor.match(/[\d\.]+/);
        const numericValue = numericValueMatch ? parseFloat(numericValueMatch[0]) : 0;
        values.push(numericValue);
    });

    const unit = filteredHistory.length > 0 ? filteredHistory[0].valor.match(/[^\d\.\s]+/g).join('') : '';

    return { labels, values, unit };
}


function renderChart(chartData, sensorType) {
    const ctx = document.getElementById('historyChart').getContext('2d');

    if (window.sensorChart instanceof Chart) {
        window.sensorChart.destroy();
    }

    window.sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: `Valor de ${sensorType} (${chartData.unit})`,
                data: chartData.values,
                borderColor: '#6c7ff5',
                backgroundColor: 'rgba(108, 127, 245, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `Valor (${chartData.unit})`
                    }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                title: { display: false }
            }
        }
    });
}

/**
 * FUNCIÓN PARA FILTRAR Y RENDERIZAR ALERTAS RECIENTES
 */
function renderRecentAlerts(historyData, sensorType, minutes = 2) {
    const alertList = document.getElementById('recent-alerts-list');
    alertList.innerHTML = '';

    const cutOffTime = Date.now() - (minutes * 60 * 1000);

    const recentAlerts = historyData.filter(log => {
        const sensorMatch = log.sensor.toLowerCase() === sensorType.toLowerCase();

        const isAlert = log.estado.toLowerCase() !== 'normal';

        const logTime = Date.parse(log.fecha);
        const isRecent = !isNaN(logTime) && logTime >= cutOffTime;

        return sensorMatch && isAlert && isRecent;
    });

    if (recentAlerts.length === 0) {
        alertList.innerHTML = `<p style="text-align: center; color: #aaa;">No se encontraron alertas para ${sensorType} en los últimos ${minutes} minutos.</p>`;
        return;
    }

    recentAlerts.forEach(log => {
        const div = document.createElement('div');
        div.className = `alert-item ${log.estado.toLowerCase()}`;
        div.innerHTML = `
            <i class="material-icons">warning</i>
            <div class="alert-content">
                <p class="alert-text">
                    <strong>${log.estado.toUpperCase()}</strong> en ${log.ubicacion}: Valor ${log.valor}
                </p>
                <span class="alert-time">${new Date(log.fecha).toLocaleTimeString('es-ES')}</span>
            </div>
        `;
        alertList.appendChild(div);
    });
}


// --- Lógica de Obtención de Datos ---

async function fetchDetailData(sensorType) {
    try {
        const response = await fetch(API_READ_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: Falló la conexión con la API de lectura.`);
        }

        const data = await response.json();

        let unnestedHistory = [];
        data.history.forEach(log => {
            const baseDate = log.timestamp;

            const addEntry = (type, data) => {
                if (data && data.value !== undefined) {
                    unnestedHistory.push({
                        fecha: baseDate,
                        sensor: type,
                        valor: `${data.value} ${data.unit}`,
                        ubicacion: data.location || 'N/A',
                        estado: data.status || 'Normal',
                    });
                }
            };
            addEntry('Aire', log.air);
            addEntry('Agua', log.water);
            addEntry('Suelo', log.soil);
        });

        const chartData = processHistoryForChart(unnestedHistory, sensorType);
        renderChart(chartData, sensorType);

        renderRecentAlerts(unnestedHistory, sensorType, 2);

    } catch (error) {
        console.error(`Error al cargar los detalles de ${sensorType}:`, error);
        document.getElementById('detail-title').textContent = `Error al cargar datos para ${sensorType}.`;
    }
}