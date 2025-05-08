import { useContext, useCallback } from 'react';
import axios from 'axios';
import {getGatewayUrl } from '../config';
import { AuthContext } from '../contexts/AuthContext';

export const useWargameService = () => {
    const { token } = useContext(AuthContext);

    // Helper function to handle API requests
    const request = useCallback(async (endpoint, options = {}) => {
        const url = getGatewayUrl(`${endpoint}`);
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add authentication if token is available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('No token found for API request; API requests will likely fail');
        }
            
        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

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
            console.error("API Request Failed:", url, error);
            throw error; // Re-throw the error to be caught by the caller
        }
    }, [token]);

// --- API Functions ---

    const listWargames = useCallback(async () => {
        return await request('/api/wargame', { method: 'GET' });
    }, [request]);

    const getWargame = useCallback(async (id) => {
        if (!id) throw new Error("Wargame ID is required.");
        return await request(`/api/wargame/${id}`, { method: 'GET' });
    }, [request]);

    const createWargame = useCallback(async (wargameData) => {
        // Expects { name: string, description?: string }
        return await request('/api/wargame', {
            method: 'POST',
            body: JSON.stringify(wargameData),
        });
    }, [request]);

    const updateWargame = useCallback(async (id, wargameData) => {
        if (!id) throw new Error("Wargame ID is required for update.");
        // Sends the full wargame object structure
        return await request(`/api/wargame/${id}`, {
            method: 'PUT',
            body: JSON.stringify(wargameData),
        });
    }, [request]);

    const deleteWargame = useCallback(async (id) => {
        if (!id) throw new Error("Wargame ID is required for delete.");
        return await request(`/api/wargame/${id}`, { method: 'DELETE' });
    }, [request]);

    // Placeholder for file uploads - requires backend implementation
    const uploadWargameDocument = useCallback(async (wargameId, file, section, entityId = null) => {
        console.warn("uploadWargameDocument is not implemented yet.");
        return Promise.resolve({ message: "File upload placeholder" }); // Mock response
    }, []);

    return {
        listWargames,
        getWargame,
        createWargame,
        updateWargame,
        deleteWargame,
        uploadWargameDocument,
    };
};

