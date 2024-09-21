// App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
// Import other pages as needed

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        {/* Define other routes */}
      </Routes>
    </Router>
  );
};

export default App;
