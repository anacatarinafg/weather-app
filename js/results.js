import { fetchData, url } from "./api.js";
import * as module from "./date.js";

/**
 * Toggle search
 */

// This function will attribute events on the selected elements where the function is being called;
const addEventOnElements = function (elements, eventType, callback) {
  for (const element of elements) element.addEventListener(eventType, callback);
};

const showSearchbar = document.querySelector("[data-search-view]");
const searchbarTogglers = document.querySelectorAll("[data-search-toggler]");
const searchInput = document.querySelector("[data-search-input]");
const searchResult = document.querySelector("[data-search-results]");

// console.log(showSearchbar);
// console.log(searchbarTogglers);

const toggleSearch = () => showSearchbar.classList.toggle("active");
addEventOnElements(searchbarTogglers, "click", toggleSearch);

let searchTimeout = null;
const searchTimeoutDuration = 500;

searchInput.addEventListener("input", function () {
  searchTimeout ?? clearTimeout(searchTimeout);

  if (!searchInput.value) {
    searchResult.classList.remove("active");
    searchResult.innerHTML = "";
    searchInput.classList.remove("searching");
  } else {
    searchInput.classList.add("searching");
  }

  if (searchInput.value) {
    searchTimeout = setTimeout(() => {
      fetchData(url.geo(searchInput.value), function (locations) {
        searchInput.classList.remove("searching");
        searchResult.classList.add("active");
        searchResult.innerHTML = `<ul class="results__list" data-search-list>`;

        const /**{NodeList} | [] */ items = [];

        for (const { name, lat, lon, country, state } of locations) {
          const searchCity = document.createElement("li");
          searchCity.classList.add("results__item");
          searchCity.innerHTML = `
            <span class="icons"
            ><i class="fa-solid fa-location-dot"></i></span>
          <div>
            <p class="results__headline">${name}</p>
            <p class="results__text">${state || ""} ${country}</p>
          </div>
          <a href="#/weather?lat=${lat}&lon=${lon}" class="results__link" aria-label="${name} weather" data-search-toggler=""></a>
            `;

          searchResult
            .querySelector("[data-search-list]")
            .appendChild(searchCity);
          items.push(searchCity.querySelector("[data-search-toggler]"));
        }
        addEventOnElements(items, "click", function () {
          toggleSearch();
          searchResult.classList.remove("active");
        });
      });
    }, searchTimeoutDuration);
  }
});

/**
 * Information about the real-time weather that will be rendered in HTML
 */
export const updateWeather = function (lat, lon) {
  const currentLocation = document.querySelector("[data-current-location]");
  const currentWeatherSection = document.querySelector(
    "[data-current-weather]"
  );
  const forecastSection = document.querySelector("[data-forecast]");
  const hourlySection = document.querySelector("[data-hourly]");
  const highlightSection = document.querySelector("[data-highlights]");

  currentWeatherSection.innerHTML = "";
  forecastSection.innerHTML = "";
  hourlySection.innerHTML = "";
  highlightSection.innerHTML = "";

  if (window.location.hash === "#/current-location") {
    currentLocation.setAttribute("disabled", "");
  } else {
    currentLocation.removeAttribute("disabled");
  }

  /**
   *
   * Current weather section
   */
  fetchData(url.currentWeather(lat, lon), function (currentWeather) {
    const {
      weather,
      dt: dateUnix,
      sys: { sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC },
      main: { temp, feels_like, pressure, humidity },
      visibility,
      timezone,
    } = currentWeather;
    const [{ description, icon }] = weather;

    currentWeatherSection.innerHTML = `
    <h2 class="section__titles current__weather--title">
      Current weather
    </h2>
    `;
    const box = document.createElement("div");
    box.classList.add("current__weather--box", "box");
    box.innerHTML = `
      <div class="current__weather--timezone">
        <span class="current__weather--span" data-location></span>
        <span class="current__weather--span">${module.getHours(
      dateUnix,
      timezone
    )}</span>
      </div>
    <img
      src="/images/weather_icons/${icon}.png"
      alt="${description}"
      class="current__weather--img"
    />
    <span class="current__weather--description">${description}</span>
    <span class="current__weather--temperature">${parseInt(temp)}º</span>
    `;
    fetchData(url.reverseGeo(lat, lon), function ([{ name, country }]) {
      box.querySelector("[data-location]").innerHTML = `${name}, ${country}`;
    });
    currentWeatherSection.appendChild(box);

    console.log(currentWeatherSection);

    /**
     *
     * 24 hours Forecast section
     */

    fetchData(url.forecastWeather(lat, lon), function (forecastWeather) {
      const {
        list: forecastList,
        city: { timezone },
      } = forecastWeather;

      hourlySection.innerHTML = `
    <h2 class="section__titles hourly__title">
      Hourly temperature & wind
    </h2>
    <div class="hourly__box box">
    <div class="hourly__headlines">
      <span class="hourly__span">Hours</span>
      <span class="hourly__span">Temperature</span>
      <span class="hourly__span">Wind</span>
    </div>
    <div class="hourly__status">
      <ul class="hourly__list" data-hourly-list>
      </ul>
    </div>
  </div>
    `;

      for (const [index, data] of forecastList.entries()) {
        if (index > 7) break;

        const {
          dt: dateTimeUnix,
          main: { temp },
          weather,
          wind: { deg: windDirection, speed: windSpeed },
        } = data;
        const [{ icon, description }] = weather;

        const hourlyLi = document.createElement("li");
        hourlyLi.classList.add("hourly__item");
        hourlyLi.innerHTML = `
      <span class="hourly__item--span">${module.getHours(
          dateTimeUnix,
          timezone
        )}</span>
      <span class="hourly__item--span">${parseInt(temp)}º</span>
      <span class="hourly__item--span">${parseInt(
          module.mps_to_kmh(windSpeed)
        )} km/h</span>
      `;
        hourlySection.querySelector("[data-hourly-list]").appendChild(hourlyLi);
      }

      /**
       *
       * 5 Days Forecast section
       */
      forecastSection.innerHTML = `
    <h2 class="section__titles forecast__title">
      Five days ahead
    </h2>
    <div class="forecast__box box">
      <ul class="forecast__list" data-forecast-list>
      </ul>
    </div>

  `;

      for (let i = 7, leng = forecastList.length; i < leng; i += 8) {
        const {
          main: { temp_max },
          weather,
          dt_txt,
        } = forecastList[i];
        const [{ icon, description }] = weather;
        const date = new Date(dt_txt);

        const forecastLi = document.createElement("li");
        forecastLi.classList.add("forecast__item");

        forecastLi.innerHTML = `
      <span class="forecast__weekDay">${date.getDate()} ${module.months[date.getUTCMonth()]
          }</span>
      <div class="forecast__imageTemperature">
      <img
        src="/images/weather_icons/${icon}.png"
        alt="${description}"
        class="forecast__img"
      />
      </div>
      <span class="forecast__temperature">${parseInt(temp_max)}º</span>
    `;
        forecastSection
          .querySelector("[data-forecast-list]")
          .appendChild(forecastLi);
      }
      /**
       *
       * Highlights section
       */
      fetchData(url.airPollution(lat, lon), function (airPollution) {
        const [
          {
            main: { aqi },
            components: { no2, o3, so2, pm2_5 },
          },
        ] = airPollution.list;

        const box = document.createElement("div");
        box.classList.add("highlights__wrapper");
        box.innerHTML = `
        <h2 class="section__titles highlights__title">Highlights</h2>
        <div class="highlights__box highlights__box--twoItems box">
            <div class="highlights__headlines">
              <span class="highlights__span">Sunsire & sunset</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list highlights__list--twoItems">
                <li class="highlights__item">
                  <p class="highlights__item--p">Sunrise</p>
                  <i class="fa-solid fa-sun"></i>
                  <p class="highlights__data">${module.getTime(
          sunriseUnixUTC,
          timezone
        )}</p>
                </li>
                <li class="highlights__item">
                  <p class="highlights__item--p">Sunset</p>
                  <i class="fa-solid fa-moon"></i>
                  <p class="highlights__data">${module.getTime(
          sunsetUnixUTC,
          timezone
        )}</p>
                </li>
              </ul>
            </div>
          </div>

          <div class="highlights__box highlights__box--twoItems box">
            <div class="highlights__headlines">
              <span class="highlights__span">Air Quality Index</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list highlights__list--twoItems">
                <li class="highlights__item">
                  <p class="highlights__item--p">PM<sub>2.5</sub></p>
                  <i class="fa-solid fa-wind"></i>
                  <p class="highlights__data">${pm2_5.toPrecision(3)}</p>
                </li>
                <li class="highlights__item">
                  <p class="highlights__item--p">SO<sub>2</sub></p>
                  <i class="fa-solid fa-wind"></i>
                  <p class="highlights__data">${so2.toPrecision(3)}</p>
                </li>
                <li class="highlights__item">
                <p class="highlights__item--p">NO<sub>2</sub></p>
                <i class="fa-solid fa-wind"></i>
                <p class="highlights__data">${no2.toPrecision(3)}</p>
              </li>
              <li class="highlights__item">
              <p class="highlights__item--p">O<sub>3</sub></p>
                <i class="fa-solid fa-wind"></i>
              <p class="highlights__data">${o3.toPrecision(3)}</p>
            </li>
              </ul>
            </div>
          </div>

          <div class="highlights__box box">
            <div class="highlights__headlines">
              <span class="highlights__span">Humidity</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list">
                <li class="highlights__item">
                  <i class="fa-solid fa-droplet"></i>
                  <p class="highlights__data">${humidity}<sup>%</sup></p>
                </li>
              </ul>
            </div>
          </div>

          <div class="highlights__box box">
            <div class="highlights__headlines">
              <span class="highlights__span">Pressure</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list">
                <li class="highlights__item">
                  <i class="fa-solid fa-hurricane"></i>
                  <p class="highlights__data">${pressure}<sup>hPa</sup></p>
                </li>
              </ul>
            </div>
          </div>

          <div class="highlights__box box">
            <div class="highlights__headlines">
              <span class="highlights__span">Visibility</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list">
                <li class="highlights__item">
                  <i class="fa-solid fa-eye-low-vision"></i>
                  <p class="highlights__data">
                    ${visibility / 1000}<sub>km</sub>
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div class="highlights__box box">
            <div class="highlights__headlines">
              <span class="highlights__span">Feels like</span>
            </div>
            <div class="highlights__status">
              <ul class="highlights__list">
                <li class="highlights__item">
                  <i class="fa-solid fa-temperature-half highlights__img"></i>
                  <p class="highlights__data">
                    ${parseInt(feels_like)}&deg;<sup>c</sup>
                  </p>
                </li>
              </ul>
            </div>
          </div>
        `;

        highlightSection.appendChild(box);
      });
    });
  });
};
