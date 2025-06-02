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

    // 創建結果表格
    function createResultsTable(data) {
        // 清空結果區域
        resultDiv.innerHTML = '';
        
        // 創建表格容器
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-top: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        // 創建表格
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            background: white;
        `;
        
        // 創建表頭
        const thead = document.createElement('thead');
        thead.style.cssText = `
            background: #f8f9fa;
            position: sticky;
            top: 0;
            z-index: 10;
        `;
        
        const headerRow = document.createElement('tr');
        const headers = ['卡名', '內容'];
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.cssText = `
                padding: 12px 15px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
                font-weight: 600;
                color: #495057;
            `;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 創建表體
        const tbody = document.createElement('tbody');
        
        // 遞歸函數來處理嵌套對象
        function addDataToTable(obj, prefix = '') {
            for (const [key, value] of Object.entries(obj)) {
                const row = document.createElement('tr');
                row.style.cssText = `
                    border-bottom: 1px solid #dee2e6;
                    transition: background-color 0.2s;
                `;
                
                // 添加懸停效果
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f8f9fa';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });
                
                // 屬性名稱單元格
                const keyCell = document.createElement('td');
                keyCell.textContent = prefix ? `${prefix}.${key}` : key;
                keyCell.style.cssText = `
                    padding: 10px 15px;
                    font-weight: 500;
                    color: #495057;
                    width: 30%;
                    vertical-align: top;
                `;
                
                // 值單元格
                const valueCell = document.createElement('td');
                valueCell.style.cssText = `
                    padding: 10px 15px;
                    color: #6c757d;
                    word-break: break-word;
                    vertical-align: top;
                `;
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // 如果是對象，顯示為JSON格式或創建子表格
                    if (Object.keys(value).length <= 3) {
                        // 簡單對象，顯示為內聯JSON
                        valueCell.innerHTML = `<code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">${JSON.stringify(value, null, 2)}</code>`;
                    } else {
                        // 複雜對象，創建展開/收縮按鈕
                        const expandBtn = document.createElement('button');
                        expandBtn.textContent = '展開詳細信息 ▼';
                        expandBtn.style.cssText = `
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8em;
                        `;
                        
                        const detailDiv = document.createElement('div');
                        detailDiv.style.display = 'none';
                        detailDiv.style.marginTop = '8px';
                        
                        const detailTable = document.createElement('table');
                        detailTable.style.cssText = `
                            width: 100%;
                            border: 1px solid #dee2e6;
                            border-radius: 4px;
                            font-size: 0.9em;
                        `;
                        
                        for (const [subKey, subValue] of Object.entries(value)) {
                            const subRow = document.createElement('tr');
                            subRow.innerHTML = `
                                <td style="padding: 6px 10px; border-bottom: 1px solid #eee; font-weight: 500; width: 40%;">${subKey}</td>
                                <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">${typeof subValue === 'object' ? JSON.stringify(subValue) : subValue}</td>
                            `;
                            detailTable.appendChild(subRow);
                        }
                        
                        detailDiv.appendChild(detailTable);
                        
                        expandBtn.addEventListener('click', () => {
                            if (detailDiv.style.display === 'none') {
                                detailDiv.style.display = 'block';
                                expandBtn.textContent = '收起詳細信息 ▲';
                            } else {
                                detailDiv.style.display = 'none';
                                expandBtn.textContent = '展開詳細信息 ▼';
                            }
                        });
                        
                        valueCell.appendChild(expandBtn);
                        valueCell.appendChild(detailDiv);
                    }
                } else if (Array.isArray(value)) {
                    valueCell.innerHTML = `<code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">[${value.join(', ')}]</code>`;
                } else {
                    // 高亮最佳匹配結果
                    if (key === 'Best Match' || key === 'Best_Match') {
                        valueCell.innerHTML = `<strong style="color: #28a745; font-weight: 600;">${value}</strong>`;
                    } else {
                        valueCell.textContent = value || '(空值)';
                    }
                }
                
                row.appendChild(keyCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            }
        }
        
        // 添加數據到表格
        addDataToTable(data);
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // 如果沒有數據，顯示提示
        if (Object.keys(data).length === 0) {
            const noDataDiv = document.createElement('div');
            noDataDiv.textContent = '未找到識別結果';
            noDataDiv.style.cssText = `
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-style: italic;
            `;
            tableContainer.appendChild(noDataDiv);
        }
        
        // 添加標題
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<h3 style="margin: 0 0 10px 0; color: #495057;">卡片識別結果</h3>';
        
        resultDiv.appendChild(titleDiv);
        resultDiv.appendChild(tableContainer);
        
        // 如果有最佳匹配，也在頂部顯示
        const bestMatch = data["Fuzzy Search"]?.["Best Match"] || data["Best Match"] || data.best_match;
        if (bestMatch) {
            const highlightDiv = document.createElement('div');
            highlightDiv.style.cssText = `
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 12px 15px;
                border-radius: 8px;
                margin-bottom: 15px;
                text-align: center;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
            `;
            highlightDiv.innerHTML = `🎯 識別結果: <span style="font-size: 1.1em;">${bestMatch}</span>`;
            resultDiv.insertBefore(highlightDiv, titleDiv);
        }
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
            resultDiv.innerHTML = '';
    
            console.log("發送圖像到伺服器...");
            const response = await fetch('/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageDataUrl })
            });
    
            const result = await response.json();
            console.log("收到伺服器響應:", result);
            loadingDiv.style.display = 'none';
            
            if (result.error) {
                resultDiv.innerHTML = `<div style="color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">錯誤: ${result.error}</div>`;
            } else {
                // 使用新的表格顯示方法
                createResultsTable(result);
                console.log("卡片詳細資訊:", result);
            }
        } catch (error) {
            console.error('處理圖像時發生錯誤:', error);
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = `<div style="color: #dc3545; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">處理失敗！${error.message}</div>`;
        }
    });
});