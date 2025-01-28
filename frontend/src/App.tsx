import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CoworkerChatInterface from "./components/CoworkerChatInterface";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CoworkerChatInterface />} />
      </Routes>
    </Router>
  );
}

// const styles: { [key: string]: React.CSSProperties } = {
//   navbar: {
//     display: "flex",
//     justifyContent: "center",
//     padding: "1rem",
//     backgroundColor: "#f0f0f0",
//     marginBottom: "2rem",
//   },
//   link: {
//     margin: "0 1rem",
//     textDecoration: "none",
//     color: "#007bff",
//     fontWeight: "bold",
//   },
// };

export default App;
