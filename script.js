

// API key
const API_KEY = "e4d52c17b68fa31e62eeaf2bcdae5191";

// grab all the DOM elements we need
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const unitToggle = document.getElementById('unitToggle');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');

const currentWeather = document.getElementById('currentWeather');
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');

const forecastCards = document.getElementById('forecastCards');
const addFavoriteBtn = document.getElementById('addFavoriteBtn');
const favoritesList = document.getElementById('favoritesList');
const favoritesSection = document.getElementById('favoritesSection');
const themeToggle = document.getElementById('themeToggle');

// global variables
let currentCity = '';
let isCelsius = true;
let favorites = JSON.parse(localStorage.getItem('favoriteCities')) || [];

// event listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', function(e){
    if(e.key === 'Enter') handleSearch();
});
locationBtn.addEventListener('click', getLocationWeather);
unitToggle.addEventListener('change', toggleUnit);
themeToggle.addEventListener('click', toggleTheme);

// assign default action for add to favorites
addFavoriteBtn.onclick = addToFavorites;

// initialize the app
function init() {

    // check theme
    if(localStorage.getItem('darkTheme') === 'true'){
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // load favorites
    displayFavorites();

    // try loading last city
    const lastCity = localStorage.getItem('lastCity');
    if(lastCity){
        getWeatherData(lastCity);
    } else {
        getLocationWeather();
    }
}

// handle search input
function handleSearch() {
    const city = cityInput.value.trim();
    if(city){
        getWeatherData(city);
    } else {
        showError('Please enter a city name');
    }
}

// get weather by geolocation
function getLocationWeather() {
    if(!navigator.geolocation){
        showError('Geolocation not supported');
        return;
    }

    loading.style.display = 'block';
    navigator.geolocation.getCurrentPosition(function(position){
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // first get city name from coordinates
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        .then(res => {
            if(!res.ok) throw new Error('Cannot get location weather');
            return res.json();
        })
        .then(data => {
            getWeatherData(data.name);
        })
        .catch(() => {
            loading.style.display = 'none';
            showError('Cannot fetch location weather');
        });

    }, function(){
        loading.style.display = 'none';
        showError('Location access denied. Search a city instead.');
    });
}

// fetch weather & forecast
function getWeatherData(city) {
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    currentCity = city;
    localStorage.setItem('lastCity', city);

    // update favorite button
    updateFavoriteButton();

    // fetch current weather (metric)
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`)
    .then(res => {
        if(!res.ok){
            if(res.status === 404) throw new Error('City not found');
            throw new Error('Failed to fetch weather');
        }
        return res.json();
    })
    .then(data => {
        displayCurrentWeather(data);
        // fetch forecast
        return fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
    })
    .then(res => {
        if(!res.ok) throw new Error('Forecast not available');
        return res.json();
    })
    .then(data => {
        displayForecast(data);
        loading.style.display = 'none';
        currentWeather.style.display = 'block';
    })
    .catch(err => {
        loading.style.display = 'none';
        showError(err.message);
    });
}

// display current weather
function displayCurrentWeather(data){
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    currentDate.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric'});

    const temp = isCelsius ? Math.round(data.main.temp) : Math.round(data.main.temp*9/5+32);
    currentTemp.textContent = `${temp}°${isCelsius?'C':'F'}`;

    const feels = isCelsius ? Math.round(data.main.feels_like) : Math.round(data.main.feels_like*9/5+32);
    feelsLike.textContent = `${feels}°${isCelsius?'C':'F'}`;

    weatherDescription.textContent = data.weather && data.weather[0] ? data.weather[0].description : '';
    weatherIcon.src = data.weather && data.weather[0] ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : '';
    weatherIcon.alt = data.weather && data.weather[0] ? data.weather[0].description : 'weather';

    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind && data.wind.speed != null ? data.wind.speed : '-'} m/s`;
    pressure.textContent = `${data.main.pressure} hPa`;

    sunrise.textContent = new Date((data.sys.sunrise||0)*1000).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit'});
    sunset.textContent = new Date((data.sys.sunset||0)*1000).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit'});
}

// display 5-day forecast
function displayForecast(data){
    forecastCards.innerHTML = '';

    let daily = data.list.filter(item => item.dt_txt && item.dt_txt.includes('12:00:00'));
    if(daily.length === 0 && data.list.length > 0){
        daily = data.list.filter((_, idx) => idx % 8 === 0); // rough daily
    }

    daily.forEach(day => {
        const date = new Date(day.dt*1000);
        const dayName = date.toLocaleDateString('en-US', { weekday:'short' });
        const monthDay = date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
        const temp = isCelsius ? Math.round(day.main.temp) : Math.round(day.main.temp*9/5+32);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="forecast-date">${dayName}, ${monthDay}</p>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}">
            <p class="forecast-temp">${temp}°${isCelsius?'C':'F'}</p>
            <p class="forecast-desc">${day.weather[0].description}</p>
            <p>Humidity: ${day.main.humidity}%</p>
        `;
        forecastCards.appendChild(card);
    });
}

// toggle C/F
function toggleUnit(){
    isCelsius = !isCelsius;
    if(currentCity) getWeatherData(currentCity);
    displayFavorites();
}

// add current city to favorites
function addToFavorites(){
    if(!currentCity) return;
    if(!favorites.includes(currentCity)){
        favorites.push(currentCity);
        localStorage.setItem('favoriteCities', JSON.stringify(favorites));
        updateFavoriteButton();
        displayFavorites();
    }
}

// remove from favorites
function removeFromFavorites(city){
    favorites = favorites.filter(fav => fav !== city);
    localStorage.setItem('favoriteCities', JSON.stringify(favorites));
    displayFavorites();
    if(currentCity === city) updateFavoriteButton();
}

// update favorite button text & action
function updateFavoriteButton(){
    if(!currentCity){
        addFavoriteBtn.innerHTML = '<i class="fas fa-star"></i> Add to Favorites';
        addFavoriteBtn.onclick = addToFavorites;
        return;
    }
    if(favorites.includes(currentCity)){
        addFavoriteBtn.innerHTML = '<i class="fas fa-star"></i> Remove from Favorites';
        addFavoriteBtn.onclick = () => removeFromFavorites(currentCity);
    } else {
        addFavoriteBtn.innerHTML = '<i class="fas fa-star"></i> Add to Favorites';
        addFavoriteBtn.onclick = addToFavorites;
    }
}

// show favorite cities list
function displayFavorites(){
    favoritesList.innerHTML = '';
    if(!favorites || favorites.length === 0){
        favoritesSection.style.display = 'none';
        return;
    }
    favoritesSection.style.display = 'block';

    favorites.forEach(city => {
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`)
        .then(res => {
            if(!res.ok){
                favorites = favorites.filter(fav => fav !== city);
                localStorage.setItem('favoriteCities', JSON.stringify(favorites));
                throw new Error('Invalid favorite');
            }
            return res.json();
        })
        .then(data => {
            const temp = isCelsius ? Math.round(data.main.temp) : Math.round(data.main.temp*9/5+32);
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <span class="favorite-city">${data.name}, ${data.sys.country}</span>
                <span class="favorite-temp">${temp}°${isCelsius?'C':'F'}</span>
                <button class="remove-btn" data-city="${city}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            const removeBtn = item.querySelector('.remove-btn');
            removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                removeFromFavorites(city);
            });

            item.addEventListener('click', () => {
                getWeatherData(city);
            });

            favoritesList.appendChild(item);
        })
        .catch(()=>{ /* ignore invalid city */ });
    });
}

// toggle dark/light theme
function toggleTheme(){
    document.body.classList.toggle('dark-theme');
    if(document.body.classList.contains('dark-theme')){
        localStorage.setItem('darkTheme','true');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        localStorage.setItem('darkTheme','false');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// show error
function showError(msg){
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
}

// start app
init();
