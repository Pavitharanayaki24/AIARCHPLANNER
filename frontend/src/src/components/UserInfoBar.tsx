import React from "react";
import {
  FaShareAlt, FaQuestionCircle, FaUser,
  FaRocket, FaCommentDots
} from "react-icons/fa";

export const UserInfoBar = () => (
  <div className="absolute top-2 right-24 bg-white border border-gray-200 h-12 px-4 py-2 flex items-center space-x-4 rounded-lg z-10">
    <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Facilitate</button>
    <div className="w-px h-6 bg-gray-300" />
    <FaCommentDots size={18} className="text-gray-700 cursor-pointer hover:text-gray-900" />
    <button className="flex items-center space-x-1 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm">
      <FaShareAlt size={16} />
      <span>Share</span>
    </button>
    <div className="w-px h-6 bg-gray-300" />
    <FaQuestionCircle size={18} />
    <div className="w-px h-6 bg-gray-300" />
    <FaUser size={22} className="bg-green-500 text-white rounded-full p-1" />
  </div>
);

export const RocketCounter = () => (
  <div className="absolute top-2 right-4 border border-gray-300 bg-gray-50 px-3 py-1 rounded-lg flex items-center space-x-2 h-12 z-10">
    <FaRocket size={16} />
    <span className="text-sm font-medium">4/6</span>
  </div>
);