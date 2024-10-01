// Clase para crear los objetos de ticket
class Ticket {
    constructor(sector, cantidad) {
        this.sector = sector;
        this.cantidad = cantidad;
    }
}

// Precios fijos
const general = 90000;
const vip = 140000;
const servicio = 9000;

// URL de la API
const apiURL = 'https://66fc2c54c3a184a84d165786.mockapi.io/sectores';

// Array para almacenar temporalmente tickets
const tickets = [];

// Mostrar el mensaje en el DOM
const mostrarMensaje = (mensaje) => {
    Swal.fire(mensaje);
};

// Función para mostrar la disponibilidad de tickets
const mostrarDisponibilidad = async () => {
    const disponibilidadParrafo = document.getElementById('disponibilidad');
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error('Error al obtener los datos de disponibilidad.');
        }
        const data = await response.json();
        let disponibilidadTexto = '<strong>Disponibilidad de Tickets:</strong><br>';
        data.forEach(sector => {
            const disponibles = sector.capacidadtotal - sector.entradasvendidas;
            disponibilidadTexto += `Sector <strong>${sector.sectores}</strong>: ${disponibles} disponibles.<br>`;
        });
        disponibilidadParrafo.innerHTML = disponibilidadTexto;
    } catch (error) {
        console.error(error);
        disponibilidadParrafo.textContent = 'No se pudo obtener la disponibilidad de tickets en este momento.';
    }
};

// Mostrar los tickets en el DOM
const mostrarTickets = () => {
    const ticketsList = document.getElementById('ticketsList');
    ticketsList.innerHTML = ''; // Limpiamos el contenedor

    // Iteramos sobre el array 'tickets' para crear elementos: por cada ticket habrá un div con un párrafo y un botón
    for (const [index, ticket] of tickets.entries()) {
        // Crear el div
        const ticketItem = document.createElement('div');
        
        // Crear el párrafo con el texto del ticket
        const ticketTexto = document.createElement('p');
        ticketTexto.textContent = `${ticket.cantidad} ticket(s) en el sector ${ticket.sector}`;
        
        // Crear el botón de eliminar
        const eliminarBtn = document.createElement('button');
        eliminarBtn.textContent = 'Eliminar';
        eliminarBtn.onclick = () => eliminarTicket(index);

        // Agregar el párrafo y el botón al div
        ticketItem.appendChild(ticketTexto);
        ticketItem.appendChild(eliminarBtn);

        // Agregar el div al contenedor
        ticketsList.appendChild(ticketItem);
    }
};

// Cargar tickets guardados desde localStorage
const cargarTickets = () => {
    const ticketsGuardados = localStorage.getItem('tickets');
    if (ticketsGuardados) {
        const ticketsArray = JSON.parse(ticketsGuardados);
        for (const ticket of ticketsArray) {
            tickets.push(new Ticket(ticket.sector, ticket.cantidad));
        }
    }
    mostrarTickets(); // Mostrar tickets guardados
};

// Eliminar un ticket
const eliminarTicket = (index) => {
    tickets.splice(index, 1); // Eliminar el ticket del array
    localStorage.setItem('tickets', JSON.stringify(tickets)); // Actualizar localStorage
    mostrarTickets(); // Actualizar la visualización
    mostrarMensaje("Ticket eliminado");
};

// Función para obtener la disponibilidad de sectores desde la API
const obtenerDisponibilidadSectores = () => {
    return fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener los datos de la API.');
            }
            return response.json();
        })
        .then(data => {
            // Crear un objeto para fácil acceso
            const disponibilidad = {};
            data.forEach(sector => {
                disponibilidad[sector.sectores] = {
                    capacidadtotal: sector.capacidadtotal,
                    entradasvendidas: sector.entradasvendidas,
                    id: sector.id
                };
            });
            return disponibilidad;
        });
};

// Función para actualizar las entradas vendidas en la API
const actualizarEntradasVendidas = (sectorNombre, nuevasEntradasVendidas) => {
    // Primero, obtenemos el ID del sector
    return fetch(`${apiURL}?sectores=${sectorNombre}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener el sector para actualizar.');
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                throw new Error(`Sector "${sectorNombre}" no encontrado en la API.`);
            }
            const sector = data[0];
            // Actualizamos las entradas vendidas
            return fetch(`${apiURL}/${sector.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...sector, entradasvendidas: nuevasEntradasVendidas })
            });
        });
};

// Capturamos el formulario y los botones
const formulario = document.querySelector('form');
const botonAgregarTicket = document.getElementById('agregarTicket');
const botonComprarTickets = document.getElementById('comprarTickets');

// Función para manejar el evento "agregar ticket"
botonAgregarTicket.addEventListener('click', () => {
    const sector = document.getElementById('sector').value;
    const cantidad = parseInt(document.querySelector('input[name="cantidad"]').value);

    // Validación de los campos antes de agregar el ticket
    if (!sector || isNaN(cantidad) || cantidad < 1) {
        mostrarMensaje("Por favor, selecciona un sector y una cantidad válida.");
        return;
    }

    // Añadimos el ticket al array
    tickets.push(new Ticket(sector, cantidad));
    localStorage.setItem('tickets', JSON.stringify(tickets)); // Actualizar localStorage
    mostrarTickets(); // Mostrar tickets actuales

    // Limpiamos el formulario para agregar más tickets
    formulario.reset();
});

// Función para manejar el evento "comprar tickets"
botonComprarTickets.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevenimos el comportamiento por defecto del formulario

    // Validamos si hay tickets para comprar
    if (tickets.length === 0) {
        mostrarMensaje("No agregaste ningún ticket.");
        return;
    }

    try {
        // Obtener la disponibilidad actual desde la API
        const disponibilidad = await obtenerDisponibilidadSectores();

        // Verificar la disponibilidad para cada ticket
        for (const ticket of tickets) {
            if (!disponibilidad[ticket.sector]) {
                mostrarMensaje(`El sector "${ticket.sector}" no existe.`);
                return;
            }
            const disponibles = disponibilidad[ticket.sector].capacidadtotal - disponibilidad[ticket.sector].entradasvendidas;
            if (ticket.cantidad > disponibles) {
                mostrarMensaje(`No hay suficientes tickets disponibles en el sector ${ticket.sector} Disponibles: ${disponibles}`);
                return;
            }
        }

        // Si todo está bien, proceder a calcular el costo total
        let costoTotal = 0;
        for (const ticket of tickets) {
            let precioSector = ticket.sector === 'general' ? general : vip;
            costoTotal += (precioSector * ticket.cantidad) + (servicio * ticket.cantidad); // Se cobra servicio por cada ticket
        }

        // Mostrar el costo total al usuario
        mostrarMensaje(`El costo total es: $${costoTotal}`);

        // Crear un objeto para acumular la cantidad de entradas vendidas por sector
        const entradasPorSector = {};

        // Acumula la cantidad de entradas por sector
        for (const ticket of tickets) {
            if (!entradasPorSector[ticket.sector]) {
                entradasPorSector[ticket.sector] = 0; // Inicializa el sector si no existe
            }
            entradasPorSector[ticket.sector] += ticket.cantidad; // Acumula la cantidad
        }

        // Actualizar las entradas vendidas en la API para cada sector
        for (const [sector, cantidadVendida] of Object.entries(entradasPorSector)) {
            const sectorActual = disponibilidad[sector];
            const nuevasEntradasVendidas = sectorActual.entradasvendidas + cantidadVendida; // Actualiza la cantidad total de entradas vendidas
            await actualizarEntradasVendidas(sector, nuevasEntradasVendidas); // Realiza la actualización
        }

        // Borrar los tickets del localStorage y limpiar el array
        localStorage.removeItem('tickets');
        tickets.length = 0; // Limpiamos el array de tickets
        mostrarTickets(); // Actualizar la visualización

        // Limpiar el formulario
        formulario.reset();

        // Actualizar y mostrar la disponibilidad actualizada
        await mostrarDisponibilidad();

    } catch (error) {
        console.error(error);
        mostrarMensaje("Ocurrió un error al procesar la compra. Por favor, inténtalo nuevamente.");
    }
});

// Cargar tickets y disponibilidad al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    cargarTickets(); // Cargar tickets del localStorage
    mostrarDisponibilidad(); // Mostrar disponibilidad inicial
});