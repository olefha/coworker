// pages/ChatPage.tsx

import React from "react";
//import ChatInterface from "../components/ChatInterface";
import SQLChatInterface from "../components/SQLChatInterface";

const ChatPage: React.FC = () => {
  return (
    <div>
      <h1>Chat with AI</h1>
      {/* <ChatInterface /> */}
      <SQLChatInterface />
    </div>
  );
};

export default ChatPage;
