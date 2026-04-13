/* ========================================
   ClimatVision — Script principal
   Fichier : script.js
   ======================================== */

// ── ICÔNES MÉTÉO (codes WMO) ─────────────────────────────────────────
const WMO = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const WMO_DESC = {
  0: 'Ciel dégagé',       1: 'Principalement dégagé', 2: 'Partiellement nuageux', 3: 'Couvert',
  45: 'Brouillard',       48: 'Brouillard givrant',
  51: 'Bruine légère',    53: 'Bruine modérée',        55: 'Bruine dense',
  61: 'Pluie légère',     63: 'Pluie modérée',         65: 'Pluie forte',
  71: 'Neige légère',     73: 'Neige modérée',         75: 'Neige forte',
  80: 'Averses légères',  81: 'Averses modérées',      82: 'Averses violentes',
  95: 'Orage',            96: 'Orage avec grêle',      99: 'Orage violent'
};

const DAYS   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

// ── DIRECTION DU VENT ─────────────────────────────────────────────────
function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── RECHERCHE D'UNE VILLE ─────────────────────────────────────────────
async function searchCity() {
  const q = document.getElementById('city-input').value.trim();
  if (!q) return;
  loadCity(q);
}

// ── CHARGEMENT DES DONNÉES MÉTÉO ─────────────────────────────────────
async function loadCity(cityName) {
  document.getElementById('city-input').value = cityName;
  document.getElementById('error-zone').innerHTML = '';
  document.getElementById('main-content').innerHTML =
    `<div style="grid-column:1/-1;" class="loading">
       Chargement des données pour <strong>${cityName}</strong>…
     </div>`;

  try {
    // 1. Géocodage : obtenir latitude / longitude
    const geoRes  = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || !geoData.results.length) {
      throw new Error(`Ville introuvable : "${cityName}"`);
    }
    const loc = geoData.results[0];

    // 2. Données météo en temps réel
    const wRes  = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
      `weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto&forecast_days=6`
    );
    const wData = await wRes.json();

    renderWeather(loc, wData.current, wData.daily, wData.current_units);

  } catch (e) {
    document.getElementById('main-content').innerHTML =
      `<div style="grid-column:1/-1;padding:3rem;text-align:center;">
         <div class="error-msg" style="display:inline-block;">${e.message}</div>
       </div>`;
  }
}

// ── AFFICHAGE DE LA MÉTÉO ─────────────────────────────────────────────
function renderWeather(loc, c, d) {
  const now        = new Date();
  const icon       = WMO[c.weather_code]      || '🌡️';
  const desc       = WMO_DESC[c.weather_code] || 'Inconnu';
  const windAngle  = c.wind_direction_10m;
  const windDirStr = windDir(windAngle);

  // Prévisions sur 5 jours (on saute le jour J)
  const forecastHTML = [1, 2, 3, 4, 5].map(i => {
    const date = new Date(d.time[i]);
    return `
      <div class="forecast-item">
        <div class="forecast-day">${DAYS[date.getDay()]}</div>
        <div class="forecast-icon">${WMO[d.weather_code[i]] || '🌡️'}</div>
        <div class="forecast-temp">${Math.round(d.temperature_2m_max[i])}°</div>
        <div class="forecast-low">${Math.round(d.temperature_2m_min[i])}°</div>
      </div>`;
  }).join('');

  // Couleur de la température selon la valeur
  const tempColor =
    c.temperature_2m > 35 ? 'var(--red)'    :
    c.temperature_2m > 25 ? 'var(--orange)' :
    c.temperature_2m < 0  ? 'var(--blue)'   : 'var(--text)';

  document.getElementById('main-content').innerHTML = `
    <div class="weather-card fade-up">
      <div>
        <div class="weather-city">
          ${loc.name} <span class="weather-country">${loc.country || ''}</span>
        </div>
        <div class="weather-date">
          ${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}
          · ${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}
        </div>
      </div>

      <div class="weather-main">
        <div class="weather-icon">${icon}</div>
        <div>
          <div class="weather-temp" style="color:${tempColor}">
            ${Math.round(c.temperature_2m)}<sup>°C</sup>
          </div>
          <div class="weather-desc">${desc}</div>
          <div class="weather-feels">Ressenti ${Math.round(c.apparent_temperature)}°C</div>
        </div>
      </div>

      <div class="weather-stats">
        <div class="stat-box">
          <div class="stat-label">Humidité</div>
          <div class="stat-value" style="color:var(--blue)">${Math.round(c.relative_humidity_2m)}%</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Pression</div>
          <div class="stat-value">${Math.round(c.surface_pressure)} hPa</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Vent</div>
          <div class="stat-value" style="color:var(--teal)">${Math.round(c.wind_speed_10m)} km/h</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Direction</div>
          <div class="stat-value">${windDirStr} · ${Math.round(windAngle)}°</div>
        </div>
      </div>

      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;
                    font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:1px;">
          Prévisions 5 jours
        </div>
        <div class="forecast-row">${forecastHTML}</div>
      </div>

      <div style="margin-top:0.25rem;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;
                    font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:1px;">
          Rose des vents
        </div>
        <div class="compass-wrap">
          <div class="compass">
            <div class="compass-n">N</div>
            <div class="compass-s">S</div>
            <div class="compass-e">E</div>
            <div class="compass-w">O</div>
            <div class="compass-needle"
                 style="transform:translate(-50%,-100%) rotate(${windAngle}deg);
                        margin-left:-1.5px;margin-top:-45px;
                        position:absolute;top:50%;left:50%;">
            </div>
            <div class="compass-center"></div>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;">${Math.round(c.wind_speed_10m)} km/h</div>
            <div style="font-size:13px;color:var(--muted);">Direction ${windDirStr} (${Math.round(windAngle)}°)</div>
            <div style="font-size:12px;color:var(--dim);margin-top:4px;">
              Précip. aujourd'hui : ${c.precipitation ?? 0} mm
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="right-col fade-up delay-1">
      <div class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-title">Températures cette semaine</div>
            <div class="card-sub">${loc.name} — max &amp; min sur 6 jours</div>
          </div>
          <span class="card-badge badge-blue">${loc.country || ''}</span>
        </div>
        <div style="height:220px;"><canvas id="weekChart"></canvas></div>
      </div>
    </div>
  `;

  // Graphique de la semaine
  const labels = d.time.slice(0, 6).map(t => {
    const dt = new Date(t);
    return DAYS[dt.getDay()];
  });
  const maxT = d.temperature_2m_max.slice(0, 6).map(Math.round);
  const minT = d.temperature_2m_min.slice(0, 6).map(Math.round);

  setTimeout(() => {
    const ctx = document.getElementById('weekChart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Max °C',
            data: maxT,
            borderColor: '#fb923c',
            backgroundColor: 'rgba(251,146,60,0.08)',
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#fb923c',
            fill: true
          },
          {
            label: 'Min °C',
            data: minT,
            borderColor: '#4f9eff',
            backgroundColor: 'rgba(79,158,255,0.08)',
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#4f9eff',
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { labels: { color: '#7b8db0', font: { size: 12 } } },
          tooltip: { backgroundColor: '#111827', titleColor: '#f0f4ff', bodyColor: '#7b8db0' }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', callback: v => v + '°C' } }
        }
      }
    });
  }, 100);
}

// ── DONNÉES CLIMATIQUES SCIENTIFIQUES ────────────────────────────────

// Anomalie de température mondiale — NASA GISS (1880–2023)
const tempYears = [1880,1890,1900,1910,1920,1930,1940,1950,1960,1970,1980,1990,2000,2005,2010,2015,2016,2017,2018,2019,2020,2021,2022,2023];
const tempAnom  = [-0.16,-0.30,-0.08,-0.47,-0.27,-0.09,0.04,-0.01,0.03,0.03,0.27,0.44,0.42,0.68,0.72,0.90,1.01,0.92,0.85,0.98,1.02,0.85,0.89,1.45];

// Concentration CO₂ — NOAA Mauna Loa (ppm)
const co2Years = [1960,1965,1970,1975,1980,1985,1990,1995,2000,2005,2010,2015,2018,2019,2020,2021,2022,2023,2024];
const co2Vals  = [317,320,326,331,339,346,354,361,369,380,390,401,408,412,414,417,421,422,424];

// Élévation du niveau de la mer — NASA Satellite Altimetry (mm, base 1993)
const seaYears = [1993,1995,1997,1999,2001,2003,2005,2007,2009,2011,2013,2015,2017,2019,2021,2023];
const seaVals  = [0,8,14,20,26,32,38,44,53,57,65,71,80,88,95,101];

// Étendue banquise arctique — NSIDC (millions de km², septembre)
const iceYears = [1980,1985,1990,1995,2000,2005,2007,2010,2012,2015,2019,2020,2021,2022,2023];
const iceVals  = [7.8,6.9,6.2,6.1,6.3,5.6,4.3,4.9,3.6,4.4,4.1,3.9,4.9,4.7,4.4];

// ── CONSTRUCTION DES GRAPHIQUES CLIMATIQUES ───────────────────────────
function buildClimateCharts() {

  // 1. Anomalie de température
  new Chart(document.getElementById('tempChart'), {
    type: 'bar',
    data: {
      labels: tempYears,
      datasets: [{
        label: 'Anomalie (°C)',
        data: tempAnom,
        backgroundColor: tempAnom.map(v =>
          v > 0
            ? `rgba(248,113,113,${Math.min(1, 0.3 + v * 0.5)})`
            : `rgba(79,158,255,${Math.min(1, 0.3 + Math.abs(v) * 0.5)})`
        ),
        borderRadius: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827', titleColor: '#f0f4ff', bodyColor: '#7b8db0',
          callbacks: { label: c => c.parsed.y.toFixed(2) + '°C' }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#7b8db0', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', callback: v => (v > 0 ? '+' : '') + v + '°C' }, min: -0.6, max: 1.6 }
      }
    }
  });

  // 2. Concentration CO₂
  new Chart(document.getElementById('co2Chart'), {
    type: 'line',
    data: {
      labels: co2Years,
      datasets: [{
        label: 'CO₂ (ppm)',
        data: co2Vals,
        borderColor: '#2dd4bf',
        backgroundColor: 'rgba(45,212,191,0.08)',
        tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#2dd4bf'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#111827', titleColor: '#f0f4ff', bodyColor: '#7b8db0', callbacks: { label: c => c.parsed.y + ' ppm' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', callback: v => v + ' ppm' }, min: 310 }
      }
    }
  });

  // 3. Niveau de la mer
  new Chart(document.getElementById('seaChart'), {
    type: 'line',
    data: {
      labels: seaYears,
      datasets: [{
        label: 'Niveau (mm)',
        data: seaVals,
        borderColor: '#4f9eff',
        backgroundColor: 'rgba(79,158,255,0.10)',
        tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#4f9eff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#111827', titleColor: '#f0f4ff', bodyColor: '#7b8db0', callbacks: { label: c => '+' + c.parsed.y + ' mm' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', callback: v => '+' + v + ' mm' } }
      }
    }
  });

  // 4. Banquise arctique
  new Chart(document.getElementById('iceChart'), {
    type: 'line',
    data: {
      labels: iceYears,
      datasets: [{
        label: 'Étendue (M km²)',
        data: iceVals,
        borderColor: '#a5f3fc',
        backgroundColor: 'rgba(165,243,252,0.08)',
        tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#a5f3fc'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#111827', titleColor: '#f0f4ff', bodyColor: '#7b8db0', callbacks: { label: c => c.parsed.y + ' M km²' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7b8db0', callback: v => v + ' M km²' }, min: 3, max: 9 }
      }
    }
  });
}

// ── INITIALISATION ────────────────────────────────────────────────────
Chart.defaults.font.family = "'DM Sans', sans-serif";
buildClimateCharts();
loadCity('Dakar'); // Ville chargée par défaut au démarrage
