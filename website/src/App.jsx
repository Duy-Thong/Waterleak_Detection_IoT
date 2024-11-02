import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WarningPage from './pages/WarningPage/WarningPage';
// ...other imports

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/device/:deviceId/warnings" element={<WarningPage />} />
        {/* ...other routes */}
      </Routes>
    </Router>
  );
};

export default App;
