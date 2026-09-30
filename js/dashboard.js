// Dashboard shared by the public home page and the three role pages:
// registrations in the last 7 days, current status of all cases, and test results.
Chart.defaults.global.defaultFontColor = '#fff';

const chartOptions = {
  color: '#fff',
  responsive: true,
  aspectRatio: 4,
  maintainAspectRatio: true,
  animation: false,
  legend: { labels: { fontColor: '#fff' } },
};

function drawLastWeek(rows) {
  new Chart(document.getElementById('Grafica').getContext('2d'), {
    type: 'bar',
    data: {
      labels: rows.map((row) => row.dia),
      datasets: [{
        label: 'Cantidad de pacientes registrados',
        data: rows.map((row) => row.num_pacientes),
        backgroundColor: 'rgba(47, 58, 74, 0.4)',
        borderColor: '#fff',
        borderWidth: 2,
      }],
    },
    options: {
      ...chartOptions,
      scales: {
        xAxes: [{ gridLines: { color: 'rgba(0,0,0,0.1)' } }],
        yAxes: [{ gridLines: { color: 'rgba(0,0,0,0.1)' }, ticks: { beginAtZero: true, precision: 0 } }],
      },
    },
  });
}

function drawStatus(rows) {
  const count = (estado) => (rows.find((row) => row.estado === estado) || { cantidad: 0 }).cantidad;
  const hospital = count(1);
  const uci = count(2);
  const curados = count(3);
  const casa = count(4);
  const muertos = count(6);
  const infectados = hospital + uci + casa;

  new Chart(document.getElementById('Grafica2').getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['Infectados', 'Muertos', 'Curados'],
      datasets: [{ data: [infectados, muertos, curados], backgroundColor: ['#e7a901', '#ff2915', '#01e749'], borderColor: '#fff', borderWidth: 2 }],
    },
    options: chartOptions,
  });
  new Chart(document.getElementById('Grafica3').getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['En tratamiento en casa', 'En tratamiento en hospital', 'Internados en UCI', 'Muertos'],
      datasets: [{ data: [casa, hospital, uci, muertos], backgroundColor: ['#3cff15', '#e6ff15', '#ff8915', '#ff2915'], borderColor: '#fff', borderWidth: 2 }],
    },
    options: chartOptions,
  });
}

function drawResults(rows) {
  const count = (label) => (rows.find((row) => row.resultados === label) || { cantidad: 0 }).cantidad;
  new Chart(document.getElementById('Grafica4').getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['Positivos', 'Negativos'],
      datasets: [{ data: [count('Positivo'), count('Negativo')], backgroundColor: ['#b5ff15', '#ff2915'], borderColor: '#fff', borderWidth: 2 }],
    },
    options: chartOptions,
  });
}

api('/resumen').then((data) => {
  drawLastWeek(data.resum);
  drawStatus(data.info);
  drawResults(data.resultados);
});
