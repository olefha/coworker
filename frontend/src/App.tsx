// App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ChatInterface from "./components/ChatInterface";
import SQLChatInterface from "./components/SQLChatInterface";

function App() {
  return (
    <Router>
      <div style={styles.navbar}>
        <Link to="/" style={styles.link}>
          General Chat
        </Link>
        <Link to="/sql-chat" style={styles.link}>
          SQL Chat
        </Link>
      </div>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
        <Route path="/sql-chat" element={<SQLChatInterface />} />
      </Routes>
    </Router>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    display: "flex",
    justifyContent: "center",
    padding: "1rem",
    backgroundColor: "#f0f0f0",
    marginBottom: "2rem",
  },
  link: {
    margin: "0 1rem",
    textDecoration: "none",
    color: "#007bff",
    fontWeight: "bold",
  },
};

export default App;
