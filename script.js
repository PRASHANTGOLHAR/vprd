// ⚠️ AIRTABLE CONFIGURATION - UPDATE THESE VALUES ⚠️
const AIRTABLE_CONFIG = {
    BASE_ID: 'appVMSlbsgAx0cH8v', // Replace with your Airtable Base ID
    TABLE_NAME: 'AP CRM', // Your table name
    API_KEY: 'patkafVHW8kIY2H8t.8d9cf3705f850e5eb13dfa9f4ef1fb532588765ccdf4d35a6218461b22aba7a6', // Replace with your Airtable API key
};

// Demo data for testing (remove this when using real Airtable)

// Global state
let currentInvoices = [];
let selectedInvoices = [];
let currentSearchOption = '';
let currentVendorName = '';

// DOM Elements
const vendorIdInput = document.getElementById('vendor-id');
const searchOptionSelect = document.getElementById('search-option');
const searchBtn = document.getElementById('search-btn');
const searchText = document.getElementById('search-text');
const searchLoading = document.getElementById('search-loading');
const vendorInfo = document.getElementById('vendor-info');
const vendorNameDisplay = document.getElementById('vendor-name-display');
const resultsSection = document.getElementById('results-section');
const selectNotice = document.getElementById('select-notice');
const invoiceCount = document.getElementById('invoice-count');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const paymentDateInput = document.getElementById('payment-date');
const previewBtn = document.getElementById('preview-btn');
const previewModal = document.getElementById('preview-modal');
const successModal = document.getElementById('success-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const successOkBtn = document.getElementById('success-ok-btn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setMinPaymentDate();
});

function setupEventListeners() {
    vendorIdInput.addEventListener('input', validateForm);
    searchOptionSelect.addEventListener('change', validateForm);
    searchBtn.addEventListener('click', handleSearch);
    paymentDateInput.addEventListener('change', validatePreviewButton);
    previewBtn.addEventListener('click', handlePreview);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', handleConfirmSubmit);
    successOkBtn.addEventListener('click', closeSuccessModal);
    
    // Close modal when clicking outside
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            closeModal();
        }
    });
    
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            closeSuccessModal();
        }
    });
}

function setMinPaymentDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    paymentDateInput.min = tomorrow.toISOString().split('T')[0];
}

function validateForm() {
    const vendorId = vendorIdInput.value.trim();
    const searchOption = searchOptionSelect.value;
    
    searchBtn.disabled = !vendorId || !searchOption;
    currentSearchOption = searchOption;
}

function validatePreviewButton() {
    const paymentDate = paymentDateInput.value;
    const hasSelection = currentSearchOption === 'full' || selectedInvoices.length > 0;
    
    previewBtn.disabled = !paymentDate || !hasSelection || currentInvoices.length === 0;
}

async function handleSearch() {
    const vendorId = vendorIdInput.value.trim();
    
    if (!vendorId || !currentSearchOption) {
        showToast('Error', 'Please enter a vendor ID and select search option', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        let invoices = [];
        
        // Check if using demo data or real Airtable
        if (AIRTABLE_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            // Use demo data
            const demoData = DEMO_DATA[vendorId];
            if (demoData) {
                invoices = demoData.invoices;
                currentVendorName = demoData.vendor_name;
                showToast('Demo Mode', `Found ₹{invoices.length} demo invoices for ₹{currentVendorName}`, 'success');
            } else {
                showToast('Demo Mode', 'No demo data found. Try VEND001, VEND002, or VEND003', 'warning');
                setLoading(false);
                return;
            }
        } else {
            // Use real Airtable API
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_NAME}?filterByFormula=({Vendor_ID}='${vendorId}')`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            invoices = data.records;
            
            if (invoices.length > 0) {
                currentVendorName = invoices[0].fields.Vendor_Name;
                showToast('Success', `Found ₹{invoices.length} invoices for vendor: ₹{currentVendorName}`, 'success');
            } else {
                showToast('No Results', 'No invoices found for this vendor ID', 'error');
                setLoading(false);
                return;
            }
        }
        
        currentInvoices = invoices;
        selectedInvoices = [];
        
        displayVendorInfo();
        displayInvoices();
        
    } catch (error) {
        console.error('Error fetching invoices:', error);
        showToast('Error', 'Failed to fetch invoices. Please check your configuration.', 'error');
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    searchBtn.disabled = loading;
    if (loading) {
        searchText.textContent = 'Searching...';
        searchLoading.classList.remove('hidden');
    } else {
        searchText.textContent = 'Search Invoices';
        searchLoading.classList.add('hidden');
    }
}

function displayVendorInfo() {
    vendorNameDisplay.textContent = currentVendorName;
    vendorInfo.classList.remove('hidden');
}

function displayInvoices() {
    invoiceCount.textContent = currentInvoices.length;
    
    // Show/hide select notice based on search option
    if (currentSearchOption === 'requested') {
        selectNotice.classList.remove('hidden');
    } else {
        selectNotice.classList.add('hidden');
    }
    
    // Build table header
    let headerHTML = '';
    if (currentSearchOption === 'requested') {
        headerHTML += '<th>Select</th>';
    }
    headerHTML += `
        <th>Batch ID</th>
        <th>Invoice Number</th>
        <th>Amount</th>
        <th>Invoice Date</th>
        <th>Due Date</th>
        <th>Days to Due</th>
        <th>Discount %</th>
    `;
    tableHeader.innerHTML = headerHTML;
    
    // Build table body
    let bodyHTML = '';
    currentInvoices.forEach(invoice => {
        const discountPercent = calculateDiscount(invoice.fields.Due_Date);
        const daysToDue = calculateDaysToDue(invoice.fields.Due_Date);
        const badgeClass = getDaysToDueBadgeClass(daysToDue);
        const discountBadgeClass = getDiscountBadgeClass(discountPercent);
        
        bodyHTML += `
            <tr>
                ${currentSearchOption === 'requested' ? `
                    <td>
                        <div class="checkbox-container">
                            <input type="checkbox" class="checkbox" data-invoice-id="${invoice.id}" 
                                   onchange="handleInvoiceSelection('${invoice.id}', this.checked)">
                        </div>
                    </td>
                ` : ''}
                <td><strong>${invoice.fields.Batch_ID}</strong></td>
                <td>${invoice.fields.Invoice_Number}</td>
                <td>₹${invoice.fields.Invoice_Amount.toLocaleString()}</td>
                <td>${formatDate(invoice.fields.Invoice_Date)}</td>
                <td>${formatDate(invoice.fields.Due_Date)}</td>
                <td><span class="badge ${badgeClass}">${daysToDue} days</span></td>
                <td><span class="badge ${discountBadgeClass}">${discountPercent}%</span></td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = bodyHTML;
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
    
    validatePreviewButton();
}

function handleInvoiceSelection(invoiceId, isSelected) {
    if (isSelected) {
        if (!selectedInvoices.includes(invoiceId)) {
            selectedInvoices.push(invoiceId);
        }
    } else {
        selectedInvoices = selectedInvoices.filter(id => id !== invoiceId);
    }
    
    validatePreviewButton();
}

function calculateDiscount(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) return 2;
    if (diffDays >= 31 && diffDays <= 60) return 5;
    if (diffDays >= 61 && diffDays <= 90) return 10;
    if (diffDays > 90) return 12;
    return 0; // Past due
}

function calculateDaysToDue(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysToDueBadgeClass(days) {
    if (days < 30) return 'badge-green';
    if (days < 60) return 'badge-yellow';
    return 'badge-red';
}

function getDiscountBadgeClass(percent) {
    if (percent <= 2) return 'badge-green';
    if (percent <= 5) return 'badge-yellow';
    if (percent <= 10) return 'badge-orange';
    return 'badge-red';
}

function handlePreview() {
    const paymentDate = paymentDateInput.value;
    
    if (!paymentDate) {
        showToast('Error', 'Please select a payment date', 'error');
        return;
    }
    
    const relevantInvoices = currentSearchOption === 'full' 
        ? currentInvoices 
        : currentInvoices.filter(inv => selectedInvoices.includes(inv.id));
    
    if (relevantInvoices.length === 0) {
        showToast('Error', 'No invoices selected', 'error');
        return;
    }
    
    const calculatedData = relevantInvoices.map(invoice => {
        const discountPercent = calculateDiscount(invoice.fields.Due_Date);
        const discountAmount = (invoice.fields.Invoice_Amount * discountPercent) / 100;
        const paymentAmount = invoice.fields.Invoice_Amount - discountAmount;
        const daysToDue = calculateDaysToDue(invoice.fields.Due_Date);
        
        return {
            ...invoice,
            discountPercent,
            discountAmount,
            paymentAmount,
            daysToDue
        };
    });
    
    const totalOriginalAmount = calculatedData.reduce((sum, inv) => sum + inv.fields.Invoice_Amount, 0);
    const totalDiscountAmount = calculatedData.reduce((sum, inv) => sum + inv.discountAmount, 0);
    const totalPaymentAmount = calculatedData.reduce((sum, inv) => sum + inv.paymentAmount, 0);
    
    displayPreviewModal(calculatedData, {
        totalOriginalAmount,
        totalDiscountAmount,
        totalPaymentAmount,
        paymentDate: formatDate(paymentDate)
    });
}

function displayPreviewModal(invoices, totals) {
    // Update summary cards
    document.getElementById('original-amount').textContent = `₹${totals.totalOriginalAmount.toLocaleString()}`;
    document.getElementById('discount-amount').textContent = `₹${totals.totalDiscountAmount.toLocaleString()}`;
    document.getElementById('payment-amount').textContent = `₹${totals.totalPaymentAmount.toLocaleString()}`;
    document.getElementById('discount-highlight').textContent = `₹${totals.totalDiscountAmount.toLocaleString()}`;
    document.getElementById('selected-payment-date').textContent = totals.paymentDate;
    
    // Build preview table
    let previewHTML = '';
    invoices.forEach(invoice => {
        const daysBadgeClass = getDaysToDueBadgeClass(invoice.daysToDue);
        const discountBadgeClass = getDiscountBadgeClass(invoice.discountPercent);
        
        previewHTML += `
            <tr>
                <td><strong>${invoice.fields.Invoice_Number}</strong></td>
                <td>₹${invoice.fields.Invoice_Amount.toLocaleString()}</td>
                <td><span class="badge ${daysBadgeClass}">${invoice.daysToDue} days</span></td>
                <td><span class="badge ${discountBadgeClass}">${invoice.discountPercent}%</span></td>
                <td style="color: #166534; font-weight: 500;">₹${invoice.discountAmount.toLocaleString()}</td>
                <td><strong>₹${invoice.paymentAmount.toLocaleString()}</strong></td>
            </tr>
        `;
    });
    
    document.getElementById('preview-table-body').innerHTML = previewHTML;
    
    // Store data for submission
    previewModal.previewData = { invoices, totals };
    
    // Show modal
    previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

async function handleConfirmSubmit() {
    const { invoices } = previewModal.previewData;
    const paymentDate = paymentDateInput.value;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        if (AIRTABLE_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            // Demo mode - simulate delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            showToast('Demo Mode', 'In real mode, this would update Airtable records', 'success');
        } else {
            // Real Airtable updates
            const updatePromises = invoices.map(async (invoice) => {
                const response = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_NAME}/${invoice.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fields: {
                                Payment_Option: currentSearchOption === 'full' ? 'Full turnover' : 'Selected by date',
                                Payment_Date: paymentDate,
                                Payment_Amount: invoice.paymentAmount
                            }
                        })
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`Failed to update invoice ${invoice.fields.Invoice_Number}`);
                }
                
                return response.json();
            });
            
            await Promise.all(updatePromises);
        }
        
        // Close preview modal and show success
        closeModal();
        showSuccessModal();
        
        // Reset form
        resetForm();
        
    } catch (error) {
        console.error('Error updating records:', error);
        showToast('Error', 'Failed to submit request. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm & Submit';
    }
}

function showSuccessModal() {
    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    previewModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function closeSuccessModal() {
    successModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function resetForm() {
    vendorIdInput.value = '';
    searchOptionSelect.value = '';
    paymentDateInput.value = '';
    vendorInfo.classList.add('hidden');
    resultsSection.classList.add('hidden');
    currentInvoices = [];
    selectedInvoices = [];
    currentSearchOption = '';
    currentVendorName = '';
    validateForm();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Add click to dismiss
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}