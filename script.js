// IndexedDB setup
let db;
const dbName = 'OrderTracker';
const dbVersion = 1;
const storeName = 'orders';

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                store.createIndex('vendor', 'vendor', { unique: false });
                store.createIndex('item', 'item', { unique: false });
            }
        };
    });
}

// Add order to database
function addOrder(orderData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(orderData);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all orders
function getAllOrders() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update order in database
function updateOrder(id, orderData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        orderData.id = id; // Ensure the ID is set
        const request = store.put(orderData);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get single order
function getOrder(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete order
function deleteOrder(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Create order tile HTML
function createOrderTile(order) {
    const vendorColors = {
        amazon: '#14b8a6',
        temu: '#ff8c00',
        alibaba: '#dc2626',
        shein: '#1f2937',
        other: '#16a34a'
    };

    return `
        <div class="item-tile">
            <button class="delete-btn" onclick="removeOrder(${order.id})">×</button>
            <button class="edit-btn" onclick="editOrder(${order.id})">✎</button>
            <div class="vendor-badge" style="background: ${vendorColors[order.vendor] || vendorColors.other}">
                ${order.vendor.toUpperCase()}
            </div>
            <div class="item-name">${order.item}</div>
            
            <div class="status-row">
                <span class="status-label">Received:</span>
                <span class="status-value ${order.received ? 'status-yes' : 'status-no'}">
                    ${order.received ? 'Yes' : 'No'}
                </span>
            </div>
            
            <div class="status-row">
                <span class="status-label">Returned:</span>
                <span class="status-value ${order.returned ? 'status-yes' : 'status-no'}">
                    ${order.returned ? 'Yes' : 'No'}
                </span>
            </div>
            
            ${order.returned ? `
                <div class="status-row">
                    <span class="status-label">Date Returned:</span>
                    <span class="status-value">${order.dateReturned ? new Date(order.dateReturned).toLocaleDateString() : 'Not specified'}</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">Returned Via:</span>
                    <span class="status-value">${order.returnedVia.toUpperCase()}</span>
                </div>
                
                <div class="status-row">
                    <span class="status-label">Refund Received:</span>
                    <span class="status-value ${order.refundReceived ? 'status-yes' : 'status-no'}">
                        ${order.refundReceived ? 'Yes' : 'No'}
                    </span>
                </div>
            ` : ''}
        </div>
    `;
}

// Display all orders
async function displayOrders() {
    try {
        const orders = await getAllOrders();
        const container = document.getElementById('itemsContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (orders.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = orders.map(createOrderTile).join('');
        }
    } catch (error) {
        console.error('Error displaying orders:', error);
    }
}

// Global variable to track edit mode
let editingOrderId = null;

// Edit order function
async function editOrder(id) {
    try {
        const order = await getOrder(id);
        if (!order) {
            alert('Order not found');
            return;
        }

        // Populate form with existing data
        document.getElementById('vendor').value = order.vendor;
        document.getElementById('item').value = order.item;
        document.getElementById('received').checked = order.received;
        document.getElementById('returned').checked = order.returned;
        document.getElementById('returnedVia').value = order.returnedVia || 'none';
        document.getElementById('dateReturned').value = order.dateReturned || '';
        document.getElementById('refundReceived').checked = order.refundReceived;

        // Switch to edit mode
        editingOrderId = id;
        document.getElementById('submitBtn').textContent = 'Update Order';
        document.getElementById('cancelEditBtn').style.display = 'block';

        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading order for edit:', error);
        alert('Error loading order. Please try again.');
    }
}

// Cancel edit function
function cancelEdit() {
    editingOrderId = null;
    document.getElementById('submitBtn').textContent = 'Add Order';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('orderForm').reset();
}

// Remove order
async function removeOrder(id) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await deleteOrder(id);
            displayOrders();
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Error deleting order. Please try again.');
        }
    }
}

// Form submission
document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderData = {
        vendor: document.getElementById('vendor').value,
        item: document.getElementById('item').value,
        received: document.getElementById('received').checked,
        returned: document.getElementById('returned').checked,
        returnedVia: document.getElementById('returnedVia').value,
        dateReturned: document.getElementById('dateReturned').value,
        refundReceived: document.getElementById('refundReceived').checked,
        dateAdded: editingOrderId ? undefined : new Date().toISOString() // Don't update dateAdded when editing
    };

    try {
        if (editingOrderId) {
            // Update existing order
            await updateOrder(editingOrderId, orderData);
            cancelEdit();
        } else {
            // Add new order
            orderData.dateAdded = new Date().toISOString();
            await addOrder(orderData);
            e.target.reset();
        }
        displayOrders();
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error saving order. Please try again.');
    }
});

// Cancel edit button
document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

// Handle return checkbox logic
document.getElementById('returned').addEventListener('change', (e) => {
    const returnedViaSelect = document.getElementById('returnedVia');
    const dateReturnedInput = document.getElementById('dateReturned');
    const refundCheckbox = document.getElementById('refundReceived');
    
    if (!e.target.checked) {
        returnedViaSelect.value = 'none';
        dateReturnedInput.value = '';
        refundCheckbox.checked = false;
    }
});

// Initialize app
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        displayOrders();
    } catch (error) {
        console.error('Error initializing database:', error);
        alert('Error initializing database. Please refresh the page.');
    }
});
