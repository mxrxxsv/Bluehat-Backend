import React from "react";
import { X } from "lucide-react";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Modal Content */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Confirm Deletion
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Are you sure you want to delete{" "}
          <span className="font-medium">{itemName}</span>?  <br />
          This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
