import React from "react";
import { FaUndo, FaRedo, FaCut, FaCopy, FaPaste, FaBolt ,FaObjectUngroup, FaTrash, FaCheckSquare, FaEye, FaFileExport, FaProjectDiagram, FaSave, FaFolderOpen } from "react-icons/fa";

type TopBarProps = {
  title: string;
  setTitle: (title: string) => void;
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  deleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canCutOrCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  copiedObject: any; // Pass this prop to track the copied object
  isManySelected: boolean;
  onPreview: () => void;
  onSave: () => void;
  onLoad: () => void;
};
const Divider = () => <div className="w-px h-6 bg-gray-300" />;

const TopBar = ({ title, setTitle, undo, redo, cut, copy, paste, selectAll, deleteSelected, canUndo, canRedo, canCutOrCopy, canPaste, canDelete, copiedObject, isManySelected, onPreview, onSave, onLoad }: TopBarProps) => (
  <div className="absolute top-2 left-4 bg-white border border-gray-200 h-12 px-4 py-2 flex items-center space-x-2 rounded-lg z-10">
    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" className="px-2 py-1 rounded text-center w-40" />
    <Divider />
    <button onClick={undo} disabled={!canUndo} className={`p-1 rounded ${!canUndo ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}><FaUndo size={14} /></button>
    <button onClick={redo} disabled={!canRedo} className={`p-1 rounded ${!canRedo ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}><FaRedo size={14} /></button>
    <Divider />
    <button onClick={cut} disabled={!canCutOrCopy} className={`p-1 rounded ${!canCutOrCopy ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}><FaCut size={14} /></button>
    <button onClick={copy} className={`p-1 rounded ${!copiedObject ? "opacity-50 cursor-pointer" : "hover:bg-gray-100 cursor-pointer"}`}><FaCopy size={14} /></button>
    <button onClick={paste} disabled={!canPaste} className={`p-1 rounded ${!canPaste ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}><FaPaste size={14} /></button>
    <Divider />
    <button onClick={deleteSelected} disabled={!canDelete} className={`p-1 rounded ${!canDelete ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}><FaTrash size={14} /></button>
    <Divider />
    <button onClick={onSave} className="p-1 hover:bg-gray-100 cursor-pointer rounded" title="Save" suppressHydrationWarning><FaSave size={14} /></button>
    <button onClick={onLoad} className="p-1 hover:bg-gray-100 cursor-pointer rounded" title="Load" suppressHydrationWarning><FaFolderOpen size={14} /></button>
    <Divider />
    <button onClick={onPreview} className="p-1 hover:bg-gray-100 cursor-pointer rounded" title="Export" suppressHydrationWarning><FaFileExport size={14} /></button>
</div>
);

export default TopBar;