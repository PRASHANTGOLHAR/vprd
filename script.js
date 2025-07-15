// ====================================
// 🚨 AIRTABLE CONFIGURATION - REPLACE WITH YOUR CREDENTIALS
// ====================================
const AIRTABLE_CONFIG = {
    BASE_ID: 'appVMSlbsgAx0cH8v',        // ← Replace with your Airtable base ID
    TABLE_NAME: 'VPRD',  // ← Replace with your table name
    API_KEY: 'patkafVHW8kIY2H8t.8d9cf3705f850e5eb13dfa9f4ef1fb532588765ccdf4d35a6218461b22aba7a6'         // ← Replace with your Airtable API key
};

// ====================================
// FORM FUNCTIONALITY
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('vendorPaymentForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const thankYouMessage = document.getElementById('thankYouMessage');
    const formContainer = document.querySelector('.form-container');
    const configAlert = document.querySelector('.config-alert');
    
    // Payment option radio buttons
    const earliestRadio = document.getElementById('earliest');
    const selectDateRadio = document.getElementById('selectDate');
    const dateField = document.getElementById('dateField');
    const paymentDateInput = document.getElementById('paymentDate');

    // ====================================
    // CONDITIONAL DATE FIELD LOGIC
    // ====================================
    function toggleDateField() {
        if (selectDateRadio.checked) {
            dateField.style.display = 'block';
            paymentDateInput.required = true;
        } else {
            dateField.style.display = 'none';
            paymentDateInput.required = false;
            paymentDateInput.value = '';
        }
    }

    // Event listeners for radio buttons
    earliestRadio.addEventListener('change', toggleDateField);
    selectDateRadio.addEventListener('change', toggleDateField);

    // ====================================
    // FORM VALIDATION
    // ====================================
    function validateForm() {
        const formData = new FormData(form);
        const errors = [];

        // Check required fields
        if (!formData.get('vendorName').trim()) {
            errors.push('Vendor Name is required');
        }
        if (!formData.get('batchId').trim()) {
            errors.push('Batch ID is required');
        }
        if (!formData.get('invoiceNumber').trim()) {
            errors.push('Invoice Number is required');
        }
        if (!formData.get('bankDetails').trim()) {
            errors.push('Bank Details are required');
        }
        if (!formData.get('paymentOption')) {
            errors.push('Payment Option is required');
        }
        if (formData.get('paymentOption') === 'select_date' && !formData.get('paymentDate')) {
            errors.push('Payment Date is required when selecting date option');
        }
        if (!formData.get('declaration')) {
            errors.push('Declaration must be accepted');
        }

        return errors;
    }

    // ====================================
    // ERROR HANDLING
    // ====================================
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    // ====================================
    // AIRTABLE INTEGRATION
    // ====================================
    async function submitToAirtable(formData) {
        // Check if Airtable credentials are configured
        if (AIRTABLE_CONFIG.BASE_ID === 'YOUR_BASE_ID' || 
            AIRTABLE_CONFIG.API_KEY === 'YOUR_API_KEY') {
            throw new Error('Please configure your Airtable credentials in the AIRTABLE_CONFIG object');
        }

        const payload = {
            fields: {
                'Vendor Name': formData.get('vendorName'),
                'Batch ID': formData.get('batchId'),
                'Invoice Number': formData.get('invoiceNumber'),
                'Bank Details': formData.get('bankDetails'),
                'Payment Option': formData.get('paymentOption'),
                'Payment Date': formData.get('paymentDate') || "Earliest Pay Available",
                'Declaration': formData.get('declaration') ? 'Accepted' : 'Not Accepted',
                'Submission Date': new Date().toISOString()
            }
        };

        console.log('Submitting to Airtable:', payload);

        try {
            const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Airtable API Error:', errorData);
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Airtable submission successful:', result);
            return result;
        } catch (error) {
            console.error('Network or API error:', error);
            throw error;
        }
    }

    // ====================================
    // FORM SUBMISSION
    // ====================================
    async function handleSubmit(event) {
        event.preventDefault();
        hideError();

        // Validate form
        const errors = validateForm();
        if (errors.length > 0) {
            showError(errors.join('. '));
            return;
        }

        // Update button state
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting...';
        submitBtn.classList.add('loading');

        try {
            const formData = new FormData(form);
            await submitToAirtable(formData);
            
            // Show success message
            formContainer.style.display = 'none';
            configAlert.style.display = 'none';
            thankYouMessage.style.display = 'block';
            
            // Scroll to success message
            thankYouMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            console.log('Form submitted successfully!');
        } catch (error) {
            console.error('Submission error:', error);
            showError(`Submission failed: ${error.message}`);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Payment Request';
            submitBtn.classList.remove('loading');
        }
    }

    // ====================================
    // EVENT LISTENERS
    // ====================================
    form.addEventListener('submit', handleSubmit);

    // ====================================
    // UTILITY FUNCTIONS
    // ====================================
    function calculateDaysDifference(date) {
        const today = new Date();
        const selectedDate = new Date(date);
        const diffTime = selectedDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    function getInterestRate(days) {
        if (days <= 30) return '2%';
        if (days <= 60) return '5%';
        if (days <= 90) return '10%';
        return '12%';
    }

    // ====================================
    // INITIALIZATION
    // ====================================
    console.log('Vendor Payment Form initialized');
    console.log('Airtable Configuration:', {
        BASE_ID: AIRTABLE_CONFIG.BASE_ID,
        TABLE_NAME: AIRTABLE_CONFIG.TABLE_NAME,
        API_KEY: AIRTABLE_CONFIG.API_KEY ? '***configured***' : 'not configured'
    });
    
    // Initial setup
    toggleDateField();
});
