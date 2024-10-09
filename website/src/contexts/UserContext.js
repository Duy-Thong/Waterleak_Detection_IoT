// src/contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const auth = getAuth();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    setUserId(storedUserId);
                } else {
                    setUserId(null);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            setUserId(null);
            localStorage.removeItem('userId'); // Xóa userId khỏi localStorage khi đăng xuất
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