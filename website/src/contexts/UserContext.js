// src/contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"; // Import Firebase authentication

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userId, setUserId] = useState(null); // State for userId

    useEffect(() => {
        const auth = getAuth();

        // Listen to authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid); // Set userId when the user is logged in
            } else {
                setUserId(null); // Clear userId if not logged in
            }
        });

        return () => unsubscribe(); // Cleanup the listener on unmount
    }, []);

    // Function to handle user logout
    const logout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth); // Sign out the user
            setUserId(null); // Clear userId after logout
        } catch (error) {
            console.error("Error logging out: ", error);
        }
    };

    return (
        <UserContext.Provider value={{ userId, setUserId, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    return useContext(UserContext);
};
