// Attempt to get token from localStorage - Adjust key if needed based on AuthContext implementation
const getAuthToken = () => {
    return localStorage.getItem('authToken'); // Common key for storing JWT
};

const API_BASE_URL = '/api/wargame'; // Traefik routes this

// Helper function to handle API requests
const request = async (endpoint, options = {}) => {
    const token = getAuthToken(); // Use the function defined above
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers,
            }
        );

        if (!response.ok) {
            let errorData;
            try {
                 errorData = await response.json();
            } catch (e) {
                 errorData = { detail: response.statusText };
            }
            console.error("API Error:", response.status, errorData);
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        // Handle 204 No Content explicitly for DELETE
        if (response.status === 204) {
            return null; // Or return { success: true }
        }

        return await response.json();
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
};

// --- API Functions ---

export const listWargames = async () => {
    return await request('/', { method: 'GET' });
};

export const getWargame = async (id) => {
    if (!id) throw new Error("Wargame ID is required.");
    return await request(`/${id}`, { method: 'GET' });
};

export const createWargame = async (wargameData) => {
    // Expects { name: string, description?: string }
    return await request('/', {
        method: 'POST',
        body: JSON.stringify(wargameData),
    });
};

export const updateWargame = async (id, wargameData) => {
    if (!id) throw new Error("Wargame ID is required for update.");
    // Sends the full wargame object structure
    return await request(`/${id}`, {
        method: 'PUT',
        body: JSON.stringify(wargameData),
    });
};

export const deleteWargame = async (id) => {
    if (!id) throw new Error("Wargame ID is required for delete.");
    return await request(`/${id}`, { method: 'DELETE' });
};

// Placeholder for file uploads - requires backend implementation
export const uploadWargameDocument = async (wargameId, file, section, entityId = null) => {
    console.warn("uploadWargameDocument is not implemented yet.");
    return Promise.resolve({ message: "File upload placeholder" }); // Mock response
}; 