// Crypto Transaction Flow Analyzer v2.11.0 - Multi-Input + Swap Filter
// Author: AI Assistant | Date: October 2025

const DEBUG = true;

function log(message, data = null) {
    if (DEBUG) {
        console.log(`[CryptoFlow] ${message}`);
        if (data !== null) {
            console.log(data);
        }
    }
}

function logError(message, error = null) {
    console.error(`[CryptoFlow ERROR] ${message}`);
    if (error !== null) {
        console.error(error);
    }
}

function logSuccess(message) {
    console.log(`%c[CryptoFlow SUCCESS] ${message}`, 'color: green; font-weight: bold;');
}

// Integer currencies (stablecoins) - always format as whole numbers
const INTEGER_CURRENCIES = new Set([
    'DAI', 'USDT', 'USDC', 'BUSD', 'TUSD', 'PAX', 'USDP', 'GUSD', 'HUSD', 'sUSD', 
    'FRAX', 'USTC', 'CUSD', 'USDX', 'EURS', 'ALUSD', 'LUSD', 'USDD', 'VAI', 'DUSD',
    'MIM', 'FEI', 'RAI', 'USDK', 'GYEN', 'USN', 'EURT', 'XSGD', 'LINA', 'USDQ',
    'QCAD', 'OUSD', 'UST', 'mUSD', 'EUSD', 'jEUR', 'jJPY', 'jGBP', 'jCHF', 'jCAD',
    'jAUD', 'jNZD', 'jSGD', 'DOLA', 'DSD', 'sEUR', 'sJPY', 'sGBP', 'sAUD', 'sCHF',
    'sKRW', 'sCNY', 'sSGD', 'sCAD', 'sNZD', 'sXAU', 'sXAG', 'sBTC', 'sETH', 'sLINK',
    'sAAVE', 'sUNI', 'sDOT', 'sYFI', 'sCOMP', 'sSNX', 'sMKR', 'sCRV', 'sBAL', 'sSUSHI',
    'sMANA', 'sCHZ', 'sENJ', 'sKNC', 'sREN', 'sBNT', 'sLRC', 'sZRX', 'sUMA', 's1INCH',
    'sALCX', 'sCEL', 'sDOGE', 'sFIL', 'sFTM', 'sGRT', 'sMATIC', 'sNEO', 'sQTUM', 'sSTX',
    'sTRX', 'sVET', 'sXLM', 'sXMR', 'sXTZ', 'sYFII', 'sZIL', 'sAVAX', 'sSOL', 'sBNB',
    'sADA', 'sEGLD', 'sFLOW', 'sICP', 'sLUNA', 'sAXS', 'sSAND', 'sRUNE', 'sOMG', 'sBAT',
    'sKSM', 'sALGO', 'sATOM', 'sNEAR', 'sFTT', 'sTHETA', 'sCAKE', 'sONE', 'sMIOTA',
    'sIOTA', 'sONT', 'sDGB', 'sZEC', 'sSHIB', 'sUSTC', 'sUSDP', 'sUSDD', 'sPYUSD',
    'sUSD1', 'sETHENA', 'sCNGN'
]);

class CryptoFlowAnalyzer {
    constructor() {
        log('Initializing CryptoFlowAnalyzer v2.11.0 - Multi-Input + Swap Filter...');
        this.uploadedFiles = {
            excel: null,
            images: [],
            pdf: null
        };
        this.parsedData = null;
        this.currentTab = null;
        this.currentExchange = null;
        this.cy = null;
        this.activeStages = new Set(['pre-layering', 'layering-non-vasp', 'layering-vasp', 'placement-dual-integration']);
        this.allCurrencies = new Set();
        this.init();
    }

    init() {
        log('Setting up event listeners...');
        this.setupEventListeners();
        log('Initializing Cytoscape...');
        this.initializeCytoscape();
        logSuccess('Application initialized successfully!');
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (!uploadArea || !fileInput) {
            logError('Upload area or file input not found!');
            return;
        }

        uploadArea.addEventListener('click', (event) => {
            if (event.target.tagName !== 'BUTTON') {
                fileInput.click();
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        const tabSelect = document.getElementById('tabSelect');
        if (tabSelect) {
            tabSelect.addEventListener('change', (e) => {
                this.currentTab = e.target.value;
                log('Tab selected:', this.currentTab);
                this.populateExchanges();
            });
        }

        const exchangeSelect = document.getElementById('exchangeSelect');
        if (exchangeSelect) {
            exchangeSelect.addEventListener('change', (e) => {
                this.currentExchange = e.target.value;
                log('Exchange selected:', this.currentExchange);
                this.enableGenerateButton();
            });
        }

        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateGraph();
            });
        }
        // Currency filter change event
        const currencyFilter = document.getElementById('currencyFilter');
        if (currencyFilter) {
          currencyFilter.addEventListener('change', () => {
        if (this.cy && this.cy.nodes().length > 0) {
            log('Currency filter changed, regenerating graph...');
            this.generateGraph();
      }
    });
    log('✓ Currency filter event listener added');
}


        const exportPngBtn = document.getElementById('exportPngBtn');
        if (exportPngBtn) {
            exportPngBtn.addEventListener('click', () => {
                this.exportAsPNG();
            });
        }

        const exportSvgBtn = document.getElementById('exportSvgBtn');
        if (exportSvgBtn) {
            exportSvgBtn.addEventListener('click', () => this.exportAsSVG());
        }


        document.querySelectorAll('.stage-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const stage = toggle.dataset.stage;
                if (this.activeStages.has(stage)) {
                    this.activeStages.delete(stage);
                    toggle.classList.remove('active');
                } else {
                    this.activeStages.add(stage);
                    toggle.classList.add('active');
                }
                if (this.cy && this.cy.nodes().length > 0) {
                    this.generateGraph();
                }
            });
        });

        logSuccess('Event listeners configured!');
    }

    async handleFiles(files) {
        log('Processing files...', { fileCount: files.length });
        const fileList = document.getElementById('fileList');

        if (!fileList) {
            logError('File list element not found!');
            return;
        }

        fileList.innerHTML = '';

        for (let file of files) {
            log(`Processing: ${file.name} (${file.size} bytes)`);
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `<span>📄 ${file.name}</span>`;

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                this.uploadedFiles.excel = file;
                fileItem.classList.add('success');
                fileItem.innerHTML += ' <span style="color: green;">✓</span>';
                try {
                    await this.parseExcel(file);
                    logSuccess('Excel parsed!');
                } catch (error) {
                    logError('Parse failed:', error);
                    fileItem.innerHTML += ' <span style="color: red;">✗</span>';
                }
            } else if (file.name.match(/\.(jpg|jpeg|png)$/i)) {
                this.uploadedFiles.images.push(file);
                fileItem.classList.add('success');
                fileItem.innerHTML += ' <span style="color: green;">✓</span>';
            } else if (file.name.endsWith('.pdf')) {
                this.uploadedFiles.pdf = file;
                fileItem.classList.add('success');
                fileItem.innerHTML += ' <span style="color: green;">✓</span>';
            }

            fileList.appendChild(fileItem);
        }
    }

    async parseExcel(file) {
        log('Starting Excel parsing...');

        try {
            const data = await file.arrayBuffer();

            if (typeof XLSX === 'undefined') {
                logError('XLSX library not loaded!');
                alert('Error: XLSX library not loaded.');
                return;
            }

            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            log('Workbook loaded:', workbook.SheetNames);

            this.parsedData = {};
            this.allCurrencies.clear();

            workbook.SheetNames.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
                log(`Parsing: ${sheetName} (${jsonData.length} rows)`);

                const sheetData = this.parseSheet(jsonData, sheetName);
                this.parsedData[sheetName] = sheetData;
            });

            log('Currencies found:', Array.from(this.allCurrencies));
            this.updateCurrencyFilter();
            this.populateTabs();
            logSuccess('Excel parsing complete!');
        } catch (error) {
            logError('Parsing failed:', error);
        }
    }

    parseSheet(data, sheetName) {
        const result = {
            caseId: '',
            country: '',
            broker: '',
            clientName: '',
            exchanges: {}
        };

        if (data[0]) {
            result.caseId = data[0][0] || '';
            for (let i = 0; i < Math.min(data[0].length, 10); i++) {
                const cell = String(data[0][i] || '');
                if (cell.includes('Country')) {
                    result.country = cell.replace(/Country:?/g, '').trim();
                }
                if (cell.includes('Broker')) {
                    result.broker = cell.replace(/Broker:?/g, '').trim();
                }
            }
        }

        if (data[1] && data[1][0]) {
            result.clientName = String(data[1][0]).split(/[–-]/)[0].trim();
        }

        let currentExchange = null;
        let currentStage = null;
        let insideValidExchange = false;

        const stopWords = ['subset of assets', 'aggregate incident', 'beneficiary vasp', 'distribution of sent'];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const firstCell = String(row[0] || '').trim();
            const firstCellLower = firstCell.toLowerCase();

            if (firstCellLower.includes('advanced transaction') && firstCellLower.includes('layering')) {
                log(`Advanced Transaction marker at row ${i}`);
                insideValidExchange = true;
                currentExchange = null;
                currentStage = null;
                continue;
            }

            if (stopWords.some(sw => firstCellLower.includes(sw))) {
                insideValidExchange = false;
                currentExchange = null;
                currentStage = null;
                continue;
            }

            if (!insideValidExchange) continue;

            if (!currentExchange && firstCell && !row[1] && !row[2] && firstCell.length > 2) {
                if (firstCellLower.includes('layering') || 
                    firstCellLower.includes('placement') || 
                    firstCell === '№/ID' ||
                    stopWords.some(sw => firstCellLower.includes(sw))) {
                    continue;
                }

                currentExchange = firstCell;
                result.exchanges[currentExchange] = {
                    'pre-layering': [],
                    'layering-non-vasp': [],
                    'layering-vasp': [],
                    'placement-dual-integration': []
                };
                log(`Exchange found: "${currentExchange}"`);
                continue;
            }

            if (!currentExchange) continue;

            if (firstCellLower.includes('placement') && firstCellLower.includes('dual')) {
                currentStage = 'placement-dual-integration';
                continue;
            } else if (firstCellLower.includes('pre-layering') || firstCellLower.includes('placement')) {
                currentStage = 'pre-layering';
                continue;
            } else if (firstCellLower.includes('layering non-vasp')) {
                currentStage = 'layering-non-vasp';
                continue;
            } else if (firstCellLower.includes('layering') && firstCellLower.includes('vasp')) {
                currentStage = 'layering-vasp';
                continue;
            }

            if (firstCell === '№/ID' || firstCell === 'ID') continue;

            if (currentExchange && currentStage && row[2] && row[4]) {
                const inputAddrOriginal = String(row[2] || '').trim();
const inputAddr = inputAddrOriginal.toLowerCase();
                const outputAddrOriginal = String(row[4] || '').trim();
const outputAddr = outputAddrOriginal.toLowerCase();

                if (inputAddr.length >= 10 && outputAddr.length >= 10) {
                    const currency = String(row[6] || '').trim();
                    const rawDate = row[1] || '';
                    const rawAmount = String(row[5] || '').replace(/\s+/g, '').replace(/,/g, '');

                    const transaction = {
                        id: row[0] || '',
                        date: rawDate,
                        input: inputAddr,
                        inputDisplay: inputAddrOriginal,
                        hash: row[3] || '',
                        output: outputAddr,
                        outputDisplay: outputAddrOriginal,
                        amount: parseFloat(rawAmount) || 0,
                        currency: currency,
                        chainAnalysis: row[7] || '',
                        comment: row[8] || '',
                        stage: currentStage
                    };

                    result.exchanges[currentExchange][currentStage].push(transaction);

                    if (currency) {
                        this.allCurrencies.add(currency);
                    }
                }
            }
        }

        Object.keys(result.exchanges).forEach(exName => {
            const exData = result.exchanges[exName];
            const total = exData['pre-layering'].length + exData['layering-non-vasp'].length + exData['layering-vasp'].length + exData['placement-dual-integration'].length;
            log(`  ${exName}: ${total} tx`);
        });

        return result;
    }

    parseTransactionIds(idStr) {
        if (!idStr) return [];

        const ids = [];
        const parts = String(idStr).split(',');

        parts.forEach(part => {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        ids.push(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    ids.push(num);
                }
            }
        });

        return ids;
    }

    isLockBurn(chainAnalysis) {
        if (!chainAnalysis) return false;
        const lower = String(chainAnalysis).toLowerCase();
        return lower.includes('lock') || lower.includes('burn');
    }

    isMinting(chainAnalysis) {
        if (!chainAnalysis) return false;
        const lower = String(chainAnalysis).toLowerCase();
        return lower.includes('mint');
    }

    extractExchangeName(comment) {
        if (!comment) return '';

        const trimmed = String(comment).trim();

        if (trimmed.includes(' to ')) {
            const parts = trimmed.split(' to ');
            return parts[parts.length - 1].trim();
        }

        return trimmed;
    }

    detectBridges(transactions) {
        log('\n=== DETECTING BRIDGES (IMPROVED ALGORITHM) ===');
        const bridges = [];

        // Шаг 1: Раскрытие диапазонов ID
        const expandedTxs = [];
        transactions.forEach(tx => {
            const ids = this.parseTransactionIds(tx.id);
            if (ids.length === 0) {
                expandedTxs.push({ ...tx, expandedId: null });
            } else {
                ids.forEach(id => {
                    expandedTxs.push({ ...tx, expandedId: id });
                });
            }
        });

        log(`Expanded ${transactions.length} transactions to ${expandedTxs.length} with IDs`);

        // Шаг 2: Разделение на Lock/Burn и Minting транзакции
        const lockBurnTxs = expandedTxs.filter(tx => this.isLockBurn(tx.chainAnalysis));
        const mintingTxs = expandedTxs.filter(tx => this.isMinting(tx.chainAnalysis));

        log(`\nLock/Burn transactions found: ${lockBurnTxs.length}`);
        lockBurnTxs.forEach((tx, idx) => {
            log(`  [${idx}] ID=${tx.expandedId}, Output=${tx.output.substring(0, 10)}..., Date="${tx.date}"`);
        });

        log(`\nMinting transactions found: ${mintingTxs.length}`);
        mintingTxs.forEach((tx, idx) => {
            log(`  [${idx}] ID=${tx.expandedId}, Input=${tx.input.substring(0, 10)}..., Date="${tx.date}"`);
        });

        // Шаг 3: Массив для отслеживания уже использованных Minting транзакций
        const usedMintingIndices = new Set();

        log('\n--- Matching bridges with improved algorithm ---');

        // Шаг 4: Для каждой Lock/Burn ищем ближайшую подходящую Minting
        for (let i = 0; i < lockBurnTxs.length; i++) {
            const lockBurnTx = lockBurnTxs[i];

            // Проверка наличия ID
            if (lockBurnTx.expandedId === null) {
                log(`[Lock/Burn ${i}] Skipping: no ID`);
                continue;
            }

            // Парсинг даты Lock/Burn
            const lockBurnDate = this.parseDate(lockBurnTx.date);
            if (!lockBurnDate) {
                log(`[Lock/Burn ${i}] Skipping: date parse failed for "${lockBurnTx.date}"`);
                continue;
            }

            log(`\n[Lock/Burn ${i}] ID=${lockBurnTx.expandedId}, Date=${lockBurnDate.toISOString()}`);
            log(`  Looking for Minting with same ID...`);

            // Поиск всех кандидатов Minting для этого Lock/Burn
            const candidates = [];

            for (let j = 0; j < mintingTxs.length; j++) {
                const mintingTx = mintingTxs[j];

                // Пропускаем уже использованные Minting
                if (usedMintingIndices.has(j)) {
                    log(`    [Minting ${j}] Already used, skipping`);
                    continue;
                }

                // Проверка совпадения ID
                if (lockBurnTx.expandedId !== mintingTx.expandedId) {
                    continue;
                }

                // Парсинг даты Minting
                const mintingDate = this.parseDate(mintingTx.date);
                if (!mintingDate) {
                    log(`    [Minting ${j}] Date parse failed: "${mintingTx.date}"`);
                    continue;
                }

                // КРИТИЧНО: Minting должен быть ПОСЛЕ Lock/Burn
                if (mintingDate <= lockBurnDate) {
                    log(`    [Minting ${j}] Date ${mintingDate.toISOString()} is BEFORE or EQUAL Lock/Burn, skipping`);
                    continue;
                }

                // Вычисление разницы во времени
                const timeDiff = (mintingDate - lockBurnDate) / (1000 * 60); // в минутах

                // Проверка временного окна (3 часа = 180 минут)
                if (timeDiff > 180) {
                    log(`    [Minting ${j}] Time diff ${timeDiff.toFixed(2)} min > 180 min (3 hours), skipping`);
                    continue;
                }

                log(`    [Minting ${j}] ✓ Valid candidate! Time diff: ${timeDiff.toFixed(2)} min`);

                // Добавляем кандидата
                candidates.push({
                    mintingIndex: j,
                    mintingTx: mintingTx,
                    timeDiff: timeDiff
                });
            }

            // Шаг 5: Выбор ближайшего по времени Minting
            if (candidates.length === 0) {
                log(`  ❌ No valid Minting found for this Lock/Burn`);
                continue;
            }

            // Сортируем кандидатов по времени (ближайший первым)
            candidates.sort((a, b) => a.timeDiff - b.timeDiff);

            const bestCandidate = candidates[0];

            log(`  ✅ BRIDGE FOUND! Selected closest Minting (${candidates.length} candidates total)`);
            log(`     Lock/Burn: ${lockBurnTx.output.substring(0, 15)}...`);
            log(`     Minting: ${bestCandidate.mintingTx.input.substring(0, 15)}...`);
            log(`     Time diff: ${bestCandidate.timeDiff.toFixed(2)} minutes`);

            // Создаём мост
            const bridge = {
                id: lockBurnTx.expandedId,
                lockBurnTx: lockBurnTx,
                mintingTx: bestCandidate.mintingTx,
                lockBurnWallet: lockBurnTx.output,
                mintingWallet: bestCandidate.mintingTx.input,
                timeDiff: bestCandidate.timeDiff.toFixed(2)
            };

            bridges.push(bridge);

            // Помечаем этот Minting как использованный
            usedMintingIndices.add(bestCandidate.mintingIndex);
        }

        // Шаг 6: Дедупликация по паре кошельков (на всякий случай)
        log(`\n--- Deduplicating bridges by wallet pair ---`);
        const uniqueBridges = [];
        const seen = new Set();

        bridges.forEach(bridge => {
            const key = `${bridge.lockBurnWallet}-${bridge.mintingWallet}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueBridges.push(bridge);
                log(`  ✓ Unique bridge: ${bridge.lockBurnWallet.substring(0, 10)}... ⟷ ${bridge.mintingWallet.substring(0, 10)}...`);
            } else {
                log(`  ⊗ Duplicate bridge skipped (same wallet pair)`);
            }
        });

        log(`\n=== TOTAL UNIQUE BRIDGES: ${uniqueBridges.length} (from ${bridges.length} matches) ===\n`);

        return uniqueBridges;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;

        try {
            const str = String(dateStr).trim();

            if (dateStr instanceof Date) {
                return dateStr;
            }

            const patterns = [
                /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
            ];

            for (const pattern of patterns) {
                const match = str.match(pattern);
                if (match) {
                    const month = parseInt(match[1]);
                    const day = parseInt(match[2]);
                    const year = parseInt(match[3]);
                    const hours = parseInt(match[4]);
                    const minutes = parseInt(match[5]);
                    const seconds = parseInt(match[6]);

                    const date = new Date(year, month - 1, day, hours, minutes, seconds);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }

            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    updateCurrencyFilter() {
        const currencyFilter = document.getElementById('currencyFilter');
      if (!currencyFilter) return;

      const currentValue = currencyFilter.value;
    
      // Очищаем и заполняем список валют
     currencyFilter.innerHTML = '<option value="">All Currencies</option>';

      Array.from(this.allCurrencies).sort().forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        currencyFilter.appendChild(option);
      });

      // Восстанавливаем выбранное значение если оно есть
      if (this.allCurrencies.has(currentValue)) {
        currencyFilter.value = currentValue;
      }

      // ✅ ИСПРАВЛЕНИЕ: Активируем фильтр
      currencyFilter.disabled = false;
    
      log('✓ Currency filter populated and enabled');
    }

    updateCurrencyFilterFromGraph(currencies) {
    const currencyFilter = document.getElementById('currencyFilter');
    if (!currencyFilter) return;

    const currentValue = currencyFilter.value;
    
    // Очищаем и заполняем список валют
    currencyFilter.innerHTML = '<option value="">All Currencies</option>';

    Array.from(currencies).sort().forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        currencyFilter.appendChild(option);
    });

    // Восстанавливаем выбранное значение если оно есть в текущем списке
    if (currencies.has(currentValue)) {
        currencyFilter.value = currentValue;
    } else {
        currencyFilter.value = ''; // Сбрасываем на "All Currencies"
    }

    currencyFilter.disabled = false;
    
    log(`✓ Currency filter updated for current graph: ${Array.from(currencies).join(', ')}`);
}


    populateTabs() {
        const tabSelect = document.getElementById('tabSelect');
        if (!tabSelect) return;

        tabSelect.innerHTML = '<option value="">Select a case...</option>';

        Object.keys(this.parsedData).forEach(tabName => {
            const option = document.createElement('option');
            option.value = tabName;
            option.textContent = tabName;
            tabSelect.appendChild(option);
        });

        tabSelect.disabled = false;
    }

    // Apply smart label spacing for multiple edges between same nodes
applyEdgeLabelSpacing() {
    log('Applying smart edge label spacing...');
    
    const edgeGroups = {};
    
    this.cy.edges().forEach(edge => {
        const source = edge.source().id();
        const target = edge.target().id();
        const key = `${source}->${target}`;
        
        if (!edgeGroups[key]) {
            edgeGroups[key] = [];
        }
        edgeGroups[key].push(edge);
    });
    
    Object.values(edgeGroups).forEach(group => {
        if (group.length > 1) {
            group.forEach((edge, index) => {
                const offset = index * -12;
                edge.style('text-margin-y', offset);
            });
        }
    });
    
    logSuccess(`Smart label spacing applied!`);
}



    populateExchanges() {
        const exchangeSelect = document.getElementById('exchangeSelect');
        if (!exchangeSelect) return;

        exchangeSelect.innerHTML = '<option value="">Select an exchange...</option>';

        if (!this.currentTab || !this.parsedData[this.currentTab]) return;

        const validExchanges = Object.keys(this.parsedData[this.currentTab].exchanges).filter(exchange => {
            const exData = this.parsedData[this.currentTab].exchanges[exchange];
            return exData['pre-layering'].length + exData['layering-non-vasp'].length + exData['layering-vasp'].length + exData['placement-dual-integration'].length > 0;
        });

        validExchanges.forEach(exchange => {
            const exData = this.parsedData[this.currentTab].exchanges[exchange];
            const totalTx = exData['pre-layering'].length + exData['layering-non-vasp'].length + exData['layering-vasp'].length + exData['placement-dual-integration'].length;

            const option = document.createElement('option');
            option.value = exchange;
            option.textContent = `${exchange} (${totalTx} tx)`;
            exchangeSelect.appendChild(option);
        });

        exchangeSelect.disabled = false;

        if (validExchanges.length === 1) {
            exchangeSelect.value = validExchanges[0];
            this.currentExchange = validExchanges[0];
            this.enableGenerateButton();
        }
    }

    enableGenerateButton() {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn && this.currentTab && this.currentExchange) {
            generateBtn.disabled = false;
        }
    }

    initializeCytoscape() {
        const container = document.getElementById('cy');
        if (!container) return;

        if (typeof cytoscape === 'undefined') {
            logError('Cytoscape not loaded!');
            return;
        }

        this.cy = cytoscape({
            container: container,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'background-color': '#ffffff',
                        'border-width': 2,
                        'border-color': 'data(color)',
                        'width': 'data(width)',
                        'height': 60,
                        'shape': 'roundrectangle',
                        'font-size': '10px',
                        'font-weight': 'bold',
                        'text-wrap': 'wrap',
                        'text-max-width': '80px'
                    }
                },
                {
                    selector: 'node.exchange-label',
                    style: {
                        'shape': 'rectangle',
                        'width': 100,
                        'height': 40,
                        'font-size': '12px',
                        'text-wrap': 'wrap'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#95a5a6',
                        'target-arrow-color': '#95a5a6',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'control-point-step-size': 120,
                        'control-point-weight': 0.7, 
                        'label': 'data(label)',
                        'font-size': '7px',
                        'text-rotation': 'autorotate',
                        'target-text-offset': 70,
                        'text-wrap': 'wrap',
                        'text-max-width': '120px',
                        'text-background-opacity': 1,
                        'text-background-color': '#ffffff',
                        'text-background-padding': '3px',
                        'text-background-shape': 'roundrectangle',
                        'line-style': 'solid',
                        'arrow-scale': 1.2
                    }
                },


                {
                    selector: 'edge.bridge',
                    style: {
                        'line-style': 'dashed',
                        'line-dash-pattern': [6, 3],
                        'line-color': '#e74c3c',
                        'target-arrow-color': '#e74c3c',
                        'width': 3,
                        'font-size': '10px',
                        'font-weight': 'bold',
                        'text-margin-y': -15,
                        'text-background-opacity': 1,
                        'text-background-color': '#ffffff',
                        'text-background-padding': '5px'
                    }
                },
                {
                    selector: 'edge.vasp-connection',
                    style: {
                        'width': 1.5,
                        'line-style': 'solid',
                        'line-color': '#7f8c8d',
                        'target-arrow-shape': 'none',
                        'curve-style': 'bezier',
                        'label': ''
                    }
                },
                {
                    selector: 'node.multi-input-hub',
                    style: {
                        'shape': 'ellipse',
                        'width': 10,
                        'height': 10,
                        'background-color': '#95a5a6',
                        'label': '',
                        'border-width': 0,
                        'text-opacity': 0,
                        'min-zoomed-font-size': 0
                    }
                },
                {
                    selector: 'node.exchange-label-node',
                    style: {
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '9px',
                        'font-weight': 'normal',
                        'color': '#7f8c8d',
                        'background-opacity': 0,
                        'border-width': 0,
                        'shape': 'rectangle',
                        'width': 1,
                        'height': 1,
                        'text-background-opacity': 0.75,
                        'text-background-color': '#d5d8dc',
                        'text-background-padding': '4px',
                        'text-background-shape': 'roundrectangle',
                        'z-index': 1
                    }
                },
                {
                    selector: 'edge.multi-input-line',
                    style: {
                        'width': 2,
                        'line-color': '#95a5a6',
                        'target-arrow-shape': 'none',
                        'curve-style': 'bezier',
                        'label': ''
                    }
                },
                {
                    selector: '.high-risk',
                    style: {
                        'border-width': 4,
                        'border-color': '#e74c3c'
                    }
                }
            ],
            layout: {
                name: 'preset'
            },
            wheelSensitivity: 0.1,
            minZoom: 0.1,
            maxZoom: 3
        });

        this.setupTooltips();
        logSuccess('Cytoscape initialized!');
    }

    applyEdgeLabelSpacing() {
    log('Applying smart edge label spacing...');
    
    const edgeGroups = {};
    
    this.cy.edges().forEach(edge => {
        const source = edge.source().id();
        const target = edge.target().id();
        const key = `${source}->${target}`;
        
        if (!edgeGroups[key]) {
            edgeGroups[key] = [];
        }
        edgeGroups[key].push(edge);
    });
    
    Object.values(edgeGroups).forEach(group => {
        if (group.length > 1) {
            group.forEach((edge, index) => {
                const offset = index * -12;
                edge.style('text-margin-y', offset);
            });
        }
    });
    
    logSuccess('Smart label spacing applied!');
}



    setupTooltips() {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;

        this.cy.on('mouseover', 'node', (event) => {
            const data = event.target.data();
            let content = `<div class="tooltip-row"><span class="tooltip-label">Address:</span><span>${data.address || data.label}</span></div>`;
            if (data.chainAnalysis) content += `<div class="tooltip-row"><span class="tooltip-label">Analysis:</span><span>${data.chainAnalysis}</span></div>`;
            tooltip.innerHTML = content;
            tooltip.style.display = 'block';
        });

        this.cy.on('mousemove', 'node', (event) => {
            tooltip.style.left = event.originalEvent.pageX + 15 + 'px';
            tooltip.style.top = event.originalEvent.pageY + 15 + 'px';
        });

        this.cy.on('mouseout', 'node', () => {
            tooltip.style.display = 'none';
        });
    }

    generateGraph() {
        log('\n=== GENERATING GRAPH ===');
        document.getElementById('loading').style.display = 'block';

        setTimeout(() => {
            try {
                this.buildGraph();
                document.getElementById('loading').style.display = 'none';
                const statsEl = document.getElementById('stats');
                    if (statsEl) statsEl.style.display = 'grid';
                document.getElementById('exportPngBtn').disabled = false;
                document.getElementById('exportSvgBtn').disabled = false;
                logSuccess('Graph generated!');
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                logError('Graph generation failed:', error);
            }
        }, 500);
    }

    buildGraph() {
        const data = this.parsedData[this.currentTab];
        const exchangeData = data.exchanges[this.currentExchange];

        this.cy.elements().remove();

        const nodes = new Map();
        const edges = [];
        const currencyFilter = document.getElementById('currencyFilter').value;
        const vaspExchanges = new Set();

        const allTransactions = [];
        const currentCurrencies = new Set();

        this.activeStages.forEach(stage => {
         if (exchangeData[stage]) {
        // ✅ ИСПРАВЛЕНИЕ: Сначала собираем ВСЕ валюты (до фильтрации)
        exchangeData[stage].forEach(tx => {
            if (tx.currency) currentCurrencies.add(tx.currency);
        });
        
        // Затем фильтруем транзакции для построения графа
        const stageTx = exchangeData[stage].filter(tx => 
            !currencyFilter || tx.currency === currencyFilter
        );
        allTransactions.push(...stageTx);



                if (stage === 'layering-vasp') {
                    stageTx.forEach(tx => {
                        if (tx.comment) {
                            const exchangeName = this.extractExchangeName(tx.comment);
                            if (exchangeName && exchangeName.length > 2) {
                                vaspExchanges.add(exchangeName);
                                log(`VASP Exchange: "${exchangeName}" from comment "${tx.comment}"`);
                            }
                        }
                    });
                }

                // Обработка Placement + Dual Integration - извлекаем биржи-получатели
                if (stage === 'placement-dual-integration') {
                    stageTx.forEach(tx => {
                        if (tx.comment) {
                            const exchangeName = this.extractExchangeName(tx.comment);
                            if (exchangeName && exchangeName.length > 2) {
                                vaspExchanges.add(exchangeName);
                                log(`Dual Integration Target Exchange: "${exchangeName}" from comment "${tx.comment}"`);
                            }
                        }
                    });
                }
            }
        });

        log(`Total transactions: ${allTransactions.length}`);
        // Обновляем фильтр валют на основе текущих транзакций
        this.updateCurrencyFilterFromGraph(currentCurrencies);

        log('VASP Exchanges:', Array.from(vaspExchanges));

        if (allTransactions.length === 0) {
            alert('No transactions found.');
            return;
        }

        // Helper function to check if transaction is a swap
        const isSwapTransaction = (tx) => {
        // Swap-транзакция = когда Input Address = Output Address (обмен внутри одного кошелька)
        const inputAddr = String(tx.input || '').trim().toLowerCase();
        const outputAddr = String(tx.output || '').trim().toLowerCase();
        
        // Если адреса одинаковые - это настоящий swap
        if (inputAddr === outputAddr && inputAddr.length > 0) {
            return true;
        }
        
        // Иначе проверяем текст только если адреса разные
        const chainAnalysis = String(tx.chainAnalysis || '').toLowerCase();
        const comment = String(tx.comment || '').toLowerCase();
        
        // Если в обеих колонках есть слово "swap" И адреса ОДИНАКОВЫЕ - исключаем
        // Если адреса РАЗНЫЕ - это обмен валюты между кошельками, оставляем
        return false;
    };


        const bridges = this.detectBridges(allTransactions);

        let multiInputCounter = 0;
        let swapTransactionsCount = 0;

        allTransactions.forEach((tx, index) => {
            // Skip swap transactions
            if (isSwapTransaction(tx)) {
                swapTransactionsCount++;
                return;
            }

            // ═══════════════════════════════════════════════════════════════════
            // СПЕЦИАЛЬНАЯ ОБРАБОТКА: Placement + Dual Integration
            // Транзакции напрямую между биржами (например, Crypto.com → Coinbase)
            // ═══════════════════════════════════════════════════════════════════
            if (tx.stage === 'placement-dual-integration') {
    const targetExchangeName = this.extractExchangeName(tx.comment);
    
    // Input wallet - цвет биржи-источника (синий)
    if (!nodes.has(tx.input)) {
        nodes.set(tx.input, {
            displayAddress: tx.inputDisplay,
            id: tx.input,
            label: this.truncateAddress(tx.inputDisplay),
            address: tx.inputDisplay,
            color: this.getStageColor('pre-layering'),
            borderWidth: 2,
            borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
            width: 100,
            stage: 'pre-layering',
            chainAnalysis: tx.chainAnalysis
        });
    }

    // Output wallet - цвет биржи-получателя (зеленый)
    if (!nodes.has(tx.output)) {
        nodes.set(tx.output, {
            displayAddress: tx.outputDisplay,
            id: tx.output,
            label: this.truncateAddress(tx.outputDisplay),
            address: tx.outputDisplay,
            color: this.getStageColor('layering-vasp'),
            borderWidth: 2,
            borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
            width: 100,
            stage: 'layering-vasp',
            chainAnalysis: tx.chainAnalysis
        });
    }



                    // Создаем транзакцию между кошельками
    edges.push({
        id: `dual-integration-${index}`,
        source: tx.input,
        target: tx.output,
        label: `${this.formatAmount(tx.amount, tx.currency)} ${tx.currency}\n\n${this.formatDateShort(tx.date)}`,
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
        classes: ''
    });

    return;

            }

            // Check if input contains multiple wallets (newline character)
            const inputStr = String(tx.input || '').trim();
            const hasMultipleInputs = inputStr.includes('\n');

            if (hasMultipleInputs) {
                // MULTI-INPUT TRANSACTION
                const inputWallets = inputStr.split('\n')
                    .map(w => w.trim())
                    .filter(w => w.length > 0);

                log(`Multiple inputs detected: ${inputWallets.length} wallets`);

                // Create intermediate hub node (small point)
                const hubId = `multi-input-hub-${multiInputCounter++}`;
                nodes.set(hubId, {
                    id: hubId,
                    label: '',  // No label
                    address: hubId,
                    color: '#95a5a6',  // Gray
                    borderWidth: 0,
                    borderColor: '#95a5a6',
                    width: 10,  // Small point
                    height: 10,  // Perfect circle
                    stage: 'multi-input-hub',
                    isMultiInputHub: true
                });

                // Create nodes for each input wallet
                inputWallets.forEach(inputWallet => {
                    if (!nodes.has(inputWallet)) {
                        nodes.set(inputWallet, {
                            id: inputWallet,
                            label: this.truncateAddress(inputWallet),
                            address: inputWallet,
                            color: this.getStageColor(tx.stage),
                            borderWidth: 2,
                            borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
                            width: 100,
                            stage: tx.stage,
                            chainAnalysis: tx.chainAnalysis
                        });
                    }

                    // Create simple line from input wallet to hub (no labels, no arrows)
                    edges.push({
                        id: `multi-input-line-${index}-${inputWallet}`,
                        source: inputWallet,
                        target: hubId,
                        label: '',  // No label
                        classes: 'multi-input-line'
                    });
                });

                // Create output node
                if (!nodes.has(tx.output)) {
                    nodes.set(tx.output, {
        displayAddress: tx.outputDisplay,
                        id: tx.output,
                        label: this.truncateAddress(tx.outputDisplay),
                        address: tx.outputDisplay,
                        color: this.getStageColor(tx.stage),
                        borderWidth: 2,
                        borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
                        width: 100,
                        stage: tx.stage,
                        chainAnalysis: tx.chainAnalysis
                    });
                }

                // Create arrow from hub to output with amount and date
                edges.push({
                    id: `multi-input-final-${index}`,
                    source: hubId,
                    target: tx.output,
                    label: `${this.formatAmount(tx.amount, tx.currency)} ${tx.currency}\n\n${this.formatDateShort(tx.date)}`,
                    amount: tx.amount,
                    currency: tx.currency,
                    date: tx.date,
                    classes: ''
                });

            } else {
                // REGULAR TRANSACTION (single input)
                if (!nodes.has(tx.input)) {
                    nodes.set(tx.input, {
        displayAddress: tx.inputDisplay,
                        id: tx.input,
                        label: this.truncateAddress(tx.inputDisplay),
                        address: tx.inputDisplay,
                        color: this.getStageColor(tx.stage),
                        borderWidth: 2,
                        borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
                        width: 100,
                        stage: tx.stage,
                        chainAnalysis: tx.chainAnalysis
                    });
                }

                if (!nodes.has(tx.output)) {
                    nodes.set(tx.output, {
        displayAddress: tx.outputDisplay,
                        id: tx.output,
                        label: this.truncateAddress(tx.outputDisplay),
                        address: tx.outputDisplay,
                        color: this.getStageColor(tx.stage),
                        borderWidth: 2,
                        borderColor: this.isHighRisk(tx) ? '#e74c3c' : '#2c3e50',
                        width: 100,
                        stage: tx.stage,
                        chainAnalysis: tx.chainAnalysis
                    });
                }

                
            }
        });

        // ════════════════════════════════════════════════════════════════
// ГРУППИРОВКА ТРАНЗАКЦИЙ ПО НАПРАВЛЕНИЮ И ВАЛЮТЕ
// ════════════════════════════════════════════════════════════════
log('Grouping transactions by direction and currency...');

const edgeMap = new Map(); // Ключ: "sourceId|targetId|currency"

allTransactions.forEach((tx, index) => {
    // Пропускаем swap-транзакции
    if (isSwapTransaction(tx)) {
        return;
    }

    const inputStr = String(tx.input || '').trim();
    const hasMultipleInputs = inputStr.includes('\n');
    
    // Multi-input и placement-dual-integration уже обработаны выше, пропускаем их
    if (hasMultipleInputs || tx.stage === 'placement-dual-integration') {
        return;
    }

    const key = `${tx.input}|${tx.output}|${tx.currency}`;
    
    if (!edgeMap.has(key)) {
        edgeMap.set(key, []);
    }
    
    edgeMap.get(key).push({
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
        index: index
    });
});


// Создаём рёбра из сгруппированных данных
edgeMap.forEach((txGroup, key) => {
    const [source, target, currency] = key.split('|');
    
    if (txGroup.length === 1) {
        // Одиночная транзакция - формат как раньше
        const tx = txGroup[0];
        edges.push({
            id: `tx-${tx.index}`,
            source: source,
            target: target,
            label: `${this.formatAmount(tx.amount, currency)} ${currency}\n${this.formatDateShort(tx.date)}`,
            amount: tx.amount,
            currency: currency,
            date: tx.date,
            classes: ''
        });
    } else {
        // Множественные транзакции - группируем
        const totalAmount = txGroup.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        const txCount = txGroup.length;
        
        // Сортируем по дате для определения первой и последней
        const sortedTxs = [...txGroup].sort((a, b) => {
            const dateA = this.parseDate(a.date);
            const dateB = this.parseDate(b.date);
            return dateA - dateB;
        });
        
        const firstDate = this.formatDateShort(sortedTxs[0].date);
        const lastDate = this.formatDateShort(sortedTxs[sortedTxs.length - 1].date);
        
        edges.push({
            id: `tx-grouped-${source}-${target}-${currency}`,
            source: source,
            target: target,
            label: `${this.formatAmount(totalAmount, currency)} ${currency} (${txCount} tx)\nF: ${firstDate}\nL: ${lastDate}`,
            amount: totalAmount,
            currency: currency,
            date: sortedTxs[0].date, // Используем дату первой транзакции
            txCount: txCount,
            classes: 'grouped-edge'
        });
        
        log(`Grouped ${txCount} transactions: ${source.substring(0,10)}... → ${target.substring(0,10)}... | ${this.formatAmount(totalAmount, currency)} ${currency}`);
    }
});

log(`Created ${edgeMap.size} edges (some grouped from multiple transactions)`);


        bridges.forEach((bridge, index) => {
            edges.push({
                id: `bridge-${index}`,
                source: bridge.lockBurnWallet,
                target: bridge.mintingWallet,
                label: 'Cross-Chain Bridge',
                classes: 'bridge'
            });
        });

        vaspExchanges.forEach(exchangeName => {
            const nodeId = `vasp-${exchangeName}`;
            nodes.set(nodeId, {
                id: nodeId,
                label: exchangeName,
                address: exchangeName,
                color: '#27ae60',
                borderWidth: 3,
                borderColor: '#229954',
                width: 120,
                stage: 'vasp-exchange',
                isExchange: true
            });
        });

        // Дедупликация VASP connections
        const vaspConnections = new Set();

        allTransactions.forEach(tx => {
            if (tx.stage === 'layering-vasp' && tx.comment) {
                const exchangeName = this.extractExchangeName(tx.comment);
                if (exchangeName && vaspExchanges.has(exchangeName)) {
                    const key = `${tx.output}-${exchangeName}`;

                    if (!vaspConnections.has(key)) {
                        vaspConnections.add(key);
                        // Создаём связи для Placement + Dual Integration
        

                        edges.push({
                            id: `vasp-${tx.output}-${exchangeName}`,
                            source: tx.output,
                            target: `vasp-${exchangeName}`,
                            label: '',
                            classes: 'vasp-connection'
                        });

                        log(`VASP connection created: ${tx.output.substring(0, 10)}... → ${exchangeName}`);
                    } else {
                        log(`VASP connection skipped (duplicate): ${tx.output.substring(0, 10)}... → ${exchangeName}`);
                    }
                }
            }
        });

        // Создаём связи для Placement + Dual Integration (отдельный цикл)
allTransactions.forEach(tx => {
    if (tx.stage === 'placement-dual-integration' && tx.comment) {
        const exchangeName = this.extractExchangeName(tx.comment);
        if (exchangeName && vaspExchanges.has(exchangeName)) {
            const key = `${tx.output}-${exchangeName}`;

            if (!vaspConnections.has(key)) {
                vaspConnections.add(key);

                edges.push({
                    id: `dual-${tx.output}-${exchangeName}`,
                    source: tx.output,
                    target: `vasp-${exchangeName}`,
                    label: '',
                    classes: 'vasp-connection'
                });

                log(`Dual Integration connection: ${tx.output.substring(0, 10)}... → ${exchangeName}`);
            }
        }
    }
});


        log(`Created ${nodes.size} nodes and ${edges.length} edges`);
        log(`Total VASP connections: ${vaspConnections.size}`);
        if (swapTransactionsCount > 0) {
            log(`Swap transactions excluded: ${swapTransactionsCount}`);
        }

        nodes.forEach(node => {
            const classes = [];
            if (node.isExchange) classes.push('exchange-label');
            if (node.isMultiInputHub) classes.push('multi-input-hub');
            if (node.borderColor === '#e74c3c') classes.push('high-risk');
            this.cy.add({ group: 'nodes', data: node, classes: classes.join(' ') });
        });

        edges.forEach(edge => {
            this.cy.add({ group: 'edges', data: edge, classes: edge.classes });
        });

        if (typeof dagre !== 'undefined') {
            this.cy.layout({
                name: 'dagre',
                rankDir: 'LR',
                nodeSep: 150,
                rankSep: 250,
                padding: 80,
                fit: true
            }).run();
        } else {
            this.cy.layout({ name: 'breadthfirst', directed: true, spacingFactor: 2 }).run();
        }

        // Add exchange labels for Pre-Layering input wallets after layout
        this.applyEdgeLabelSpacing();{
            const exchangeLabelsAdded = new Set();
            const walletLabelMap = new Map(); // Map to track wallet-label relationships

            allTransactions.forEach(tx => {
                if ((tx.stage === 'pre-layering' || tx.stage === 'placement-dual-integration') && !isSwapTransaction(tx)) {
                    const inputStr = String(tx.input || '').trim();
                    const hasMultipleInputs = inputStr.includes('\n');

                    const processInputWallet = (inputWallet) => {
                        const labelId = `exchange-label-${inputWallet}`;
                        if (!exchangeLabelsAdded.has(labelId)) {
                            exchangeLabelsAdded.add(labelId);

                            const walletNode = this.cy.getElementById(inputWallet);
                            if (walletNode.length > 0) {
                    const pos = walletNode.position();

                    const labelNode = this.cy.add({
                        group: 'nodes',
                        data: {
                            id: labelId,
                            label: this.currentExchange,
                            walletId: inputWallet,
                            color: '#9b59b6',
                            borderColor: '#8e44ad',
                            borderWidth: 2,
                            width: 120
                        },
                        position: {
                            x: pos.x,
                            y: pos.y + 55
                        },
                        classes: ['exchange-label-node']
                    });

                    // Store the relationship



                                // Store the relationship
                                walletLabelMap.set(inputWallet, labelId);
                            }
                        }
                    };

                    if (hasMultipleInputs) {
                        const inputWallets = inputStr.split('\n')
                            .map(w => w.trim())
                            .filter(w => w.length > 0);
                        inputWallets.forEach(processInputWallet);
                    } else {
                        processInputWallet(tx.input);
                    }
                }
            });

            // Add drag event listener to move labels with wallets
            this.cy.on('drag', 'node', function(evt) {
                const node = evt.target;
                const nodeId = node.id();
                const labelId = walletLabelMap.get(nodeId);

                if (labelId) {
                    const labelNode = this.cy.getElementById(labelId);
                    if (labelNode.length > 0) {
                        const pos = node.position();
                        labelNode.position({
                            x: pos.x,
                            y: pos.y + 55
                        });
                    }
                }
            }.bind(this));

        } 100;

        this.updateStats(nodes.size, edges.length, allTransactions);
        setTimeout(() => this.cy.fit(60), 200);
        
        // Активируем кнопки экспорта
        const exportPngBtn = document.getElementById('exportPngBtn');
        const exportSvgBtn = document.getElementById('exportSvgBtn');
        if (exportPngBtn) exportPngBtn.disabled = false;
        if (exportSvgBtn) exportSvgBtn.disabled = false;
        log('✓ Export buttons enabled');

        // Обновляем статистику
        this.updateStats(nodes.size, edges.length, allTransactions);

    }


    getStageColor(stage) {
        return {
            'pre-layering': '#3498db',
            'layering-non-vasp': '#000000',
            'layering-vasp': '#ffd700 '
        }[stage] || '#95a5a6';
    }

    isHighRisk(tx) {
        const keywords = ['high-risk', 'phishing', 'scam', 'sanctioned'];
        return keywords.some(k => (tx.chainAnalysis || '').toLowerCase().includes(k));
    }

    truncateAddress(addr) {
        if (!addr) return 'Unknown';
        if (addr.length <= 12) return addr;
        return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
    }

    formatAmount(amount, currency) {
        const num = Number(amount);

        if (isNaN(num)) {
            log('WARNING: Invalid amount:', amount);
            return '0';
        }

        const currencyUpper = String(currency || '').toUpperCase();
        const isIntegerCurrency = INTEGER_CURRENCIES.has(currencyUpper);

        if (isIntegerCurrency) {
            return Math.floor(num).toLocaleString('en-US');
        } else {
            return num.toFixed(6);
        }
    }

    formatDateShort(dateStr) {
        if (!dateStr) return '';
        try {
            const date = this.parseDate(dateStr);
            if (!date || isNaN(date.getTime())) return '';

            const month = date.getMonth() + 1;
            const day = date.getDate();
            const year = date.getFullYear() % 100;
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;

            return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
        } catch (e) {
            return '';
        }
    }

    updateStats(nodeCount, edgeCount, transactions) {
        log(`Updating stats: ${nodeCount} wallets, ${edgeCount} transactions`);
    
        // ✅ ИСПРАВЛЕНИЕ: Обновляем ПРАВИЛЬНЫЕ HTML элементы
        const walletCountEl = document.getElementById('walletCount');
     const transactionCountEl = document.getElementById('transactionCount');
     const currencyListEl = document.getElementById('currencyList');
    
     if (walletCountEl) {
        walletCountEl.textContent = nodeCount;
        log(`✓ Wallet count updated: ${nodeCount}`);
     } else {
        logError('Element walletCount not found!');
      }
    
      if (transactionCountEl) {
        transactionCountEl.textContent = edgeCount;
        log(`✓ Transaction count updated: ${edgeCount}`);
      } else {
        logError('Element transactionCount not found!');
      }
    
       if (currencyListEl && transactions) {
        const currencies = new Set();
        transactions.forEach(tx => {
            if (tx.currency) currencies.add(tx.currency);
        });
        
        const currencyArray = Array.from(currencies).sort();
        currencyListEl.textContent = currencyArray.join(', ') || 'N/A';
        log(`✓ Currencies updated: ${currencyArray.join(', ')}`);
     } else {
        if (!currencyListEl) logError('Element currencyList not found!');
       }
    
       logSuccess(`Statistics updated: ${nodeCount} wallets, ${edgeCount} transactions`);
    }

async exportAsPNG() {
        log('Starting PNG export with NATIVE Cytoscape method...');
        
        if (!this.cy || this.cy.nodes().length === 0) {
            alert('No graph to export! Please generate a graph first.');
            logError('Export failed: No graph available');
            return;
        }

        // 🔒 БЛОКИРУЕМ КНОПКИ ЭКСПОРТА
        const exportPngBtn = document.getElementById('exportPngBtn');
        const exportSvgBtn = document.getElementById('exportSvgBtn');
        
        const originalPngText = exportPngBtn ? exportPngBtn.textContent : '📥 PNG';
        
        if (exportPngBtn) {
            exportPngBtn.disabled = true;
            exportPngBtn.textContent = '⏳ Exporting...';
        }
        if (exportSvgBtn) {
            exportSvgBtn.disabled = true;
        }

        try {
            // Скрываем sticky controls
            const stickyControls = document.querySelector('.controls.sticky');
            if (stickyControls) {
                stickyControls.style.display = 'none';
            }

            // Определяем оптимальный scale в зависимости от размера графа
            const nodeCount = this.cy.nodes().length;
            let scale = 2; // По умолчанию
            
            if (nodeCount > 200) {
                scale = 1; // Очень большой граф
                log('Large graph detected (' + nodeCount + ' nodes), using scale: 1');
            } else if (nodeCount > 100) {
                scale = 1.5; // Большой граф
                log('Medium-large graph (' + nodeCount + ' nodes), using scale: 1.5');
            } else {
                log('Normal graph (' + nodeCount + ' nodes), using scale: 2');
            }

            // Экспортируем в PNG
            log('Generating PNG with scale: ' + scale + ', full: true...');
            
            let pngBlob;
            try {
                pngBlob = this.cy.png({
                    full: true,
                    scale: scale,
                    bg: 'white',
                    output: 'blob',
                    maxWidth: 20000,
                    maxHeight: 20000
                });
            } catch (pngError) {
                logError('PNG generation failed with scale ' + scale + ', retrying with scale 1...');
                // Повторная попытка с scale: 1
                pngBlob = this.cy.png({
                    full: true,
                    scale: 1,
                    bg: 'white',
                    output: 'blob',
                    maxWidth: 20000,
                    maxHeight: 20000
                });
                scale = 1;
            }

            if (!pngBlob || pngBlob.size === 0) {
                throw new Error('Generated PNG is empty');
            }

            log('PNG generated successfully');

            // Создаём Image для добавления padding
            const img = new Image();
            const pngUrl = URL.createObjectURL(pngBlob);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load PNG image'));
                img.src = pngUrl;
            });

            log('Original image size: ' + img.width + 'x' + img.height);

            // Проверяем размер изображения
            if (img.width === 0 || img.height === 0) {
                throw new Error('Generated PNG has zero dimensions');
            }

            // Создаём canvas с padding
            const padding = Math.floor(60 * scale); // Масштабируем padding
            const canvas = document.createElement('canvas');
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);

            log('Final canvas size: ' + canvas.width + 'x' + canvas.height);

            // Скачиваем
            const fileName = 'crypto-flow-' + (this.currentExchange || 'graph') + '-' + Date.now() + '.png';
            
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                
                logSuccess('PNG exported: ' + fileName);
                log('File size: ' + (blob.size / 1024 / 1024).toFixed(2) + ' MB');
                log('Scale used: ' + scale);
                
                // 🔓 РАЗБЛОКИРУЕМ КНОПКИ ЭКСПОРТА
                setTimeout(() => {
                    if (exportPngBtn) {
                        exportPngBtn.disabled = false;
                        exportPngBtn.textContent = originalPngText;
                    }
                    if (exportSvgBtn) {
                        exportSvgBtn.disabled = false;
                    }
                }, 500);
            }, 'image/png', 1.0);

            URL.revokeObjectURL(pngUrl);

            // Восстанавливаем controls
            if (stickyControls) {
                stickyControls.style.display = '';
            }

        } catch (error) {
            logError('PNG export failed:', error);
            
            // Предлагаем альтернативу - SVG
            const useSVG = confirm(
                'PNG export failed for this large graph.\\n\\n' +
                'Would you like to export as SVG instead?\\n' +
                '(SVG has infinite quality and smaller file size)'
            );
            
            if (useSVG) {
                // Восстанавливаем кнопки перед вызовом SVG экспорта
                if (exportPngBtn) {
                    exportPngBtn.disabled = false;
                    exportPngBtn.textContent = originalPngText;
                }
                if (exportSvgBtn) {
                    exportSvgBtn.disabled = false;
                }
                
                // Вызываем SVG экспорт
                this.exportAsSVG();
            } else {
                alert('PNG export failed: ' + error.message);
            }
            
            const stickyControls = document.querySelector('.controls.sticky');
            if (stickyControls) {
                stickyControls.style.display = '';
            }
            
            // 🔓 РАЗБЛОКИРУЕМ КНОПКИ при ошибке
            if (exportPngBtn) {
                exportPngBtn.disabled = false;
                exportPngBtn.textContent = originalPngText;
            }
            if (exportSvgBtn) {
                exportSvgBtn.disabled = false;
            }
        }
}
        async exportAsSVG() {
        log('Starting SVG export...');
        
        if (!this.cy || this.cy.nodes().length === 0) {
            alert('No graph to export! Please generate a graph first.');
            logError('Export failed: No graph available');
            return;
        }

        // 🔒 БЛОКИРУЕМ КНОПКИ ЭКСПОРТА
        const exportPngBtn = document.getElementById('exportPngBtn');
        const exportSvgBtn = document.getElementById('exportSvgBtn');
        
        const originalSvgText = exportSvgBtn ? exportSvgBtn.textContent : '📥 SVG';
        
        if (exportSvgBtn) {
            exportSvgBtn.disabled = true;
            exportSvgBtn.textContent = '⏳ Exporting...';
        }
        if (exportPngBtn) {
            exportPngBtn.disabled = true;
        }

        try {
            // Проверка cytoscape-svg
            if (typeof this.cy.svg !== 'function') {
                logError('cytoscape-svg plugin not loaded!');
                alert('Error: Cytoscape SVG plugin not loaded.');
                // Разблокируем кнопки
                if (exportSvgBtn) {
                    exportSvgBtn.disabled = false;
                    exportSvgBtn.textContent = originalSvgText;
                }
                if (exportPngBtn) exportPngBtn.disabled = false;
                return;
            }

            // Скрываем sticky controls
            const stickyControls = document.querySelector('.controls.sticky');
            if (stickyControls) {
                stickyControls.style.display = 'none';
            }

            // Генерируем SVG
            log('Generating SVG...');
            const svgContent = this.cy.svg({
                full: true,
                scale: 1,
                bg: 'white'
            });

            if (!svgContent || svgContent.length < 100) {
                throw new Error('Generated SVG is empty');
            }

            log('SVG length: ' + svgContent.length + ' characters');

            // Парсим SVG для добавления padding
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            const originalWidth = parseFloat(svgElement.getAttribute('width'));
            const originalHeight = parseFloat(svgElement.getAttribute('height'));

            log('Original SVG size: ' + originalWidth + 'x' + originalHeight);

            // Добавляем padding 60px
            const padding = 60;
            const newWidth = originalWidth + padding * 2;
            const newHeight = originalHeight + padding * 2;

            svgElement.setAttribute('width', newWidth + 'px');
            svgElement.setAttribute('height', newHeight + 'px');
            svgElement.setAttribute('viewBox', '-' + padding + ' -' + padding + ' ' + newWidth + ' ' + newHeight);

            log('SVG with padding: ' + newWidth + 'x' + newHeight);

            // Конвертируем обратно в строку
            const serializer = new XMLSerializer();
            const finalSvgContent = serializer.serializeToString(svgElement);

            // Создаём blob и скачиваем
            const blob = new Blob([finalSvgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = 'crypto-flow-' + (this.currentExchange || 'graph') + '-' + Date.now() + '.svg';
            link.download = fileName;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            // Восстанавливаем controls
            if (stickyControls) {
                stickyControls.style.display = '';
            }

            logSuccess('SVG exported: ' + fileName);
            log('Format: 100% VECTOR (infinite quality)');
            log('File size: ' + (blob.size / 1024).toFixed(2) + ' KB');
            
            // 🔓 РАЗБЛОКИРУЕМ КНОПКИ ЭКСПОРТА
            setTimeout(() => {
                if (exportSvgBtn) {
                    exportSvgBtn.disabled = false;
                    exportSvgBtn.textContent = originalSvgText;
                }
                if (exportPngBtn) {
                    exportPngBtn.disabled = false;
                }
            }, 500);

        } catch (error) {
            logError('SVG export failed:', error);
            alert('SVG export failed: ' + error.message);
            
            const stickyControls = document.querySelector('.controls.sticky');
            if (stickyControls) {
                stickyControls.style.display = '';
            }
            
            // 🔓 РАЗБЛОКИРУЕМ КНОПКИ при ошибке
            if (exportSvgBtn) {
                exportSvgBtn.disabled = false;
                exportSvgBtn.textContent = originalSvgText;
            }
            if (exportPngBtn) {
                exportPngBtn.disabled = false;
            }
        }
    }
}



document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new CryptoFlowAnalyzer();
        logSuccess('Application ready!');
    } catch (error) {
        logError('Initialization failed:', error);
    }
});
