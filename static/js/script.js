const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureButton = document.getElementById('captureButton');
const resultDiv = document.getElementById('result');
const loadingDiv = document.getElementById('loading');

async function setupCamera() {
    const constraints = {
        video: {
            facingMode: 'environment',
            aspectRatio: 2/3
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (err) {
        console.error("Kļūda piekļūstot kamerai:", err);
        resultDiv.textContent = "Neizdevās piekļūt kamerai. Lūdzu, pārbaudiet atļaujas un mēģiniet vēlreiz.";
    }
}

setupCamera();

captureButton.addEventListener('click', async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight * 0.17;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');

    loadingDiv.style.display = 'block';
    resultDiv.textContent = '';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageDataUrl })
        });

        const result = await response.json();
        loadingDiv.style.display = 'none';
        resultDiv.textContent = `Rezultātu skaties konsolē!`;
    } catch (error) {
        console.error('Kļūda attēla apstrādes procesā:', error);
        loadingDiv.style.display = 'none';
        resultDiv.textContent = "Izskatās, ka tā nav Yu-Gi-Oh kārts angliski!";
    }
});
