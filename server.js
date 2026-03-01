const express = require('express');
const cors = require('cors');
const pikudHaoref = require('pikud-haoref-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let lastAlert = null;
let lastAlertTime = 0;
const ALERT_DISPLAY_DURATION = 30000;

// מיפוי ערים לקואורדינטות (lat, lng)
const CITIES_COORDINATES = {
    // ירושלים והסביבה
    'ירושלים': { lat: 31.7683, lng: 35.2137 },
    'ירושלים - מרכז': { lat: 31.7767, lng: 35.2345 },
    'ירושלים - דרום': { lat: 31.7500, lng: 35.2200 },
    'ירושלים - צפון': { lat: 31.8000, lng: 35.2300 },
    'ירושלים - מזרח': { lat: 31.7800, lng: 35.2500 },
    'ירושלים - מערב': { lat: 31.7700, lng: 35.1900 },
    'מבשרת ציון': { lat: 31.8025, lng: 35.1522 },
    'מעלה אדומים': { lat: 31.7781, lng: 35.3011 },
    'גבעת זאב': { lat: 31.8628, lng: 35.1714 },
    'ביתר עילית': { lat: 31.6969, lng: 35.1183 },
    'בית שמש': { lat: 31.7514, lng: 34.9886 },
    'אבו גוש': { lat: 31.8078, lng: 35.1089 },
    'מודיעין': { lat: 31.8975, lng: 35.0103 },
    'מודיעין עילית': { lat: 31.9333, lng: 35.0444 },
    
    // תל אביב והמרכז
    'תל אביב - מרכז העיר': { lat: 32.0853, lng: 34.7818 },
    'תל אביב - דרום העיר': { lat: 32.0500, lng: 34.7700 },
    'תל אביב - צפון העיר': { lat: 32.1100, lng: 34.7900 },
    'תל אביב - יפו': { lat: 32.0500, lng: 34.7500 },
    'רמת גן': { lat: 32.0700, lng: 34.8243 },
    'גבעתיים': { lat: 32.0717, lng: 34.8100 },
    'בני ברק': { lat: 32.0833, lng: 34.8333 },
    'חולון': { lat: 32.0167, lng: 34.7667 },
    'בת ים': { lat: 32.0167, lng: 34.7500 },
    'ראשון לציון': { lat: 31.9500, lng: 34.8000 },
    'פתח תקווה': { lat: 32.0833, lng: 34.8833 },
    'הרצליה': { lat: 32.1667, lng: 34.8333 },
    'רעננה': { lat: 32.1833, lng: 34.8667 },
    'כפר סבא': { lat: 32.1833, lng: 34.9000 },
    'נתניה': { lat: 32.3286, lng: 34.8561 },
    'רחובות': { lat: 31.8928, lng: 34.8113 },
    'נס ציונה': { lat: 31.9333, lng: 34.8000 },
    'לוד': { lat: 31.9500, lng: 34.9000 },
    'רמלה': { lat: 31.9167, lng: 34.8667 },
    
    // חיפה והצפון
    'חיפה': { lat: 32.7940, lng: 34.9896 },
    'חיפה - מרכז הכרמל': { lat: 32.7800, lng: 34.9800 },
    'חיפה - קריות': { lat: 32.8300, lng: 35.0700 },
    'קריית אתא': { lat: 32.8000, lng: 35.1000 },
    'קריית ביאליק': { lat: 32.8333, lng: 35.0833 },
    'קריית מוצקין': { lat: 32.8333, lng: 35.0667 },
    'עכו': { lat: 32.9333, lng: 35.0833 },
    'נהריה': { lat: 33.0000, lng: 35.0833 },
    'כרמיאל': { lat: 32.9167, lng: 35.3000 },
    'עפולה': { lat: 32.6000, lng: 35.2833 },
    'טבריה': { lat: 32.7897, lng: 35.5317 },
    'צפת': { lat: 32.9658, lng: 35.4983 },
    
    // הדרום
    'באר שבע': { lat: 31.2589, lng: 34.7997 },
    'אשדוד': { lat: 31.8000, lng: 34.6500 },
    'אשקלון': { lat: 31.6658, lng: 34.5664 },
    'קריית גת': { lat: 31.6100, lng: 34.7700 },
    'דימונה': { lat: 31.0667, lng: 35.0333 },
    'אילת': { lat: 29.5577, lng: 34.9519 },
    'שדרות': { lat: 31.5167, lng: 34.5833 },
    'אופקים': { lat: 31.3167, lng: 34.6167 },
    'נתיבות': { lat: 31.4167, lng: 34.5833 },
    
    // יהודה ושומרון
    'אריאל': { lat: 32.1000, lng: 35.1833 },
    'אפרת': { lat: 31.6500, lng: 35.1500 },
    'קרני שומרון': { lat: 32.1667, lng: 35.0833 },
    'אלקנה': { lat: 32.1167, lng: 35.0333 },
};

// מצא את העיר הקרובה ביותר לקואורדינטות
function findNearestCity(lat, lng, maxDistanceKm = 15) {
    let nearestCity = null;
    let nearestDistance = Infinity;
    
    for (const [cityName, coords] of Object.entries(CITIES_COORDINATES)) {
        const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestCity = cityName;
        }
    }
    
    if (nearestDistance <= maxDistanceKm) {
        return { city: nearestCity, distance: nearestDistance };
    }
    return null;
}

// חישוב מרחק בקילומטרים (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// בדוק אם יש התראה לאזור מסוים
function hasAlertForArea(alertCities, userCity) {
    if (!Array.isArray(alertCities) || !userCity) return false;
    
    const userCityLower = userCity.toLowerCase();
    const userCityBase = userCity.split(' - ')[0].toLowerCase(); // "ירושלים - מרכז" -> "ירושלים"
    
    return alertCities.some(city => {
        const cityLower = (city || '').toLowerCase();
        const cityBase = city.split(' - ')[0].toLowerCase();
        
        return cityLower === userCityLower ||
               cityLower.includes(userCityLower) ||
               userCityLower.includes(cityLower) ||
               cityBase === userCityBase;
    });
}

// שמור התראות גולמיות
let currentAlerts = null;
let currentAlertsTime = 0;

function checkAlerts() {
    pikudHaoref.getActiveAlert(function(err, alert) {
        if (err) {
            return;
        }
        
        if (alert && alert.type && alert.cities && alert.cities.length > 0) {
            currentAlerts = alert;
            currentAlertsTime = Date.now();
            console.log('📡 התראה התקבלה:', alert.cities.length, 'אזורים');
        }
    });
}

// API - בדיקת התראות עם קואורדינטות
app.get('/api/alert', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const now = Date.now();
    
    // אם אין קואורדינטות, החזר סטטוס בסיסי
    if (isNaN(lat) || isNaN(lng)) {
        return res.json({
            hasJerusalemAlert: false,
            hasAlert: false,
            alert: null,
            message: 'נדרשות קואורדינטות (lat, lng)',
            serverRunning: true
        });
    }
    
    // מצא את העיר הקרובה
    const nearest = findNearestCity(lat, lng);
    
    if (!nearest) {
        return res.json({
            hasJerusalemAlert: false,
            hasAlert: false,
            alert: null,
            userLocation: { lat, lng },
            message: 'לא נמצאה עיר קרובה במאגר',
            serverRunning: true
        });
    }
    
    // בדוק אם יש התראה לאזור הזה
    const alertActive = currentAlerts && 
                       (now - currentAlertsTime) < ALERT_DISPLAY_DURATION &&
                       hasAlertForArea(currentAlerts.cities, nearest.city);
    
    const relevantAlert = alertActive ? {
        type: currentAlerts.type,
        cities: [nearest.city],
        instructions: currentAlerts.instructions || 'רבותי! כעת זה הזמן שלנו להכות על ראשי נגידי עם היושבים במקלטים.'
    } : null;
    
    res.json({
        hasJerusalemAlert: alertActive,
        hasAlert: alertActive,
        alert: relevantAlert,
        userLocation: { lat, lng },
        nearestCity: nearest.city,
        distanceKm: Math.round(nearest.distance * 10) / 10,
        lastCheck: new Date().toISOString(),
        serverRunning: true
    });
});

// API - התראת טסט
app.get('/api/test', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    
    let testCity = 'האזור שלך';
    if (!isNaN(lat) && !isNaN(lng)) {
        const nearest = findNearestCity(lat, lng);
        if (nearest) testCity = nearest.city;
    }
    
    currentAlerts = {
        type: 'missiles',
        cities: [testCity],
        instructions: 'רבותי! כעת זה הזמן שלנו להכות על ראשי נגידי עם היושבים במקלטים.'
    };
    currentAlertsTime = Date.now();
    
    console.log('🧪 התראת טסט הופעלה עבור:', testCity);
    
    res.json({
        success: true,
        message: 'התראת טסט הופעלה ל-30 שניות',
        city: testCity
    });
});

// API - סטטוס
app.get('/api/status', (req, res) => {
    res.json({
        serverRunning: true,
        port: PORT,
        citiesInDatabase: Object.keys(CITIES_COORDINATES).length,
        lastAlertTime: currentAlertsTime ? new Date(currentAlertsTime).toISOString() : null
    });
});

// דף בית
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>שרת התראות לפי מיקום</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                h1 { color: #333; margin-bottom: 20px; }
                .status { padding: 15px; border-radius: 8px; margin: 15px 0; }
                .status.ok { background: #d4edda; color: #155724; }
                .status.info { background: #cce5ff; color: #004085; }
                .status.alert { background: #f8d7da; color: #721c24; }
                .btn { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px 10px 0; border: none; cursor: pointer; font-size: 16px; }
                .btn:hover { background: #b91c1c; }
                .btn.secondary { background: #6b7280; }
                .btn.secondary:hover { background: #4b5563; }
                .btn.green { background: #16a34a; }
                .btn.green:hover { background: #15803d; }
                #result { margin-top: 20px; }
                #location { font-size: 14px; color: #666; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚨 שרת התראות לפי מיקום</h1>
                <div class="status ok">✅ השרת פועל על פורט ${PORT}</div>
                
                <div id="location">📍 מיקום: טוען...</div>
                
                <div>
                    <button class="btn green" onclick="getLocation()">📍 זהה מיקום</button>
                    <button class="btn" onclick="testAlert()">🧪 התראת טסט</button>
                    <button class="btn secondary" onclick="checkAlert()">🔍 בדוק התראות</button>
                </div>
                
                <div id="result"></div>
            </div>
            <script>
                let userLat = null, userLng = null;
                
                function getLocation() {
                    if (!navigator.geolocation) {
                        document.getElementById('location').innerHTML = '❌ הדפדפן לא תומך במיקום';
                        return;
                    }
                    document.getElementById('location').innerHTML = '📍 מזהה מיקום...';
                    navigator.geolocation.getCurrentPosition(
                        pos => {
                            userLat = pos.coords.latitude;
                            userLng = pos.coords.longitude;
                            document.getElementById('location').innerHTML = '📍 מיקום: ' + userLat.toFixed(4) + ', ' + userLng.toFixed(4);
                            checkAlert();
                        },
                        err => {
                            document.getElementById('location').innerHTML = '❌ שגיאה בזיהוי מיקום: ' + err.message;
                        }
                    );
                }
                
                async function checkAlert() {
                    if (!userLat || !userLng) {
                        document.getElementById('result').innerHTML = '<div class="status info">📍 יש לזהות מיקום קודם</div>';
                        return;
                    }
                    const res = await fetch('/api/alert?lat=' + userLat + '&lng=' + userLng);
                    const data = await res.json();
                    let html = '<pre style="background:#f3f4f6;padding:15px;border-radius:8px;font-size:13px;">' + JSON.stringify(data, null, 2) + '</pre>';
                    if (data.nearestCity) {
                        html = '<div class="status info">🏙️ העיר הקרובה: <strong>' + data.nearestCity + '</strong> (' + data.distanceKm + ' ק"מ)</div>' + html;
                    }
                    if (data.hasAlert) {
                        html = '<div class="status alert">🚨 יש התראה באזור שלך!</div>' + html;
                    }
                    document.getElementById('result').innerHTML = html;
                }
                
                async function testAlert() {
                    if (!userLat || !userLng) {
                        document.getElementById('result').innerHTML = '<div class="status info">📍 יש לזהות מיקום קודם</div>';
                        return;
                    }
                    const res = await fetch('/api/test?lat=' + userLat + '&lng=' + userLng);
                    const data = await res.json();
                    document.getElementById('result').innerHTML = '<div class="status alert">🧪 ' + data.message + '<br>עיר: ' + data.city + '</div>';
                }
                
                getLocation();
            </script>
        </body>
        </html>
    `);
});

// בדוק התראות כל 3 שניות
setInterval(checkAlerts, 3000);

app.listen(PORT, () => {
    console.log(`
🚨 שרת התראות לפי מיקום פועל!
📍 כתובת: http://localhost:${PORT}
📡 בודק התראות כל 3 שניות
🗺️  ${Object.keys(CITIES_COORDINATES).length} ערים במאגר

נקודות קצה:
  GET /api/alert?lat=XX&lng=YY  - בדיקת התראות לפי מיקום
  GET /api/test?lat=XX&lng=YY   - התראת טסט
  GET /api/status               - סטטוס השרת
    `);
    
    checkAlerts();
});
