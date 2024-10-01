/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/CombinedChatInterface.tsx

import React, { useState, useRef, useEffect } from "react";
import { askQuestion } from "../services/apiService";

interface Message {
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
}

const CombinedChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      sender: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    try {
      const aiResponse = await askQuestion(userMessage.content);
      console.log("AI Response from askQuestion:", aiResponse); // For debugging

      const aiMessage: Message = {
        sender: "ai",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Failed to get response from server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Combined SQL & Graph Chat</h2>
      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "user" ? "#dcf8c6" : "#fff",
            }}
          >
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a production question..."
          style={styles.input}
          disabled={isLoading}
        />
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? "AI is typing..." : "Send"}
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    height: "80vh",
  },
  chatBox: {
    flex: 1,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
  },
  message: {
    maxWidth: "80%",
    padding: "0.5rem 1rem",
    marginBottom: "0.5rem",
    borderRadius: "20px",
    boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    marginTop: "1rem",
  },
  input: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "20px",
    border: "1px solid #ccc",
    marginRight: "0.5rem",
  },
  button: {
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
  },
  error: {
    color: "red",
    marginTop: "0.5rem",
  },
};

export default CombinedChatInterface;
