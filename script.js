const URL = 'https://teachablemachine.withgoogle.com/models/qv4Jq1JCX/';

let model, labelContainer, maxPredictions;
let isIos = false;
let currentPage = 'quiz';

const webcamInstances = {
    quiz: { webcam: null, active: false, initialized: false },
    weather: { webcam: null, active: false, initialized: false }
};

if (window.navigator.userAgent.indexOf('iPhone') > -1 || window.navigator.userAgent.indexOf('iPad') > -1) {
    isIos = true;
}

const labels = ['Cirrus', 'Cirrocumulus', 'Altostratus', 'Cumulus', 'Cumulonimbus', 'Contrails', 'Orographic', 'Cirrostratus', 'Altocumulus', 'Nimbostratus', 'Stratus', 'Stratocumulus', 'Mammatus', 'Lenticular'];

const weatherMap = {
    'Cumulonimbus': '⛈️ Thunderstorm expected - Heavy rain',
    'Cumulus': '☀️ Fair weather - Scattered showers possible',
    'Stratus': '🌧️ Overcast - Light rain',
    'Stratocumulus': '☁️ Cloudy - Light precipitation',
    'Cirrus': '☀️ Fair weather - High altitude clouds',
    'Nimbostratus': '🌧️ Heavy rain expected',
    'Altostratus': '☁️ Partly cloudy - Moderate weather',
    'Altocumulus': '☀️ Generally fair',
    'Cirrocumulus': '☀️ Fair, possible temperature changes',
    'Cirrostratus': '☁️ Rain possible in 24 hours',
    'Lenticular': '☀️ Fair but windy',
    'Contrails': '✈️ Aircraft contrails',
    'Orographic': '⛰️ Mountain-influenced clouds',
    'Mammatus': '⚠️ Severe weather possible'
};

window.onload = function() {
    init();
    setupNavigation();
    setupPhotoUpload();
};

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    setupLabelContainers();
}

function setupLabelContainers() {
    // Quiz labels
    labelContainer = document.getElementById('label-container');
    createLabelElements(labelContainer);

    // Weather labels
    const weatherLabelContainer = document.getElementById('label-container-weather');
    if (weatherLabelContainer) {
        createLabelElements(weatherLabelContainer);
    }

    // Photo labels
    const photoLabelContainer = document.getElementById('label-container-photo');
    if (photoLabelContainer) {
        createLabelElements(photoLabelContainer);
    }
}

function createLabelElements(container) {
    container.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-container';
        
        const labelText = document.createElement('p');
        labelText.className = 'label-text';
        labelText.innerHTML = labels[i];
        
        const barContainer = document.createElement('div');
        barContainer.className = 'label-bar-container';
        
        const probability = document.createElement('p');
        probability.className = 'label-probability';
        probability.innerHTML = '0.0%';
        
        const barFill = document.createElement('div');
        barFill.className = 'label-bar-fill';
        barFill.style.width = '0%';
        
        barContainer.appendChild(probability);
        barContainer.appendChild(barFill);
        labelDiv.appendChild(labelText);
        labelDiv.appendChild(barContainer);
        container.appendChild(labelDiv);
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            switchPage(pageId);
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function switchPage(pageId) {
    // Stop all webcams when switching pages
    Object.keys(webcamInstances).forEach(key => {
        webcamInstances[key].active = false;
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');
    currentPage = pageId;
}

async function startWebcam(pageType) {
    const instance = webcamInstances[pageType];
    
    if (!instance.initialized) {
        const flip = true;
        const width = isIos ? 224 : 450;
        const height = isIos ? 224 : 450;
        
        instance.webcam = new tmImage.Webcam(width, height, flip);
        await instance.webcam.setup();

        const containerId = pageType === 'quiz' ? 'webcam-container' : 'webcam-container-weather';
        const container = document.getElementById(containerId);

        if (isIos) {
            container.appendChild(instance.webcam.webcam);
            const video = container.getElementsByTagName('video')[0];
            if (video) {
                video.setAttribute("playsinline", true);
                video.muted = "true";
                video.style.width = '100%';
                video.style.aspectRatio = '1/1';
            }
        } else {
            container.appendChild(instance.webcam.canvas);
        }

        instance.initialized = true;
        instance.active = true;
        instance.webcam.play();
        loop(pageType);
    } else {
        instance.active = true;
        if (!instance.webcam.webcam.playing) {
            instance.webcam.play();
        }
        loop(pageType);
    }

    updateButtonStates(pageType);
}

async function stopWebcam(pageType) {
    const instance = webcamInstances[pageType];
    instance.active = false;
    updateButtonStates(pageType);
}

function updateButtonStates(pageType) {
    const startBtn = document.getElementById(`startBtn-${pageType}`);
    const stopBtn = document.getElementById(`stopBtn-${pageType}`);
    
    const instance = webcamInstances[pageType];
    startBtn.disabled = instance.active;
    stopBtn.disabled = !instance.active;
}

async function loop(pageType) {
    if (webcamInstances[pageType].active) {
        webcamInstances[pageType].webcam.update();
    }
    await predict(pageType);
    if (webcamInstances[pageType].active) {
        window.requestAnimationFrame(() => loop(pageType));
    }
}

async function predict(pageType) {
    const instance = webcamInstances[pageType];
    
    let prediction;
    if (isIos) {
        prediction = await model.predict(instance.webcam.webcam);
    } else {
        prediction = await model.predict(instance.webcam.canvas);
    }

    const containerId = pageType === 'quiz' ? 'label-container' : 'label-container-weather';
    const container = document.getElementById(containerId);
    const children = container.childNodes;

    for (let i = 0; i < maxPredictions; i++) {
        const probability = (prediction[i].probability.toFixed(4) * 100).toFixed(1);
        children[i].childNodes[0].innerHTML = labels[i];
        children[i].childNodes[1].childNodes[0].innerHTML = probability + '%';
        children[i].childNodes[1].childNodes[1].style.width = probability + '%';
    }

    // Update weather insights
    if (pageType === 'weather') {
        updateWeatherInsights(prediction);
    }
}

function updateWeatherInsights(prediction) {
    let topPrediction = prediction.reduce((max, curr) => 
        curr.probability > max.probability ? curr : max
    );

    const insights = document.getElementById('weather-insights');
    const cloudType = labels[prediction.indexOf(topPrediction)];
    const weatherInfo = weatherMap[cloudType] || 'Unknown cloud type';
    const confidence = (topPrediction.probability * 100).toFixed(1);

    insights.innerHTML = `
        <strong>Detected Cloud Type:</strong> ${cloudType}<br>
        <strong>Confidence:</strong> ${confidence}%<br>
        <strong>Weather Prediction:</strong> ${weatherInfo}
    `;
}

function setupPhotoUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const photoInput = document.getElementById('photoInput');

    uploadBox.addEventListener('click', () => photoInput.click());

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#764ba2';
        uploadBox.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.backgroundColor = '';
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.backgroundColor = '';
        handlePhotoUpload(e.dataTransfer.files[0]);
    });

    photoInput.addEventListener('change', (e) => {
        handlePhotoUpload(e.target.files[0]);
    });
}

function handlePhotoUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('previewImage');
        img.src = e.target.result;
        
        document.getElementById('photo-preview').style.display = 'block';
        document.getElementById('analyzeBtn').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function analyzePhoto() {
    const img = document.getElementById('previewImage');
    const resultsDiv = document.getElementById('photo-results');

    const prediction = await model.predict(img);
    const container = document.getElementById('label-container-photo');
    const children = container.childNodes;

    for (let i = 0; i < maxPredictions; i++) {
        const probability = (prediction[i].probability.toFixed(4) * 100).toFixed(1);
        children[i].childNodes[0].innerHTML = labels[i];
        children[i].childNodes[1].childNodes[0].innerHTML = probability + '%';
        children[i].childNodes[1].childNodes[1].style.width = probability + '%';
    }

    resultsDiv.style.display = 'block';
}

function toggleFAQ(button) {
    const answer = button.nextElementSibling;
    const isOpen = answer.style.display !== 'none';

    document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
    document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active'));

    if (!isOpen) {
        answer.style.display = 'block';
        button.classList.add('active');
    }
}

function handleContactSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    // In a real application, you would send this data to a server
    console.log('Contact Form Submitted:', { name, email, subject, message });
    
    alert('Thank you for your message! We will get back to you soon.');
    event.target.reset();
}
