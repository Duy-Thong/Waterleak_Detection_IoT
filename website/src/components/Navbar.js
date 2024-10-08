import React from 'react';

const Navbar = ({ onLogout }) => (
    <nav className="bg-blue-500 p-4 flex justify-between">
        <h1 className="text-white text-2xl font-bold">Water Leak Detection</h1>
        <button
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
            onClick={onLogout}
        >
            Logout
        </button>
    </nav>
);

export default Navbar;
