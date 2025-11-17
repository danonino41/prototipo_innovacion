const API_READ_URL = 'https://servicio-iot-get-965769718448.northamerica-south1.run.app';
const API_WRITE_URL = 'https://servicio-iot-965769718448.northamerica-south1.run.app';

let globalHistoryData = [];

const sensorLocations = [
    { id: 'suelo1', type: 'suelo', top: '70%', left: '30%', location: 'Zona C1' },
    { id: 'suelo2', type: 'suelo', top: '55%', left: '15%', location: 'Zona C2' },
    { id: 'suelo3', type: 'suelo', top: '45%', left: '55%', location: 'Zona C3' },
    { id: 'agua1', type: 'agua', top: '85%', left: '5%', location: 'Pozo B1' },
    { id: 'agua2', type: 'agua', top: '90%', left: '40%', location: 'Pozo B2' },
    { id: 'aire1', type: 'aire', top: '30%', left: '60%', location: 'Sector A1' },
    { id: 'aire2', type: 'aire', top: '15%', left: '40%', location: 'Sector A2' },
];


// --- Funciones de Utilidad ---

function updateQualityCards(airData, waterData, soilData) {
    const updateCard = (id, data) => {
        if (!data || data.value === undefined) return;
        document.getElementById(`${id}-value`).innerHTML = `${data.value} <span class="unit">${data.unit || ''}</span>`;
        document.getElementById(`${id}-status`).textContent = data.status || 'N/A';
        document.getElementById(`${id}-status`).className = `status-tag ${data.status ? data.status.toLowerCase() : 'normal'}`;
    };

    updateCard('aire', airData);
    updateCard('agua', waterData);
    updateCard('suelo', soilData);
}

function renderAlerts(alerts) {
    const list = document.getElementById('alert-list');
    list.innerHTML = '';

    alerts.forEach(item => {
        const div = document.createElement('div');
        div.className = `alert-item ${item.status.toLowerCase()}`;
        div.innerHTML = `
            <i class="material-icons">warning</i>
            <div class="alert-content">
                <p class="alert-text">
                    <strong>${item.sensor}</strong> en ${item.location}: ${item.text}.
                </p>
                <span class="alert-time">${item.time}</span>
            </div>
        `;
        list.appendChild(div);
    });

    if (list.children.length === 0) {
        list.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">No hay alertas activas.</p>';
    }
}


function renderHistoryTable(history, filter = 'Todos') {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    const filteredHistory = history.filter(item => {
        if (filter === 'Todos') return true;

        return item.sensor.toLowerCase() === filter.toLowerCase();
    });

    filteredHistory.forEach(log => {
        const row = tbody.insertRow();
        const statusText = log.estado || 'Normal';
        row.innerHTML = `
            <td>${log.fecha}</td>
            <td>${log.sensor}</td>
            <td>${log.valor}</td>
            <td>${log.ubicacion}</td>
            <td><span class="status-tag ${statusText.toLowerCase()}">${statusText}</span></td>
        `;
    });
}

function updateSensorInfoBox(info) {
    const box = document.getElementById('sensor-info-box');
    box.querySelector('.box-title').textContent = info.title;
    document.getElementById('box-value').textContent = info.value;
    document.getElementById('box-status').textContent = info.status;
    document.getElementById('box-location').textContent = info.location;
    box.style.borderLeft = `5px solid ${info.status.toLowerCase() === 'peligro' ? 'red' : 'blue'}`;
}


function renderSensorPoints(locations, currentData) {
    const mapContainer = document.querySelector('.map-container');
    mapContainer.querySelectorAll('.sensor-point').forEach(p => p.remove());

    locations.forEach(sensor => {
        const sensorTypeData = currentData[sensor.type] || { status: 'Normal', value: 'N/A', unit: '' };
        const status = sensorTypeData.status || 'Normal';

        const point = document.createElement('div');
        point.className = `sensor-point ${sensor.type} ${status.toLowerCase()}`;
        point.style.top = sensor.top;
        point.style.left = sensor.left;
        point.dataset.id = sensor.id;

        point.addEventListener('click', () => {
            updateSensorInfoBox({
                title: `Sensor ${sensor.type.toUpperCase()} (${sensor.id.toUpperCase()})`,
                value: sensorTypeData.value + ' ' + sensorTypeData.unit,
                status: status,
                location: sensor.location,
            });
        });

        mapContainer.appendChild(point);
    });

    const initialSensor = locations.find(s => s.type === 'suelo') || locations[0];
    const initialData = currentData[initialSensor.type];
    if (initialData) {
        updateSensorInfoBox({
            title: `Sensor ${initialSensor.type.toUpperCase()} (${initialSensor.id.toUpperCase()})`,
            value: initialData.value + ' ' + initialData.unit,
            status: initialData.status,
            location: initialSensor.location,
        });
    }
}

function generateAlerts(currentData) {
    const alerts = [];
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    const check = (data, sensor, location) => {
        if (data && data.status && data.status.toLowerCase() !== 'normal') {
            alerts.push({
                status: data.status,
                sensor: sensor,
                location: location,
                text: `${data.label} (${data.value}${data.unit}) está en nivel de ${data.status}.`,
                time: now
            });
        }
    };

    check(currentData.air, 'Calidad del Aire', 'Sector A');
    check(currentData.water, 'Calidad del Agua', 'Pozo B');
    check(currentData.soil, 'Calidad del Suelo', 'Zona C');

    return alerts;
}

/**
 * Obtiene los datos actuales y de historial desde la Cloud Function de lectura.
 */
async function fetchData() {
    console.log('Obteniendo datos de Google Cloud...');
    const updateButton = document.getElementById('update-data-btn');
    updateButton.disabled = true;
    updateButton.classList.add('loading');

    try {
        const response = await fetch(API_READ_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: Falló la conexión con la API de lectura.`);
        }

        const data = await response.json();
        const currentData = data.current;

        globalHistoryData = [];

        data.history.forEach(log => {
            const baseDate = new Date(log.timestamp).toLocaleString('es-PE');

            const addEntry = (sensorType, data) => {
                if (data && data.value !== undefined) {
                    globalHistoryData.push({
                        fecha: baseDate,
                        sensor: sensorType,
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

        updateQualityCards(currentData.air, currentData.water, currentData.soil);

        renderHistoryTable(globalHistoryData);

        const alerts = generateAlerts(currentData);
        renderAlerts(alerts);

        renderSensorPoints(sensorLocations, currentData);

        if (currentData.timestamp) {
            const date = new Date(currentData.timestamp);
            document.getElementById('last-update').textContent = `Última actualización: ${date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium', hour12: true })}`;
        }

    } catch (error) {
        console.error('Error al cargar los datos:', error);
        document.getElementById('last-update').textContent = 'Error: Falló la conexión con la API.';
    } finally {
        updateButton.disabled = false;
        updateButton.classList.remove('loading');
    }
}

/**
 * Función para generar datos simulados y enviarlos a Firestore 
 * usando tu Cloud Function 'recibirLecturas'.
 */
const getRandomValue = (min, max) => (Math.random() * (max - min) + min).toFixed(3);
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getStatus = (value, threshold) => (parseFloat(value) > threshold) ? 'Peligro' : (parseFloat(value) > threshold * 0.7) ? 'Alerta' : 'Normal';


async function sendSimulatedData() {
    const airValue = getRandomValue(5, 50);
    const waterValue = getRandomValue(0.01, 0.2);
    const soilValue = getRandomInt(100, 1500);

    const simulatedData = {
        air: {
            value: airValue,
            unit: 'µg/m³',
            status: getStatus(airValue, 40),
            location: 'Sector A1',
            label: 'PM2.5'
        },
        water: {
            value: waterValue,
            unit: 'mg/L',
            status: getStatus(waterValue, 0.15),
            location: 'Pozo B1',
            label: 'Metales'
        },
        soil: {
            value: soilValue,
            unit: 'ppm',
            status: getStatus(soilValue, 1200),
            location: 'Zona C1',
            label: 'pH/Metales'
        }
    };

    console.log('Enviando datos simulados (POST)...', simulatedData);

    try {
        const response = await fetch(API_WRITE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(simulatedData)
        });

        if (response.ok) {
            console.log('✅ Datos simulados enviados. Actualizando dashboard...');
            fetchData();
        } else {
            console.error('❌ Error al enviar datos:', response.status, await response.text());
        }
    } catch (error) {
        console.error('❌ Error de red al enviar datos:', error);
    }
}


// --- INICIALIZACIÓN Y EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    highlightActiveSensorMenu();
    const updateButton = document.getElementById('update-data-btn');
    if (updateButton) {
        updateButton.addEventListener('click', sendSimulatedData);
    }

    const filterDropdown = document.querySelector('.filter-dropdown');
    filterDropdown.addEventListener('click', (event) => {
        const target = event.target;

        if (target.tagName === 'A' && target.hasAttribute('data-filter')) {
            event.preventDefault();

            const filterValue = target.getAttribute('data-filter');

            renderHistoryTable(globalHistoryData, filterValue);

            const filterTextNode = filterDropdown.firstChild;
            if (filterTextNode && filterTextNode.nodeType === 3) {
                filterTextNode.textContent = `Filtro: ${filterValue}`;
            }
        }
    });
    setInterval(sendSimulatedData, 10000);
});

function highlightActiveSensorMenu() {
    const urlParams = new URLSearchParams(window.location.search);
    const activeType = urlParams.get('type');
    const path = window.location.pathname.split('/').pop();

    document.querySelectorAll('.sidebar li.active').forEach(li => {
        li.classList.remove('active');
    });

    // --- Caso 1: Dashboard Principal ---
    if (path === 'DashboardFinal.html') {
        document.querySelector('.sidebar nav a[href*="DashboardFinal.html"]')
            ?.closest('li')?.classList.add('active');
        return;
    }

    // --- Caso 2: Gestión de Incidencias ---
    if (path === 'GestionIncidencias.html') {
        document.querySelector('.sidebar nav a[href*="GestionIncidencias.html"]')
            ?.closest('li')?.classList.add('active');
        return;
    }

    // --- Caso 3: Detalles de Sensor (SensorDetail.html?type=X) ---
    if (path === 'SensorDetail.html' && activeType) {
        const normalizedActiveType = activeType.toLowerCase();

        const selector = `.sidebar nav a[href*="type=${normalizedActiveType}"]`;
        const activeLink = document.querySelector(selector);

        if (activeLink) {
            activeLink.closest('li')?.classList.add('active');
            console.log('¡Éxito! Clase "active" aplicada al sensor:', normalizedActiveType);
        }

        return;
    }
}