// AssetVal Pro - Asset Valuation System
// Core Application Logic

// Data Storage
let valuations = JSON.parse(localStorage.getItem('valuations')) || [];
let comparisonAssets = JSON.parse(localStorage.getItem('comparisonAssets')) || [];
let reports = JSON.parse(localStorage.getItem('reports')) || [];
let currentValuation = null;

// Condition multipliers for valuation
const CONDITION_FACTORS = {
    excellent: 0.95,
    good: 0.80,
    fair: 0.60,
    poor: 0.40,
    salvage: 0.20
};

// Market demand adjustments
const DEMAND_ADJUSTMENTS = {
    high: 0.10,
    normal: 0,
    low: -0.10
};

// Economic condition adjustments
const ECONOMIC_ADJUSTMENTS = {
    boom: 0.05,
    stable: 0,
    recession: -0.10
};

// Category depreciation rates (annual)
const DEPRECIATION_RATES = {
    machinery: 0.10,
    vehicle: 0.15,
    property: 0.02,
    inventory: 0.05,
    electronics: 0.20,
    furniture: 0.10,
    other: 0.10
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initForm();
    updateDashboard();
    updateComparisonSection();
    updateReportsSection();
});

// Navigation
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
}

function showSection(sectionId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
}

// Form Handling
function initForm() {
    const form = document.getElementById('valuationForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Set default date to today
    document.getElementById('acquisitionDate').valueAsDate = new Date();
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        assetName: document.getElementById('assetName').value,
        category: document.getElementById('assetCategory').value,
        acquisitionDate: document.getElementById('acquisitionDate').value,
        acquisitionCost: parseFloat(document.getElementById('acquisitionCost').value),
        condition: document.getElementById('condition').value,
        usefulLife: parseInt(document.getElementById('usefulLife').value),
        marketComparable: parseFloat(document.getElementById('marketComparable').value) || 0,
        liquidationFactor: parseFloat(document.getElementById('liquidationFactor').value) / 100,
        marketDemand: document.getElementById('marketDemand').value,
        economicCondition: document.getElementById('economicCondition').value,
        notes: document.getElementById('notes').value
    };
    
    currentValuation = calculateValuation(formData);
    displayResults(currentValuation);
    saveValuation(currentValuation);
    updateDashboard();
}

// Valuation Calculation Engine
function calculateValuation(data) {
    const now = new Date();
    const acquisitionDate = new Date(data.acquisitionDate);
    const yearsOwned = (now - acquisitionDate) / (365.25 * 24 * 60 * 60 * 1000);
    
    // Get depreciation rate for category
    const depreciationRate = DEPRECIATION_RATES[data.category] || 0.10;
    
    // Calculate depreciated value (straight-line depreciation)
    const totalDepreciation = Math.min(yearsOwned / data.usefulLife, 0.90);
    const depreciatedValue = data.acquisitionCost * (1 - totalDepreciation);
    
    // Apply condition factor
    const conditionFactor = CONDITION_FACTORS[data.condition];
    const conditionAdjustedValue = depreciatedValue * conditionFactor;
    
    // Market approach calculation
    let marketValue;
    if (data.marketComparable > 0) {
        // Weighted average of depreciated value and market comparable
        marketValue = (conditionAdjustedValue * 0.4) + (data.marketComparable * 0.6);
    } else {
        marketValue = conditionAdjustedValue;
    }
    
    // Apply market demand adjustment
    const demandAdjustment = DEMAND_ADJUSTMENTS[data.marketDemand];
    marketValue *= (1 + demandAdjustment);
    
    // Apply economic condition adjustment
    const economicAdjustment = ECONOMIC_ADJUSTMENTS[data.economicCondition];
    marketValue *= (1 + economicAdjustment);
    
    // Calculate liquidation value
    const liquidationValue = marketValue * data.liquidationFactor;
    
    // Build breakdown for transparency
    const breakdown = [
        { label: 'Original Acquisition Cost', value: data.acquisitionCost, type: 'neutral' },
        { label: `Depreciation (${(totalDepreciation * 100).toFixed(1)}%)`, value: -data.acquisitionCost * totalDepreciation, type: 'negative' },
        { label: 'Depreciated Value', value: depreciatedValue, type: 'neutral' },
        { label: `Condition Adjustment (${data.condition})`, value: conditionAdjustedValue - depreciatedValue, type: conditionAdjustedValue > depreciatedValue ? 'positive' : 'negative' },
    ];
    
    if (data.marketComparable > 0) {
        breakdown.push({ label: 'Market Comparable Adjustment', value: marketValue - conditionAdjustedValue * (1 + demandAdjustment) * (1 + economicAdjustment), type: 'neutral' });
    }
    
    if (demandAdjustment !== 0) {
        breakdown.push({ label: `Market Demand (${data.marketDemand})`, value: marketValue * demandAdjustment / (1 + demandAdjustment), type: demandAdjustment > 0 ? 'positive' : 'negative' });
    }
    
    if (economicAdjustment !== 0) {
        breakdown.push({ label: `Economic Conditions (${data.economicCondition})`, value: marketValue * economicAdjustment / (1 + economicAdjustment), type: economicAdjustment > 0 ? 'positive' : 'negative' });
    }
    
    return {
        id: Date.now(),
        ...data,
        yearsOwned,
        marketValue: Math.round(marketValue * 100) / 100,
        liquidationValue: Math.round(liquidationValue * 100) / 100,
        breakdown,
        calculatedAt: new Date().toISOString()
    };
}

// Display Results
function displayResults(valuation) {
    const resultsPanel = document.getElementById('resultsPanel');
    resultsPanel.classList.remove('hidden');
    
    document.getElementById('marketValueResult').textContent = formatCurrency(valuation.marketValue);
    document.getElementById('liquidationValueResult').textContent = formatCurrency(valuation.liquidationValue);
    
    // Build breakdown table
    const breakdownTable = document.getElementById('breakdownTable');
    breakdownTable.innerHTML = valuation.breakdown.map(item => `
        <div class="breakdown-row">
            <span class="breakdown-label">${item.label}</span>
            <span class="breakdown-value ${item.type}">${formatCurrency(item.value)}</span>
        </div>
    `).join('') + `
        <div class="breakdown-row total">
            <span class="breakdown-label">Final Market Value</span>
            <span class="breakdown-value">${formatCurrency(valuation.marketValue)}</span>
        </div>
    `;
    
    // Scroll to results
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

// Save Valuation
function saveValuation(valuation) {
    valuations.unshift(valuation);
    localStorage.setItem('valuations', JSON.stringify(valuations));
    showToast('Valuation saved successfully!');
}

// Update Dashboard
function updateDashboard() {
    // Update stats
    document.getElementById('totalValuations').textContent = valuations.length;
    
    const totalMarket = valuations.reduce((sum, v) => sum + v.marketValue, 0);
    document.getElementById('totalMarketValue').textContent = formatCurrency(totalMarket);
    
    const totalLiquid = valuations.reduce((sum, v) => sum + v.liquidationValue, 0);
    document.getElementById('totalLiquidation').textContent = formatCurrency(totalLiquid);
    
    document.getElementById('reportsGenerated').textContent = reports.length;
    
    // Update recent valuations list
    const recentList = document.getElementById('recentValuationsList');
    if (valuations.length === 0) {
        recentList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <p>No valuations yet. Create your first valuation!</p>
            </div>
        `;
    } else {
        recentList.innerHTML = valuations.slice(0, 5).map(v => `
            <div class="valuation-item">
                <div class="valuation-info">
                    <h4>${v.assetName}</h4>
                    <span>${formatDate(v.calculatedAt)} • ${v.category}</span>
                </div>
                <div class="valuation-values">
                    <div class="market">${formatCurrency(v.marketValue)}</div>
                    <div class="liquidation">Liq: ${formatCurrency(v.liquidationValue)}</div>
                </div>
            </div>
        `).join('');
    }
}

// Comparison Functions
function addToComparison() {
    if (!currentValuation) return;
    
    if (comparisonAssets.find(a => a.id === currentValuation.id)) {
        showToast('Asset already in comparison');
        return;
    }
    
    comparisonAssets.push(currentValuation);
    localStorage.setItem('comparisonAssets', JSON.stringify(comparisonAssets));
    updateComparisonSection();
    showToast('Added to comparison!');
}

function clearComparison() {
    comparisonAssets = [];
    localStorage.setItem('comparisonAssets', JSON.stringify(comparisonAssets));
    updateComparisonSection();
    showToast('Comparison cleared');
}

function updateComparisonSection() {
    const emptyState = document.getElementById('comparisonEmpty');
    const tableContainer = document.getElementById('comparisonTable');
    
    if (comparisonAssets.length === 0) {
        emptyState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    
    // Build comparison table
    const header = document.getElementById('comparisonHeader');
    const body = document.getElementById('comparisonBody');
    
    header.innerHTML = `
        <tr>
            <th>Attribute</th>
            ${comparisonAssets.map(a => `<th>${a.assetName}</th>`).join('')}
        </tr>
    `;
    
    const rows = [
        { label: 'Category', key: 'category' },
        { label: 'Acquisition Cost', key: 'acquisitionCost', format: 'currency' },
        { label: 'Condition', key: 'condition' },
        { label: 'Years Owned', key: 'yearsOwned', format: 'years' },
        { label: 'Market Value', key: 'marketValue', format: 'currency', class: 'market-value-cell' },
        { label: 'Liquidation Value', key: 'liquidationValue', format: 'currency', class: 'liquidation-value-cell' }
    ];
    
    body.innerHTML = rows.map(row => `
        <tr>
            <td><strong>${row.label}</strong></td>
            ${comparisonAssets.map(a => {
                let value = a[row.key];
                if (row.format === 'currency') value = formatCurrency(value);
                if (row.format === 'years') value = value.toFixed(1) + ' years';
                return `<td class="${row.class || ''}">${value}</td>`;
            }).join('')}
        </tr>
    `).join('');
}

// PDF Generation
function generatePDF() {
    if (!currentValuation) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(51, 102, 204);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Valuation Report', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 20, 35);
    
    // Asset Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Information', 20, 55);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const assetInfo = [
        ['Asset Name', currentValuation.assetName],
        ['Category', currentValuation.category],
        ['Acquisition Date', formatDate(currentValuation.acquisitionDate)],
        ['Acquisition Cost', formatCurrency(currentValuation.acquisitionCost)],
        ['Condition', currentValuation.condition.charAt(0).toUpperCase() + currentValuation.condition.slice(1)],
        ['Useful Life', currentValuation.usefulLife + ' years']
    ];
    
    doc.autoTable({
        startY: 60,
        head: [],
        body: assetInfo,
        theme: 'striped',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });
    
    // Valuation Results
    const resultsY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Valuation Results', 20, resultsY);
    
    doc.autoTable({
        startY: resultsY + 5,
        head: [['Value Type', 'Amount', 'Methodology']],
        body: [
            ['Market Value', formatCurrency(currentValuation.marketValue), 'Comparable Sales & Depreciation'],
            ['Liquidation Value', formatCurrency(currentValuation.liquidationValue), 'Quick Sale Estimate']
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 102, 204] },
        styles: { fontSize: 10 }
    });
    
    // Calculation Breakdown
    const breakdownY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculation Breakdown', 20, breakdownY);
    
    doc.autoTable({
        startY: breakdownY + 5,
        head: [['Component', 'Value']],
        body: currentValuation.breakdown.map(b => [b.label, formatCurrency(b.value)]),
        theme: 'striped',
        headStyles: { fillColor: [51, 102, 204] },
        styles: { fontSize: 10 }
    });
    
    // Notes
    if (currentValuation.notes) {
        const notesY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Valuation Notes', 20, notesY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(currentValuation.notes, 20, notesY + 8, { maxWidth: 170 });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('AssetVal Pro - Professional Asset Valuation System', 20, 285);
    doc.text('This report is for informational purposes only.', 20, 290);
    
    // Save PDF
    const filename = `valuation_${currentValuation.assetName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(filename);
    
    // Save to reports
    const report = {
        id: Date.now(),
        valuationId: currentValuation.id,
        assetName: currentValuation.assetName,
        marketValue: currentValuation.marketValue,
        liquidationValue: currentValuation.liquidationValue,
        filename,
        generatedAt: new Date().toISOString()
    };
    reports.unshift(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    updateDashboard();
    updateReportsSection();
    
    showToast('PDF Report generated!');
}

function generateComparisonPDF() {
    if (comparisonAssets.length === 0) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l'); // Landscape for comparison
    
    // Header
    doc.setFillColor(51, 102, 204);
    doc.rect(0, 0, 297, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Comparison Report', 20, 23);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 20, 30);
    
    // Comparison Table
    doc.setTextColor(0, 0, 0);
    const headers = ['Attribute', ...comparisonAssets.map(a => a.assetName)];
    const rows = [
        ['Category', ...comparisonAssets.map(a => a.category)],
        ['Acquisition Cost', ...comparisonAssets.map(a => formatCurrency(a.acquisitionCost))],
        ['Condition', ...comparisonAssets.map(a => a.condition)],
        ['Years Owned', ...comparisonAssets.map(a => a.yearsOwned.toFixed(1))],
        ['Market Value', ...comparisonAssets.map(a => formatCurrency(a.marketValue))],
        ['Liquidation Value', ...comparisonAssets.map(a => formatCurrency(a.liquidationValue))]
    ];
    
    doc.autoTable({
        startY: 45,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [51, 102, 204] },
        styles: { fontSize: 10 }
    });
    
    // Totals
    const totalMarket = comparisonAssets.reduce((s, a) => s + a.marketValue, 0);
    const totalLiquid = comparisonAssets.reduce((s, a) => s + a.liquidationValue, 0);
    const totalsY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Portfolio Summary', 20, totalsY);
    
    doc.autoTable({
        startY: totalsY + 5,
        head: [['Metric', 'Value']],
        body: [
            ['Total Assets', comparisonAssets.length.toString()],
            ['Combined Market Value', formatCurrency(totalMarket)],
            ['Combined Liquidation Value', formatCurrency(totalLiquid)],
            ['Average Market Value', formatCurrency(totalMarket / comparisonAssets.length)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [51, 102, 204] }
    });
    
    doc.save(`comparison_report_${Date.now()}.pdf`);
    showToast('Comparison PDF generated!');
}

// Reports Section
function updateReportsSection() {
    const emptyState = document.getElementById('reportsEmpty');
    const reportsList = document.getElementById('reportsList');
    
    if (reports.length === 0) {
        emptyState.classList.remove('hidden');
        reportsList.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    reportsList.classList.remove('hidden');
    
    reportsList.innerHTML = reports.map(r => `
        <div class="report-card">
            <div class="report-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
            </div>
            <h4>${r.assetName}</h4>
            <div class="report-date">${formatDate(r.generatedAt)}</div>
            <div class="report-values">
                <div class="value-item">
                    <span class="value-label">Market Value</span>
                    <span class="value-amount market">${formatCurrency(r.marketValue)}</span>
                </div>
                <div class="value-item">
                    <span class="value-label">Liquidation</span>
                    <span class="value-amount liquidation">${formatCurrency(r.liquidationValue)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Form Reset
function resetForm() {
    document.getElementById('valuationForm').reset();
    document.getElementById('resultsPanel').classList.add('hidden');
    document.getElementById('acquisitionDate').valueAsDate = new Date();
    currentValuation = null;
}

// Utility Functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const messageEl = toast.querySelector('.toast-message');
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
