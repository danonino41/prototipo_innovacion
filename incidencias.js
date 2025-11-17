document.addEventListener('DOMContentLoaded', () => {
    const INCIDENTS_KEY = 'incidentsData';
    const form = document.getElementById('incident-form');
    const incidentsContainer = document.getElementById('incidents-container');
    const statusFilter = document.getElementById('status-filter');

    const getIncidents = () => {
        const data = localStorage.getItem(INCIDENTS_KEY);
        return data ? JSON.parse(data) : [];
    };

    const saveIncidents = (incidents) => {
        localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
    };

    const getStatusClass = (status) => {
        return `status-${status.toLowerCase().replace(' ', '-')}`;
    };

    const getSeverityClass = (severity) => {
        return `status-${severity.toLowerCase()}`;
    };

    const initializeIncidents = () => {
        const incidents = getIncidents();
        if (incidents.length === 0) {
            const now = new Date();
            const sampleIncidents = [
                {
                    id: 'INC-124578',
                    sensorType: 'Suelo',
                    location: 'Zona C - Sector 5',
                    severity: 'Crítica',
                    description: 'Desviación extrema del nivel de pH (lectura de 4.1). Requiere acción inmediata.',
                    status: 'Abierta',
                    date: new Date(now.getTime() - 86400000).toLocaleString('es-ES'),
                },
                {
                    id: 'INC-930112',
                    sensorType: 'Aire',
                    location: 'Estación de Monitoreo Norte',
                    severity: 'Alta',
                    description: 'Fallo de comunicación en el sensor de PM10. Se requiere revisión física.',
                    status: 'En Progreso',
                    date: new Date(now.getTime() - 3600000).toLocaleString('es-ES'),
                },
                {
                    id: 'INC-008765',
                    sensorType: 'Agua',
                    location: 'Pozo de Recolección P2',
                    severity: 'Media',
                    description: 'Lectura de metales pesados fuera del rango estándar durante las últimas 6 horas.',
                    status: 'Abierta',
                    date: new Date(now.getTime() - 10800000).toLocaleString('es-ES'),
                },
                {
                    id: 'INC-543210',
                    sensorType: 'Aire',
                    location: 'Patio de Lixiviación',
                    severity: 'Baja',
                    description: 'Mantenimiento preventivo pendiente para el sensor de CO2. Tarea rutinaria.',
                    status: 'Cerrada',
                    date: new Date(now.getTime() - 259200000).toLocaleString('es-ES'),
                },
            ];
            saveIncidents(sampleIncidents);
        }
    };

    const renderIncidents = (filter = 'Todos') => {
        const incidents = getIncidents();
        incidentsContainer.innerHTML = '';

        const filteredIncidents = incidents.filter(incident =>
            filter === 'Todos' || incident.status === filter
        );

        if (filteredIncidents.length === 0) {
            incidentsContainer.innerHTML = '<p class="no-incidents-msg">No hay incidencias registradas con el filtro actual.</p>';
            return;
        }

        filteredIncidents.forEach(incident => {
            const incidentItem = document.createElement('div');
            incidentItem.className = 'incident-item';
            incidentItem.dataset.id = incident.id;

            const statusClass = getStatusClass(incident.status);
            const severityClass = getSeverityClass(incident.severity);

            const displayDescription = incident.description.length > 100
                ? incident.description.substring(0, 100) + '...'
                : incident.description;

            incidentItem.innerHTML = `
                <div class="incident-details">
                    <p><strong>ID:</strong> ${incident.id} | <strong>Tipo:</strong> ${incident.sensorType}</p>
                    <p><strong>Ubicación:</strong> ${incident.location}</p>
                    <p><strong>Prioridad:</strong> <span class="status-tag-incident ${severityClass}">${incident.severity}</span></p>
                    <p><strong>Descripción:</strong> ${displayDescription}</p>
                    <p style="font-size: 0.8em; color: #999;">Última actualización: ${incident.date}</p>
                </div>
                <div class="incident-controls">
                    <span class="status-tag-incident ${statusClass}">${incident.status}</span>
                </div>
            `;
            incidentsContainer.appendChild(incidentItem);
        });

    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const newIncident = {
            id: 'INC-' + Date.now().toString().slice(-6),
            sensorType: document.getElementById('sensor-type').value,
            location: document.getElementById('location').value.trim(),
            severity: document.getElementById('severity').value,
            description: document.getElementById('description').value.trim(),
            status: 'Abierta', // El estado inicial siempre será 'Abierta'
            date: new Date().toLocaleString('es-ES'),
        };

        const incidents = getIncidents();
        incidents.unshift(newIncident);
        saveIncidents(incidents);
        form.reset();

        renderIncidents(statusFilter.value);
    });

    statusFilter.addEventListener('change', (e) => {
        renderIncidents(e.target.value);
    });

    initializeIncidents();
    renderIncidents();
});