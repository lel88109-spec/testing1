const URL = 'https://teachablemachine.withgoogle.com/models/qv4Jq1JCX/';

let model, webcam, labelContainer, maxPredictions;

let isIos = false;
if (window.navigator.userAgent.indexOf('iPhone') > -1 || window.navigator.userAgent.indexOf('iPad') > -1) {
  isIos = true;
}

let isCameraInit = false;
let isCameraOn = false;
let currentCategory = 'all';

const labels = ['Cirrus', 'Cirrocumulus', 'Altostratus', 'Cumulus', 'Cumulonimbus', 'Contrails', 'Orographic', 'Cirrostratus', 'Altocumulus', 'Nimbostratus', 'Stratus', 'Stratocumulus', 'Mammatus', 'Lenticular'];

const categoryMapping = {
    'all': labels,
    'cirrus': ['Cirrus', 'Cirrocumulus', 'Contrails', 'Cirrostratus'],
    'cumulus': ['Cumulus', 'Cumulonimbus', 'Altocumulus', 'Lenticular'],
    'stratus': ['Stratus', 'Stratocumulus', 'Altostratus', 'Nimbostratus'],
    'other': ['Orographic', 'Mammatus']
};

window.onload = function() {
    init();
    setupCategoryButtons();
};

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    labelContainer = document.getElementById('label-container');
    for (let i = 0; i < maxPredictions; i++) {
        const container = document.createElement('div');
        container.className = 'label-container';
        
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
        
        barContainer.appendChild(probability);
        barContainer.appendChild(barFill);
        container.appendChild(labelText);
        container.appendChild(barContainer);
        labelContainer.appendChild(container);
    }
}

function setupCategoryButtons() {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
        });
    });
}

async function startWebcam() {
    if (!isCameraInit) {
        const flip = true;
        const width = isIos ? 224 : 450;
        const height = isIos ? 224 : 450;
        webcam = new tmImage.Webcam(width, height, flip);

        await webcam.setup();

        if (isIos) {
            document.getElementById('webcam-container').appendChild(webcam.webcam);
            const webCamVideo = document.getElementsByTagName('video')[0];
            webCamVideo.setAttribute("playsinline", true);
            webCamVideo.muted = "true";
            webCamVideo.style.width = '100%';
            webCamVideo.style.aspectRatio = '1/1';
        } else {
            document.getElementById("webcam-container").appendChild(webcam.canvas);
        }
        isCameraInit = true;
        isCameraOn = true;
        webcam.play();
        window.requestAnimationFrame(loop);
    } else {
        isCameraOn = true;
    }
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
}

async function stopWebcam() {
    isCameraOn = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

async function loop() {
    if (isCameraOn) {
        webcam.update();
    }
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    let prediction;
    if (isIos) {
        prediction = await model.predict(webcam.webcam);
    } else {
        prediction = await model.predict(webcam.canvas);
    }
    
    for (let i = 0; i < maxPredictions; i++) {
        const probability = (prediction[i].probability.toFixed(4) * 100).toFixed(1);
        labelContainer.childNodes[i].childNodes[0].innerHTML = prediction[i].className;
        labelContainer.childNodes[i].childNodes[1].childNodes[0].innerHTML = probability + '%';
        labelContainer.childNodes[i].childNodes[1].childNodes[1].style.width = probability + '%';
    }
}
