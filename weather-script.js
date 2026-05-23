// Weather API Configuration
const API_KEY = 'demo'; // Using open-meteo API (free, no key needed)
const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const errorMessage = document.getElementById('errorMessage');
const currentWeatherSection = document.getElementById('currentWeather');
const hourlyForecastSection = document.getElementById('hourlyForecast');
const weeklyForecastSection = document.getElementById('weeklyForecast');
const loadingSpinner = document.getElementById('loadingSpinner');
const welcomeMessage = document.getElementById('welcomeMessage');
const hourlyContainer = document.getElementById('hourlyContainer');
const forecastContainer = document.getElementById('forecastContainer');

// Event Listeners
searchBtn.addEventListener('click', () => handleSearch(cityInput.value));
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch(cityInput.value);
});
locationBtn.addEventListener('click', getLocationWeather);

// Main Functions
async function handleSearch(city) {
    if (!city.trim()) {
        showError('Please enter a city name');
        return;
    }

    try {
        showLoading(true);
        hideError();
        
        // Get coordinates from city name
        const coords = await getCoordinates(city);
        if (coords) {
            await getWeatherData(coords.latitude, coords.longitude, city);
        }
    } catch (error) {
        showError('Failed to fetch weather data. Please try again.');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

async function getCoordinates(cityName) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                latitude: result.latitude,
                longitude: result.longitude,
                name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`
            };
        } else {
            showError('City not found. Please try again.');
            return null;
        }
    } catch (error) {
        showError('Error searching for city');
        console.error(error);
        return null;
    }
}

async function getWeatherData(lat, lon, cityName) {
    try {
        const response = await fetch(
            `${API_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,windspeed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=8`
        );
        const data = await response.json();
        
        if (data) {
            displayWeather(data, cityName);
            displayHourlyForecast(data);
            displayWeeklyForecast(data);
            welcomeMessage.classList.add('hidden');
        }
    } catch (error) {
        showError('Failed to fetch weather data');
        console.error(error);
    }
}

function getLocationWeather() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    
                    // Get city name from coordinates
                    const response = await fetch(
                        `${GEOCODING_API}?latitude=${latitude}&longitude=${longitude}&format=json`
                    );
                    const data = await response.json();
                    const cityName = data.results?.[0]?.name || 'Current Location';
                    
                    await getWeatherData(latitude, longitude, cityName);
                    hideError();
                } catch (error) {
                    showError('Error getting location weather data');
                    console.error(error);
                } finally {
                    showLoading(false);
                }
            },
            (error) => {
                showError('Unable to access your location. Please check permissions.');
                showLoading(false);
                console.error(error);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Display Functions
function displayWeather(data, cityName) {
    const current = data.hourly;
    const daily = data.daily;
    const now = new Date();
    const currentHourIndex = now.getHours();
    
    // Current weather data
    const currentTemp = Math.round(current.temperature_2m[currentHourIndex]);
    const currentCode = current.weathercode[currentHourIndex];
    const description = getWeatherDescription(currentCode);
    const windSpeed = Math.round(current.windspeed_10m[currentHourIndex]);
    const humidity = 'N/A'; // Open-meteo doesn't provide humidity in free tier
    const feelsLike = currentTemp; // Approximation
    const pressure = 'N/A';
    const visibility = 'N/A';
    const uvIndex = 'N/A';
    const minTemp = Math.round(daily.temperature_2m_min[0]);
    const maxTemp = Math.round(daily.temperature_2m_max[0]);
    
    // Update DOM
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('temp').textContent = currentTemp;
    document.getElementById('description').textContent = description;
    document.getElementById('weatherIcon').src = getWeatherIcon(currentCode);
    document.getElementById('windSpeed').textContent = `${windSpeed} km/h`;
    document.getElementById('humidity').textContent = humidity;
    document.getElementById('feelsLike').textContent = `${feelsLike}°C`;
    document.getElementById('pressure').textContent = pressure;
    document.getElementById('visibility').textContent = visibility;
    document.getElementById('uvIndex').textContent = uvIndex;
    document.getElementById('minTemp').textContent = `${minTemp}°C`;
    document.getElementById('maxTemp').textContent = `${maxTemp}°C`;
    
    currentWeatherSection.classList.remove('hidden');
}

function displayHourlyForecast(data) {
    const hourly = data.hourly;
    const now = new Date();
    
    hourlyContainer.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        const temp = Math.round(hourly.temperature_2m[now.getHours() + i]);
        const code = hourly.weathercode[now.getHours() + i];
        const icon = getWeatherEmoji(code);
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${time.getHours().toString().padStart(2, '0')}:00</div>
            <div class="hourly-icon">${icon}</div>
            <div class="hourly-temp">${temp}°</div>
        `;
        hourlyContainer.appendChild(hourlyItem);
    }
    
    hourlyForecastSection.classList.remove('hidden');
}

function displayWeeklyForecast(data) {
    const daily = data.daily;
    
    forecastContainer.innerHTML = '';
    
    for (let i = 0; i < daily.time.length && i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const high = Math.round(daily.temperature_2m_max[i]);
        const low = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weathercode[i];
        const icon = getWeatherEmoji(code);
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">${icon}</div>
            <div class="forecast-temp">
                <span class="forecast-high">${high}°</span>
                <span class="forecast-low">${low}°</span>
            </div>
        `;
        forecastContainer.appendChild(forecastItem);
    }
    
    weeklyForecastSection.classList.remove('hidden');
}

// Weather Code to Description Mapping
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy (depositing)',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Heavy drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code === 1 || code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '⛈️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '🌤️';
}

function getWeatherIcon(code) {
    const iconUrl = `https://raw.githubusercontent.com/basmilius/weather-icons/master/production/png/64/`;
    const iconMap = {
        0: 'clear-day.png',
        1: 'mostly-clear-day.png',
        2: 'partly-cloudy-day.png',
        3: 'overcast.png',
        45: 'fog.png',
        48: 'fog.png',
        51: 'drizzle.png',
        53: 'drizzle.png',
        55: 'drizzle.png',
        61: 'rain.png',
        63: 'rain.png',
        65: 'rain.png',
        71: 'snow.png',
        73: 'snow.png',
        75: 'snow.png',
        77: 'snow.png',
        80: 'rain.png',
        81: 'rain.png',
        82: 'rain.png',
        85: 'snow.png',
        86: 'snow.png',
        95: 'thunderstorms.png',
        96: 'thunderstorms-rain.png',
        99: 'thunderstorms-rain.png'
    };
    return iconUrl + (iconMap[code] || 'not-available.png');
}

// Utility Functions
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Initialize
console.log('Weather Dashboard loaded successfully!');
