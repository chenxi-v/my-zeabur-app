// weather-component.js

// 重构后的统一响应式天气插件
class UnifiedWeatherWidget {
    constructor(options = {}) {
        this.options = {
            position: options.position || 'top-right',
            refreshInterval: options.refreshInterval || 3600000,
            showDetails: options.showDetails !== false,
            ...options
        };

        this.weatherIcons = {
            '晴': '☀️',
            '多云': '⛅',
            '阴': '☁️',
            '小雨': '🌦️',
            '中雨': '🌧️',
            '大雨': '🌧️',
            '暴雨': '⛈️',
            '雷': '⚡',
            '雪': '❄️',
            '雾': '🌫️',
            '霾': '🌫️',
            '未知': '🌤️'
        };

        this.isExpanded = false;
        this.init();
    }

    async init() {
        await this.createWidget();
        await this.loadWeatherData();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async createWidget() {
        const widget = document.querySelector('.unified-weather-widget');
        
        // 根据当前主题设置初始样式
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const themeClass = isDarkTheme ? 'dark-theme' : 'light-theme';
        
        widget.innerHTML = `
            <div class="weather-main ${themeClass}">
                <div class="weather-basic">
                    <div class="weather-icon">⛅</div>
                    <div class="weather-info">
                        <div class="weather-temp">24°C</div>
                        <div class="weather-location">北京市</div>
                    </div>
                    <div class="weather-toggle">▼</div>
                </div>
                <div class="weather-details">
                    <div class="details-condition">多云</div>
                    <div class="details-grid">
                        <div class="details-item">湿度: 65%</div>
                        <div class="details-item">风速: 12 km/h</div>
                        <div class="details-item">温度: 20～28°C</div>
                        <div class="details-item">空气: 良</div>
                    </div>
                    <div class="details-update">更新: 14:30</div>
                </div>
            </div>
        `;

        this.positionWidget();
    }

    positionWidget() {
        const widget = document.querySelector('.unified-weather-widget');
        if (!widget) return;

        switch(this.options.position) {
            case 'top-left':
                widget.style.left = '20px';
                widget.style.top = '20px';
                break;
            case 'bottom-right':
                widget.style.right = '20px';
                widget.style.bottom = '20px';
                widget.style.top = 'auto';
                break;
            case 'bottom-left':
                widget.style.left = '20px';
                widget.style.bottom = '20px';
                widget.style.top = 'auto';
                break;
            case 'top-right':
            default:
                widget.style.right = '20px';
                widget.style.top = '20px';
                break;
        }
    }

    async loadWeatherData() {
        const now = Date.now();
        const CACHE_DURATION = this.options.refreshInterval;
        
        // 检查缓存
        const cacheKey = 'weatherIslandCache';
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const cacheData = JSON.parse(cachedData);
            if (now - cacheData.lastUpdated < CACHE_DURATION) {
                this.updateWeatherDisplay(cacheData.data);
                return cacheData.data;
            }
        }

        try {
            const { location, coordinates } = await this.fetchUserLocation();
            if (!location || !coordinates) {
                const errorData = this.processWeatherData({ error: true, reason: '无法获取位置信息' }, now, '未知位置');
                this.updateWeatherDisplay(errorData);
                return errorData;
            }

            const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
            const airQualityApiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=european_aqi&timezone=auto`;

            const weatherController = new AbortController();
            const weatherTimeoutId = setTimeout(() => weatherController.abort(), 4000);
            const weatherResponse = await fetch(weatherApiUrl, {
                signal: weatherController.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                }
            });
            clearTimeout(weatherTimeoutId);

            if (!weatherResponse.ok) {
                throw new Error(`获取天气信息失败: ${weatherResponse.status} ${weatherResponse.statusText}`);
            }

            const weatherData = await weatherResponse.json();

            let airQualityData = { current: { european_aqi: null } };
            try {
                const airQualityController = new AbortController();
                const airQualityTimeoutId = setTimeout(() => airQualityController.abort(), 5000);
                const airQualityResponse = await fetch(airQualityApiUrl, {
                    signal: airQualityController.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                        'Accept-Language': 'zh-CN,zh;q=0.9'
                    }
                });
                clearTimeout(airQualityTimeoutId);

                if (airQualityResponse.ok) {
                    airQualityData = await airQualityResponse.json();
                }
            } catch (airQualityError) {
                console.warn('获取空气质量数据时出错:', airQualityError);
            }

            const combinedData = {
                ...weatherData,
                current: {
                    ...weatherData.current,
                    european_aqi: airQualityData.current?.european_aqi
                }
            };

            const parsedWeatherData = this.processWeatherData(combinedData, now, location, coordinates);

            // 保存到缓存
            localStorage.setItem(cacheKey, JSON.stringify({
                data: parsedWeatherData,
                lastUpdated: now
            }));

            this.updateWeatherDisplay(parsedWeatherData);
            return parsedWeatherData;
        } catch (error) {
            console.error('获取天气信息失败:', error);
            const errorData = this.processWeatherData({ error: true, reason: error.message }, Date.now(), '未知位置');
            this.updateWeatherDisplay(errorData);
            return errorData;
        }
    }

    async fetchUserLocation() {
        try {
            let location = '';
            let coordinates = null;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const myipLaResponse = await fetch('https://api.myip.la/cn?json', {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                        'Accept-Language': 'zh-CN,zh;q=0.9'
                    }
                });
                clearTimeout(timeoutId);

                if (myipLaResponse.ok) {
                    const data = await myipLaResponse.json();
                    if (data && data.location) {
                        if (data.location.latitude && data.location.longitude) {
                            coordinates = {
                                latitude: parseFloat(data.location.latitude),
                                longitude: parseFloat(data.location.longitude)
                            };
                        }

                        const province = data.location.province || '';
                        const city = data.location.city || '';
                        if (province && city) {
                            if (city.includes(province.replace('省', '').replace('市', '').replace('都', ''))) {
                                location = city;
                            } else {
                                location = province + city;
                            }
                        } else if (province) {
                            location = province;
                        } else if (city) {
                            location = city;
                        } else if (data.location.country_name) {
                            location = data.location.country_name;
                        }
                    }
                }
            } catch (error) {
                console.warn('api.myip.la 获取失败，将回退到备用方案:', error.message);
            }

            if (!location) {
                try {
                    const ipipResponse = await fetch('https://myip.ipip.net', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                            'Referer': 'https://www.baidu.com/',
                            'Accept-Language': 'zh-CN,zh;q=0.9',
                            'Keep-Alive': 'yes',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (ipipResponse.ok) {
                        const text = await ipipResponse.text();
                        if (text && text.includes('来自于：')) {
                            const locationPart = text.split('来自于：')[1];
                            if (locationPart) {
                                const locationInfo = locationPart.split(' ')[0];
                                if (locationInfo) {
                                    const parts = locationInfo.trim().split(' ');
                                    if (parts.length >= 3) {
                                        location = parts[1] + parts[2];
                                    } else if (parts.length === 2) {
                                        location = parts[1];
                                    } else {
                                        location = parts[0];
                                    }

                                    try {
                                        coordinates = await this.getCoordinates(location);
                                    } catch (geoError) {
                                        console.error(`获取 ${location} 坐标失败:`, geoError);
                                    }
                                }
                            }
                        }
                    }
                } catch (fallbackError) {
                    console.error('备用 API 也失败了:', fallbackError.message);
                }
            }

            if (!location) {
                console.warn('无法获取位置信息');
                return { location: '', coordinates: null };
            }

            return { location, coordinates };
        } catch (error) {
            console.error('获取位置信息过程中发生错误:', error);
            return { location: '', coordinates: null };
        }
    }

    async getCoordinates(cityName) {
        if (!cityName) return null;

        try {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&accept-language=zh-Hans&countrycodes=CN`;

            const response = await fetch(geocodeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                }
            });

            if (!response.ok) {
                throw new Error('地理编码请求失败');
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            }

            if (cityName.length > 2) {
                const province = cityName.substring(0, 2);
                const provinceUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(province)}&format=json&limit=1&accept-language=zh-Hans&countrycodes=CN`;
                const provinceResponse = await fetch(provinceUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                        'Accept-Language': 'zh-CN,zh;q=0.9'
                    }
                });

                if (provinceResponse.ok) {
                    const provinceData = await provinceResponse.json();
                    if (provinceData && provinceData.length > 0) {
                        const { lat, lon } = provinceData[0];
                        return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
                    }
                }
            }

            console.warn(`无法获取 ${cityName} 的坐标，天气服务暂不支持该地区`);
            return null;
        } catch (error) {
            console.error('获取坐标失败:', error);
            return null;
        }
    }

    processWeatherData(data, timestamp, userLocation = '', coordinates = null) {
        if (!data || data.error) {
            const errorMessage = data && data.reason ? data.reason : '该位置暂不支持';
            return {
                location: userLocation || '未知位置',
                condition: errorMessage,
                temperature: 'N/A',
                tempRange: 'N/A',
                airQuality: 'N/A',
                humidity: 'N/A',
                windSpeed: 'N/A',
                icon: this.weatherIcons['未知'],
                timestamp: timestamp
            };
        }

        const current = data.current || {};
        const weatherCode = current.weather_code || 0;
        const temperature = current.temperature_2m !== undefined ? `${Math.round(current.temperature_2m)}°C` : 'N/A';
        let tempRange = 'N/A';
        if (data.daily) {
            const minTemp = data.daily.temperature_2m_min?.[0];
            const maxTemp = data.daily.temperature_2m_max?.[0];
            if (minTemp !== undefined && maxTemp !== undefined) {
                tempRange = `${Math.round(minTemp)}～${Math.round(maxTemp)}°C`;
            }
        }

        let humidity = 'N/A';
        if (data.current && data.current.relative_humidity_2m !== undefined) {
            humidity = `${data.current.relative_humidity_2m}%`;
        }

        let airQuality = 'N/A';
        if (data.current && data.current.european_aqi !== undefined) {
            const aqi = data.current.european_aqi;
            let aqiLevel = '';
            if (aqi <= 20) aqiLevel = '优';
            else if (aqi <= 40) aqiLevel = '良';
            else if (aqi <= 60) aqiLevel = '中等';
            else if (aqi <= 80) aqiLevel = '一般';
            else if (aqi <= 100) aqiLevel = '差';
            else aqiLevel = '严重';
            airQuality = `${aqiLevel} (${aqi})`;
        }

        let windSpeed = 'N/A';
        if (data.current && data.current.wind_speed_10m !== undefined) {
            windSpeed = `${Math.round(current.wind_speed_10m)} km/h`;
        }

        let weatherCondition = '未知';
        let weatherIcon = this.weatherIcons['未知'];
        if (weatherCode !== undefined) {
            if (weatherCode === 0) {
                weatherCondition = '晴';
                weatherIcon = this.weatherIcons['晴'];
            } else if (weatherCode === 1) {
                weatherCondition = '大部晴朗';
                weatherIcon = this.weatherIcons['晴'];
            } else if (weatherCode === 2) {
                weatherCondition = '局部多云';
                weatherIcon = this.weatherIcons['多云'];
            } else if (weatherCode === 3) {
                weatherCondition = '多云';
                weatherIcon = this.weatherIcons['多云'];
            } else if ([45, 48].includes(weatherCode)) {
                weatherCondition = '雾';
                weatherIcon = this.weatherIcons['雾'];
            } else if ([51, 53, 55, 56, 57].includes(weatherCode)) {
                weatherCondition = '小雨';
                weatherIcon = this.weatherIcons['小雨'];
            } else if ([61, 63, 66, 80, 81].includes(weatherCode)) {
                weatherCondition = '中雨';
                weatherIcon = this.weatherIcons['中雨'];
            } else if ([65, 67, 82].includes(weatherCode)) {
                weatherCondition = '大雨';
                weatherIcon = this.weatherIcons['大雨'];
            } else if ([95, 96, 99].includes(weatherCode)) {
                weatherCondition = '雷雨';
                weatherIcon = this.weatherIcons['雷'];
            } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
                weatherCondition = '雪';
                weatherIcon = this.weatherIcons['雪'];
            } else {
                weatherCondition = '阴';
                weatherIcon = this.weatherIcons['阴'];
            }
        }

        return {
            location: userLocation || '未知位置',
            condition: weatherCondition,
            temperature: temperature,
            tempRange: tempRange,
            airQuality: airQuality,
            humidity: humidity,
            windSpeed: windSpeed,
            icon: weatherIcon,
            timestamp: timestamp
        };
    }

    updateWeatherDisplay(weatherData) {
        const widget = document.querySelector('.unified-weather-widget');
        if (!widget) return;

        const icon = widget.querySelector('.weather-icon');
        const temp = widget.querySelector('.weather-temp');
        const location = widget.querySelector('.weather-location');
        const condition = widget.querySelector('.details-condition');
        const humidity = widget.querySelector('.details-item:nth-child(1)');
        const wind = widget.querySelector('.details-item:nth-child(2)');
        const tempRange = widget.querySelector('.details-item:nth-child(3)');
        const airQuality = widget.querySelector('.details-item:nth-child(4)');
        const updateTime = widget.querySelector('.details-update');

        if (icon) icon.textContent = weatherData.icon;
        if (temp) temp.textContent = weatherData.temperature;
        if (location) location.textContent = weatherData.location;
        if (condition) condition.textContent = weatherData.condition;
        if (humidity) humidity.textContent = `湿度: ${weatherData.humidity}`;
        if (wind) wind.textContent = `风速: ${weatherData.windSpeed}`;
        if (tempRange) tempRange.textContent = `温度: ${weatherData.tempRange}`;
        if (airQuality) airQuality.textContent = `空气: ${weatherData.airQuality.split(' ')[0]}`;

        if (updateTime) {
            const updateDate = new Date(weatherData.timestamp);
            updateTime.textContent = `更新: ${updateDate.getHours().toString().padStart(2, '0')}:${updateDate.getMinutes().toString().padStart(2, '0')}`;
        }
    }

    setupEventListeners() {
        const widget = document.querySelector('.unified-weather-widget');
        const toggleBtn = widget ? widget.querySelector('.weather-toggle') : null;
        const detailsPanel = widget ? widget.querySelector('.weather-details') : null;

        if (widget && toggleBtn && detailsPanel) {
            // 点击切换详情面板
            widget.addEventListener('click', (e) => {
                if (e.target.classList.contains('weather-toggle') || 
                    e.target.closest('.weather-toggle')) {
                    return;
                }
                
                this.toggleDetails();
            });

            // 点击箭头切换详情
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDetails();
                });
            }

            // 双击刷新天气数据
            widget.addEventListener('dblclick', async (e) => {
                e.stopPropagation();
                widget.classList.add('loading');
                try {
                    await this.loadWeatherData();
                } catch (error) {
                    console.error('刷新天气数据失败:', error);
                } finally {
                    widget.classList.remove('loading');
                }
            });
        }
    }

    toggleDetails() {
        const widget = document.querySelector('.unified-weather-widget');
        const toggleBtn = widget ? widget.querySelector('.weather-toggle') : null;
        const detailsPanel = widget ? widget.querySelector('.weather-details') : null;

        if (widget && toggleBtn && detailsPanel) {
            this.isExpanded = !this.isExpanded;
            
            if (this.isExpanded) {
                detailsPanel.classList.add('expanded');
                toggleBtn.classList.add('expanded');
            } else {
                detailsPanel.classList.remove('expanded');
                toggleBtn.classList.remove('expanded');
            }
        }
    }

    startAutoRefresh() {
        setInterval(async () => {
            await this.loadWeatherData();
        }, this.options.refreshInterval);
    }

    // 提供手动刷新方法
    async refresh() {
        return await this.loadWeatherData();
    }
}
