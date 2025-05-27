document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const captureButton = document.getElementById('captureButton');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const cameraError = document.getElementById('cameraError');

    // 檢查瀏覽器支持
    function checkBrowserSupport() {
        console.log("檢查瀏覽器支持...");
        
        // 顯示一些調試信息
        if (!navigator) {
            console.error("navigator 對象不存在");
            return false;
        }
        
        console.log("navigator 對象存在");
        console.log("navigator.userAgent: " + navigator.userAgent);
        
        // 檢查不同的相機API選項
        const hasGetUserMedia = !!(
            navigator.mediaDevices && 
            navigator.mediaDevices.getUserMedia || 
            navigator.getUserMedia || 
            navigator.webkitGetUserMedia || 
            navigator.mozGetUserMedia
        );
        
        console.log("相機API支持狀態: " + hasGetUserMedia);
        return hasGetUserMedia;
    }

    // 獲取相機流的兼容方法
    async function getMediaStream(constraints) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            console.log("使用標準 mediaDevices.getUserMedia");
            return await navigator.mediaDevices.getUserMedia(constraints);
        } 
        
        // 舊版API支持
        return new Promise((resolve, reject) => {
            const getUserMedia = 
                navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia;
                
            if (!getUserMedia) {
                reject(new Error("瀏覽器不支持getUserMedia"));
                return;
            }
            
            console.log("使用舊版 getUserMedia API");
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }

    async function setupCamera() {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        try {
            console.log("嘗試啟動相機...");
            
            if (!checkBrowserSupport()) {
                throw new Error("瀏覽器不支持相機API");
            }
            
            const stream = await getMediaStream(constraints);
            console.log("成功獲取相機串流");
            video.srcObject = stream;
            
            video.onloadedmetadata = () => {
                console.log("視頻元數據已載入");
                video.play().catch(e => console.error("播放失敗:", e));
            };
            
            if (cameraError) {
                cameraError.style.display = 'none';
            }
            
        } catch (err) {
            console.error("相機訪問錯誤:", err);
            
            if (cameraError) {
                cameraError.style.display = 'block';
                cameraError.textContent = "無法訪問相機: " + err.message + 
                    "。可能原因：瀏覽器不支持、缺少權限或需要使用HTTPS。";
            }
            
            if (resultDiv) {
                resultDiv.textContent = "相機訪問失敗。請使用Chrome或Firefox的最新版本，並通過localhost或HTTPS訪問。";
            }
        }
    }

    // 嘗試設置相機
    setupCamera();

    // 添加訪問按鈕，有些瀏覽器需要用戶交互才能訪問相機
    document.body.insertAdjacentHTML('afterbegin', 
        '<div style="text-align:center; margin:10px;"><button id="startCamera" style="padding:10px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer;">允許訪問相機</button></div>'
    );
    
    document.getElementById('startCamera').addEventListener('click', function() {
        console.log("用戶點擊了允許訪問相機按鈕");
        setupCamera();
        this.disabled = true;
        this.textContent = "正在啟動相機...";
    });

    captureButton.addEventListener('click', async () => {
        if (!video.srcObject) {
            console.error("相機未初始化");
            resultDiv.textContent = "相機未初始化，請點擊「允許訪問相機」按鈕。";
            return;
        }
        
        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight * 0.17;
    
            console.log("截取圖像，尺寸:", canvas.width, "x", canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    
            const imageDataUrl = canvas.toDataURL('image/jpeg');
    
            loadingDiv.style.display = 'block';
            resultDiv.textContent = '';
    
            console.log("發送圖像到伺服器...");
            const response = await fetch('/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageDataUrl })
            });
    
            const result = await response.json();
            console.log("收到服務器響應:", result);
            loadingDiv.style.display = 'none';
            
            if (result.error) {
                resultDiv.textContent = `錯誤: ${result.error}`;
            } else {
                resultDiv.textContent = `識別結果: ${result.Fuzzy_Search?.Best_Match || '未識別'}`;
                console.log("卡片詳細資訊:", result);
            }
        } catch (error) {
            console.error('處理圖像時發生錯誤:', error);
            loadingDiv.style.display = 'none';
            resultDiv.textContent = "處理失敗！" + error.message;
        }
    });
});