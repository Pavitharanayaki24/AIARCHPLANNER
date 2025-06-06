import React from 'react';

const MessageBox = () => {
  return (
    <div
      id="message-box"
      className="fixed top-4 right-4 p-4 rounded-lg shadow-lg transition-all duration-300 opacity-0 invisible"
    >
      <div className="flex items-center justify-between">
        <span id="message-text" className="text-sm font-medium"></span>
        <button
          id="close-message"
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default MessageBox; 