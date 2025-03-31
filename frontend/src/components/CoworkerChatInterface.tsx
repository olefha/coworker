import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { askQuestion } from "../services/apiService";
import "./markdownStyles.css";

interface Message {
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
}

const CoworkerChatInterface: React.FC = () => {
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
      console.log("AI Response from askQuestion:", aiResponse);

      const aiMessage: Message = {
        sender: "ai",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Failed to get response from server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Chatty Digital Coworker</h2>
      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "user" ? "#dcf8c6" : "#fff",
              whiteSpace: "pre-wrap",
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif", // Custom font for all messages
            }}
          >
            {msg.sender === "user" ? (
              <span>{msg.content}</span>
            ) : (
              <div className="markdown-content">
                {/* @ts-expect-error - ReactMarkdown has typing issues with recent versions */}
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
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
    maxWidth: "800px",
    margin: "2rem auto",
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    height: "80vh",
    backgroundColor: "",
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif", // Default font for the entire container
  },
  header: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    fontSize: "1.5rem",
    marginBottom: "1rem",
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
    maxWidth: "90%",
    padding: "0.8rem", // Slightly reduced padding
    marginBottom: "0.8rem", // Slightly reduced margin
    borderRadius: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    fontSize: "0.95rem", // Slightly smaller font size
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
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif", // Match the font
  },
  button: {
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif", // Match the font
  },
  error: {
    color: "red",
    marginTop: "0.5rem",
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif", // Match the font
  },
};

export default CoworkerChatInterface;
